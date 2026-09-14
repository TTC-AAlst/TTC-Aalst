import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { TrophyIcon } from '../controls/Icons/TrophyIcon';
import { ThrillerIcon } from '../controls/Icons/ThrillerIcon';
import { Icon } from '../controls/Icons/Icon';
import { t } from '../../locales';
import { IMatch } from '../../models/model-interfaces';
import { selectMatches, selectUser, useTtcSelector } from '../../utils/hooks/storeHooks';
import { getPlayerFormation } from '../../models/utils/getPlayerFormation';
import { browseTo } from '../../routes';

// Header height (AppBar dense toolbar)
const HEADER_HEIGHT = 48;

type GroupedMatches = {
  date: string;
  dateDisplay: string;
  matches: IMatch[];
};

const isMatchHidden = (match: IMatch): boolean => {
  // Hide walkover matches
  if (match.scoreType === 'WalkOver') return true;
  // Hide forfeit matches
  const divisionRanking = match.getTeam().getDivisionRanking(match.opponent);
  if (!divisionRanking.empty && divisionRanking.isForfait) return true;
  return false;
};

const groupMatchesByDate = (matches: IMatch[]): GroupedMatches[] => {
  const groups: { [key: string]: IMatch[] } = {};
  matches
    .filter(m => !isMatchHidden(m))
    .forEach(match => {
      const dateKey = match.date.format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(match);
    });

  return Object.entries(groups).map(([date, matchList]) => ({
    date,
    dateDisplay: matchList[0]?.date.format('dd D MMM') ?? date,
    matches: matchList.sort((a, b) => a.date.valueOf() - b.date.valueOf()),
  }));
};

export const Matches = () => {
  const ownMatches = useTtcSelector(selectMatches);
  const today = dayjs();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);

  const matchesToday = ownMatches.filter(cal => cal.date.isSame(today, 'day')).sort((a, b) => a.date.valueOf() - b.date.valueOf());

  const matchesNext = ownMatches.filter(cal => cal.date.isAfter(today, 'day')).sort((a, b) => a.date.valueOf() - b.date.valueOf());

  const matchesPlayed = ownMatches.filter(cal => cal.date.isBefore(today, 'day')).sort((a, b) => a.date.valueOf() - b.date.valueOf());

  const pastGroups = groupMatchesByDate(matchesPlayed);
  const todayGroup = matchesToday.length > 0 ? (groupMatchesByDate(matchesToday)[0] ?? null) : null;
  const futureGroups = groupMatchesByDate(matchesNext);

  // Scroll to center today marker on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    const todayEl = todayRef.current;
    if (container && todayEl) {
      setTimeout(() => {
        const containerHeight = container.clientHeight;
        const elementTop = todayEl.offsetTop;
        const elementHeight = todayEl.offsetHeight;
        const scrollTo = elementTop - containerHeight / 2 + elementHeight / 2;
        container.scrollTop = Math.max(0, scrollTo);
      }, 100);
    }
  }, []);

  // Hide body scrollbar when this component is mounted
  useEffect(() => {
    document.documentElement.style.setProperty('overflow-y', 'hidden');
    return () => {
      document.documentElement.style.setProperty('overflow-y', 'scroll');
    };
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      style={{
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '20px 16px' }}>
        {/* Past matches */}
        {pastGroups.map(group => (
          <DayCard key={group.date} group={group} isPast />
        ))}

        {/* Today marker and matches */}
        <div ref={todayRef}>
          <TodayMarker hasMatchesToday={matchesToday.length > 0} todayGroup={todayGroup} />
        </div>

        {/* Future matches */}
        {futureGroups.map(group => (
          <DayCard key={group.date} group={group} />
        ))}
      </div>
    </div>
  );
};

type TodayMarkerProps = {
  hasMatchesToday: boolean;
  todayGroup: GroupedMatches | null;
};

