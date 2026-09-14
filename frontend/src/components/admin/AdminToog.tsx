import { useEffect } from 'react';
import dayjs from 'dayjs';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import { PlayerAutoComplete } from '../players/PlayerAutoComplete';
import { Icon } from '../controls/Icons/Icon';
import { t } from '../../locales';
import { assignToog, fetchToogAdmin } from '../../reducers/toogReducer';
import { selectPlayers, selectTeams, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';

export const AdminToog = () => {
  const dispatch = useTtcDispatch();
  const days = useTtcSelector(state => state.toog.admin);
  const players = useTtcSelector(selectPlayers);
  const teams = useTtcSelector(selectTeams);

  useEffect(() => {
    dispatch(fetchToogAdmin());
  }, [dispatch]);

  const playerName = (playerId: number) => players.find(ply => ply.id === playerId)?.alias ?? `#${playerId}`;
  const homeTeams = (teamIds: number[]) =>
    teams
      .filter(team => teamIds.includes(team.id))
      .map(team => team.renderOwnTeamTitle())
      .join(', ');

  return (
    <Table size="sm">
      <thead>
        <tr>
          <th>{t('common.date')}</th>
          <th>{t('admin.toog.homeTeams')}</th>
          <th>{t('admin.toog.volunteers')}</th>
          <th>{t('admin.toog.other')}</th>
        </tr>
      </thead>
      <tbody>
        {days.map(day => (
          <tr key={day.date} className={day.assignedPlayerId ? undefined : 'table-warning'}>
            <td>{dayjs(day.date).format('dd DD/MM')}</td>
            <td>{homeTeams(day.homeTeamIds)}</td>
            <td>
              {day.availablePlayerIds.map(availableId => (
                <Button
                  key={availableId}
                  size="sm"
                  style={{ marginRight: 5 }}
                  variant={day.assignedPlayerId === availableId ? 'success' : 'outline-secondary'}
                  onClick={() => dispatch(assignToog({ date: day.date, playerId: availableId }))}
                >
                  {playerName(availableId)}
                </Button>
              ))}
              {day.assignedPlayerId && !day.availablePlayerIds.includes(day.assignedPlayerId) ? (
                <Button size="sm" variant="success" style={{ marginRight: 5 }} disabled>
                  {playerName(day.assignedPlayerId)}
                </Button>
              ) : null}
              {day.assignedPlayerId ? (
                <Button size="sm" variant="link" aria-label={t('admin.toog.clear')} onClick={() => dispatch(assignToog({ date: day.date, playerId: null }))}>
                  <Icon fa="fa fa-times" />
                </Button>
              ) : null}
            </td>
            <td>
              <PlayerAutoComplete
                label={t('admin.toog.other')}
                selectPlayer={playerId => {
                  if (playerId !== 'system') {
                    dispatch(assignToog({ date: day.date, playerId }));
                  }
                }}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};
