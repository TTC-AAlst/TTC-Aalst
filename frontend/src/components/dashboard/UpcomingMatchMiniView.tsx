import { Link } from 'react-router-dom';
import { IMatch, IMatchPlayerInfo } from '../../models/model-interfaces';
import MatchVs from '../matches/Match/MatchVs';
import { PlayerLink } from '../players/controls/PlayerLink';
import { MatchBlock } from '../matches/Match/MatchBlock';
import { selectPlayers, selectUser, useTtcSelector } from '../../utils/hooks/storeHooks';
import { getPlayerFormation } from '../../models/utils/getPlayerFormation';
import t from '../../locales';
import { MatchDate } from '../matches/controls/MatchDate';

type UpcomingMatchMiniViewProps = {
  match: IMatch;
};

export const UpcomingMatchMiniView = ({ match }: UpcomingMatchMiniViewProps) => {
  const players = useTtcSelector(selectPlayers);
  const user = useTtcSelector(selectUser);

  const getPlayer = (playerId: number) => players.find(p => p.id === playerId);

  const formation = getPlayerFormation(match);
  const isUserInFinalFormation = user.playerId && formation.some(p => p.id === user.playerId);

  const renderFormation = () => {
    if (formation.length === 0) {
      return <div style={{ marginTop: 8, fontSize: '0.85em', color: '#999', fontStyle: 'italic' }}>Nog geen opstelling</div>;
    }

    const renderPlayerList = (playerList: IMatchPlayerInfo[]) =>
      playerList.map((ply, i) => {
        const player = getPlayer(ply.id);
        const ranking = player?.getCompetition(match.competition)?.ranking;
        return (
          <span key={ply.id} style={{ whiteSpace: 'nowrap' }}>
            {player ? <PlayerLink player={player}>{player.alias}</PlayerLink> : ply.player?.alias || 'Unknown'}
            {ranking && <small style={{ opacity: 0.7 }}> ({ranking})</small>}
            {i < playerList.length - 1 && ', '}
          </span>
        );
      });

    return (
      <div style={{ marginTop: 8, fontSize: '0.85em', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
        <MatchBlock block={match.block} displayNonBlocked={false} />
        {renderPlayerList(formation)}
      </div>
    );
  };

  return (
    <div
      style={{
        padding: 10,
        backgroundColor: isUserInFinalFormation ? '#F0F0F0' : '#fafafa',
        borderRadius: 4,
        border: isUserInFinalFormation ? '2px solid #4CAF50' : '1px solid #ddd',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <MatchVs match={match} withLinks withPosition ownTeamLink="main" />
          <div style={{ fontSize: '0.85em', color: '#666' }}>
            <MatchDate match={match} bigDisplayMinWidth={0} />
          </div>
        </div>
        <Link to={t.route('match', { matchId: match.id })} className="btn btn-outline-secondary btn-sm">
          {t('match.details')}
        </Link>
      </div>
      {renderFormation()}
    </div>
  );
};
