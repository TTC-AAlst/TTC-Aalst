import { ViewMatchDetailsButton } from '../controls/ViewMatchDetailsButton';
import { IMatch } from '../../../models/model-interfaces';

type OpponentMatchScoreProps = {
  readonlyMatch: IMatch;
  /** Whose outcome to show: a derby is one match with a won and a lost side */
  ownTeamId: number;
};

export const OpponentMatchScore = ({ readonlyMatch, ownTeamId }: OpponentMatchScoreProps) => {
  if (readonlyMatch.isOurMatch) {
    const match = readonlyMatch.getOurMatch(ownTeamId);
    return <ViewMatchDetailsButton match={match} size="sm" />;
  }

  if (readonlyMatch.scoreType === 'WalkOver') {
    return <span>WO</span>;
  }

  if (!readonlyMatch.isSyncedWithFrenoy) {
    return null;
  }

  return (
    <span>
      {readonlyMatch.score.home} - {readonlyMatch.score.out}
    </span>
  );
};
