import { IMatch, IMatchPlayerInfo } from '../model-interfaces';

/** The players picked for a match: the blocked formation, or the captain's draft when not blocked yet */
export const getPlayerFormation = (match: IMatch): IMatchPlayerInfo[] => {
  if (match.block === 'Major' || match.block === 'Captain') {
    return match.getPlayerFormation(match.block);
  }
  return match.getPlayerFormation('Captain');
};
