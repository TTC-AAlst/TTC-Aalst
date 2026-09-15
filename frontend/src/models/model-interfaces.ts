import { Dayjs } from 'dayjs';
import { UserRoles } from './UserModel';
import { PlayerRanking } from './utils/rankingSorter';
import { ISetScore } from './utils/setScores';

export interface ITeamPlayerStats {
  ply: IPlayer;
  won: { [ranking: string]: number };
  lost: { [ranking: string]: number };
  games: number;
  victories: number;
  isDoubles: boolean;
  belles: {
    [ranking: string]: {
      won: number;
      lost: number;
    };
  };
  belleVictories: number;
  belleGames: number;
}

/* ****************************************************
 *                       UTILITY
 **************************************************** */

export type TranslatorParams = Record<string, string | number> | string | number;

export type TranslatorFn = (key?: string, params?: TranslatorParams) => string;

export type Translator = TranslatorFn & {
  reverseRoute: (baseRoute: string, translatedRoute: string) => string;
  route: (routeName: string, params?: Record<string, string | number>) => string;
};

export type OwnTeamLink = 'main' | 'matches' | 'ranking' | 'players' | 'matchesTable' | 'week';

export interface ICacheResponse<T> {
  data: T[];
  lastChange: string;
}

/* ****************************************************
 *                       MATCHES
 **************************************************** */

export type Competition = 'Vttl' | 'Sporta' | 'Jeugd';

export type MatchScoreType = 'NotYetPlayed' | 'Won' | 'Lost' | 'Draw' | 'WalkOver' | 'BeingPlayed';

export type MatchPlayerStatus = 'Play' | 'Major' | 'Captain' | 'NotPlay' | 'Maybe' | 'DontKnow';

export type MatchGameOutcome = 'NotYetPlayed' | 'Won' | 'Lost' | 'Draw' | 'WalkOver';

export interface IMatchScore {
  home: number;
  out: number;
}

export interface IStoreMatchCommon {
  id: number;
  frenoyMatchId: string;
  shouldBePlayed: boolean;
  isSyncedWithFrenoy: boolean;
  week: number;
  competition: Competition;
  frenoyDivisionId: number;
  date: Dayjs;
  score: IMatchScore;
  scoreType: MatchScoreType;
  isPlayed: boolean;
  players: IMatchPlayer[];
  formationComment: string;
  games: IMatchGame[];
}

interface IMatchCommon extends IStoreMatchCommon {
  getDisplayDate(format?: 's' | 'd'): string;
  getDisplayTime(): string;
  isStandardStartTime(): boolean;
  isBeingPlayed: () => boolean;
  getOwnPlayers(): IMatchPlayer[];
  getTheirPlayers(): IMatchPlayer[];
  renderScore(): string;
  getTeamPlayerCount: () => 4 | 3;
  getGamePlayer(uniqueIndex: number): IMatchPlayer | {};
}

/** If you are unsure what kind of match it is */
export interface IMatch extends IMatchCommon, IMatchOwn, IMatchOther {}

export interface IFullStoreMatchOwn extends IStoreMatchCommon, IStoreMatchOwn {}

interface IStoreMatchOwn {
  isHomeMatch: boolean;
  teamId: number;
  /** The other TTC Aalst team in a derby. Null for every other match. */
  opponentTeamId: number | null;
  description: string;
  reportPlayerId: 0 | number;
  block: MatchPlayerStatus | '';
  comments: IMatchComment[];
  opponent: ITeamOpponent;
  isDerby: boolean;
}

/**
 * This interface applies only to MatchModels in which
 * one of the two teams is TTC Aalst
 * */
interface IMatchOwn extends IStoreMatchOwn {
  isPlayedBy(teamId: number): boolean;
  renderOpponentTitle(): string;
  getOpponentClub(): IClub;
  isScoreComplete(): boolean;
  getTeam: () => ITeam;
  getPreviousMatch(): IMatch | undefined;
  plays: (playerId: number | IPlayer, statusFilter?: 'onlyFinal') => IMatchPlayer | undefined;
  getPlayerFormation(statusFilter: undefined | 'onlyFinal' | 'Play' | 'Captain' | 'Major'): IMatchPlayerInfo[];
  getOwnPlayerModels(statusFilter?: undefined | 'onlyFinal' | 'Play' | 'Captain'): IPlayer[];
  getGameMatches(): IGetGameMatches[];
}

