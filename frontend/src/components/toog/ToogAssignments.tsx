import { useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import Alert from 'react-bootstrap/Alert';
import { t } from '../../locales';
import { IToogAssignment } from '../../models/model-interfaces';
import { fetchToogAssigned } from '../../reducers/toogReducer';
import { selectPlayers, selectUser, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';

export const useToogAssignments = () => {
  const dispatch = useTtcDispatch();
  const user = useTtcSelector(selectUser);
  const assigned = useTtcSelector(state => state.toog.assigned);

  useEffect(() => {
    if (user.playerId) {
      dispatch(fetchToogAssigned());
    }
  }, [dispatch, user.playerId]);

  return user.playerId ? assigned : [];
};

export const getToogPlayer = <T extends { id: number }>(assigned: IToogAssignment[], players: T[], date: Dayjs): T | undefined => {
  const assignment = assigned.find(a => dayjs(a.date).isSame(date, 'day'));
  return assignment ? players.find(p => p.id === assignment.playerId) : undefined;
};

type ToogLinesProps = {
  /** Days with a home match */
  days: Dayjs[];
  showDate?: boolean;
};

export const ToogLines = ({ days, showDate = true }: ToogLinesProps) => {
  const assigned = useToogAssignments();
  const players = useTtcSelector(selectPlayers);

  const lines = days
    .filter((day, index) => days.findIndex(d => d.isSame(day, 'day')) === index)
    .sort((a, b) => a.valueOf() - b.valueOf())
    .map(day => ({ day, player: getToogPlayer(assigned, players, day) }))
    .filter(line => line.player);

  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="toog-lines" style={{ marginTop: 15 }}>
      {lines.map(({ day, player }) => (
        <div key={day.format('YYYY-MM-DD')}>
          <span role="img" aria-hidden="true">
            🍺
          </span>{' '}
          <strong>{t('week.toog')}</strong>
          {showDate ? ` ${day.format('ddd D/M')}` : ''}: {player!.alias}
        </div>
      ))}
    </div>
  );
};

/** Reminder for the logged in player at the toog in the coming two weeks */
export const MyToogNotice = () => {
  const assigned = useToogAssignments();
  const user = useTtcSelector(selectUser);

  const today = dayjs().startOf('day');
  const until = today.add(14, 'day').endOf('day');
  const myDays = assigned
    .filter(a => a.playerId === user.playerId)
    .map(a => dayjs(a.date))
    .filter(day => day.isBetween(today, until, 'day', '[]'))
    .sort((a, b) => a.valueOf() - b.valueOf());

  if (myDays.length === 0) {
    return null;
  }

  return (
    <Alert variant="warning" style={{ padding: '8px 12px', marginBottom: 8 }}>
      {myDays.map(day => (
        <div key={day.format('YYYY-MM-DD')}>
          <span role="img" aria-hidden="true">
            🍺
          </span>{' '}
          {t('dashboard.myToog', { day: day.format('dddd D/M') })}
        </div>
      ))}
    </Alert>
  );
};

type ToogBadgeProps = {
  alias?: string;
  color?: string;
};

export const ToogBadge = ({ alias, color = '#666' }: ToogBadgeProps) => {
  if (!alias) {
    return null;
  }

  return (
    <span className="toog-badge" title={t('week.toog')} style={{ marginLeft: 10, fontSize: '0.85em', color, whiteSpace: 'nowrap' }}>
      <span role="img" aria-hidden="true">
        🍺
      </span>{' '}
      {alias}
    </span>
  );
};