const TodayMarker = ({ hasMatchesToday, todayGroup }: TodayMarkerProps) => {
  const user = useTtcSelector(selectUser);
  const todayDate = dayjs().format('dd D MMM');
  const todayColor = '#9b59b6';

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Today stripe with date on left */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: hasMatchesToday ? 8 : 0 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: todayColor,
            boxShadow: hasMatchesToday ? '0 0 8px rgba(155, 89, 182, 0.5)' : undefined,
            flexShrink: 0,
            animation: hasMatchesToday ? 'pulse 2s infinite' : undefined,
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.9em',
            color: todayColor,
            textTransform: 'uppercase',
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          {todayDate}
        </span>
        <div
          style={{
            flex: 1,
            height: 2,
            backgroundColor: todayColor,
            marginLeft: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasMatchesToday ? (
            <Link
              to={t.route('matchesToday')}
              style={{
                backgroundColor: 'white',
                padding: '0 12px',
                color: todayColor,
                fontWeight: 600,
                fontSize: '0.85em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
              className="link-hover-underline"
            >
              {t('match.todayMatches')}
            </Link>
          ) : (
            <span
              style={{
                backgroundColor: 'white',
                padding: '0 12px',
                color: todayColor,
                fontWeight: 600,
                fontSize: '0.85em',
                textTransform: 'uppercase',
              }}
            >
              Vandaag
            </span>
          )}
        </div>
      </div>

      {/* Today's matches */}
      {todayGroup && (
        <div
          style={{
            marginLeft: 5,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderLeft: '2px solid #ecf0f1',
            paddingLeft: 12,
          }}
        >
          {todayGroup.matches.map(match => (
            <MatchRow key={match.id} match={match} isToday userId={user.playerId} />
          ))}
        </div>
      )}
    </div>
  );
};

type DayCardProps = {
  group: GroupedMatches;
  isPast?: boolean;
  isToday?: boolean;
};

const getScoreBackgroundColor = (won: boolean, isDraw: boolean) => {
  if (won) return '#d4edda';
  if (isDraw) return '#fff3cd';
  return '#f8d7da';
};

const getMatchResult = (match: IMatch): 'won' | 'lost' | 'draw' | null => {
  const hasScore = match.score && (match.score.home !== 0 || match.score.out !== 0);
  if (!hasScore) return null;

  const ownScore = match.isHomeMatch ? match.score.home : match.score.out;
  const theirScore = match.isHomeMatch ? match.score.out : match.score.home;

  if (ownScore > theirScore) return 'won';
  if (ownScore < theirScore) return 'lost';
  return 'draw';
};

const getDayDotColor = (matches: IMatch[], isToday: boolean, isPast: boolean): string => {
  if (isToday) return '#9b59b6';

  // Future: blue
  if (!isPast) return '#3498db';

  // Past: calculate aggregate result
  const results = matches.map(m => getMatchResult(m)).filter(r => r !== null);
  if (results.length === 0) return '#bdc3c7'; // No results yet, gray

  const wins = results.filter(r => r === 'won').length;
  const losses = results.filter(r => r === 'lost').length;

  // All won: gold
  if (wins === results.length) return '#FFD700';
  // All lost: red
  if (losses === results.length) return '#dc3545';

  // Equal wins and losses (or all draws): yellow/amber
  if (wins === losses) return '#f0ad4e';

  // More wins than losses: orange (leaning gold)
  if (wins > losses) return '#FFA500';

  // More losses than wins: dark orange (distinct from red)
  return '#e67e22';
};

const DayCard = ({ group, isPast, isToday }: DayCardProps) => {
  const user = useTtcSelector(selectUser);
  const dotColor = getDayDotColor(group.matches, !!isToday, !!isPast);

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Date header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: dotColor,
            flexShrink: 0,
            boxShadow: isToday ? '0 0 8px rgba(231, 76, 60, 0.5)' : undefined,
            animation: isToday ? 'pulse 2s infinite' : undefined,
          }}
        />
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.9em',
            color: isToday ? '#e74c3c' : '#666',
            textTransform: 'uppercase',
            marginLeft: 8,
          }}
        >
          {group.dateDisplay}
        </span>
      </div>

      {/* Matches list */}
      <div
        style={{
          marginLeft: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderLeft: '2px solid #ecf0f1',
          paddingLeft: 12,
        }}
      >
        {group.matches.map(match => (
          <MatchRow key={match.id} match={match} isPast={isPast} isToday={isToday} userId={user.playerId} />
        ))}
      </div>
    </div>
  );
};

type MatchRowProps = {
  match: IMatch;
  isPast?: boolean;
  isToday?: boolean;
  userId?: number;
};

const getCardBackground = (isToday: boolean, isPast: boolean) => {
  if (isToday) return '#fff5f5';
  if (isPast) return '#fafafa';
  return '#fff';
};

const getCardBorder = (userPlays: boolean, isToday: boolean) => {
  if (userPlays) return '2px solid #4CAF50';
  if (isToday) return '1px solid #e74c3c';
  return '1px solid #e0e0e0';
};

