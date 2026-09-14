import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import UserModel from '../../models/UserModel';
import MatchModel from '../../models/MatchModel';
import TeamModel from '../../models/TeamModel';
import PlayerModel from '../../models/PlayerModel';
import { Competition, IMatch, IPlayer, ITeam } from '../../models/model-interfaces';
import { mirrorDerbyMatch } from '../../models/utils/mirrorDerbyMatch';
import { findLineupConflicts } from '../../models/utils/lineupConflicts';

export const useTtcDispatch = useDispatch.withTypes<AppDispatch>();
export const useTtcSelector = useSelector.withTypes<RootState>();

export const selectUser = createSelector([(state: RootState) => state.user], user => new UserModel(user));

export const selectTeams = createSelector([(state: RootState) => state.teams, (state: RootState) => state.teamRankings], (teams, rankings) =>
  teams.map(t => new TeamModel(t, rankings[t.id] ?? [])),
);

export const selectMatches = createSelector([(state: RootState) => state.matches], matches => matches.map(m => new MatchModel(m) as IMatch));

/**
 * A derby is stored once, with the second team's formation on home: false where
 * getOwnPlayers() drops it, so both views on it have to be handed to the rule.
 */
export const selectLineupConflicts = createSelector([(state: RootState) => state.matches, (state: RootState) => state.teams], (matches, teams) =>
  findLineupConflicts(
    matches.flatMap(m => {
      const match = new MatchModel(m) as IMatch;
      if (!m.opponentTeamId) {
        return [match];
      }
      const ownTeamCode = teams.find(team => team.id === m.teamId)?.teamCode ?? '';
      return [match, new MatchModel(mirrorDerbyMatch(m, ownTeamCode)) as IMatch];
    }),
  ),
);

export const selectFreeMatches = createSelector([(state: RootState) => state.freeMatches], matches => matches.map(m => new MatchModel(m) as IMatch));

export const selectReadOnlyMatches = createSelector([(state: RootState) => state.readonlyMatches], matches => matches.map(m => new MatchModel(m) as IMatch));

export const selectPlayers = createSelector([(state: RootState) => state.players], players => players.map(p => new PlayerModel(p) as IPlayer));

export const selectQuitters = createSelector([(state: RootState) => state.playersQuitters], players => players.map(p => new PlayerModel(p) as IPlayer));

export const selectMatchesBeingPlayed = createSelector([selectMatches, selectTeams, () => Math.floor(Date.now() / (1000 * 60 * 60))], (matches, teams) =>
  matches.filter(m => {
    if (!m.isBeingPlayed()) return false;
    if (m.scoreType === 'WalkOver') return false;
    const team = teams.find(x => x.id === m.teamId);
    if (!team) return true;
    const divisionRanking = team.getDivisionRanking(m.opponent);
    if (!divisionRanking.empty && divisionRanking.isForfait) return false;
    return true;
  }),
);

/**
 * Selector to determine "your teams" based on match participation.
 * - Uses teams defined on the player
 * - If more than 2 teams, looks at synced matches to find most played teams
 */
export const selectUserTeams = createSelector([selectUser, selectTeams, selectMatches], (user, teams, matches): ITeam[] => {
  if (!user.playerId) {
    const vttlA = teams.find(t => t.competition === 'Vttl' && t.teamCode === 'A');
    const sportaA = teams.find(t => t.competition === 'Sporta' && t.teamCode === 'A');
    return [vttlA, sportaA].filter(Boolean) as ITeam[];
  }

  const userTeams = teams.filter(t => user.teams.includes(t.id));
  if (userTeams.length <= 2) {
    return userTeams;
  }

  // More than 2 teams: analyze match participation
  const syncedMatches = matches.filter(m => m.isSyncedWithFrenoy);

  // Count matches per team for this player
  const teamMatchCounts: Record<number, number> = {};
  syncedMatches.forEach(match => {
    const playerInMatch = match.players.find(p => p.playerId === user.playerId);
    if (playerInMatch) {
      teamMatchCounts[match.teamId] = (teamMatchCounts[match.teamId] || 0) + 1;
    }
  });

  // Group teams by competition
  const teamsByCompetition: Record<Competition, ITeam[]> = { Vttl: [], Sporta: [], Jeugd: [] };
  userTeams.forEach(team => {
    teamsByCompetition[team.competition].push(team);
  });

  // For each competition, determine the user's team(s)
  const competitions: Competition[] = ['Vttl', 'Sporta', 'Jeugd'];
  return competitions.flatMap(competition => {
    const compTeams = teamsByCompetition[competition];

    if (compTeams.length === 0) {
      return [];
    }

    if (compTeams.length === 1) {
      // Only one team in this competition, include it
      return compTeams[0] ? [compTeams[0]] : [];
    }

    // Multiple teams in this competition
    // Calculate total matches played in this competition
    const totalCompMatches = compTeams.reduce((sum, team) => sum + (teamMatchCounts[team.id] || 0), 0);

    if (totalCompMatches === 0) {
      // No matches played yet, pick the first team (by teamCode)
      const sorted = [...compTeams].sort((a, b) => a.teamCode.localeCompare(b.teamCode));
      return sorted[0] ? [sorted[0]] : [];
    }

    // Sort by match count descending
    const teamsWithCounts = compTeams
      .map(team => ({
        team,
        count: teamMatchCounts[team.id] || 0,
        percentage: (teamMatchCounts[team.id] || 0) / totalCompMatches,
      }))
      .sort((a, b) => b.count - a.count);

    // Always include the team with most matches
    const first = teamsWithCounts[0];
    if (!first) return [];
    const result = [first.team];

    // Include second team if they played 40%+ of matches
    const second = teamsWithCounts[1];
    if (second && second.percentage >= 0.4) {
      result.push(second.team);
    }

    return result;
  });
});
