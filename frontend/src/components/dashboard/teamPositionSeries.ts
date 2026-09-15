import { RaceSeries, SeriesColors } from '../controls/charts/chartRows';
import { TeamPositionWeek } from '../../reducers/rankingHistoryReducer';
import { ITeam } from '../../models/model-interfaces';
import { TeamPositionPoint } from './TeamPositionTooltip';

/**
 * Our teams are spread over both competitions, which do not play the same mondays.
 * Colour carries the competition; the end label carries the team, because nine
 * distinct hues would not stay apart for a colourblind reader.
 *
 * Nothing is highlighted by default: every line here is ours, so emphasising them
 * all emphasises nothing, and the field would flicker as the mouse leaves a line.
 */
export function toPositionSeries(positions: TeamPositionWeek[], teams: ITeam[]): RaceSeries<TeamPositionPoint>[] {
  const byTeam = new Map<number, RaceSeries<TeamPositionPoint>>();

  positions.forEach(p => {
    const team = teams.find(t => t.id === p.teamId);
    let series = byTeam.get(p.teamId);
    if (!series) {
      series = {
        key: String(p.teamId),
        label: team ? `${team.competition} ${team.teamCode}` : String(p.teamId),
        highlighted: false,
        color: team?.competition === 'Sporta' ? SeriesColors[1] : SeriesColors[0],
        points: [],
      };
      byTeam.set(p.teamId, series);
    }
    series.points.push({
      weekDate: p.weekDate,
      value: p.position,
      meta: {
        week: p.week,
        position: p.position,
        teamsInDivision: p.teamsInDivision,
        division: team?.getDivisionDescription() ?? '',
        gamesWon: p.gamesWon,
        gamesLost: p.gamesLost,
        gamesDraw: p.gamesDraw,
      },
    });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.weekDate.localeCompare(b.weekDate)));
  return series;
}
