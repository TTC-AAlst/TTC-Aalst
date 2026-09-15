import { LineChart } from '../controls/charts/LineChart';
import { Series } from '../controls/charts/chartScales';
import { useTtcSelector } from '../../utils/hooks/storeHooks';
import { hasEnoughWeeks } from '../../reducers/rankingHistoryReducer';

type DivisionPointsRaceProps = {
  divisionId: number;
  ownClubId: number;
  ownTeamCodes: string[];
};

export const DivisionPointsRace = ({ divisionId, ownClubId, ownTeamCodes }: DivisionPointsRaceProps) => {
  const weeks = useTtcSelector(state => state.rankingHistory.divisions[divisionId]) ?? [];

  if (!hasEnoughWeeks(weeks)) {
    return null;
  }

  const byTeam = new Map<string, Series>();
  weeks.forEach(w => {
    const key = `${w.clubId}-${w.teamCode}`;
    let series = byTeam.get(key);
    if (!series) {
      series = {
        label: w.teamName,
        highlighted: w.clubId === ownClubId && ownTeamCodes.includes(w.teamCode),
        points: [],
      };
      byTeam.set(key, series);
    }
    series.points.push({ x: w.week, y: w.points });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.x - b.x));

  return <LineChart series={series} formatTooltip={(s, p) => `Week ${p.x}: ${s.label} - ${p.y} punten`} />;
};
