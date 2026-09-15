export type ISetScore = {
  home: number;
  out: number;
};

/**
 * Frenoy stores the sets of a game as "<setNr>|<points of the set's loser>", comma separated:
 * "1|-9,2|8,3|5,4|13" is 9-11, 11-8, 11-5, 15-13. Only VTTL fills this in; Sporta never does.
 */
export const parseSetScores = (scores: string | null | undefined): ISetScore[] => {
  if (!scores) {
    return [];
  }

  return scores
    .split(',')
    .map(set => {
      const points = set.split('|')[1]?.trim();
      if (!points || !/^-?\d+$/.test(points)) {
        return null;
      }

      const loser = Math.abs(parseInt(points, 10));
      const winner = Math.max(11, loser + 2);
      // A set lost 0-11 is stored as "-0", and parseInt('-0') is -0, which tests equal to 0.
      // Only the string still carries the sign.
      return points.startsWith('-') ? { home: loser, out: winner } : { home: winner, out: loser };
    })
    .filter((set): set is ISetScore => set !== null);
};
