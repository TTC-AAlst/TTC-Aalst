import { Table } from 'react-bootstrap';
import { IMatch, ITeam, PickedPlayer } from '../../../models/model-interfaces';
import { getTablePlayers, tableMatchViewportWidths } from './matchesTableUtil';
import { getPlayerFormation } from '../../../models/utils/getPlayerFormation';
import { selectLineupConflicts, selectUser, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { conflictKey } from '../../../models/utils/lineupConflicts';
import { useViewport } from '../../../utils/hooks/useViewport';
import { MatchesTablePlayerLineUpHeader } from './MatchesTablePlayerLineUpHeader';
import {
  MatchesTablePlayerLineUpDateCell,
  MatchesTablePlayerLineUpFrenoyMatchIdCell,
  MatchesTablePlayerLineUpMatchBlockCell,
  MatchesTablePlayerLineUpMatchVsCell,
  MatchesTablePlayerLineUpPlayerPlayingCell,
} from './MatchesTablePlayerLineUpCells';
import { getPlayingStatusClass } from '../../../models/PlayerModel';
import { PlayerCompetitionButton } from '../../players/PlayerBadges';

type MatchesTablePlayerLineUpProps = {
  team: ITeam;
  matches: IMatch[];
  tablePlayers: PickedPlayer[];
  onTablePlayerSelect: (players: PickedPlayer[], match: IMatch) => void;
};

export const MatchesTableEditPlayerLineUp = ({ team, matches, tablePlayers, onTablePlayerSelect }: MatchesTablePlayerLineUpProps) => {
  const user = useTtcSelector(selectUser);
  const conflicts = useTtcSelector(selectLineupConflicts);
  const viewport = useViewport();
  const teamPlayers = getTablePlayers(team);

  return (
    <Table className="matches-table max-width-table">
      <MatchesTablePlayerLineUpHeader team={team} />
      {matches.map(match => {
        const playerFormation = match.getPlayerFormation('Play');
        const majorOrCaptainFormation = getPlayerFormation(match);
        const canEditFormation = user.canEditMatchPlayers(match);

        return (
          <tbody key={match.id}>
            <tr key={match.id}>
              <MatchesTablePlayerLineUpDateCell match={match} team={team} bigDisplayMinWidth={tableMatchViewportWidths.other} />
              <MatchesTablePlayerLineUpFrenoyMatchIdCell match={match} />
              <MatchesTablePlayerLineUpMatchVsCell match={match} playerCount={canEditFormation ? tablePlayers.filter(x => x.matchId === match.id).length : 0} />
              <MatchesTablePlayerLineUpMatchBlockCell match={match} displayNonBlocked={canEditFormation} />
              {teamPlayers.map(ply => {
                if (!canEditFormation) {
                  return (
                    <MatchesTablePlayerLineUpPlayerPlayingCell
                      key={ply.player.id}
                      display={majorOrCaptainFormation.some(formation => formation.id === ply.player.id)}
                      match={match}
                      player={ply.player}
                      team={team}
                      conflictTeams={conflicts.get(conflictKey(match.id, ply.player.id))}
                    />
                  );
                }

                const playerDecision = playerFormation.find(frm => frm.id === ply.player.id);
                let decision = tablePlayers.find(x => x.matchId === match.id && x.player.id === ply.player.id);
                if (!decision) {
                  decision = {
                    id: ply.player.id,
                    matchId: match.id,
                    matchPlayer: { status: '', statusNote: '' },
                    player: ply.player,
                  };
                  if (playerDecision?.matchPlayer.statusNote) {
                    decision.matchPlayer.statusNote = `${playerDecision.player.alias}: ${playerDecision?.matchPlayer.statusNote}`;
                  }
                }

                const onButtonClick = () => {
                  const player = tablePlayers?.find(x => x.id === ply.player.id && x.matchId === match.id);
                  if (player) {
                    onTablePlayerSelect(
                      tablePlayers.filter(x => x !== player),
                      match,
                    );
                  } else {
                    const plyInfo = {
                      id: ply.player.id,
                      matchId: match.id,
                      player: ply.player,
                      matchPlayer: {
                        status: user.canManageTeams() ? ('Major' as const) : ('Captain' as const),
                        statusNote: '',
                      },
                    };
                    onTablePlayerSelect(tablePlayers.concat([plyInfo]), match);
                  }
                };
                return (
                  <td key={ply.player.id} className={`td-${getPlayingStatusClass(playerDecision?.matchPlayer.status)}`}>
                    <PlayerCompetitionButton
                      plyInfo={decision}
                      isPicked={!!decision.matchPlayer.status}
                      actionIconClass="fa fa-thumbs-o-up"
                      onButtonClick={onButtonClick}
                      competition={match.competition}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        );
      })}
      <tr>
        <td colSpan={viewport.width > tableMatchViewportWidths.frenoyMatchId ? 4 : 3}>&nbsp;</td>
        {teamPlayers.map(ply => {
          const played = matches.filter(match =>
            tablePlayers
              .filter(frm => frm.matchId === match.id && frm.id === ply.player.id)
              .find(frm => frm.matchPlayer.status === 'Captain' || frm.matchPlayer.status === 'Major'),
          );
          return (
            <td key={ply.player.id} style={{ textAlign: 'center', fontWeight: 'bold' }}>
              {played.length}
            </td>
          );
        })}
      </tr>
    </Table>
  );
};
