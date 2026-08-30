import dayjs from 'dayjs';
import storeUtil from '../storeUtil';
import { IPlayer, ITeam, IMatch, IStoreTeam } from './model-interfaces';

export const userRoles = ['Player', 'Board', 'Dev', 'System'] as const;
export type UserRoles = (typeof userRoles)[number];

/** Players without a captain/board role may only touch the formation once the match is imminent */
const FORMATION_EDIT_WINDOW_HOURS = 2;

const security = {
  CAN_MANAGETEAM: 'CAN_MANAGETEAM',
  CAN_EDITALLREPORTS: 'CAN_EDITALLREPORTS',
  IS_ADMIN: 'IS_ADMIN',
  IS_DEV: 'IS_DEV',
  IS_SYSTEM: 'IS_SYSTEM',
};

export interface IStoreUser {
  playerId: number;
  teams: number[];
  security: string[];
}

export interface IUser extends IStoreUser {
  playsIn(teamId: number): boolean;
  getPlayer(): IPlayer;
  getTeams(): IStoreTeam[];
  can(what: string): boolean;
  canManageTeams(): boolean;
  canEditMatchesOrIsCaptain(): boolean;
  canEditMatchPlayers(match: IMatch): boolean;
  canEditFormation(match: IMatch): boolean;
  canPostReport(teamId: number): boolean;
  canChangeMatchScore(match: IMatch): boolean;
  isAdmin: () => boolean;
  isDev(): boolean;
  isSystem(): boolean;
}

export default class UserModel implements IUser {
  playerId: number;
  teams: number[];
  security: string[];

  constructor(json: IStoreUser) {
    this.playerId = json.playerId;
    this.teams = json.teams;
    this.security = json.security;
  }

  playsIn(teamId: number): boolean {
    return this.teams.indexOf(teamId) !== -1;
  }

  getPlayer(): IPlayer {
    return storeUtil.getPlayer(this.playerId);
  }

  getTeams(): ITeam[] {
    return this.teams.map(storeUtil.getTeam);
  }

  can(what: string): boolean {
    return this.security.indexOf(what) !== -1;
  }

  canManageTeams(): boolean {
    return this.can(security.CAN_MANAGETEAM);
  }

  canEditMatchesOrIsCaptain(): boolean {
    if (this.can(security.CAN_MANAGETEAM)) {
      return true;
    }

    const captains: number[] = this.getTeams()
      .map(team => team.getCaptainPlayerIds())
      .flat();

    return captains.indexOf(this.playerId) !== -1;
  }

  canEditMatchPlayers(match: IMatch): boolean {
    if (match.isSyncedWithFrenoy) {
      return false;
    }

    if (this.can(security.CAN_MANAGETEAM)) {
      return true;
    }

    const isCaptain = match.getTeam().isCaptain(this.getPlayer());
    if (!isCaptain) {
      return false;
    }

    if (match.block === 'Major') {
      return false;
    }

    return true;
  }

  canEditFormation(match: IMatch): boolean {
    if (!this.playerId) {
      return false;
    }

    if (this.isAdmin() || this.canEditMatchesOrIsCaptain()) {
      return true;
    }

    return match.date.subtract(FORMATION_EDIT_WINDOW_HOURS, 'hour').isBefore(dayjs());
  }

  canPostReport(teamId: number): boolean {
    return this.playsIn(teamId) || this.can(security.CAN_EDITALLREPORTS);
  }

  canChangeMatchScore(match: IMatch): boolean {
    if (match.isSyncedWithFrenoy) {
      return false;
    }
    return this.playsIn(match.teamId) || this.isAdmin() || !!match.players.find(p => p.playerId === this.playerId);
  }

  isAdmin(): boolean {
    return this.can(security.IS_ADMIN);
  }

  isDev(): boolean {
    return this.can(security.IS_DEV);
  }

  isSystem(): boolean {
    return this.can(security.IS_SYSTEM);
  }
}
