import { createSelector } from '@reduxjs/toolkit';
import MatchModel from '../../models/MatchModel';
import { mirrorDerbyMatch } from '../../models/utils/mirrorDerbyMatch';
import { IMatch } from '../../models/model-interfaces';
import type { RootState } from '../../store';

/**
 * The matches a player was in, seen from the team they played for.
 *
 * A derby is stored once and every team relative field on it describes match.teamId,
 * so a player of the other own team needs the mirrored view.
 */
export const selectPlayerMatches = createSelector(
  [(state: RootState) => state.matches, (state: RootState) => state.teams, (_: RootState, playerId: number) => playerId],
  (matches, teams, playerId): IMatch[] =>
    matches
      .map(match => ({ match, ply: match.players.find(p => p?.playerId === playerId) }))
      .filter(({ ply }) => !!ply)
      .map(({ match, ply }) => {
        if (ply!.home || !match.opponentTeamId) {
          return new MatchModel(match) as IMatch;
        }
        const ownTeamCode = teams.find(team => team.id === match.teamId)?.teamCode ?? '';
        return new MatchModel(mirrorDerbyMatch(match, ownTeamCode)) as IMatch;
      }),
);
