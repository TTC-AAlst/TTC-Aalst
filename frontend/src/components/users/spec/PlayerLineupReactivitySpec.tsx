import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../../store';
import storeUtil from '../../../storeUtil';
import PlayerLineup from '../PlayerLineup';
import http from '../../../utils/httpClient';

// PlayerLineup reads matches through storeUtil, not a selector, so answering a match must still
// repaint the row. This wires the component to the real store to catch a missing subscription.

const match = (players: unknown[]) => ({
  id: 5,
  frenoyMatchId: '1/5',
  shouldBePlayed: true,
  isSyncedWithFrenoy: false,
  week: 3,
  competition: 'Vttl',
  frenoyDivisionId: 1,
  date: dayjs().add(7, 'day').hour(20).toISOString(),
  teamId: 1,
  opponentTeamId: null,
  isHomeMatch: true,
  description: '',
  reportPlayerId: 0,
  block: '',
  comments: [],
  opponent: { clubId: 2, teamCode: 'X' },
  score: { home: 0, out: 0 },
  scoreType: 'NotYetPlayed',
  isPlayed: false,
  formationComment: '',
  players,
  games: [],
});

const playing = {
  id: 50,
  matchId: 5,
  playerId: 1,
  home: true,
  position: 1,
  ranking: 'B0',
  name: 'Me',
  alias: 'Me',
  uniqueIndex: 1,
  status: 'Play',
  statusNote: '',
  won: 0,
};

beforeEach(() => {
  store.dispatch({
    type: 'clubs/simpleLoaded',
    payload: [
      { id: 1, name: 'Aalst' },
      { id: 2, name: 'Opp' },
    ],
  });
  store.dispatch({
    type: 'players/simpleLoaded',
    payload: [{ id: 1, active: true, alias: 'Me', vttl: { position: 1, ranking: 'B0', uniqueIndex: 1 }, sporta: null }],
  });
  store.dispatch({ type: 'teams/simpleLoaded', payload: [{ id: 1, competition: 'Vttl', teamCode: 'A', year: 2024, players: [{ playerId: 1 }] }] });
  store.dispatch({ type: 'matches/simpleLoaded', payload: [match([])] });
});

describe('PlayerLineup reactivity', () => {
  it('colors the row after answering a match', async () => {
    vi.spyOn(http, 'post').mockResolvedValue(match([playing]));

    render(
      <Provider store={store}>
        <PlayerLineup teams={storeUtil.getTeams().filter(t => t.id === 1)} playerId={1} />
      </Provider>,
    );

    fireEvent.click(screen.getAllByText('SPELEN')[0]!);
    await waitFor(() => expect(http.post).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.querySelector('tr.table-success')).not.toBeNull();
  });
});
