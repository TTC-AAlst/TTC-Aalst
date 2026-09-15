import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../../utils/test-utils';
import { Navigation } from '../HeaderNavigation';
import { IStorePlayer, IPlayerCompetition, IPlayerStyle } from '../../../../models/model-interfaces';
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

const createPlayer = (id: number, firstName: string, lastName: string): IStorePlayer => ({
  id,
  alias: firstName,
  firstName,
  lastName,
  active: true,
  vttl: {
    clubId: 1,
    competition: 'Vttl',
    frenoyLink: '',
    position: 1,
    ranking: 'B6',
    nextRanking: null,
    prediction: null,
    uniqueIndex: 100,
    rankingIndex: 1,
    rankingValue: 50,
  } as IPlayerCompetition,
  sporta: undefined,
  contact: { playerId: id, email: '', mobile: '', address: '', city: '' },
  style: { playerId: id, name: '', bestStroke: '' } as IPlayerStyle,
  quitYear: null,
  security: 'Player' as UserRoles,
  hasKey: false,
  imageVersion: 0,
});

const testPlayer = createPlayer(42, 'Wouter', 'Test');

describe('HeaderNavigation', () => {
  it('renders "Mijn spelerspagina" menu item when logged in', () => {
    renderWithProviders(
      <TestRouter>
        <Navigation navOpen closeNav={() => {}} />
      </TestRouter>,
      {
        preloadedState: {
          user: { playerId: 42, teams: [], security: [] },
          players: [testPlayer],
          matches: [],
          teams: [],
        },
      },
    );

    expect(screen.getByText('Mijn spelerspagina')).toBeInTheDocument();
  });

  it('renders "Bezoekerspagina" when logged in', () => {
    renderWithProviders(
      <TestRouter>
        <Navigation navOpen closeNav={() => {}} />
      </TestRouter>,
      {
        preloadedState: {
          user: { playerId: 42, teams: [], security: [] },
          players: [testPlayer],
          matches: [],
          teams: [],
        },
      },
    );

    expect(screen.getByText('Bezoekerspagina')).toBeInTheDocument();
  });

  it('does not render "Bezoekerspagina" when not logged in', () => {
    renderWithProviders(
      <TestRouter>
        <Navigation navOpen closeNav={() => {}} />
      </TestRouter>,
      {
        preloadedState: {
          user: { playerId: 0, teams: [], security: [] },
          players: [testPlayer],
          matches: [],
          teams: [],
        },
      },
    );

    expect(screen.queryByText('Bezoekerspagina')).not.toBeInTheDocument();
  });

  it('does not render "Mijn spelerspagina" when not logged in', () => {
    renderWithProviders(
      <TestRouter>
        <Navigation navOpen closeNav={() => {}} />
      </TestRouter>,
      {
        preloadedState: {
          user: { playerId: 0, teams: [], security: [] },
          players: [testPlayer],
          matches: [],
          teams: [],
        },
      },
    );

    expect(screen.queryByText('Mijn spelerspagina')).not.toBeInTheDocument();
  });
});
