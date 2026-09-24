import { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { PlayerAutoComplete } from '../players/PlayerAutoComplete';
import { PlayersImageGallery } from '../players/PlayersImageGallery';
import { teamPlayerType, ITeam, Competition, TeamPlayerType } from '../../models/model-interfaces';
import { frenoyTeamSync } from '../../reducers/matchesReducer';
import { fetchQuitters } from '../../reducers/playersReducer';
import { toggleTeamPlayer } from '../../reducers/teamsReducer';
import { selectPlayers, selectQuitters, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';

const AdminTeamPlayers = ({ team }: { team: ITeam }) => {
  const [role, setRole] = useState<TeamPlayerType>('Standard');
  const dispatch = useTtcDispatch();
  const players = useTtcSelector(selectPlayers);
  const quitters = useTtcSelector(selectQuitters);
  const quitTeamPlayers = team.players.filter(ply => !players.some(p => p.id === ply.playerId));

  const onToggleTeamPlayer = (playerId: number) => {
    dispatch(toggleTeamPlayer({ teamId: team.id, playerId, role }));
    setRole('Standard');
  };

  const renderPlayerSubtitle = (ply: { id: number }) => {
    const player = team.getPlayers().find(p => p.player.id === ply.id);
    return <span>{player ? player.type : null}</span>;
  };

  const teamCompetition = team.competition === 'Sporta' ? 'Sporta' : 'Vttl';
  return (
    <div style={{ paddingLeft: 10, paddingRight: 10 }}>
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <Card.Body>
          <h4>
            {team.renderOwnTeamTitle()}
            <Button style={{ marginLeft: 20 }} onClick={() => dispatch(frenoyTeamSync({ teamId: team.id }))}>
              Frenoy Sync
            </Button>
          </h4>

          <PlayersImageGallery players={team.getPlayers().map(ply => ply.player)} competition={team.competition} subtitle={renderPlayerSubtitle} forceSmall />

          <div style={{ clear: 'both' }} />

          {quitTeamPlayers.map(ply => (
            <Button
              key={ply.playerId}
              variant="danger"
              style={{ marginRight: 10, marginBottom: 10 }}
              onClick={() => dispatch(toggleTeamPlayer({ teamId: team.id, playerId: ply.playerId, role: ply.type }))}
            >
              {quitters.find(q => q.id === ply.playerId)?.alias ?? `#${ply.playerId}`} verwijderen
            </Button>
          ))}

          <Form.Select value={role} onChange={e => setRole(e.target.value as TeamPlayerType)} style={{ width: 100, marginRight: 10, display: 'inline-block' }}>
            {Object.values(teamPlayerType).map(r => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Form.Select>

          <div style={{ width: 250 }}>
            <PlayerAutoComplete
              selectPlayer={playerId => playerId !== 'system' && onToggleTeamPlayer(playerId)}
              label="Selecteer speler"
              competition={teamCompetition}
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

const AdminTeamsToolbar = ({ onFilterChange }: { onFilterChange: (comp: Competition) => void }) => (
  <div style={{ padding: 10 }}>
    <Button variant="info" style={{ marginRight: 10 }} onClick={() => onFilterChange('Vttl')}>
      Vttl
    </Button>
    <Button variant="info" style={{ marginRight: 10 }} onClick={() => onFilterChange('Sporta')}>
      Sporta
    </Button>
    <Button variant="info" onClick={() => onFilterChange('Jeugd')}>
      Jeugd
    </Button>
  </div>
);

const AdminTeams = ({ teams }: { teams: ITeam[] }) => {
  const [filter, setFilter] = useState<Competition>('Vttl');
  const dispatch = useTtcDispatch();

  useEffect(() => {
    dispatch(fetchQuitters());
  }, [dispatch]);

  return (
    <div>
      <AdminTeamsToolbar onFilterChange={setFilter} />
      {teams
        .filter(team => team.competition === filter)
        .sort((a, b) => a.teamCode.localeCompare(b.teamCode))
        .map(team => (
          <AdminTeamPlayers key={team.id} team={team} />
        ))}
    </div>
  );
};

export default AdminTeams;
