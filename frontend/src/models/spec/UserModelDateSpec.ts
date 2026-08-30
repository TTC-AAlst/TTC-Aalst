import dayjs from 'dayjs';
import { vi } from 'vitest';
import storeUtil from '../../storeUtil';
import UserModel from '../UserModel';
import { IMatch } from '../model-interfaces';

vi.mock('../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getPlayer: vi.fn(),
  },
}));

const createUser = (playerId: number, securityRoles: string[] = []) => new UserModel({ playerId, teams: [], security: securityRoles });

const createMatchStub = (date: dayjs.Dayjs): IMatch =>
  ({
    date,
  }) as unknown as IMatch;

describe('UserModel.canEditFormation', () => {
  it('allows a board member to edit days before the match', () => {
    const user = createUser(1, ['CAN_MANAGETEAM']);
    expect(user.canEditFormation(createMatchStub(dayjs().add(5, 'day')))).toBe(true);
  });

  it('allows an admin to edit days before the match', () => {
    const user = createUser(1, ['IS_ADMIN']);
    expect(user.canEditFormation(createMatchStub(dayjs().add(5, 'day')))).toBe(true);
  });

  it('allows a captain of one of his teams to edit days before the match', () => {
    vi.mocked(storeUtil.getTeam).mockReturnValue({ getCaptainPlayerIds: () => [7] } as never);
    const user = new UserModel({ playerId: 7, teams: [1], security: [] });
    expect(user.canEditFormation(createMatchStub(dayjs().add(5, 'day')))).toBe(true);
  });

  it('blocks a regular player more than 2 hours before the match', () => {
    const user = createUser(1);
    expect(user.canEditFormation(createMatchStub(dayjs().add(3, 'hour')))).toBe(false);
  });

  it('blocks a regular player earlier on match day', () => {
    const user = createUser(1);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15, 10, 0, 0));
    expect(user.canEditFormation(createMatchStub(dayjs('2025-03-15T20:00:00')))).toBe(false);
    vi.useRealTimers();
  });

  it('allows a regular player within 2 hours before the match', () => {
    const user = createUser(1);
    expect(user.canEditFormation(createMatchStub(dayjs().add(90, 'minute')))).toBe(true);
  });

  it('allows a regular player once the match has started', () => {
    const user = createUser(1);
    expect(user.canEditFormation(createMatchStub(dayjs().subtract(30, 'minute')))).toBe(true);
  });

  it('blocks anonymous visitors during the match', () => {
    const user = createUser(0);
    expect(user.canEditFormation(createMatchStub(dayjs()))).toBe(false);
  });
});