interface IStoreMatchOther {
  home: ITeamOpponent;
  away: ITeamOpponent;
  /** Is TTC Aalst home or away team? */
  isOurMatch: boolean;
}

/**
 * This interface applies only to MatchModels in which
 * TTC Aalst is not considered 'special' or is not playing in.
 * These are loaded in the context of other Teams.
 */
interface IMatchOther extends IStoreMatchOther {
  /** If isOurMatch, get the IMatchOwn MatchModel */
  getOurMatch: (teamId?: number) => IMatch;

  getClub(which: 'home' | 'away'): IClub | undefined;
  won(opponent: ITeamOpponent): boolean;
}

export interface IMatchPlayer {
  id: number;
  matchId: number;
  status: MatchPlayerStatus;
  statusNote: string;
  position: number;
  name: string;
  ranking: PlayerRanking;
  uniqueIndex: number;
  won: number;
  home: boolean;
  playerId: 0 | number;
  alias: string;
}

export interface IMatchGame {
  id: number;
  matchId: number;
  matchNumber: number;
  homePlayerUniqueIndex: number;
  outPlayerUniqueIndex: number;
  homePlayerSets: number;
  outPlayerSets: number;
  outcome: MatchGameOutcome;
  /** Raw Frenoy set scores; VTTL only, see parseSetScores */
  scores?: string;
}

/** Previous encounters of players */
export type PlayerEncounter = {
  matchGameId: number;
  /** The match for which we're getting the previous encounters */
  requestMatchId: number;
  /** The match in which the encounter was played */
  matchId: number;
  matchDate: string;
  competition: Competition;
  homeName: string;
  homePlayerUniqueId: number;
  homePlayerSets: number;
  homeRanking: PlayerRanking;
  awayName: string;
  awayPlayerUniqueId: number;
  awayPlayerSets: number;
  awayRanking: PlayerRanking;
};

export interface IGetGameMatches {
  matchNumber: number;
  home: IMatchPlayer;
  out: IMatchPlayer;
  homeSets: number;
  outSets: number;
  setScores: ISetScore[];
  outcome: MatchGameOutcome;

  isDoubles: boolean;
  ownPlayer: { playerId: 0 } | IMatchPlayer;
}

export interface IMatchComment {
  id: number;
  matchId: number;
  playerId: number;
  text: string;
  /** Hidden is only visible for TTC Aalst players */
  hidden: boolean;
  postedOn: string | Date | null;
  imageUrl: string;
}

/* ****************************************************
 *                       PLAYERS
 **************************************************** */

export interface IStorePlayer {
  alias: string;
  contact: IPlayerContact;
  id: number;
  active: boolean;
  firstName: string;
  lastName: string;
  sporta?: IPlayerCompetition;
  vttl?: IPlayerCompetition;
  style: IPlayerStyle;
  quitYear: number | null;
  security: UserRoles;
  hasKey: boolean | null;
  imageVersion: number;
}

export interface IPlayer extends IStorePlayer {
  name: string;
  slug: string;
  getCompetition: (competition: Competition) => IPlayerCompetition;
  getTeam(comp: Competition): ITeam | undefined;
  getTeams(): ITeam[];
}

export interface IPlayerContact {
  playerId: number;
  email: string;
  mobile: string;
  address: string;
  city: string;
}

export interface IPlayerCompetition {
  clubId: number;
  competition: Competition;
  frenoyLink: string;
  /** Index */
  position: number;
  ranking: PlayerRanking;
  /** EndOfYear has been filled in manually */
  nextRanking: PlayerRanking | null;
  /** Prediction by AI model */
  prediction: PlayerRanking | null;
  uniqueIndex: number;
  rankingIndex: number;
  rankingValue: number;
}

export interface IPlayerStyle {
  playerId: number;
  name: string;
  bestStroke: string;
}

