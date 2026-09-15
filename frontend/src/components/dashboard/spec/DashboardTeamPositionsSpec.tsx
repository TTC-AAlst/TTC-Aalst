import { vi } from 'vitest';
import { renderWithProviders } from '../../../utils/test-utils';
import { DashboardTeamPositions } from '../DashboardTeamPositions';
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

const pos = (teamId: number, week: number, position: number, teamsInDivision: number): TeamPositionWeek => ({
  teamId,
  week,
  weekDate: `2026-09-${7 + week * 7}T00:00:00`,
  position,
  teamsInDivision,
  gamesWon: 0,
  gamesLost: 0,
  gamesDraw: 0,
});

const renderPositions = (positions: TeamPositionWeek[]) =>
  renderWithProviders(<DashboardTeamPositions />, {
    preloadedState: { rankingHistory: { divisions: {}, positions } as never },
  });

describe('DashboardTeamPositions', () => {
  it('renders nothing without data', () => {
    const { container } = renderPositions([]);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing with only one week', () => {
    const { container } = renderPositions([pos(1, 1, 3, 12)]);
    expect(container.innerHTML).toBe('');
  });

  it('mounts the chart once two weeks exist', () => {
    const { container } = renderPositions([pos(1, 1, 3, 12), pos(1, 2, 2, 12), pos(2, 1, 8, 10), pos(2, 2, 9, 10)]);
    expect(container.querySelector('.race-chart-loading')).toBeInTheDocument();
  });
});
