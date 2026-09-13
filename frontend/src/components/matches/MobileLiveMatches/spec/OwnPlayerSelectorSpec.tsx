import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../utils/test-utils';
import { OwnPlayerSelector } from '../OwnPlayerSelector';
import { IMatch, IStorePlayer, IPlayerCompetition, IPlayerStyle, IMatchPlayer, MatchPlayerStatus } from '../../../../models/model-interfaces';
import { UserRoles } from '../../../../models/UserModel';

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn(),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(),
}));

const mockMatchResponse = {
  id: 1,
  players: [],
  games: [],
  comments: [],
  isHomeMatch: true,
  shouldBePlayed: true,
  isSyncedWithFrenoy: false,
  competition: 'Vttl',
  date: '2026-02-19',
  score: { home: 0, out: 0 },
  scoreType: 'NotYetPlayed',
  isPlayed: false,
  formationComment: '',
  frenoyMatchId: '',
  week: 1,
  frenoyDivisionId: 1,
  teamId: 1,
  description: '',
  reportPlayerId: 0,
  block: '',
  isDerby: false,
  opponent: { clubId: 1, teamCode: 'A' },
};

mockPost.mockResolvedValue(mockMatchResponse);

vi.mock('../../../../utils/httpClient', () => ({
  default: {
    get: vi.fn().mockResolvedValue([]),
    post: mockPost,
  },
}));

const vttl = (pos: number, ranking: string, idx: number, val: number): IPlayerCompetition => ({
  clubId: 1,
  competition: 'Vttl' as const,
  frenoyLink: '',
  position: pos,
  ranking: ranking as IPlayerCompetition['ranking'],
  nextRanking: null,
  prediction: null,
  uniqueIndex: 100 + pos,
  rankingIndex: pos,
  rankingValue: val,
});

const ply = (id: number, alias: string, first: string, last: string, active: boolean, v?: IPlayerCompetition): IStorePlayer => ({
  id,
  alias,
  firstName: first,
  lastName: last,
  active,
  vttl: v,
  sporta: undefined,
  contact: { playerId: id, email: '', mobile: '', address: '', city: '' },
  style: { playerId: id, name: '', bestStroke: '' } as IPlayerStyle,
  quitYear: null,
  security: 'Player' as UserRoles,
  hasKey: false,
  imageVersion: 0,
});

const testPlayers: IStorePlayer[] = [
  ply(1, 'Jean-François', 'Jean-François', 'Dupont', true, vttl(1, 'B6', 101, 50)),
  ply(2, 'Marc', 'Marc', 'Peeters', true, vttl(2, 'C2', 102, 40)),
  ply(3, 'André', 'André', 'Van Damme', true, vttl(3, 'C6', 103, 30)),
  ply(4, 'Luc', 'Luc', 'Janssens', true, vttl(4, 'D0', 104, 20)),
  ply(5, 'Pieter', 'Pieter', 'De Smet', true, vttl(5, 'D2', 105, 10)),
  ply(6, 'Inactive', 'Inactive', 'Player', false, vttl(6, 'E0', 106, 5)),
  ply(7, 'NoRanking', 'NoRanking', 'Player', true),
];

const mockTeamMatches: IMatch[] = [];

const createMockMatch = (overrides: Partial<IMatch> = {}): IMatch =>
  ({
    id: 1,
    competition: 'Vttl',
    frenoyDivisionId: 1,
    teamId: 1,
    games: [],
    players: [],
    block: '' as MatchPlayerStatus | '',
    isSyncedWithFrenoy: false,
    opponent: { clubId: 10, teamCode: 'A' },
    date: { isBefore: () => false, clone: () => ({ subtract: () => ({ isBefore: () => true }) }) },
    getOwnPlayers: () => [] as IMatchPlayer[],
    getTheirPlayers: () => [] as IMatchPlayer[],
    getTeamPlayerCount: () => 4 as 3 | 4,
    getTeam: () => ({ getMatches: () => mockTeamMatches }),
    getPlayerFormation: () => [],
    ...overrides,
  }) as unknown as IMatch;

const defaultStoreState = {
  players: testPlayers,
};