const MatchRow = ({ match, isPast, isToday, userId }: MatchRowProps) => {
  const team = match.getTeam();
  const thriller = team.getThriller(match);
  const hasScore = match.score && (match.score.home !== 0 || match.score.out !== 0);
  const won = hasScore && ((match.isHomeMatch && match.score.home > match.score.out) || (!match.isHomeMatch && match.score.out > match.score.home));
  const isDraw = hasScore && match.score.home === match.score.out;

  // Check if user plays in this match
  const formation = getPlayerFormation(match);
  const userPlaysInMatch = userId && formation.some(p => p.id === userId);

  // Get division rankings
  const ownRanking = team.getDivisionRanking();
  const ownRankingPos = !ownRanking.empty ? ownRanking.position : null;
  const opponentRanking = team.getDivisionRanking(match.opponent);
  const opponentRankingPos = !opponentRanking.empty ? opponentRanking.position : null;

  const ownTeamTitle = team.renderOwnTeamTitle();
  const opponentTitle = match.renderOpponentTitle();

  // Formation rankings for future matches
  const showFormation = !isPast && !hasScore && formation.length > 0;

  // Hide time for default start times on future matches
  const showTime = !hasScore && !match.isStandardStartTime();

  const scoreElement = hasScore && (
    <Link to={t.route('match', { matchId: match.id })} style={{ textDecoration: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 4,
          backgroundColor: getScoreBackgroundColor(!!won, isDraw),
          fontWeight: 600,
          whiteSpace: 'nowrap',
          color: 'inherit',
        }}
      >
        {won && <TrophyIcon style={{ fontSize: '0.9em' }} />}
        <span>
          {match.score.home} - {match.score.out}
        </span>
      </div>
    </Link>
  );

  const borderStyle = getCardBorder(!!userPlaysInMatch, !!isToday);
  const cardBg = getCardBackground(!!isToday, !!isPast);

  return (
    <div
      style={{
        position: 'relative',
        opacity: isPast ? 0.7 : 1,
      }}
    >
      {/* vs or thriller indicator - positioned on the border */}
      <div
        style={{
          position: 'absolute',
          left: thriller ? -4 : 0,
          top: thriller ? 24 : 27,
          display: 'flex',
          alignItems: 'center',
          background: `linear-gradient(to right, #fff 50%, ${cardBg} 50%)`,
          padding: '0 4px',
          zIndex: 1,
        }}
      >
        {thriller ? (
          <ThrillerIcon color={thriller === 'topMatch' ? 'red' : 'orange'} />
        ) : (
          <span
            style={{
              color: '#888',
              fontSize: '0.7em',
              fontWeight: 500,
              textTransform: 'uppercase',
            }}
          >
            vs
          </span>
        )}
      </div>

      {/* Card with full border */}
      <div
        style={{
          backgroundColor: cardBg,
          border: borderStyle,
          borderRadius: 8,
          padding: '10px 14px 10px 20px',
          marginLeft: 10,
        }}
      >
        {/* Teams row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Teams */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Own team row */}
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {ownRankingPos && <small style={{ color: '#888', fontWeight: 400 }}>{ownRankingPos}. </small>}
              <Link to={browseTo.getTeam(team)} className="link-hover-underline">
                {ownTeamTitle}
              </Link>
            </div>
            {/* Opponent row */}
            <div style={{ fontWeight: 600 }}>
              {opponentRankingPos && <small style={{ color: '#888', fontWeight: 400 }}>{opponentRankingPos}. </small>}
              <Link to={browseTo.getOpponent(match.competition, match.opponent)} className="link-hover-underline">
                {opponentTitle}
              </Link>
            </div>
          </div>

          {/* Score or time+button */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {scoreElement}
            {!hasScore && showTime && (
              <div style={{ color: '#888', fontSize: '0.85em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon fa="fa fa-clock-o" />
                <span>{match.date.format('HH:mm')}</span>
              </div>
            )}
            {!hasScore && (
              <Link
                to={t.route('match', { matchId: match.id })}
                className="btn btn-outline-secondary btn-sm"
                style={{ fontSize: '0.75em', padding: '4px 8px' }}
              >
                {t('match.details')}
              </Link>
            )}
          </div>
        </div>

        {/* Formation for future matches */}
        {showFormation && (
          <div
            style={{
              marginTop: 6,
              fontSize: '0.8em',
              color: '#666',
            }}
          >
            {formation.map((ply, i) => {
              const ranking = ply.player?.getCompetition(match.competition)?.ranking;
              return (
                <span key={ply.id}>
                  {ply.player?.alias || 'Unknown'}
                  {ranking && <small style={{ opacity: 0.7 }}> ({ranking})</small>}
                  {i < formation.length - 1 && ', '}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
