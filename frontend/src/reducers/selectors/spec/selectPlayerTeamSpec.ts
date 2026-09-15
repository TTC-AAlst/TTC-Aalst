import { vi } from 'vitest';
import { selectPlayerTeam } from '../selectPlayerTeam';
import { IFullStoreMatchOwn, IMatchPlayer } from '../../../models/model-interfaces';
import type { RootState } from '../../../store';

vi.mock('../../../storeUtil', () => ({ default: { getPlayer: (playerId: number) => ({ id: playerId }) } }));

const TeamAId = 493;
const TeamBId = 494;

const player = (playerId: number, home: boolean): IMatchPlayer =>
  ({ playerId, home, position: 1, status: 'Major', uniqueIndex: playerId }) as unknown as IMatchPlayer;

const match = (id: number, players: IMatchPlayer[], extra: Partial<IFullStoreMatchOwn> = {}): IFullStoreMatchOwn =>
  ({
    id,
    competition: 'Sporta',
    isSyncedWithFrenoy: true,
    date: '2026-01-10T20:00:00',
    teamId: TeamAId,
    opponentTeamId: null,
    isHomeMatch: true,
    opponent: { clubId: 29, teamCode: 'B' },
    score: { home: 10, out: 0 },
    scoreType: 'Won',
    players,
    games: [],
    comments: [],
    ...extra,
  }) as unknown as IFullStoreMatchOwn;

const state = (matches: IFullStoreMatchOwn[]): RootState =>
  ({
    matches,
    teams: [
      { id: TeamAId, teamCode: 'A', competition: 'Sporta' },
      { id: TeamBId, teamCode: 'B', competition: 'Sporta' },
    ],
    teamRankings: {},
  }) as unknown as RootState;

describe('selectPlayerTeam', () => {
  it('picks the team the player turned out for most', () => {
    const matches = [match(1, [player(344, true)]), match(2, [player(344, true)], { teamId: TeamBId }), match(3, [player(344, true)], { teamId: TeamBId })];

    expect(selectPlayerTeam(state(matches), 344, 'Sporta')!.teamCode).toBe('B');
  });

  it('counts a derby for the team he actually played in', () => {
    const derby = match(1, [player(20, true), player(344, false)], { opponentTeamId: TeamBId, opponent: { clubId: 1, teamCode: 'B' } });

    expect(selectPlayerTeam(state([derby]), 344, 'Sporta')!.teamCode).toBe('B');
    expect(selectPlayerTeam(state([derby]), 20, 'Sporta')!.teamCode).toBe('A');
  });

  it('ignores another competition', () => {
    const matches = [match(1, [player(344, true)], { teamId: TeamBId, competition: 'Vttl' })];

    expect(selectPlayerTeam(state(matches), 344, 'Sporta')).toBeUndefined();
  });

  it('ignores a match that is not synced yet', () => {
    const matches = [match(1, [player(344, true)], { teamId: TeamBId, isSyncedWithFrenoy: false })];

    expect(selectPlayerTeam(state(matches), 344, 'Sporta')).toBeUndefined();
  });

  it('prefers the first team code on a tie', () => {
    const matches = [match(1, [player(344, true)]), match(2, [player(344, true)], { teamId: TeamBId })];

    expect(selectPlayerTeam(state(matches), 344, 'Sporta')!.teamCode).toBe('A');
  });
});