describe('OwnPlayerSelector', () => {
  beforeEach(() => {
    mockPost.mockClear();
  });
  it('renders "Selecteer spelers" button when form is closed', () => {
    renderWithProviders(<OwnPlayerSelector match={createMockMatch()} />, { preloadedState: defaultStoreState });

    expect(screen.getByRole('button', { name: /selecteer spelers/i })).toBeInTheDocument();
  });

  it('shows player list when opened with data', () => {
    renderWithProviders(<OwnPlayerSelector match={createMockMatch()} initialOpen />, { preloadedState: defaultStoreState });

    expect(screen.getByText('Jean-François')).toBeInTheDocument();
    expect(screen.getByText('B6')).toBeInTheDocument();
    expect(screen.getByText('Marc')).toBeInTheDocument();
    expect(screen.getByText('Pieter')).toBeInTheDocument();
  });

  it('filters players with latinize search (accent-insensitive)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OwnPlayerSelector match={createMockMatch()} initialOpen />, { preloadedState: defaultStoreState });

    const searchInput = screen.getByPlaceholderText('Zoeken...');
    await user.type(searchInput, 'francois');

    expect(screen.getByText('Jean-François')).toBeInTheDocument();
    expect(screen.queryByText('Marc')).not.toBeInTheDocument();
  });

  it('toggles player selection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OwnPlayerSelector match={createMockMatch()} initialOpen />, { preloadedState: defaultStoreState });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]!).not.toBeChecked();

    await user.click(checkboxes[0]!);
    expect(checkboxes[0]!).toBeChecked();

    await user.click(checkboxes[0]!);
    expect(checkboxes[0]!).not.toBeChecked();
  });

  it('disables excess players when max reached', async () => {
    const match = createMockMatch({ getTeamPlayerCount: () => 2 as 3 | 4 });
    const user = userEvent.setup();
    renderWithProviders(<OwnPlayerSelector match={match} initialOpen />, { preloadedState: defaultStoreState });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);

    expect(checkboxes[2]!).toBeDisabled();
  });

  it('pre-selects players matching match.block status', () => {
    const match = createMockMatch({
      block: 'Captain' as MatchPlayerStatus,
      getOwnPlayers: () =>
        [
          { playerId: 1, status: 'Captain', home: true, position: 1 },
          { playerId: 3, status: 'Captain', home: true, position: 2 },
          { playerId: 5, status: 'Play', home: true, position: 3 },
        ] as unknown as IMatchPlayer[],
    });

    renderWithProviders(<OwnPlayerSelector match={match} initialOpen />, { preloadedState: defaultStoreState });

    const checkboxes = screen.getAllByRole('checkbox');
    const checkedBoxes = checkboxes.filter(cb => (cb as HTMLInputElement).checked);
    expect(checkedBoxes).toHaveLength(2);
  });

  it('sorts selected players to top of list', () => {
    const match = createMockMatch({
      block: 'Captain' as MatchPlayerStatus,
      getOwnPlayers: () => [{ playerId: 5, status: 'Captain', home: true, position: 1 }] as unknown as IMatchPlayer[],
    });

    renderWithProviders(<OwnPlayerSelector match={match} initialOpen />, { preloadedState: defaultStoreState });

    const labels = screen.getAllByText(/Jean-François|Marc|André|Luc|Pieter/);
    expect(labels[0]).toHaveTextContent('Pieter');
  });

  it('auto-saves when reaching required player count', async () => {
    const match = createMockMatch({ getTeamPlayerCount: () => 2 as 3 | 4 });
    const user = userEvent.setup();
    renderWithProviders(<OwnPlayerSelector match={match} initialOpen />, { preloadedState: defaultStoreState });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /selecteer spelers/i })).toBeInTheDocument();
    });

    expect(mockPost).toHaveBeenCalledWith('/matches/EditMatchPlayers', {
      matchId: 1,
      teamId: 1,
      playerIds: [1, 2],
      blockAlso: true,
      newStatus: 'Major',
      comment: '',
    });
  });

  it('cancel button closes form and resets state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OwnPlayerSelector match={createMockMatch()} initialOpen />, { preloadedState: defaultStoreState });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]!);

    const cancelButton = screen.getByRole('button', { name: /annuleren/i });
    await user.click(cancelButton);

    expect(screen.getByRole('button', { name: /selecteer spelers/i })).toBeInTheDocument();
  });

  it('only shows active players with competition ranking', () => {
    renderWithProviders(<OwnPlayerSelector match={createMockMatch()} initialOpen />, { preloadedState: defaultStoreState });

    // 5 active players with vttl ranking should be shown
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(5);

    // Inactive player and no-ranking player should not appear
    expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
    expect(screen.queryByText('NoRanking')).not.toBeInTheDocument();
  });
});
