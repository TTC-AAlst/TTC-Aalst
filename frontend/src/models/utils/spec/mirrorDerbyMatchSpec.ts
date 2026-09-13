import { mirrorDerbyMatch } from '../mirrorDerbyMatch';
import { OwnClubId } from '../../ClubModel';
import { IFullStoreMatchOwn, IMatchGame, IMatchPlayer } from '../../model-interfaces';

const TeamAId = 493;
const TeamBId = 494;

const player = (playerId: number, home: boolean): IMatchPlayer =>
  ({
    id: playerId,
    matchId: 1,
    playerId,
    home,
    position: 1,
    name: '',
    alias: '',
    ranking: 'D6',
    uniqueIndex: playerId,
    won: 0,
    status: 'Major',
    statusNote: '',
  }) as IMatchPlayer;

const game = (outcome: IMatchGame['outcome']): IMatchGame =>
  ({ id: 1, matchId: 1, matchNumber: 1, homePlayerUniqueIndex: 1, outPlayerUniqueIndex: 2, homePlayerSets: 3, outPlayerSets: 1, outcome }) as IMatchGame;

const derby = (): IFullStoreMatchOwn =>
  ({
    id: 77,
    teamId: TeamAId,
    opponentTeamId: TeamBId,
    isHomeMatch: true,
    opponent: { clubId: OwnClubId, teamCode: 'B' },
    isDerby: true,
    score: { home: 7, out: 3 },
    scoreType: 'Won',
    players: [player(1, true), player(2, false)],
    games: [game('Won')],
  }) as unknown as IFullStoreMatchOwn;

describe('mirrorDerbyMatch', () => {
  it('swaps the two own teams', () => {
    const mirrored = mirrorDerbyMatch(derby(), 'A');
    expect(mirrored.teamId).toBe(TeamBId);
    expect(mirrored.opponentTeamId).toBe(TeamAId);
  });

  it('makes the home match an away match against the other own team', () => {
    const mirrored = mirrorDerbyMatch(derby(), 'A');
    expect(mirrored.isHomeMatch).toBe(false);
    expect(mirrored.opponent).toEqual({ clubId: OwnClubId, teamCode: 'A' });
  });

  it('keeps the score in home-away order but flips the outcome', () => {
    const mirrored = mirrorDerbyMatch(derby(), 'A');
    expect(mirrored.score).toEqual({ home: 7, out: 3 });
    expect(mirrored.scoreType).toBe('Lost');
    expect(mirrored.games[0]!.outcome).toBe('Lost');
  });

  it('leaves a draw, walkover and unplayed outcome alone', () => {
    const notPlayed = { ...derby(), scoreType: 'NotYetPlayed' as const, games: [game('Draw'), game('WalkOver'), game('NotYetPlayed')] };
    const mirrored = mirrorDerbyMatch(notPlayed, 'A');
    expect(mirrored.scoreType).toBe('NotYetPlayed');
    expect(mirrored.games.map(g => g.outcome)).toEqual(['Draw', 'WalkOver', 'NotYetPlayed']);
  });

  it('turns our players into theirs and back', () => {
    const mirrored = mirrorDerbyMatch(derby(), 'A');
    expect(mirrored.players.find(p => p.playerId === 1)!.home).toBe(false);
    expect(mirrored.players.find(p => p.playerId === 2)!.home).toBe(true);
  });

  it('does not touch the original', () => {
    const original = derby();
    mirrorDerbyMatch(original, 'A');
    expect(original.teamId).toBe(TeamAId);
    expect(original.players[0]!.home).toBe(true);
  });
});
