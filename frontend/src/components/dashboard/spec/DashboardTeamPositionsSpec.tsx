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
  position,
  teamsInDivision,
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

  it('draws one line per team', () => {
    const { container } = renderPositions([pos(1, 1, 3, 12), pos(1, 2, 2, 12), pos(2, 1, 8, 10), pos(2, 2, 9, 10)]);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('highlights every line, since they are all ours', () => {
    const { container } = renderPositions([pos(1, 1, 3, 12), pos(1, 2, 2, 12), pos(2, 1, 8, 10), pos(2, 2, 9, 10)]);
    expect(container.querySelectorAll('polyline.highlighted')).toHaveLength(2);
  });

  it('keeps each week own division size when a team drops out', () => {
    const { container } = renderPositions([pos(1, 1, 3, 12), pos(1, 2, 3, 11)]);
    const titles = [...container.querySelectorAll('title')].map(t => t.textContent);
    expect(titles).toContain('Week 1: 1 - 3e van 12');
    expect(titles).toContain('Week 2: 1 - 3e van 11');
  });

  it('puts each team own division size in the tooltip', () => {
    const { container } = renderPositions([pos(1, 1, 3, 12), pos(1, 2, 2, 12), pos(2, 1, 8, 10), pos(2, 2, 9, 10)]);
    const titles = [...container.querySelectorAll('title')].map(t => t.textContent);
    expect(titles.some(t => t?.includes('van 12'))).toBe(true);
    expect(titles.some(t => t?.includes('van 10'))).toBe(true);
  });
});
