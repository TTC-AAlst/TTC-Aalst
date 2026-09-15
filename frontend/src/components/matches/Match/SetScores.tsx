import cn from 'classnames';
import { ISetScore } from '../../../models/utils/setScores';

type SetScoresProps = {
  sets: ISetScore[];
  /** Set scores are stored from the Frenoy home player's side: flip them for a player playing away */
  flip?: boolean;
  /** Run alongside whatever precedes them instead of on a line of their own */
  inline?: boolean;
};

export const SetScores = ({ sets, flip, inline }: SetScoresProps) => {
  if (!sets.length) {
    return null;
  }

  return (
    <div className={cn('set-scores', { 'set-scores-inline': inline })}>
      {sets.map((set, index) => {
        const [left, right] = flip ? [set.out, set.home] : [set.home, set.out];
        return (
          <span key={index} className={cn('set-score', left > right ? 'set-score-won' : 'set-score-lost')}>
            {left}-{right}
          </span>
        );
      })}
    </div>
  );
};
