import MatchModel from '../MatchModel';
import { IFullStoreMatchOwn, IMatchPlayer } from '../model-interfaces';

const OwnClubId = 1;

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

const match = (isHomeMatch: boolean, players: IMatchPlayer[]): MatchModel =>
  new MatchModel({
    id: 1,
    teamId: 493,
    isHomeMatch,
    opponent: { clubId: OwnClubId, teamCode: 'B' },
    comments: [],
    players,
    games: [{ id: 1, matchId: 1, matchNumber: 1, homePlayerUniqueIndex: 10, outPlayerUniqueIndex: 20, homePlayerSets: 3, outPlayerSets: 0, outcome: 'Won' }],
  } as unknown as IFullStoreMatchOwn);

describe('MatchModel.getGameMatches in a derby', () => {
  it('takes the home player for the home team', () => {
    const derby = match(true, [player(10, 67, true), player(20, 75, false)]);

    expect(derby.getGameMatches()[0]!.ownPlayer.playerId).toBe(67);
  });

  it('takes the away player for the away team', () => {
    const derby = match(false, [player(10, 67, false), player(20, 75, true)]);

    expect(derby.getGameMatches()[0]!.ownPlayer.playerId).toBe(75);
  });

  it('still takes the only known player when just one side is ours', () => {
    const awayMatch = match(false, [player(10, 0, false), player(20, 75, true)]);

    expect(awayMatch.getGameMatches()[0]!.ownPlayer.playerId).toBe(75);
  });
});
