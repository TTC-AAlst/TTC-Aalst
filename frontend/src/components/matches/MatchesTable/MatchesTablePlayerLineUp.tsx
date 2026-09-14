import { Table } from 'react-bootstrap';
import { IMatch, ITeam } from '../../../models/model-interfaces';
import { getTablePlayers, tableMatchViewportWidths } from './matchesTableUtil';
import { getPlayerFormation } from '../../../models/utils/getPlayerFormation';
import { MatchesTablePlayerLineUpHeader } from './MatchesTablePlayerLineUpHeader';
import {
  MatchesTablePlayerLineUpDateCell,
  MatchesTablePlayerLineUpFrenoyMatchIdCell,
  MatchesTablePlayerLineUpMatchBlockCell,
  MatchesTablePlayerLineUpMatchVsCell,
  MatchesTablePlayerLineUpPlayerPlayingCell,
} from './MatchesTablePlayerLineUpCells';
import { selectUser, useTtcSelector } from '../../../utils/hooks/storeHooks';

type MatchesTablePlayerLineUpProps = {
  team: ITeam;
  matches: IMatch[];
};

export const MatchesTablePlayerLineUp = ({ team, matches }: MatchesTablePlayerLineUpProps) => {
  const user = useTtcSelector(selectUser);
  const teamPlayers = getTablePlayers(team);

  return (
    <Table className="matches-table max-width-table">
      <MatchesTablePlayerLineUpHeader team={team} />
      {matches.map((match, i) => {
        const stripeColor = { backgroundColor: i % 2 === 0 ? '#f9f9f9' : undefined };
        const playerFormation = getPlayerFormation(match);
        const canSeeFormation = !!match.block || user.canEditMatchPlayers(match);

        return (
          <tbody key={match.id}>
            <tr key={match.id} style={stripeColor}>
              <MatchesTablePlayerLineUpDateCell match={match} team={team} bigDisplayMinWidth={tableMatchViewportWidths.other} />
              <MatchesTablePlayerLineUpFrenoyMatchIdCell match={match} />
              <MatchesTablePlayerLineUpMatchVsCell match={match} playerCount={canSeeFormation ? playerFormation.length : 0} />
              <MatchesTablePlayerLineUpMatchBlockCell match={match} displayNonBlocked={canSeeFormation} />
              {teamPlayers.map(ply => (
                <MatchesTablePlayerLineUpPlayerPlayingCell
                  key={ply.player.id}
                  display={canSeeFormation && playerFormation.some(formation => formation.id === ply.player.id)}
                  match={match}
                  player={ply.player}
                  team={team}
                />
              ))}
            </tr>
          </tbody>
        );
      })}
    </Table>
  );
};
