import { RaceSeries, SeriesColors } from '../controls/charts/chartRows';
import { DivisionRankingWeek } from '../../reducers/rankingHistoryReducer';
import { DivisionRacePoint } from './DivisionRaceTooltip';

/** A row identifies a team only by club *and* code: every division has an A team. */
export const divisionSeriesKey = (clubId: number, teamCode: string) => `${clubId}-${teamCode}`;

/**
 * Two of ours can share a division (Sporta A and B both play 1957), hence a colour each.
 */
export function toDivisionSeries(weeks: DivisionRankingWeek[], ownClubId: number, ownTeamCodes: string[]): RaceSeries<DivisionRacePoint>[] {
  const byTeam = new Map<string, RaceSeries<DivisionRacePoint>>();
  let ownCount = 0;

  weeks.forEach(w => {
    const key = divisionSeriesKey(w.clubId, w.teamCode);
    let series = byTeam.get(key);
    if (!series) {
      const isOurs = w.clubId === ownClubId && ownTeamCodes.includes(w.teamCode);
      series = {
        key,
        label: w.teamName,
        highlighted: isOurs,
        color: isOurs ? SeriesColors[ownCount++ % SeriesColors.length] : undefined,
        points: [],
      };
      byTeam.set(key, series);
    }
    series.points.push({ weekDate: w.weekDate, value: w.points, meta: { points: w.points } });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.weekDate.localeCompare(b.weekDate)));
  return series;
}
