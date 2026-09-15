import { vi } from 'vitest';
import { renderWithProviders, TestRouter } from '../../../utils/test-utils';
import { DashboardGlobalTeamStats } from '../DashboardGlobalTeamStats';
import { TeamPositionWeek } from '../../../reducers/rankingHistoryReducer';

vi.mock('../../../storeUtil', () => ({
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

const pos = (teamId: number, week: number): TeamPositionWeek => ({ teamId, week, position: 3, teamsInDivision: 12 });

const renderStats = (positions: TeamPositionWeek[]) =>
  renderWithProviders(
    <TestRouter>
      <DashboardGlobalTeamStats />
    </TestRouter>,
    { preloadedState: { rankingHistory: { divisions: {}, positions } as never } },
  );

describe('DashboardGlobalTeamStats', () => {
  it('shows no tabs at all when there is no graph to show', () => {
    const { container } = renderStats([]);
    expect(container.querySelector('.nav-tabs')).toBeNull();
  });

  it('shows no tabs on a single week', () => {
    const { container } = renderStats([pos(1, 1)]);
    expect(container.querySelector('.nav-tabs')).toBeNull();
  });

  it('offers the graph tab once two weeks exist', () => {
    const { container } = renderStats([pos(1, 1), pos(1, 2)]);
    expect(container.querySelector('.nav-tabs')).not.toBeNull();
  });
});
