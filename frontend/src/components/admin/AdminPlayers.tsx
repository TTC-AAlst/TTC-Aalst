import { ReactElement, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Table from 'react-bootstrap/Table';
import Form from 'react-bootstrap/Form';
import { AdminPlayerForm } from './AdminPlayerForm';
import AdminChangePassword from './AdminChangePassword';
import { AdminBoardMembers } from './AdminBoardMembers';
import { AdminNewMember } from './membership/AdminNewMember';
import { ButtonStack } from '../controls/Buttons/ButtonStack';
import { EditButton } from '../controls/Buttons/EditButton';
import { Icon } from '../controls/Icons/Icon';
import { IPlayer, Competition } from '../../models/model-interfaces';
import { displayMobile } from '../../models/PlayerModel';
import { useViewport } from '../../utils/hooks/useViewport';
import { selectPlayers, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';
import { deletePlayer, fetchQuitters, frenoySync, updatePlayer } from '../../reducers/playersReducer';

const keepTrackOfPlayerKeys = false;

type Pages = 'active' | 'new-player' | 'Speler editeren' | 'set-password' | 'inactive' | 'bestuur';

export const AdminPlayers = () => {
  const [filter, setFilter] = useState<Pages>('active');
  const [playerFilter, setPlayerFilter] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<IPlayer | null>(null);
  const players = useTtcSelector(selectPlayers);
  const viewport = useViewport();
  const dispatch = useTtcDispatch();

  useEffect(() => {
    dispatch(fetchQuitters());
  }, [dispatch]);

  let playersContent: ReactElement | null = null;
  let otherContent: ReactElement | null = null;
  switch (filter) {
    case 'new-player':
      otherContent = <AdminNewMember onEnd={() => setFilter('active')} />;
      break;

    case 'Speler editeren':
      otherContent = <AdminPlayerForm player={selectedPlayer!} onEnd={() => setFilter('active')} />;
      break;

    case 'set-password':
      otherContent = <AdminChangePassword onEnd={() => setFilter('active')} />;
      break;

    case 'bestuur':
      otherContent = <AdminBoardMembers />;
      break;

    case 'inactive': {
      playersContent = <InactivesTable filter={playerFilter} />;
      break;
    }

    case 'active':
    default: {
      let activePlayers = players;
      if (playerFilter) {
        activePlayers = players.filter(x => x.name.toLowerCase().includes(playerFilter));
      }
      playersContent = (
        <ActivesTable
          players={activePlayers}
          onEditPlayer={ply => {
            setFilter('Speler editeren');
            setSelectedPlayer(ply);
          }}
        />
      );
      break;
    }
  }

  const viewsConfig = [
    { key: 'active', text: 'Spelers beheren' },
    { key: 'inactive', text: 'Activeren / Verwijderen' },
    { key: 'new-player', text: 'Nieuw lid' },
    { key: 'set-password', text: 'Paswoord reset' },
    { key: 'bestuur', text: 'Bestuur' },
  ];
  return (
    <div>
      <div style={{ marginTop: 5, marginLeft: 5 }}>
        <ButtonStack config={viewsConfig} small={viewport.width < 550} activeView={filter} onClick={newFilter => setFilter(newFilter as Pages)} />
      </div>
      <br />

      {playersContent ? (
        <div>
          <Form.Control placeholder="Zoek speler" onChange={e => setPlayerFilter(e.target.value.toLowerCase())} style={{ width: 200, marginLeft: 10 }} />

          <button type="button" className="btn btn-outline-secondary pull-right" style={{ marginRight: 15 }} onClick={() => dispatch(frenoySync())}>
            Frenoy Sync
          </button>

          {playersContent}
        </div>
      ) : (
        otherContent
      )}
    </div>
  );
};

function concatCompetitions(vttl: boolean, sporta: boolean): string {
  const comps: Competition[] = [];
  if (vttl) {
    comps.push('Vttl');
  }
  if (sporta) {
    comps.push('Sporta');
  }
  return comps.join(', ');
}

type ActivesTableProps = {
  players: IPlayer[];
  onEditPlayer: (player: IPlayer) => void;
};

const ActivesTable = ({ players, onEditPlayer }: ActivesTableProps) => {
  const dispatch = useTtcDispatch();
  return (
    <Table size="sm" hover>
      <thead>
        <tr>
          <th>Speler</th>
          <th className="d-none d-md-table-cell">Competities</th>
          <th className="d-none d-md-table-cell">Toegang</th>
          <th>Acties</th>
        </tr>
      </thead>
      <tbody>
        {players
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(ply => (
            <tr key={ply.id}>
              <td>
                <strong>{ply.name}</strong> <small className="d-none d-md-inline">({ply.alias})</small>
                <br />
                <small>
                  <a href={`mailto:${ply.contact.email}`}>{ply.contact.email}</a>
                  <span style={{ marginLeft: 20, marginRight: 20 }} className="d-none d-lg-inline">
                    {`${ply.contact.address}, ${ply.contact.city}`}
                  </span>
                  <br className="d-block d-lg-none" />
                  <span>{displayMobile(ply.contact.mobile)}</span>
                </small>
              </td>
              <td className="d-none d-md-table-cell">{concatCompetitions(!!ply.vttl, !!ply.sporta)}</td>
              <td className="d-none d-md-table-cell">{ply.security === 'Player' ? '' : ply.security}</td>
              <td>
                <EditButton onClick={() => onEditPlayer(ply)} style={{ fontSize: 26 }} />

                {keepTrackOfPlayerKeys ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    style={{ marginLeft: 5 }}
                    onClick={() => {
                      const newPlayer = {
                        ...ply,
                        hasKey: ply.hasKey === false ? null : !ply.hasKey,
                      };
                      dispatch(updatePlayer({ player: newPlayer }));
                    }}
                  >
                    <Icon fa="fa fa-key fa-2x" color={ply.hasKey ? 'green' : ply.hasKey === false ? 'red' : undefined} />
                  </button>
                ) : null}

                {!ply.vttl && !ply.sporta ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    style={{ marginLeft: 10 }}
                    onClick={() => {
                      const newPlayer = {
                        ...ply,
                        active: false,
                        quitYear: dayjs().year(),
                        security: 'Player' as const,
                      };
                      dispatch(updatePlayer({ player: newPlayer, switchActive: true }));
                    }}
                  >
                    <span className="d-none d-xl-inline">Recreant deactiveren</span>
                    <span className="d-inline d-xl-none">X</span>
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
};

type InactivesTableProps = {
  filter: string;
};

const InactivesTable = ({ filter }: InactivesTableProps) => {
  const dispatch = useTtcDispatch();
  const playersQuitters = useTtcSelector(state => state.playersQuitters);
  let quitters = playersQuitters;
  if (filter) {
    quitters = quitters.filter(x => `${x.firstName} ${x.lastName}`.toLowerCase().includes(filter));
  }

  return (
    <Table size="sm" hover>
      <thead>
        <tr>
          <th>Speler</th>
          <th className="d-none d-sm-table-cell">Alias</th>
          <th className="d-none d-sm-table-cell">Gestopt</th>
          <th>Acties</th>
        </tr>
      </thead>
      <tbody>
        {quitters
          .slice()
          .sort((a, b) => (b.quitYear || 0) - (a.quitYear || 0))
          .map(ply => (
            <tr key={ply.id}>
              <td>
                {ply.firstName} {ply.lastName}
              </td>
              <td className="d-none d-sm-table-cell">{ply.alias}</td>
              <td className="d-none d-sm-table-cell">{ply.quitYear}</td>
              <td>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    const newPlayer = {
                      ...ply,
                      active: true,
                      quitYear: null,
                      security: 'Player' as const,
                    };
                    dispatch(updatePlayer({ player: newPlayer, switchActive: true }));
                  }}
                >
                  Recreant activeren
                </button>

                <button
                  type="button"
                  style={{ marginLeft: 8 }}
                  className="btn btn-outline-secondary"
                  onClick={() => dispatch(deletePlayer({ playerId: ply.id }))}
                >
                  Permanent verwijderen
                </button>
              </td>
            </tr>
          ))}
      </tbody>
    </Table>
  );
};