export type PredictionResult = {
  competition: Competition;
  uniqueIndex: number;
  name: string;
  oldRanking: string;
  newRanking: string;
};

export type PlayerEventType = 'PlayerStyleUpdated' | 'MatchReport' | 'MatchComment';

export interface IPlayerEvent {
  id: number;
  type: PlayerEventType;
  data: string | null;
  teamId: number | null;
  matchId: number | null;
  playerId: number;
  createdOn: string;
  createdBy: string;
}

/* ****************************************************
 *                       TEAMS
 **************************************************** */

export type TeamPlayerType = (typeof teamPlayerType)[keyof typeof teamPlayerType] | 'Invaller';

export const teamPlayerType = {
  standard: 'Standard',
  captain: 'Captain',
  reserve: 'Reserve',
} as const;

export interface IStoreTeam {
  competition: Competition;
  divisionName: string;
  id: number;
  teamCode: string;
  clubId: number;
  year: number;
  opponents: ITeamOpponent[];
  players: ITeamPlayer[];
  frenoy: ITeamFrenoy;
}

export interface ITeam extends IStoreTeam {
  ranking: ITeamRanking[];

  getTeamPlayerCount(): 2 | 3 | 4;
  getScoreCount(): 16 | 10 | 5;
  renderOwnTeamTitle(): string;
  getDivisionDescription(): string;
  getDivisionRanking(opponent?: 'our-ranking' | ITeamOpponent): (ITeamRanking & { empty: false }) | { empty: true };
  getThriller(match: IMatch): undefined | 'topMatch' | 'degradationMatch';
  isCaptain: (player: IPlayer) => boolean;
  getCaptainPlayerIds: () => number[];
  getPlayers(type?: 'reserve' | 'standard'): ITeamPlayerInfo[];
  plays(playerId: number): boolean;
  getMatches(): IMatch[];
  getPlayerStats(): ITeamPlayerStats[];
  isInDegradationZone(opponent?: ITeamOpponent): boolean;
  isTopper(opponent?: ITeamOpponent): boolean;
}

export interface ITeamOpponent {
  teamCode: string;
  clubId: number;
}

export interface ITeamPlayer {
  playerId: number;
  type: TeamPlayerType;
}

/** ITeamPlayer is with playerId, this one has it resolved to IPlayer */
export interface ITeamPlayerInfo {
  player: IPlayer;
  type: TeamPlayerType;
}

export interface IMatchPlayerInfo {
  id: number;
  player: IPlayer;
  matchPlayer: IMatchPlayer;
}

/** Selecting players for a match form */
export type PickedPlayer = {
  /** PlayerId */
  id: number;
  matchId: number;
  player: IPlayer;
  matchPlayer: {
    status: MatchPlayerStatus | '';
    statusNote: string;
  };
};

export interface ITeamRanking {
  position: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  points: number;
  clubId: number;
  teamCode: string;
  isForfait: boolean;
}

export interface ITeamFrenoy {
  divisionId: number;
  linkId: string;
  teamId: string;
  seasonId: number;
  teamCompetition: Competition;

  getUrl(type: 'results' | 'ranking'): string;
  getWeekUrl(weekName: number): string;
}

/* ****************************************************
 *                       CLUBS
 **************************************************** */

export interface IClub {
  active: boolean;
  alternativeLocations: IClubLocation[];
  codeSporta: string;
  codeVttl: string;
  id: number;
  name: string;
  shower: boolean;
  website: string;
  managers: IClubManager[];
  mainLocation: IClubLocation;
}

export interface IClubLocation {
  id: number;
  description: string;
  address: string;
  postalCode: string;
  city: string;
  mobile: string;
  comment: string;
}

export interface IClubManager {
  playerId: number;
  description: string;
  sortOrder: number;
}

export type IToogDay = {
  date: string;
  homeTeamIds: number[];
  available: boolean;
  assigned: boolean;
};

export type IToogAdminDay = {
  date: string;
  homeTeamIds: number[];
  availablePlayerIds: number[];
  assignedPlayerId: number | null;
};
