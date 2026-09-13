import { OwnClubId } from '../ClubModel';
import { IFullStoreMatchOwn, MatchGameOutcome, MatchScoreType } from '../model-interfaces';

function flipOutcome<T extends MatchScoreType | MatchGameOutcome>(outcome: T): T {
  if (outcome === 'Won') {
    return 'Lost' as T;
  }
  if (outcome === 'Lost') {
    return 'Won' as T;
  }
  return outcome;
}

/**
 * A derby is one match played by two of our own teams, stored once.
 * Every team relative field on it describes match.teamId, so the other
 * team gets its own view on the same match.
 *
 * @param ownTeamCode Team code of match.teamId, the opponent after mirroring
 */
export function mirrorDerbyMatch(match: IFullStoreMatchOwn, ownTeamCode: string): IFullStoreMatchOwn {
  return {
    ...match,
    teamId: match.opponentTeamId!,
    opponentTeamId: match.teamId,
    isHomeMatch: !match.isHomeMatch,
    opponent: { clubId: OwnClubId, teamCode: ownTeamCode },
    scoreType: flipOutcome(match.scoreType),
    players: match.players.map(ply => ({ ...ply, home: !ply.home })),
    games: match.games.map(game => ({ ...game, outcome: flipOutcome(game.outcome) })),
  };
}
