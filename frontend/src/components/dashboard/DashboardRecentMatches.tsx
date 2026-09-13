import { useState } from 'react';
import dayjs from 'dayjs';
import Button from 'react-bootstrap/Button';
import { Strike } from '../controls/controls/Strike';
import { MatchMiniView } from './MatchMiniView';
import { selectMatches, selectUserTeams, useTtcSelector } from '../../utils/hooks/storeHooks';
import { useViewport } from '../../utils/hooks/useViewport';
import t from '../../locales';

export const DashboardRecentMatches = () => {
  const matches = useTtcSelector(selectMatches);
  const userTeams = useTtcSelector(selectUserTeams);
  const viewport = useViewport();
  const isLargeDevice = viewport.width >= 1200;
  const [showOtherMatches, setShowOtherMatches] = useState(false);

  const today = dayjs();
  const lastWeek = dayjs().subtract(7, 'days');

  const userTeamIds = userTeams.map(team => team.id);

  // Get matches from previous week and current week that have been synced, exclude walk overs and forfeited opponents
  const recentMatches = matches
    .filter(match => {
      const matchDate = dayjs(match.date);
      if (!matchDate.isBetween(lastWeek, today, 'day', '[]')) return false;
      if (!match.isSyncedWithFrenoy) return false;
      if (match.scoreType === 'WalkOver') return false;
      const divisionRanking = match.getTeam().getDivisionRanking(match.opponent);
      if (!divisionRanking.empty && divisionRanking.isForfait) return false;
      return true;
    })
    .sort((a, b) => b.date.valueOf() - a.date.valueOf());

  let userMatches = recentMatches.filter(match => userTeamIds.some(teamId => match.isPlayedBy(teamId)));
  let otherMatches = recentMatches.filter(match => !userTeamIds.some(teamId => match.isPlayedBy(teamId)));

  // If no user matches but there are other matches, show top 2 from other matches
  if (userMatches.length === 0 && otherMatches.length > 0) {
    userMatches = otherMatches.slice(0, 2);
    otherMatches = otherMatches.slice(2);
  }

  if (recentMatches.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <Strike text={t('dashboard.recentMatches')} style={{ marginBottom: 6 }} />
      <div style={{ display: 'grid', gridTemplateColumns: isLargeDevice ? '1fr 1fr' : '1fr', gap: 8 }}>
        {userMatches.map(match => (
          <MatchMiniView key={match.id} match={match} />
        ))}
      </div>

      {otherMatches.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {!showOtherMatches && (
            <div style={{ textAlign: 'center' }}>
              <Button variant="outline-secondary" size="sm" onClick={() => setShowOtherMatches(!showOtherMatches)}>
                {t('dashboard.showOtherMatches')}
              </Button>
            </div>
          )}

          {showOtherMatches && (
            <div style={{ display: 'grid', gridTemplateColumns: isLargeDevice ? '1fr 1fr' : '1fr', gap: 8, marginTop: 8 }}>
              {otherMatches.map(match => (
                <MatchMiniView key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
