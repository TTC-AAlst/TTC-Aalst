import { RaceSeries, SeriesColors } from '../controls/charts/chartRows';
import { DivisionRankingWeek } from '../../reducers/rankingHistoryReducer';

/**
 * Every division has an A team, so a row is ours only when the club matches as well as the team code.
 * Two of ours can share a division (Sporta A and B both play 1957), hence a colour each.
 */
export function toDivisionSeries(weeks: DivisionRankingWeek[], ownClubId: number, ownTeamCodes: string[]): RaceSeries[] {
  const byTeam = new Map<string, RaceSeries>();
  let ownCount = 0;

  weeks.forEach(w => {
    const key = `${w.clubId}-${w.teamCode}`;
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
    series.points.push({ weekDate: w.weekDate, value: w.points, note: `${w.position}e - ${w.points} punten` });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.weekDate.localeCompare(b.weekDate)));
  return series;
}
