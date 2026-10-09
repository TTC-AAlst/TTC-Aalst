import { useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { t } from '../../locales';
import { IToogAssignment } from '../../models/model-interfaces';
import { fetchToogAssigned } from '../../reducers/toogReducer';
import { selectPlayers, selectUser, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';

const useToogAssignments = () => {
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
