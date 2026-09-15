import MatchModel from '../MatchModel';
import { IFullStoreMatchOwn, IMatchPlayer } from '../model-interfaces';

const player = (uniqueIndex: number, playerId: number, home: boolean): IMatchPlayer =>
  ({
    id: uniqueIndex,
    matchId: 1,
    playerId,
    home,
    uniqueIndex,
    position: 1,
    name: `ply${playerId}`,
    alias: '',
    ranking: 'D6',
    won: 0,
    status: 'Major',
    statusNote: '',
  }) as IMatchPlayer;

const match = (scores: string | undefined): MatchModel =>
  new MatchModel({
    id: 1,
    teamId: 493,
    isHomeMatch: true,
    opponent: { clubId: 2, teamCode: 'B' },
    comments: [],
    players: [player(10, 67, true), player(20, 0, false)],
    games: [
      { id: 1, matchId: 1, matchNumber: 1, homePlayerUniqueIndex: 10, outPlayerUniqueIndex: 20, homePlayerSets: 3, outPlayerSets: 1, outcome: 'Won', scores },
    ],
  } as unknown as IFullStoreMatchOwn);

describe('MatchModel.getGameMatches set scores', () => {
  it('decodes the set scores of a game', () => {
    expect(match('1|-9,2|8,3|5,4|13').getGameMatches()[0]!.setScores).toEqual([
      { home: 9, out: 11 },
      { home: 11, out: 8 },
      { home: 11, out: 5 },
      { home: 15, out: 13 },
    ]);
  });

  it('has no set scores for a game without them', () => {
    expect(match(undefined).getGameMatches()[0]!.setScores).toEqual([]);
  });
});
