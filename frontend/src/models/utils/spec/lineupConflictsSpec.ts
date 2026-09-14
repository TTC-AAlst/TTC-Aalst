import { conflictKey, findLineupConflicts } from '../lineupConflicts';
import { Competition, IMatch, IMatchPlayerInfo, MatchPlayerStatus } from '../../model-interfaces';

const plyInfo = (playerId: number, status: MatchPlayerStatus): IMatchPlayerInfo =>
  ({ id: playerId, player: { id: playerId, alias: `Ply${playerId}` }, matchPlayer: { status } }) as unknown as IMatchPlayerInfo;

type MatchOptions = {
  id: number;
  teamCode: string;
  week?: number;
  competition?: Competition;
  block?: MatchPlayerStatus | '';
  players?: IMatchPlayerInfo[];
  shouldBePlayed?: boolean;
  isSyncedWithFrenoy?: boolean;
};

const match = ({
  id,
  teamCode,
  week = 3,
  competition = 'Sporta',
  block = 'Captain',
  players = [],
  shouldBePlayed = true,
  isSyncedWithFrenoy = false,
}: MatchOptions): IMatch =>
  ({
    id,
    week,
    competition,
    block,
    shouldBePlayed,
    isSyncedWithFrenoy,
    getTeam: () => ({ teamCode }),
    getPlayerFormation: (filter: string) =>
      players.filter(ply => ply.matchPlayer.status === filter || (filter === 'onlyFinal' && ply.matchPlayer.status === 'Major')),
  }) as unknown as IMatch;

describe('findLineupConflicts', () => {
  it('flags a player picked for two teams in the same competition and week', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.get(conflictKey(1, 7))).toEqual(['Sporta B']);
    expect(conflicts.get(conflictKey(2, 7))).toEqual(['Sporta A']);
  });

  it('leaves a player picked once alone', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(8, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('allows the same player in another playing week', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', week: 3, players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', week: 4, players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('allows Sporta and Vttl in the same week', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', competition: 'Sporta', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'A', competition: 'Vttl', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('ignores a player who only said he is available', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Play')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('ignores a match that should not be played', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', shouldBePlayed: false, players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('flags the open match but not the one already synced with frenoy', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', isSyncedWithFrenoy: true, block: '', players: [plyInfo(7, 'Major')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.get(conflictKey(1, 7))).toBeUndefined();
    expect(conflicts.get(conflictKey(2, 7))).toEqual(['Sporta A']);
  });

  it('names every other team when a player is picked three times', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Captain')] }),
      match({ id: 3, teamCode: 'C', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.get(conflictKey(1, 7))).toEqual(['Sporta B', 'Sporta C']);
  });

  it('treats the two views on a derby as one match', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 1, teamCode: 'B', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('flags a player picked for two Major-blocked matches in the same week', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', block: 'Major', players: [plyInfo(7, 'Major')] }),
      match({ id: 2, teamCode: 'B', block: 'Major', players: [plyInfo(7, 'Major')] }),
    ]);

    expect(conflicts.get(conflictKey(1, 7))).toEqual(['Sporta B']);
    expect(conflicts.get(conflictKey(2, 7))).toEqual(['Sporta A']);
  });
});
