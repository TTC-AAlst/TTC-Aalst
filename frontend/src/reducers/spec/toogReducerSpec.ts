import { describe, it, expect } from 'vitest';
import toogReducer, { assignToog, fetchToogAssigned } from '../toogReducer';
import { IToogAdminDay, IToogAssignment } from '../../models/model-interfaces';

const day1 = '2026-10-10T00:00:00';
const day2 = '2026-10-17T00:00:00';
const pastDay = '2026-09-26T00:00:00';

describe('toogReducer assigned', () => {
  it('stores the fetched assignments', () => {
    const assigned: IToogAssignment[] = [{ date: day1, playerId: 1 }];
    const state = toogReducer(undefined, { type: fetchToogAssigned.fulfilled.type, payload: assigned });
    expect(state.assigned).toEqual(assigned);
  });

  it('follows the board assigning someone', () => {
    const initial = {
      mine: [],
      admin: [],
      assigned: [
        { date: pastDay, playerId: 3 },
        { date: day1, playerId: 1 },
      ],
    };
    const admin: IToogAdminDay[] = [
      { date: day1, homeTeamIds: [], availablePlayerIds: [], assignedPlayerId: null },
      { date: day2, homeTeamIds: [], availablePlayerIds: [], assignedPlayerId: 2 },
    ];

    const state = toogReducer(initial, { type: assignToog.fulfilled.type, payload: admin });

    expect(state.assigned).toEqual([
      { date: pastDay, playerId: 3 },
      { date: day2, playerId: 2 },
    ]);
  });
});
