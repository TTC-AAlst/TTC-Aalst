import { LazyRaceChart } from '../controls/charts/LazyRaceChart';
import { useTtcSelector, selectTeams } from '../../utils/hooks/storeHooks';
import { hasEnoughWeeks } from '../../reducers/rankingHistoryReducer';
import { toPositionSeries } from './teamPositionSeries';
import { TeamPositionTooltip } from './TeamPositionTooltip';

export const DashboardTeamPositions = () => {
  const positions = useTtcSelector(state => state.rankingHistory.positions);
  const teams = useTtcSelector(selectTeams);

  if (!hasEnoughWeeks(positions)) {
    return null;
  }

  return (
    <LazyRaceChart
      series={toPositionSeries(positions, teams)}
      yInverted
      renderTooltip={(row, series, activeKey) => <TeamPositionTooltip row={row} series={series} activeKey={activeKey} />}
    />
  );
};
