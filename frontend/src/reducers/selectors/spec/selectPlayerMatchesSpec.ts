import { vi } from 'vitest';
import { selectPlayerMatches } from '../selectPlayerMatches';
import { OwnClubId } from '../../../models/ClubModel';
import { IFullStoreMatchOwn, IMatchPlayer } from '../../../models/model-interfaces';
import type { RootState } from '../../../store';

vi.mock('../../../storeUtil', () => ({ default: { getPlayer: (playerId: number) => ({ id: playerId }) } }));

const TeamAId = 493;
const TeamBId = 494;

const player = (playerId: number, home: boolean): IMatchPlayer =>
  ({ playerId, home, position: 1, status: 'Major', uniqueIndex: playerId }) as unknown as IMatchPlayer;

const derby = (): IFullStoreMatchOwn =>
  ({
    id: 77,
    competition: 'Sporta',
    isSyncedWithFrenoy: true,
    date: '2026-01-10T20:00:00',
    teamId: TeamAId,
    opponentTeamId: TeamBId,
    isHomeMatch: true,
    opponent: { clubId: OwnClubId, teamCode: 'B' },
    score: { home: 10, out: 0 },
    scoreType: 'Won',
    players: [player(20, true), player(344, false)],
    games: [],
    comments: [],
  }) as unknown as IFullStoreMatchOwn;

const awayMatch = (): IFullStoreMatchOwn =>
  ({
    ...derby(),
    id: 78,
    opponentTeamId: null,
    isHomeMatch: false,
    opponent: { clubId: 29, teamCode: 'B' },
    players: [player(344, true)],
  }) as unknown as IFullStoreMatchOwn;

const state = (): RootState =>
  ({
    matches: [derby(), awayMatch()],
    teams: [
      { id: TeamAId, teamCode: 'A', competition: 'Sporta' },
      { id: TeamBId, teamCode: 'B', competition: 'Sporta' },
    ],
  }) as unknown as RootState;

describe('selectPlayerMatches', () => {
  it('mirrors a derby for a player of the other own team', () => {
    const match = selectPlayerMatches(state(), 344).find(m => m.id === 77)!;

    expect(match.teamId).toBe(TeamBId);
    expect(match.isHomeMatch).toBe(false);
    expect(match.scoreType).toBe('Lost');
    expect(match.opponent).toEqual({ clubId: OwnClubId, teamCode: 'A' });
  });

  it('keeps the stored view for a player of match.teamId', () => {
    const match = selectPlayerMatches(state(), 20).find(m => m.id === 77)!;

    expect(match.teamId).toBe(TeamAId);
    expect(match.isHomeMatch).toBe(true);
    expect(match.scoreType).toBe('Won');
  });

  it('drops the matches the player was not in', () => {
    expect(selectPlayerMatches(state(), 20).map(m => m.id)).toEqual([77]);
    expect(selectPlayerMatches(state(), 344).map(m => m.id)).toEqual([77, 78]);
  });
});
