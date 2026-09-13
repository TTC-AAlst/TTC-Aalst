import { useState } from 'react';
import { Button, ButtonGroup, Form } from 'react-bootstrap';
import { Strike } from '../../controls/controls/Strike';
import { Icon } from '../../controls/Icons/Icon';
import { PlayerPerformanceCard, PlayerCompetitionStats } from './PlayerPerformanceCard';
import { selectMatches, selectPlayers, selectTeams, selectUser, selectUserTeams, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { IPlayer, ITeam } from '../../../models/model-interfaces';
import {
  GameResult,
  MatchGameResults,
  collectPlayerGameResultsByMatch,
  getRecentResults,
  calculatePerformanceBadge,
  PerformanceBadgeType,
} from '../../players/controls/PlayerPerformanceUtils';
import { PlayerRanking } from '../../../models/utils/rankingSorter';
import t from '../../../locales';

const latinize = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

type PlayerWithCompetitionStats = {
  player: IPlayer;
  vttl: PlayerCompetitionStats | null;
  sporta: PlayerCompetitionStats | null;
  vttlResults: GameResult[];
  sportaResults: GameResult[];
  recentResults: GameResult[]; // Results from last 2 matches per competition
  badgeType: PerformanceBadgeType | null;
};

const collectStatsForPlayers = (playerIds: Set<number>, allPlayers: IPlayer[], teams: ITeam[]): PlayerWithCompetitionStats[] => {
  const statsByPlayer = new Map<
    number,
    {
      player: IPlayer;
      vttlStats: { games: number; victories: number } | null;
      sportaStats: { games: number; victories: number } | null;
      vttlResultsByMatch: MatchGameResults[];
      sportaResultsByMatch: MatchGameResults[];
    }
  >();

  playerIds.forEach(playerId => {
    const playerInfo = allPlayers.find(p => p.id === playerId);
    if (!playerInfo) return;

    teams.forEach(team => {
      const teamMatches = team.getMatches().filter(m => m.isSyncedWithFrenoy);

      const ranking = team.competition === 'Sporta' ? playerInfo.sporta?.ranking : playerInfo.vttl?.ranking;

      const resultsByMatch = collectPlayerGameResultsByMatch(playerId, ranking as PlayerRanking, teamMatches);
      const results = resultsByMatch.flatMap(m => m.results);
      const games = results.length;
      const victories = results.filter(r => r.won).length;

      if (games === 0) return;

      const existing = statsByPlayer.get(playerId);
      if (!existing) {
        statsByPlayer.set(playerId, {
          player: playerInfo,
          vttlStats: team.competition === 'Vttl' ? { games, victories } : null,
          sportaStats: team.competition === 'Sporta' ? { games, victories } : null,
          vttlResultsByMatch: team.competition === 'Vttl' ? resultsByMatch : [],
          sportaResultsByMatch: team.competition === 'Sporta' ? resultsByMatch : [],
        });
      } else if (team.competition === 'Vttl') {
        if (existing.vttlStats) {
          existing.vttlStats.games += games;
          existing.vttlStats.victories += victories;
        } else {
          existing.vttlStats = { games, victories };
        }
        existing.vttlResultsByMatch.push(...resultsByMatch);
      } else if (team.competition === 'Sporta') {
        if (existing.sportaStats) {
          existing.sportaStats.games += games;
          existing.sportaStats.victories += victories;
        } else {
          existing.sportaStats = { games, victories };
        }
        existing.sportaResultsByMatch.push(...resultsByMatch);
      }
    });
  });

  return Array.from(statsByPlayer.values()).map(entry => {
    entry.vttlResultsByMatch.sort((a, b) => b.matchDate.valueOf() - a.matchDate.valueOf());
    entry.sportaResultsByMatch.sort((a, b) => b.matchDate.valueOf() - a.matchDate.valueOf());

    const vttlResults = entry.vttlResultsByMatch.flatMap(m => m.results);
    const sportaResults = entry.sportaResultsByMatch.flatMap(m => m.results);
    const allResults = [...vttlResults, ...sportaResults];
    const recentResults = getRecentResults(entry.vttlResultsByMatch, entry.sportaResultsByMatch);
    const badge = allResults.length >= 3 ? calculatePerformanceBadge(allResults, recentResults) : null;

    return {
      player: entry.player,
      vttl: entry.vttlStats,
      sporta: entry.sportaStats,
      vttlResults,
      sportaResults,
      recentResults,
      badgeType: badge?.type ?? null,
    };
  });
};

type BadgeFilter = 'on-fire' | 'solid' | 'rising' | 'on-track' | 'struggling';

export const TeamPlayerPerformance = () => {
  const [showOtherPlayers, setShowOtherPlayers] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [badgeFilters, setBadgeFilters] = useState<Set<BadgeFilter>>(new Set());
  const user = useTtcSelector(selectUser);
  const teams = useTtcSelector(selectTeams);
  const userTeams = useTtcSelector(selectUserTeams);
  const allMatches = useTtcSelector(selectMatches);
  const allPlayers = useTtcSelector(selectPlayers);

  const toggleBadgeFilter = (badge: BadgeFilter) => {
    setBadgeFilters(prev => {
      const next = new Set(prev);
      if (next.has(badge)) {
        next.delete(badge);
      } else {
        next.add(badge);
      }
      return next;
    });
  };

  const hasActiveFilters = nameFilter.length > 0 || badgeFilters.size > 0;

  if (userTeams.length === 0) {
    return null;
  }

  // Find all players that play in the user's teams
  const playerIdsInUserTeams = new Set<number>();
  userTeams.forEach(team => {
    const teamMatches = team.getMatches().filter(m => m.isSyncedWithFrenoy);
    teamMatches.forEach(match => {
      match.getGameMatches().forEach(game => {
        if (!game.isDoubles && 'playerId' in game.ownPlayer && game.ownPlayer.playerId) {
          playerIdsInUserTeams.add(game.ownPlayer.playerId);
        }
      });
    });
  });

  // Find all players that play in ANY team (for "other players")
  const allPlayerIdsInTeams = new Set<number>();
  teams.forEach(team => {
    const teamMatches = team.getMatches().filter(m => m.isSyncedWithFrenoy);
    teamMatches.forEach(match => {
      match.getGameMatches().forEach(game => {
        if (!game.isDoubles && 'playerId' in game.ownPlayer && game.ownPlayer.playerId) {
          allPlayerIdsInTeams.add(game.ownPlayer.playerId);
        }
      });
    });
  });

  // Other players = all players in teams minus players in user's teams
  const otherPlayerIds = new Set<number>();
  allPlayerIdsInTeams.forEach(id => {
    if (!playerIdsInUserTeams.has(id)) {
      otherPlayerIds.add(id);
    }
  });

  // Count matches played together with the current user
  const matchesPlayedTogether: Record<number, number> = {};
  if (user.playerId) {
    const userTeamMatches = allMatches.filter(m => m.isSyncedWithFrenoy);
    userTeamMatches.forEach(match => {
      const playersInMatch = match.players.filter(p => p.playerId && p.playerId !== user.playerId).map(p => p.playerId);
      const userInMatch = match.players.some(p => p.playerId === user.playerId);
      if (userInMatch) {
        playersInMatch.forEach(playerId => {
          matchesPlayedTogether[playerId] = (matchesPlayedTogether[playerId] || 0) + 1;
        });
      }
    });
  }

  const playerStats = collectStatsForPlayers(playerIdsInUserTeams, allPlayers, teams);

  // Sort: current user first, then by matches played together
  playerStats.sort((a, b) => {
    if (a.player.id === user.playerId) return -1;
    if (b.player.id === user.playerId) return 1;
    const aMatches = matchesPlayedTogether[a.player.id] || 0;
    const bMatches = matchesPlayedTogether[b.player.id] || 0;
    return bMatches - aMatches;
  });

  const otherPlayerStats = showOtherPlayers ? collectStatsForPlayers(otherPlayerIds, allPlayers, teams) : [];

  const filterStats = (stats: PlayerWithCompetitionStats[]): PlayerWithCompetitionStats[] => {
    if (!hasActiveFilters) return stats;

    return stats.filter(stat => {
      // Name filter
      if (nameFilter.length > 0) {
        const searchTerm = latinize(nameFilter);
        const playerName = latinize(`${stat.player.firstName} ${stat.player.lastName} ${stat.player.alias || ''}`);
        if (!playerName.includes(searchTerm)) {
          return false;
        }
      }

      // Badge filter
      if (badgeFilters.size > 0) {
        if (!stat.badgeType || !badgeFilters.has(stat.badgeType as BadgeFilter)) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredPlayerStats = filterStats(playerStats);
  const filteredOtherPlayerStats = filterStats(otherPlayerStats);

  if (playerStats.length === 0) {
    return null;
  }

  const badgeFilterButtons: { key: BadgeFilter; label: string; color: string }[] = [
    { key: 'on-fire', label: 'On Fire', color: '#FF5722' },
    { key: 'solid', label: 'Sterk', color: '#4CAF50' },
    { key: 'rising', label: 'Stijgend', color: '#2196F3' },
    { key: 'on-track', label: 'On Track', color: '#8BC34A' },
    { key: 'struggling', label: 'Lastig', color: '#FF9800' },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Strike text={t('dashboard.teamPlayerPerformance')} style={{ flex: 1, marginBottom: 0 }} />
        <Button
          variant={hasActiveFilters ? 'primary' : 'outline-secondary'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          style={{ padding: '2px 8px', fontSize: '0.75em' }}
        >
          <Icon fa="fa fa-filter" />
        </Button>
      </div>

      {showFilters && (
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: 10,
            borderRadius: 6,
            marginBottom: 12,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Form.Control
            type="text"
            placeholder={t('dashboard.filterByName')}
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            size="sm"
            style={{ width: 180, flex: '0 0 auto' }}
          />
          <ButtonGroup size="sm">
            {badgeFilterButtons.map(badge => (
              <Button
                key={badge.key}
                variant={badgeFilters.has(badge.key) ? 'primary' : 'outline-secondary'}
                onClick={() => toggleBadgeFilter(badge.key)}
                style={{
                  fontSize: '0.8em',
                  borderColor: badgeFilters.has(badge.key) ? badge.color : undefined,
                  backgroundColor: badgeFilters.has(badge.key) ? badge.color : undefined,
                }}
              >
                {badge.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 }}>
        {filteredPlayerStats.map(stat => (
          <PlayerPerformanceCard
            key={stat.player.id}
            player={stat.player}
            vttl={stat.vttl}
            sporta={stat.sporta}
            vttlResults={stat.vttlResults}
            sportaResults={stat.sportaResults}
            recentResults={stat.recentResults}
            isCurrentUser={stat.player.id === user.playerId}
          />
        ))}
      </div>
      {otherPlayerIds.size > 0 && !showOtherPlayers && (
        <div style={{ marginTop: 15, textAlign: 'center' }}>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowOtherPlayers(true)}>
            {t('dashboard.showOtherPlayers')}
          </Button>
        </div>
      )}
      {showOtherPlayers && filteredOtherPlayerStats.length > 0 && (
        <div style={{ marginTop: 15 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 }}>
            {filteredOtherPlayerStats.map(stat => (
              <PlayerPerformanceCard
                key={stat.player.id}
                player={stat.player}
                vttl={stat.vttl}
                sporta={stat.sporta}
                vttlResults={stat.vttlResults}
                sportaResults={stat.sportaResults}
                recentResults={stat.recentResults}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
