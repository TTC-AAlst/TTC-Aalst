import Card from 'react-bootstrap/Card';
import { DivisionHeader } from '../../teams/controls/DivisionHeader';
import { PlayerIndividual } from './PlayerIndividual';
import { Competition, IPlayer } from '../../../models/model-interfaces';
import { useTtcSelector } from '../../../utils/hooks/storeHooks';
import { selectPlayerTeam } from '../../../reducers/selectors/selectPlayerTeam';

type PlayerCompetitionProps = {
  player: IPlayer;
  competition: Competition;
};

export const PlayerCompetition = ({ player, competition }: PlayerCompetitionProps) => {
  const endOfSeason = useTtcSelector(state => state.config.params.endOfSeason);
  const playedTeam = useTtcSelector(state => selectPlayerTeam(state, player.id, competition));
  const comp = player.getCompetition(competition);
  if (!comp.ranking) {
    return null;
  }

  const team = playedTeam ?? player.getTeam(competition);
  return (
    <Card>
      <Card.Header>
        <div style={{ fontSize: 22 }}>
          {competition} {team ? team.teamCode : null}
          {team ? (
            <span style={{ fontSize: 16, marginTop: 5 }} className="pull-right">
              <DivisionHeader team={team} withVictoryBadges={false} />
            </span>
          ) : null}
        </div>
      </Card.Header>

      <Card.Body>
        <PlayerIndividual player={player} competition={competition} />

        {endOfSeason && comp.nextRanking ? (
          <div>
            {comp.ranking !== comp.nextRanking ? (
              <span>
                <b>Nieuw klassement</b>:{comp.ranking}
                <i className="fa fa-long-arrow-right" style={{ marginLeft: 8, marginRight: 8 }} />
                {comp.nextRanking}
              </span>
            ) : (
              <span>
                <b>Behoud klassement</b>: {comp.nextRanking}
              </span>
            )}
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
};
