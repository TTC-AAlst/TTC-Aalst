import { vi } from 'vitest';
import { selectLineupConflicts } from '../storeHooks';
import { conflictKey } from '../../../models/utils/lineupConflicts';
import { OwnClubId } from '../../../models/ClubModel';
import { IFullStoreMatchOwn, IMatchPlayer } from '../../../models/model-interfaces';
import type { RootState } from '../../../store';

const { getPlayerMock } = vi.hoisted(() => ({
  getPlayerMock: vi.fn((playerId: number) => ({ id: playerId, alias: `Ply${playerId}`, getCompetition: () => ({ position: playerId }) })),
}));

// getTeam() logs a warning for a team without an id, so hand back a complete one
vi.mock('../../../storeUtil', () => ({
  default: {
    getTeam: (teamId: number) => ({ id: teamId, teamCode: teamId === 1 ? 'A' : 'B' }),
    getPlayer: getPlayerMock,
  },
}));

const player = (playerId: number, home: boolean): IMatchPlayer =>
  ({ id: playerId, matchId: 1, playerId, home, position: playerId, status: 'Captain', uniqueIndex: playerId }) as unknown as IMatchPlayer;

const derby = (): IFullStoreMatchOwn =>
  ({
    id: 1,
    week: 3,
    competition: 'Sporta',
    block: 'Captain',
    shouldBePlayed: true,
    isSyncedWithFrenoy: false,
    date: '2026-09-15T20:00:00',
    teamId: 1,
    opponentTeamId: 2,
    isHomeMatch: true,
    opponent: { clubId: OwnClubId, teamCode: 'B' },
    score: { home: 0, out: 0 },
    scoreType: 'NotYetPlayed',
    players: [player(7, true), player(8, false)],
    games: [],
    comments: [],
  }) as unknown as IFullStoreMatchOwn;

const otherMatch = (): IFullStoreMatchOwn =>
  ({
    ...derby(),
    id: 2,
    teamId: 1,
    opponentTeamId: null,
    opponent: { clubId: 999, teamCode: 'C' },
    players: [player(8, true)],
  }) as unknown as IFullStoreMatchOwn;

const state = (matches: IFullStoreMatchOwn[]): RootState =>
  ({
    matches,
    teams: [
      { id: 1, teamCode: 'A', competition: 'Sporta' },
      { id: 2, teamCode: 'B', competition: 'Sporta' },
    ],
  }) as unknown as RootState;

describe('selectLineupConflicts', () => {
  afterEach(() => {
    getPlayerMock.mockImplementation((playerId: number) => ({ id: playerId, alias: `Ply${playerId}`, getCompetition: () => ({ position: playerId }) }));
  });

  it('sees the away formation of a derby', () => {
    const conflicts = selectLineupConflicts(state([derby(), otherMatch()]));

    expect(conflicts.get(conflictKey(2, 8))).toEqual(['Sporta B']);
    expect(conflicts.get(conflictKey(1, 8))).toEqual(['Sporta A']);
  });

  it('still finds the conflict when the players slice has not loaded yet', () => {
    // storeUtil.getPlayer does players.find(...)! and yields a PlayerModel(undefined), id 0, for every player
    getPlayerMock.mockImplementation(() => ({ id: 0, alias: 'Unhydrated', getCompetition: () => ({ position: 0 }) }));

    const conflicts = selectLineupConflicts(state([derby(), otherMatch()]));

    expect(conflicts.get(conflictKey(2, 8))).toEqual(['Sporta B']);
  });
});
