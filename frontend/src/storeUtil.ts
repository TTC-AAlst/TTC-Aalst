import { store } from './store';
import { getRankingValue } from './models/utils/playerRankingValueMapper';
import { ITeam, IClub, IPlayer, IMatch, IMatchPlayer, ITeamOpponent } from './models/model-interfaces';
import PlayerModel from './models/PlayerModel';
import TeamModel from './models/TeamModel';
import MatchModel from './models/MatchModel';
import { mirrorDerbyMatch } from './models/utils/mirrorDerbyMatch';

/** How many players of a ranking beat */
interface IOpponentFormationRankingInfo {
  ranking: string;
  amount: number;
}

interface IOponnentFormation {
  key: string;
  details: IOpponentFormationRankingInfo[];
  amount: number;
  value: number;
}

const createKey = (form: IOpponentFormationRankingInfo[]): string => form.reduce((key, f) => key + f.amount + f.ranking, '');

export function getOpponentFormations(matches: IMatch[], opponent?: ITeamOpponent): IOponnentFormation[] {
  return matches
    .filter(match => match.isSyncedWithFrenoy && match.shouldBePlayed)
    .reduce((acc: IOponnentFormation[], match) => {
      let isHomeTeam: boolean;
      if (!opponent) {
        isHomeTeam = true;
      } else {
        isHomeTeam = match.home.clubId === opponent.clubId && match.home.teamCode === opponent.teamCode;
      }
      const formation = getMatchPlayerRankings(match, isHomeTeam);

      const exists = acc.find(form => form.key === createKey(formation));
      if (!exists) {
        acc.push({
          key: createKey(formation),
          details: formation,
          amount: 1,
          value: formation.reduce((total, { ranking, amount }) => total + amount * getRankingValue(match.competition, ranking), 0),
        });
      } else {
        exists.amount++;
      }
      return acc;
    }, []);
}

const unique = <T>(value: T, index: number, self: T[]): boolean => self.indexOf(value) === index;

export function getMatchPlayerRankings(match: IMatch, homeTeam: boolean): IOpponentFormationRankingInfo[] {
  let opponentFormation: IMatchPlayer[];

  if (match.isOurMatch) {
    const ourMatch = match.getOurMatch();
    const playerFormation = ourMatch.getPlayerFormation('onlyFinal');
    opponentFormation = playerFormation.map(pf => pf.matchPlayer);
  } else if (homeTeam) {
    opponentFormation = match.players.filter(m => m.home);
  } else {
    opponentFormation = match.players.filter(m => !m.home);
  }

  const rankings = opponentFormation.map(ply => ply.ranking);
  const diffs = rankings.filter(unique);
  return diffs.map((ranking: string) => ({
    ranking,
    amount: rankings.reduce((prev, cur) => prev + (cur === ranking ? 1 : 0), 0),
  }));
}

// TODO: This stuff should be done with selectors:
// Components using these functions will not update
// when the state changes...
// Since this stuff does not typically change a lot
// it's not a big deal.

const util = {
  getTeam(teamId: number): ITeam {
    const { teams, teamRankings } = store.getState();
    const singleTeam = teams.find(team => team.id === teamId)!;
    return new TeamModel(singleTeam, teamRankings[singleTeam?.id] ?? []);
  },
  getTeams(): ITeam[] {
    const { teams, teamRankings } = store.getState();
    return teams.map(team => new TeamModel(team, teamRankings[team.id] ?? []));
  },

  getClub(clubId: number): IClub {
    const { clubs } = store.getState();
    return clubs.find(club => club.id === clubId)!;
  },

  getPlayer(playerId: number): IPlayer {
    const { players } = store.getState();
    const player = players.find(ply => ply.id === playerId)!;
    return new PlayerModel(player);
  },

  /** @param teamId Which of our teams looks at the match; a derby has two views on one match */
  getMatch(matchId: number, teamId?: number): IMatch {
    const { matches, teams } = store.getState();
    const match = matches.find(m => m.id === matchId)!;
    if (!teamId || match.teamId === teamId) {
      return new MatchModel(match);
    }
    const ownTeamCode = teams.find(team => team.id === match.teamId)?.teamCode ?? '';
    return new MatchModel(mirrorDerbyMatch(match, ownTeamCode));
  },
  getMatches(): IMatch[] {
    const { matches } = store.getState();
    return matches.map(m => new MatchModel(m));
  },

  matches: {
    getAllMatches(): IMatch[] {
      return util.getMatches();
    },

    getTeamMatches(teamId: number): IMatch[] {
      const { matches } = store.getState();
      return matches.filter(m => m.teamId === teamId || m.opponentTeamId === teamId).map(m => util.getMatch(m.id, teamId));
    },
  },
};

export default util;
