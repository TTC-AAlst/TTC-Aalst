import cn from 'classnames';
import { ISetScore } from '../../../models/utils/setScores';

type SetScoresProps = {
  sets: ISetScore[];
  /** Set scores are stored from the Frenoy home player's side: flip them for a player playing away */
  flip?: boolean;
  /** Whose side decides the won/lost colors. Defaults to the side shown first */
  ownSide?: 'home' | 'out';
  /** Run alongside whatever precedes them instead of on a line of their own */
  inline?: boolean;
};

export const SetScores = ({ sets, flip, ownSide, inline }: SetScoresProps) => {
  if (!sets.length) {
    return null;
  }

  const own = ownSide ?? (flip ? 'out' : 'home');
  const opponent = own === 'home' ? 'out' : 'home';
  const setsWon = sets.filter(set => set[own] > set[opponent]).length;

  return (
    <div className={cn('set-scores', { 'set-scores-inline': inline, 'set-scores-game-won': setsWon > sets.length - setsWon })}>
      {sets.map((set, index) => {
        const [left, right] = flip ? [set.out, set.home] : [set.home, set.out];
        return (
          <span key={index} className={cn('set-score', set[own] > set[opponent] ? 'set-score-won' : 'set-score-lost')}>
            {left}-{right}
          </span>
        );
      })}
    </div>
  );
};
