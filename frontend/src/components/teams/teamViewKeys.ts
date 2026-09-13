import { IUser } from '../../models/UserModel';

/** The formation table is too wide to be usable on a small screen */
const matchesTableMinWidth = 1000;

export const getTeamViewKeys = (user: IUser, viewportWidth: number): string[] => {
  const viewKeys = ['main', 'week', 'matches', 'ranking', 'players'];
  if (user.playerId && viewportWidth > matchesTableMinWidth) {
    viewKeys.splice(3, 0, 'matchesTable');
  }
  return viewKeys;
};
