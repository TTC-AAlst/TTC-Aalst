import { LineChart } from '../controls/charts/LineChart';
import { Series } from '../controls/charts/chartScales';
import { useTtcSelector, selectTeams } from '../../utils/hooks/storeHooks';

const MinimumWeeksToPlot = 2;

export const DashboardTeamPositions = () => {
  const positions = useTtcSelector(state => state.rankingHistory.positions);
  const teams = useTtcSelector(selectTeams);

  const distinctWeeks = new Set(positions.map(p => p.week));
  if (distinctWeeks.size < MinimumWeeksToPlot) {
    return null;
  }

  // A division can lose a team mid-season, so its size belongs to the week, not the team.
  const sizeByLabelAndWeek = new Map<string, number>();
  const byTeam = new Map<number, Series>();
  positions.forEach(p => {
    let series = byTeam.get(p.teamId);
    if (!series) {
      const team = teams.find(t => t.id === p.teamId);
      series = {
        label: team ? `${team.competition} ${team.teamCode}` : String(p.teamId),
        highlighted: true,
        points: [],
      };
      byTeam.set(p.teamId, series);
    }
    sizeByLabelAndWeek.set(`${series.label}-${p.week}`, p.teamsInDivision);
    series.points.push({ x: p.week, y: p.position });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.x - b.x));

  return (
    <LineChart series={series} yInverted formatTooltip={(s, p) => `Week ${p.x}: ${s.label} - ${p.y}e van ${sizeByLabelAndWeek.get(`${s.label}-${p.x}`)}`} />
  );
};
