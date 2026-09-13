import { getTeamViewKeys } from '../teamViewKeys';
import { IUser } from '../../../models/UserModel';

const user = (playerId: number): IUser => ({ playerId }) as IUser;

describe('getTeamViewKeys', () => {
  it('offers the formation table to any logged in player', () => {
    expect(getTeamViewKeys(user(42), 1200)).toContain('matchesTable');
  });

  it('hides the formation table from anonymous visitors', () => {
    expect(getTeamViewKeys(user(0), 1200)).not.toContain('matchesTable');
  });

  it('hides the formation table on screens too narrow for it', () => {
    expect(getTeamViewKeys(user(42), 800)).not.toContain('matchesTable');
  });

  it('puts the formation table right after the matches', () => {
    expect(getTeamViewKeys(user(42), 1200)).toEqual(['main', 'week', 'matches', 'matchesTable', 'ranking', 'players']);
  });
});
