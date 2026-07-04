import dayjs, { Dayjs } from 'dayjs';
import storeUtil from '../storeUtil';
import PlayerModel from './PlayerModel';
import { OwnClubId } from './ClubModel';
import {
  IMatch,
  ITeam,
  Competition,
  IMatchScore,
  MatchScoreType,
  IMatchPlayer,
  IMatchGame,
  ITeamOpponent,
  IClub,
  IMatchPlayerInfo,
  IPlayer,
  IGetGameMatches,
  MatchPlayerStatus,
  IStoreMatchCommon,
  IFullStoreMatchOwn,
  IMatchComment,
} from './model-interfaces';
import { logger } from '../utils/logger';

// TODO: Duplicted in backend. Should be in db.
const defaultStartHour = 20;

export const matchOutcome = {
  NotYetPlayed: 'NotYetPlayed',
  Won: 'Won',
  Lost: 'Lost',
  Draw: 'Draw',
  WalkOver: 'WalkOver',
};

// Reality:
// type MatchModelType = IMatchCommon & (IMatchOwn | IMatchOther);

export default class MatchModel implements IMatch {
  // IMatch
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

  // IMatchOwn
  isHomeMatch = false;
  teamId = 0;
  description = '';
  reportPlayerId = 0;
  block = '' as MatchPlayerStatus | '';
  comments: IMatchComment[] = [];
  opponent: ITeamOpponent = { teamCode: '', clubId: 0 };
  isDerby = false;

  // IMatchOther
  home: ITeamOpponent = { teamCode: '', clubId: 0 };
  away: ITeamOpponent = { teamCode: '', clubId: 0 };
  /** True when TTC Aalst is either home or away team */
  isOurMatch = false;
  /** If isOurMatch, get the IMatchOwn MatchModel */
  getOurMatch() {
    return storeUtil.getMatch(this.id);
  }

  constructor(json: IStoreMatchCommon & Partial<IFullStoreMatchOwn> & { home?: ITeamOpponent; away?: ITeamOpponent }) {
    this.id = json.id;
    this.frenoyMatchId = json.frenoyMatchId;
    this.shouldBePlayed = json.shouldBePlayed;
    this.isSyncedWithFrenoy = json.isSyncedWithFrenoy;
    this.week = json.week;
    this.competition = json.competition;
    this.frenoyDivisionId = json.frenoyDivisionId;
    this.date = dayjs(json.date);

    this.score = json.score || { home: 0, out: 0 };
    this.scoreType = json.scoreType;
    this.isPlayed = json.isPlayed;
    this.players = json.players;
    this.formationComment = json.formationComment;
    this.games = json.games;

    // TODO: probably better to split MatchModel and ReadOnlyMatchModel/OtherMatchModel
    // this.opponent = null;
    if (json.opponent) {
      // TTC Aalst Match
      this.isHomeMatch = json.isHomeMatch!;
      this.teamId = json.teamId!;
      this.description = json.description!;
      this.reportPlayerId = json.reportPlayerId!;
      this.block = json.block!;

      this.comments = json.comments!.map(c => ({
        ...c,
        postedOn: dayjs(c.postedOn as string | Date | undefined),
      })) as unknown as IMatchComment[];

      this.opponent = json.opponent;
      this.isDerby = json.opponent.clubId === OwnClubId;
    } else {
      // OtherMatch
      this.home = json.home!;
      this.away = json.away!;

      this.isOurMatch = this.home.clubId === OwnClubId || this.away.clubId === OwnClubId;
    }
  }

  getDisplayDate(format?: 's' | 'd'): string {
    // Usage: this.context.t('match.date', match.getDisplayDate())
    if (format === 's') {
      return this.date.format('D/M');
    }
    if (format === 'd') {
      return this.date.format('ddd D/M');
    }

    if (this.date.minute()) {
      return this.date.format('ddd D/M HH:mm');
    }
    return this.date.format('ddd D/M HH');
  }

  getDisplayTime(): string {
    if (this.date.minute()) {
      return this.date.format('HH:mm');
    }
    return this.date.format('HH');
  }

  renderOpponentTitle(): string {
    const club = this.getOpponentClub();
    return `${club.name} ${this.opponent.teamCode || ''}`;
  }

  getOpponentClub(): IClub {
    if (this.home?.teamCode) {
      // eslint-disable-next-line no-console
      console.error(`Called getOpponentClub on OtherMatch ${JSON.stringify(this, null, 2)}`);
    }
    return storeUtil.getClub(this.opponent.clubId);
  }

  getClub(which: 'home' | 'away'): IClub | undefined {
    if (this.opponent?.clubId) {
      // eslint-disable-next-line no-console
      console.warn('MatchModel.getClub: use getOpponentClub for TTC Aalst matches', this.opponent);
    }
    if (which === 'home') {
      return storeUtil.getClub(this.home.clubId);
    }
    if (which === 'away') {
      return storeUtil.getClub(this.away.clubId);
    }
    // eslint-disable-next-line no-console
    console.error(`MatchModel.getClub passed ${which}: expected home or away.`);
    return undefined;
  }

  isStandardStartTime(): boolean {
    return !this.date.minute() && this.date.hour() === defaultStartHour;
  }

  isBeingPlayed(): boolean {
    const diff = dayjs().diff(this.date, 'hour', true);
    return Math.abs(diff) < 14;
  }

  won(opponent: ITeamOpponent): boolean {
    // ATTN: This only works for an OpponentMatch?
    if (this.score.home === this.score.out) {
      return false;
    }

    let won = this.score.home > this.score.out;
    if (this.away.clubId === opponent.clubId && this.away.teamCode === opponent.teamCode) {
      won = !won;
    }
    return won;
  }

