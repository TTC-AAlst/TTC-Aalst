import { LazyRaceChart } from '../controls/charts/LazyRaceChart';
import { useTtcSelector } from '../../utils/hooks/storeHooks';
import { hasEnoughWeeks } from '../../reducers/rankingHistoryReducer';
import { toDivisionSeries } from './divisionRaceSeries';
import { DivisionRaceTooltip } from './DivisionRaceTooltip';

type DivisionPointsRaceProps = {
  divisionId: number;
  ownClubId: number;
  ownTeamCodes: string[];
  selectedKey?: string;
  onSelect?: (key: string | undefined) => void;
};

export const DivisionPointsRace = ({ divisionId, ownClubId, ownTeamCodes, selectedKey, onSelect }: DivisionPointsRaceProps) => {
  const weeks = useTtcSelector(state => state.rankingHistory.divisions[divisionId]) ?? [];

  if (!hasEnoughWeeks(weeks)) {
    return null;
  }

  return (
    <LazyRaceChart
      series={toDivisionSeries(weeks, ownClubId, ownTeamCodes)}
      selectedKey={selectedKey}
      onSelect={onSelect}
      renderTooltip={(row, series, activeKey) => <DivisionRaceTooltip row={row} series={series} activeKey={activeKey} />}
    />
  );
};
