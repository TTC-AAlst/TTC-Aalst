import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../../store';
import storeUtil from '../../../storeUtil';
import PlayerLineup from '../PlayerLineup';
import http from '../../../utils/httpClient';

// Derby: Team A (home) vs Team B (away), both ours. Stored once from A's perspective.
const derby = {
  id: 5,
  frenoyMatchId: 'O12/008',
  shouldBePlayed: true,
  isSyncedWithFrenoy: false,
  week: 3,
  competition: 'Vttl',
  frenoyDivisionId: 1,
  date: dayjs().add(7, 'day').hour(20).toISOString(),
  teamId: 1,
  opponentTeamId: 2,
  isHomeMatch: true,
  description: '',
  reportPlayerId: 0,
  block: '',
  comments: [],
  opponent: { clubId: 1, teamCode: 'B' },
  score: { home: 0, out: 0 },
  scoreType: 'NotYetPlayed',
  isPlayed: false,
  formationComment: '',
  players: [],
  games: [],
};

beforeEach(() => {
  store.dispatch({ type: 'clubs/simpleLoaded', payload: [{ id: 1, name: 'Aalst' }] });
  store.dispatch({
    type: 'players/simpleLoaded',
    payload: [{ id: 1, active: true, alias: 'Me', vttl: { position: 1, ranking: 'B0', uniqueIndex: 1 }, sporta: null }],
  });
  store.dispatch({
    type: 'teams/simpleLoaded',
    payload: [
      { id: 1, competition: 'Vttl', teamCode: 'A', year: 2024, players: [] },
      { id: 2, competition: 'Vttl', teamCode: 'B', year: 2024, players: [{ playerId: 1 }] },
    ],
  });
  store.dispatch({ type: 'matches/simpleLoaded', payload: [derby] });
});

describe('PlayerLineup derby self-answer', () => {
  // A Team B player views the derby mirrored, so storing them on the home side flips them out of
  // their own formation and the row never colours. They must be stored on their physical side.
  it('posts the away side (home=false) for a Team B player', async () => {
    const post = vi.spyOn(http, 'post').mockResolvedValue(derby);

    // Team B player viewing their own lineup
    render(
      <Provider store={store}>
        <PlayerLineup teams={storeUtil.getTeams().filter(t => t.id === 2)} playerId={1} />
      </Provider>,
    );

    fireEvent.click(screen.getAllByText('SPELEN')[0]!);
    await waitFor(() => expect(post).toHaveBeenCalled());

    const body = post.mock.calls[0]![1] as { home: boolean };
    expect(body.home).toBe(false);
  });
});
