import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../utils/test-utils';
import http from '../../../../utils/httpClient';
import { AdminNewMember } from '../AdminNewMember';
import { IVttlMember, getEmptyMembership } from '../membershipModels';
import * as pdf from '../membershipPdf';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn(),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]), getTeamMatches: vi.fn().mockReturnValue([]) },
  },
}));

vi.mock('../../../controls/Editor', () => ({
  default: ({ text }: { text: string }) => <div data-testid="editor">{text}</div>,
}));

const contact = (playerId: number, address = '', city = '') => ({ playerId, email: `p${playerId}@ttc.be`, mobile: '', address, city });
const player = (id: number, firstName: string, lastName: string, extra = {}) => ({
  id,
  alias: firstName,
  firstName,
  lastName,
  active: true,
  quitYear: null,
  security: 'Player' as const,
  contact: contact(id),
  style: { playerId: id, name: '', bestStroke: '' },
  ...extra,
});

const preloadedState = {
  config: { params: { year: '2026', frenoyClubIdVttl: 'OVL134', email: 'info@ttc-aalst.be', clubBankNr: 'BE55 0016 5927 6744', adultMembership: '€125' } },
  players: [player(1, 'Piet', 'Voorzitter'), player(2, 'Mie', 'Secretaris')],
  playersQuitters: [player(3, 'Karel', 'Gestopt', { active: false, quitYear: 2023, contact: contact(3, 'Kerkstraat 12 bus 3', '9300 Aalst') })],
  clubs: [
    {
      id: 1,
      name: 'TTC Aalst',
      managers: [
        { playerId: 1, description: 'Chairman', sortOrder: 1 },
        { playerId: 2, description: 'Secretary', sortOrder: 2 },
      ],
    },
  ],
  user: { playerId: 1 },
};

const vttlMember = (extra: Partial<IVttlMember> = {}): IVttlMember => ({
  uniqueIndex: 512345,
  firstName: 'JAN',
  lastName: 'PEETERS',
  ranking: 'E6',
  club: 'OVL001',
  gender: 'M',
  birthDate: '1990-05-17T00:00:00',
  season: 23,
  ...extra,
});

const render = () => renderWithProviders(<AdminNewMember onEnd={vi.fn()} />, { preloadedState });

const searchVttl = async (name: string, result: IVttlMember[]) => {
  vi.spyOn(http, 'get').mockResolvedValue(result);
  fireEvent.change(screen.getByPlaceholderText('Naam'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Zoek VTTL' }));
  await waitFor(() => expect(http.get).toHaveBeenCalledWith('/membership/Vttl', { name }));
};

const formSelect = () => screen.getByDisplayValue(/aansluiting|Hernieuwing/) as HTMLSelectElement;

describe('AdminNewMember', () => {
  beforeEach(() => {
    vi.spyOn(pdf, 'createMembershipPdf').mockResolvedValue(new TextEncoder().encode('%PDF'));
  });
  afterEach(() => vi.restoreAllMocks());

  it('starts a first affiliation for an unknown name', () => {
    render();
    fireEvent.change(screen.getByPlaceholderText('Naam'), { target: { value: 'Jan Van den Broeck' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nieuw lid aanmaken' }));

    expect(formSelect().value).toBe('first');
    expect(screen.getByLabelText('Voornaam')).toHaveValue('Jan');
    expect(screen.getByLabelText('Achternaam')).toHaveValue('Van den Broeck');
  });

  it('prefills the board names', () => {
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Nieuw lid aanmaken' }));

    expect(screen.getByDisplayValue('Piet Voorzitter')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mie Secretaris')).toBeInTheDocument();
  });

  it('shows VTTL hits with the suggested form', async () => {
    render();
    await searchVttl('Peeters', [vttlMember(), vttlMember({ uniqueIndex: 2, firstName: 'AN', club: 'OVL002', season: 27 })]);

    const rows = screen.getAllByRole('row');
    expect(within(rows[1]!).getByText('Heraansluiting (min. 1 jaar onderbreking)')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Transfer!')).toBeInTheDocument();
  });

  it('prefills a reaffiliation from a VTTL hit', async () => {
    render();
    await searchVttl('Peeters', [vttlMember()]);

    fireEvent.click(screen.getByRole('button', { name: 'Kies' }));

    expect(formSelect().value).toBe('reaffiliation');
    expect(screen.getByLabelText('Voornaam')).toHaveValue('Jan');
    expect(screen.getByLabelText('Achternaam')).toHaveValue('Peeters');
    expect(screen.getByLabelText('Geboortedatum')).toHaveValue('1990-05-17');
    expect(screen.getByLabelText('Laatste seizoen VTTL')).toHaveValue('2022-2023');
  });

  it('prefills a quitter from our db and reactivates on save', async () => {
    render();
    vi.spyOn(http, 'get').mockResolvedValue(getEmptyMembership(3));
    fireEvent.change(screen.getByPlaceholderText('Naam'), { target: { value: 'Karel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kies' }));

    await screen.findByDisplayValue('Kerkstraat');
    expect(http.get).toHaveBeenCalledWith('/membership/3');
    expect(formSelect().value).toBe('reaffiliation');
    expect(screen.getByLabelText('Bus')).toHaveValue('3');
    expect(screen.getByLabelText('Postcode')).toHaveValue('9300');

    const post = vi.spyOn(http, 'post').mockImplementation(async (_url: string, data?: unknown) => data as never);
    fireEvent.click(screen.getByRole('button', { name: 'Bewaren' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/membership', expect.objectContaining({ playerId: 3, street: 'Kerkstraat' })));
    expect(post).toHaveBeenCalledWith(
      '/players/UpdatePlayer',
      expect.objectContaining({ id: 3, quitYear: null, contact: expect.objectContaining({ address: 'Kerkstraat 12 bus 3' }) }),
    );
  });

  it('emails the pdf to the member with the club in cc', async () => {
    render();
    fireEvent.click(screen.getByRole('button', { name: 'Nieuw lid aanmaken' }));
    fireEvent.change(screen.getByLabelText('Voornaam'), { target: { value: 'Jan' } });
    fireEvent.change(screen.getByLabelText('Achternaam'), { target: { value: 'Peeters' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jan@peeters.be' } });

    fireEvent.click(screen.getByRole('button', { name: /Mail naar lid/ }));
    expect(screen.getByLabelText('Aan')).toHaveValue('jan@peeters.be');
    expect(screen.getByLabelText('Cc')).toHaveValue('info@ttc-aalst.be');
    expect((await screen.findByTestId('editor')).textContent).toContain('BE55 0016 5927 6744');

    const post = vi.spyOn(http, 'post').mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Versturen' }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/membership/Email',
        expect.objectContaining({
          to: ['jan@peeters.be'],
          cc: ['info@ttc-aalst.be'],
          attachments: [{ fileName: 'eerste-aansluiting 2026-2027 Jan Peeters.pdf', base64: 'JVBERg==' }],
        }),
      ),
    );
  });
});
