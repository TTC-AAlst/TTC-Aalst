import React from 'react';
import { Link } from 'react-router-dom';
import cn from 'classnames';
import { Icon } from '../controls/Icons/Icon';
import { TrophyIcon } from '../controls/Icons/TrophyIcon';
import { CommentIcon } from '../controls/Icons/CommentIcon';
import { IMatch } from '../../models/model-interfaces';
import { t } from '../../locales';
import { useViewport } from '../../utils/hooks/useViewport';

function getClassName(isHomeMatch: boolean, home: number, out: number): 'match-won' | 'match-lost' | 'match-draw' {
  if (home === out) {
    return 'match-draw';
  }
  let won = home > out;
  if (!isHomeMatch) {
    won = !won;
  }
  return won ? 'match-won' : 'match-lost';
}

type MatchScoreProps = {
  match: IMatch;
  style?: React.CSSProperties;
  className?: string;
  forceDisplay?: boolean;
  showComments?: boolean;
  showThrophy?: boolean;
  /** When true, don't wrap in a Link (useful when already inside a Link) */
  noLink?: boolean;
};

export const MatchScore = ({ showThrophy = true, noLink = false, ...props }: MatchScoreProps) => {
  const viewport = useViewport();

  let match: IMatch | undefined;
  match = props.match;

  // A walkover/forfait has no numeric score (0-0). Show "WO" rather than "0 - 0" or the
  // previous-encounter fallback. Neutral colour: the winning side isn't reliably known and
  // red/green would exclude colourblind readers.
  if (match.scoreType === 'WalkOver') {
    const woBadge = (
      <span className={cn('badge label-as-badge match-wo', { clickable: !noLink }, props.className)} style={props.style}>
        WO
      </span>
    );
    return noLink ? woBadge : <Link to={t.route('match', { matchId: match.id })}>{woBadge}</Link>;
  }

  if (!props.forceDisplay) {
    if (!match.score || (match.score.home === 0 && match.score.out === 0)) {
      match = match.getPreviousMatch();
      if (!match || !match.score || (match.score.home === 0 && match.score.out === 0)) {
        return null;
      }
      const classColor2 = getClassName(match.isHomeMatch, match.score.home, match.score.out);
      const badge = (
        <span className={cn('badge label-as-badge clickable', classColor2, props.className)} title={t('match.previousEncounterScore')} style={props.style}>
          <Icon fa="fa fa-long-arrow-left" style={{ marginRight: 7 }} />
          <span>{match.renderScore()}</span>
        </span>
      );
      if (noLink) {
        return badge;
      }
      return <Link to={t.route('match', { matchId: match.id })}>{badge}</Link>;
    }
  }

  const score = match.score || { home: 0, out: 0 };
  const classColor = getClassName(match.isHomeMatch, score.home, score.out);
  const badge = (
    <span className={cn('badge label-as-badge clickable', props.className, classColor)} style={props.style}>
      <span>
        {classColor === 'match-won' && viewport.width > 350 && showThrophy ? (
          <TrophyIcon style={{ marginRight: 7, fontWeight: 'normal' }} color="#FFE568" />
        ) : null}
        {`${score.home} - ${score.out}`}
        {props.showComments && (match.comments.length || match.description) ? (
          <CommentIcon style={{ marginLeft: 8 }} tooltip={t('match.scoreComment')} />
        ) : null}
      </span>
    </span>
  );
  if (noLink) {
    return badge;
  }
  return <Link to={t.route('match', { matchId: match.id })}>{badge}</Link>;
};
