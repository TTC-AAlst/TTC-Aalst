import { toDivisionSeries } from '../divisionRaceSeries';
import { DivisionRankingWeek } from '../../../reducers/rankingHistoryReducer';
import { SeriesColors } from '../../controls/charts/chartRows';

const OwnClubId = 1;

const week = (w: number, teamCode: string, clubId: number, points: number, position = 1): DivisionRankingWeek => ({
  week: w,
  weekDate: `2026-09-${7 + w * 7}T00:00:00`,
  position,
  points,
  gamesPlayed: w,
  clubId,
  teamCode,
  teamName: `Team ${teamCode}`,
});

describe('toDivisionSeries', () => {
  it('makes one series per team in the division', () => {
    const series = toDivisionSeries([week(1, 'A', OwnClubId, 3), week(1, 'C', 99, 0), week(2, 'A', OwnClubId, 6), week(2, 'C', 99, 3)], OwnClubId, ['A']);

    expect(series).toHaveLength(2);
    expect(series.map(s => s.label)).toEqual(['Team A', 'Team C']);
  });

  it('highlights our team and colours it', () => {
    const series = toDivisionSeries([week(1, 'A', OwnClubId, 3), week(1, 'C', 99, 0)], OwnClubId, ['A']);

    expect(series[0]).toMatchObject({ highlighted: true, color: SeriesColors[0] });
    expect(series[1]).toMatchObject({ highlighted: false, color: undefined });
  });

  it('gives both of our teams their own colour when we have two in one division', () => {
    const series = toDivisionSeries([week(1, 'A', OwnClubId, 3), week(1, 'B', OwnClubId, 1), week(1, 'C', 99, 0)], OwnClubId, ['A', 'B']);

    expect(series.filter(s => s.highlighted).map(s => s.color)).toEqual([SeriesColors[0], SeriesColors[1]]);
  });

  it('does not highlight another club that shares our team code', () => {
    const series = toDivisionSeries([week(1, 'A', OwnClubId, 3), week(1, 'A', 99, 0)], OwnClubId, ['A']);

    expect(series.filter(s => s.highlighted)).toHaveLength(1);
  });

  it('plots points against the monday of the week', () => {
    const series = toDivisionSeries([week(2, 'A', OwnClubId, 6)], OwnClubId, ['A']);

    expect(series[0]!.points).toEqual([{ weekDate: '2026-09-21T00:00:00', value: 6, note: '1e - 6 punten' }]);
  });

  it('orders the points chronologically', () => {
    const series = toDivisionSeries([week(2, 'A', OwnClubId, 6), week(1, 'A', OwnClubId, 3)], OwnClubId, ['A']);

    expect(series[0]!.points.map(p => p.value)).toEqual([3, 6]);
  });
});
