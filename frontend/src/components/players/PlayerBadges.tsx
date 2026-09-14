import React from 'react';
import { getPlayingStatusClass } from '../../models/PlayerModel';
import { PlayerLink } from './controls/PlayerLink';
import { CommentIcon } from '../controls/Icons/CommentIcon';
import { Icon } from '../controls/Icons/Icon';
import { Competition, IPlayer, MatchPlayerStatus, PickedPlayer } from '../../models/model-interfaces';
import { t } from '../../locales';

type PlayerCompetitionBadgeProps = {
  style?: React.CSSProperties;
  plyInfo: {
    matchPlayer: { status: MatchPlayerStatus };
    player: IPlayer;
  };
  competition: Competition;
  /** Other teams the player is also lined up for this playing week */
  conflictTeams?: string[];
};

export const PlayerCompetitionBadge = ({ plyInfo, competition, style = {}, conflictTeams }: PlayerCompetitionBadgeProps) => {
  const comp = plyInfo.player.getCompetition(competition);
  const color = conflictTeams?.length ? 'danger' : getPlayingStatusClass(plyInfo.matchPlayer.status) || 'primary';
  return (
    <PlayerLink player={plyInfo.player} className="clickable">
      <span
        className={`clickable badge label-as-badge bg-${color}`}
        key={plyInfo.player.id + plyInfo.matchPlayer.status}
        style={{ fontSize: 14, display: 'inline-block', ...style }}
      >
        {plyInfo.player.alias}
        {competition && comp ? <span style={{ marginLeft: 5, fontSize: 10 }}>{comp.ranking}</span> : null}
        {conflictTeams?.length ? (
          <Icon fa="fa fa-exclamation-triangle" style={{ marginLeft: 5, marginRight: 0 }} tooltip={t('match.plys.alsoPlaysIn', conflictTeams.join(', '))} />
        ) : null}
      </span>
    </PlayerLink>
  );
};

type PlayerCompetitionButtonProps = {
  plyInfo: PickedPlayer;
  onButtonClick: Function;
  isPicked: boolean;
  actionIconClass: string;
  style?: React.CSSProperties;
  competition: Competition;
};

export const PlayerCompetitionButton = ({ plyInfo, onButtonClick, isPicked, actionIconClass, style, competition }: PlayerCompetitionButtonProps) => {
  const { matchPlayer } = plyInfo;
  const comp = plyInfo.player.getCompetition(competition);
  return (
    <button
      type="button"
      key={plyInfo.player.id + matchPlayer.status}
      className={`btn btn-xs btn-${getPlayingStatusClass(matchPlayer.status) || 'outline-primary'}`}
      title={matchPlayer.statusNote}
      style={{ marginBottom: 5, ...style }}
      onClick={() => onButtonClick()}
    >
      {matchPlayer.statusNote ? <CommentIcon style={{ marginRight: 5, marginLeft: 0 }} /> : null}
      {plyInfo.player.alias}
      {competition && comp ? <span style={{ marginLeft: 5, fontSize: 10 }}>{comp.ranking}</span> : null}
      <Icon fa={actionIconClass} style={{ marginRight: 0, marginLeft: 5, visibility: isPicked ? undefined : 'hidden' }} />
    </button>
  );
};
