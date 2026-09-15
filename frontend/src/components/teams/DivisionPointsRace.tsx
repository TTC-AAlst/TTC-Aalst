import { LazyRaceChart } from '../controls/charts/LazyRaceChart';
import { useTtcSelector } from '../../utils/hooks/storeHooks';
import { hasEnoughWeeks } from '../../reducers/rankingHistoryReducer';
import { toDivisionSeries } from './divisionRaceSeries';

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

  return <LazyRaceChart series={toDivisionSeries(weeks, ownClubId, ownTeamCodes)} />;
};