  isScoreComplete(): boolean {
    const scoreTotal = this.getTeam().getScoreCount();
    return this.score.home + this.score.out === scoreTotal;
  }

  renderScore(): string {
    if (this.score.home === 0 && this.score.out === 0) {
      return '';
    }
    return `${this.score.home} - ${this.score.out}`;
  }

  getTeam(): ITeam {
    const team = storeUtil.getTeam(this.teamId);
    if (!team || !team.id) {
      const message = `MatchId=${this.id}: teamId ${this.teamId} not found. Match=${JSON.stringify(this)}`;
      // eslint-disable-next-line no-console
      console.warn(message);
      logger.error(message);
    }
    return team;
  }

  getTeamPlayerCount(): 4 | 3 {
    return this.competition === 'Vttl' ? 4 : 3;
  }

  getPreviousMatch(): IMatch | undefined {
    const otherMatch = storeUtil.matches
      .getAllMatches()
      .find(
        m => m.teamId === this.teamId && m.opponent.clubId === this.opponent.clubId && m.opponent.teamCode === this.opponent.teamCode && m.date < this.date,
      );

    return otherMatch;
  }

  plays(playerId: number | IPlayer, statusFilter?: 'onlyFinal'): IMatchPlayer | undefined {
    if (playerId instanceof PlayerModel) {
      playerId = playerId.id;
    }
    const playerInfo = this.getPlayerFormation(statusFilter).find(ply => ply.id === playerId);
    return playerInfo ? playerInfo.matchPlayer : undefined;
  }

  getPlayerFormation(statusFilter: undefined | 'onlyFinal' | 'Play' | 'Captain' | 'Major'): IMatchPlayerInfo[] {
    const plys = this.getOwnPlayers();

    let filter: (ply: IMatchPlayerInfo) => boolean;
    if (!statusFilter || statusFilter === 'onlyFinal') {
      filter = (ply: IMatchPlayerInfo): boolean => {
        const { status } = ply.matchPlayer;
        if (this.isSyncedWithFrenoy) {
          return status === 'Major';
        }

        if (this.block) {
          return status === this.block;
        }

        if (statusFilter === 'onlyFinal') {
          return false;
        }

        return status !== 'Major' && status !== 'Captain';
      };
    } else if (statusFilter === 'Play') {
      filter = ply => ply.matchPlayer.status !== 'Captain' && ply.matchPlayer.status !== 'Major';
    } else {
      filter = ply => ply.matchPlayer.status === statusFilter;
    }

    const sortMappedMatchPlayers = (plyA: IMatchPlayerInfo, plyB: IMatchPlayerInfo): number => {
      const aComp = plyA.player.getCompetition(this.competition);
      const bComp = plyB.player.getCompetition(this.competition);
      if (!aComp || !aComp.position) {
        return -1;
      }
      if (!bComp || !bComp.position) {
        return 1;
      }
      return aComp.position - bComp.position;
    };

    return plys
      .filter(ply => ply.playerId)
      .map(ply => ({
        id: ply.playerId,
        player: storeUtil.getPlayer(ply.playerId),
        matchPlayer: ply,
      }))
      .filter(filter)
      .sort(sortMappedMatchPlayers);
  }

  getOwnPlayerModels(statusFilter?: undefined | 'onlyFinal' | 'Play' | 'Captain'): IPlayer[] {
    return this.getPlayerFormation(statusFilter).map(x => x.player);
  }

  getOwnPlayers(): IMatchPlayer[] {
    return this.players.filter(player => player.home).sort((a, b) => a.position - b.position);
  }

  getTheirPlayers(): IMatchPlayer[] {
    return this.players.filter(player => !player.home).sort((a, b) => a.position - b.position);
  }

  getGamePlayer(uniqueIndex: number): IMatchPlayer {
    return this.players.find(ply => ply.uniqueIndex === uniqueIndex)!;
  }

  getGameMatches(): IGetGameMatches[] {
    // result.ownPlayer = {} == double game
    if (!this.games.length) {
      return [];
    }

    return this.games.map(game => {
      const homePlayer = this.getGamePlayer(game.homePlayerUniqueIndex);
      const outPlayer = this.getGamePlayer(game.outPlayerUniqueIndex);
      const result: IGetGameMatches = {
        matchNumber: game.matchNumber,
        home: homePlayer,
        out: outPlayer,
        homeSets: game.homePlayerSets,
        outSets: game.outPlayerSets,
        outcome: game.outcome,
        isDoubles: false,
        ownPlayer: { playerId: 0 },
      };

      if (result.home && result.out) {
        if (result.home.playerId || result.out.playerId) {
          result.ownPlayer = result.home.playerId ? result.home : result.out;
        } else {
          // readonlyMatch does not have ownPlayer

          // TODO: 2018: This is risky stuff. FrenoyApi changed and double matches don't seem to
          // be recognized properly anymore. Could use this to improve: it is now possible to fetch
          // who played in the doubles...
          // RISKY: Are readonlyMatches now a problem? (ie all readonlyMatches recognized as doubles match...)
          //         --> This didn't seem to be the case
          // console.log('FrenoyAPI change: Doubles vs readonlyMatches?', game, result);
          result.ownPlayer = { playerId: 0 };
          result.isDoubles = false;
        }
      } else {
        // TODO: 2017: bug with isDoubles see backend TODO in FrenoyMatchesApi.cs
        // uhoh boy... morgen es checken hoe doubles match er in de db uitziet in 2017 en 2018?

        // debugger;
        result.ownPlayer = { playerId: 0 };
        result.isDoubles = true;
      }
      return result;
    });
  }
}
