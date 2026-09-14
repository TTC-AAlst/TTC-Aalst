import { vi } from 'vitest';
import { IFullStoreMatchOwn } from '../models/model-interfaces';
import { OwnClubId } from '../models/ClubModel';

const TeamAId = 493;
const TeamBId = 494;

const derby = (): IFullStoreMatchOwn =>
  ({
    id: 77,
    teamId: TeamAId,
    opponentTeamId: TeamBId,
    isHomeMatch: true,
    opponent: { clubId: OwnClubId, teamCode: 'B' },
    score: { home: 10, out: 0 },
    scoreType: 'Won',
    comments: [],
    players: [],
    games: [],
  }) as unknown as IFullStoreMatchOwn;

const state = {
  matches: [derby()],
  teams: [
    { id: TeamAId, teamCode: 'A', competition: 'Sporta' },
    { id: TeamBId, teamCode: 'B', competition: 'Sporta' },
  ],
  teamRankings: {},
  clubs: [{ id: OwnClubId, name: 'TTC Aalst' }],
  players: [],
};

vi.mock('../store', () => ({ store: { getState: () => state } }));

const storeUtil = (await import('../storeUtil')).default;

describe('storeUtil.getMatch of a derby', () => {
  it('returns the stored view when no team is asked for', () => {
    const match = storeUtil.getMatch(77);
    expect(match.teamId).toBe(TeamAId);
    expect(match.scoreType).toBe('Won');
  });

  it('returns the losing view for the other own team', () => {
    const match = storeUtil.getMatch(77, TeamBId);
    expect(match.teamId).toBe(TeamBId);
    expect(match.isHomeMatch).toBe(false);
    expect(match.scoreType).toBe('Lost');
    expect(match.opponent).toEqual({ clubId: OwnClubId, teamCode: 'A' });
  });
});
