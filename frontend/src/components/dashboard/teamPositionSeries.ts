import { RaceSeries, SeriesColors } from '../controls/charts/chartRows';
import { TeamPositionWeek } from '../../reducers/rankingHistoryReducer';
import { ITeam } from '../../models/model-interfaces';

/**
 * Our teams are spread over both competitions, which do not play the same mondays.
 * Colour carries the competition; the end label carries the team, because nine
 * distinct hues would not stay apart for a colourblind reader.
 */
export function toPositionSeries(positions: TeamPositionWeek[], teams: ITeam[]): RaceSeries[] {
  const byTeam = new Map<number, RaceSeries>();

  positions.forEach(p => {
    let series = byTeam.get(p.teamId);
    if (!series) {
      const team = teams.find(t => t.id === p.teamId);
      series = {
        key: String(p.teamId),
        label: team ? `${team.competition} ${team.teamCode}` : String(p.teamId),
        highlighted: true,
        color: team?.competition === 'Sporta' ? SeriesColors[1] : SeriesColors[0],
        points: [],
      };
      byTeam.set(p.teamId, series);
    }
    series.points.push({ weekDate: p.weekDate, value: p.position, note: `${p.position}e van ${p.teamsInDivision}` });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.weekDate.localeCompare(b.weekDate)));
  return series;
}
