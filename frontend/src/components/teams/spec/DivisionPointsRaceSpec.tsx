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

  it('draws a line per team once two weeks exist', () => {
    const { container } = renderRace([week(1, 'A', 3, OwnClubId), week(1, 'C', 0, 99), week(2, 'A', 6, OwnClubId), week(2, 'C', 3, 99)]);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('highlights only our team', () => {
    const { container } = renderRace([week(1, 'A', 3, OwnClubId), week(1, 'C', 0, 99), week(2, 'A', 6, OwnClubId), week(2, 'C', 3, 99)]);
    expect(container.querySelectorAll('polyline.highlighted')).toHaveLength(1);
  });

  it('highlights both of our teams when we have two in one division', () => {
    const { container } = renderRace([
      week(1, 'A', 3, OwnClubId),
      week(1, 'B', 1, OwnClubId),
      week(1, 'C', 0, 99),
      week(2, 'A', 6, OwnClubId),
      week(2, 'B', 2, OwnClubId),
      week(2, 'C', 3, 99),
    ]);
    expect(container.querySelectorAll('polyline.highlighted')).toHaveLength(2);
  });

  it('does not highlight another club that shares our team code', () => {
    const { container } = renderRace([week(1, 'A', 3, OwnClubId), week(1, 'A', 0, 99), week(2, 'A', 6, OwnClubId), week(2, 'A', 3, 99)]);
    expect(container.querySelectorAll('polyline.highlighted')).toHaveLength(1);
  });

  it('names the team and its points in the tooltip', () => {
    const { container } = renderRace([week(1, 'A', 3, OwnClubId), week(2, 'A', 6, OwnClubId)]);
    const titles = [...container.querySelectorAll('title')].map(t => t.textContent);
    expect(titles).toContain('Week 2: Team A - 6 punten');
  });
});
