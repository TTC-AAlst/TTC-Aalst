import { parseSetScores } from '../setScores';

describe('parseSetScores', () => {
  it('returns nothing when the game has no set scores', () => {
    expect(parseSetScores(null)).toEqual([]);
    expect(parseSetScores(undefined)).toEqual([]);
    expect(parseSetScores('')).toEqual([]);
  });

  it('reads a positive number as a set won by the home player', () => {
    expect(parseSetScores('1|8,2|8,3|9')).toEqual([
      { home: 11, out: 8 },
      { home: 11, out: 8 },
      { home: 11, out: 9 },
    ]);
  });

  it('reads a negative number as a set won by the away player', () => {
    expect(parseSetScores('1|-9,2|8')).toEqual([
      { home: 9, out: 11 },
      { home: 11, out: 8 },
    ]);
  });

  it('gives the winner two more points than the loser from 10 onwards', () => {
    expect(parseSetScores('1|10,2|13,3|17')).toEqual([
      { home: 12, out: 10 },
      { home: 15, out: 13 },
      { home: 19, out: 17 },
    ]);
  });

  it('awards a -0 set to the away player', () => {
    expect(parseSetScores('1|-0')).toEqual([{ home: 0, out: 11 }]);
  });

  it('awards a 0 set to the home player', () => {
    expect(parseSetScores('1|0')).toEqual([{ home: 11, out: 0 }]);
  });

  it('skips sets it cannot read', () => {
    expect(parseSetScores('1|8,rubbish,3|')).toEqual([{ home: 11, out: 8 }]);
  });
});
