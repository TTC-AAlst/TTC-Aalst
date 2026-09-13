import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { IMatch, ITeam } from '../../models/model-interfaces';
import t from '../../locales';
import { Icon } from '../controls/Icons/Icon';

type MatchStatus = 'beingPlayed' | 'notStarted' | 'played';

const getTeamMatchInfo = (team: ITeam): { match: IMatch | undefined; status: MatchStatus } => {
  const matches = team.getMatches();
  const now = dayjs();
  const today = now.startOf('day');

  // Check for match scheduled today (not yet played)
  const todayMatch = matches.find(m => {
    const matchDate = dayjs(m.date).startOf('day');
    return matchDate.isSame(today) && !m.isSyncedWithFrenoy && m.scoreType !== 'WalkOver';
  });

  if (todayMatch) {
    // If match time has passed, it's being played; otherwise not started yet
    const matchHasStarted = now.isAfter(todayMatch.date);
    if (matchHasStarted) {
      return { match: todayMatch, status: 'beingPlayed' };
    }
    return { match: todayMatch, status: 'notStarted' };
  }

  // Otherwise get the most recent played match (synced with Frenoy)
  const playedMatches = matches.filter(m => m.isSyncedWithFrenoy && m.scoreType !== 'WalkOver').sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return { match: playedMatches[0], status: 'played' };
};

const getScoreColors = (match: IMatch): { bg: string; hoverBg: string } => {
  const { score, isHomeMatch } = match;

  if (!score) {
    return { bg: '#6BCBFF', hoverBg: '#49bfff' };
  }

  if (score.home === score.out) {
    return { bg: '#FF9E4F', hoverBg: '#ff8b2d' };
  }

  const won = isHomeMatch ? score.home > score.out : score.out > score.home;
  return won ? { bg: '#6BCBFF', hoverBg: '#49bfff' } : { bg: '#FF5144', hoverBg: '#ff3122' };
};

export const TeamMatchButton = ({ team }: { team: ITeam }) => {
  const { match, status } = getTeamMatchInfo(team);

  if (!match) {
    return (
      <div
        className="btn btn-secondary disabled"
        style={{
          width: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        -
      </div>
    );
  }

  // Not yet started: show starting time with clock icon
  if (status === 'notStarted') {
    return (
      <Link
        to={t.route('match', { matchId: match.id })}
        className="btn btn-outline-secondary"
        style={{
          width: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.9em',
          fontWeight: 'bold',
          textDecoration: 'none',
        }}
      >
        <Icon fa="fa fa-clock-o" style={{ marginRight: 4 }} />
        {match.date.format('HH:mm')}
      </Link>
    );
  }

  // Being played: show score with red live dot, colored like final score
  if (status === 'beingPlayed') {
    const colors = getScoreColors(match);
    return (
      <Link
        to={t.route('match', { matchId: match.id })}
        className="btn"
        style={{
          width: 70,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.95em',
          fontWeight: 'bold',
          textDecoration: 'none',
          position: 'relative',
          backgroundColor: colors.bg,
          borderColor: colors.bg,
          color: 'white',
          paddingLeft: 16,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = colors.hoverBg;
          e.currentTarget.style.borderColor = colors.hoverBg;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = colors.bg;
          e.currentTarget.style.borderColor = colors.bg;
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 6,
            width: 8,
            height: 8,
            backgroundColor: '#dc3545',
            borderRadius: '50%',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        {match.score ? `${match.score.home} - ${match.score.out}` : '0 - 0'}
      </Link>
    );
  }

  // Played: show score with colors
  const colors = getScoreColors(match);
  return (
    <Link
      to={t.route('match', { matchId: match.id })}
      className="btn"
      style={{
        width: 70,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.95em',
        fontWeight: 'bold',
        textDecoration: 'none',
        backgroundColor: colors.bg,
        borderColor: colors.bg,
        color: 'white',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = colors.hoverBg;
        e.currentTarget.style.borderColor = colors.hoverBg;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = colors.bg;
        e.currentTarget.style.borderColor = colors.bg;
      }}
    >
      {match.score ? `${match.score.home} - ${match.score.out}` : '-'}
    </Link>
  );
};
