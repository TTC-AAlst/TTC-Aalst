import { createSelector } from '@reduxjs/toolkit';
import { selectPlayerMatches } from './selectPlayerMatches';
import { selectTeams } from '../../utils/hooks/storeHooks';
import { Competition, ITeam } from '../../models/model-interfaces';
import type { RootState } from '../../store';

/**
 * The team a player turned out for most, which is not always one he is on the roster of:
 * a reserve can play every match for another team than the one he was assigned to.
 */
export const selectPlayerTeam = createSelector(
  [selectPlayerMatches, selectTeams, (_: RootState, __: number, competition: Competition) => competition],
  (matches, teams, competition): ITeam | undefined => {
    const played = new Map<number, number>();
    matches
      .filter(match => match.isSyncedWithFrenoy && match.competition === competition)
      .forEach(match => played.set(match.teamId, (played.get(match.teamId) ?? 0) + 1));

    return teams.filter(team => played.has(team.id)).sort((a, b) => played.get(b.id)! - played.get(a.id)! || a.teamCode.localeCompare(b.teamCode))[0];
  },
);
