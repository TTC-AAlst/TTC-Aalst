import { vi } from 'vitest';
import { renderWithProviders } from '../../../utils/test-utils';
import { DivisionPointsRace } from '../DivisionPointsRace';
import { DivisionRankingWeek } from '../../../reducers/rankingHistoryReducer';

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

const OwnClubId = 1;
const divisionId = 1957;

const week = (w: number, teamCode: string, points: number, clubId: number): DivisionRankingWeek => ({
  week: w,
  weekDate: `2026-09-${7 + w * 7}T00:00:00`,
  position: 1,
  points,
  gamesPlayed: w,
  clubId,
  teamCode,
  teamName: `Team ${teamCode}`,
});

const renderRace = (weeks: DivisionRankingWeek[]) =>
  renderWithProviders(<DivisionPointsRace divisionId={divisionId} ownClubId={OwnClubId} ownTeamCodes={['A', 'B']} />, {
    preloadedState: { rankingHistory: { divisions: { [divisionId]: weeks }, positions: [] } as never },
  });

describe('DivisionPointsRace', () => {
  it('renders nothing with no data at all', () => {
    const { container } = renderRace([]);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing with only one week', () => {
    const { container } = renderRace([week(1, 'A', 3, OwnClubId), week(1, 'C', 0, 99)]);
    expect(container.innerHTML).toBe('');
  });

  it('mounts the chart once two weeks exist', () => {
    const { container } = renderRace([week(1, 'A', 3, OwnClubId), week(1, 'C', 0, 99), week(2, 'A', 6, OwnClubId), week(2, 'C', 3, 99)]);
    expect(container.querySelector('.race-chart-loading')).toBeInTheDocument();
  });
});
