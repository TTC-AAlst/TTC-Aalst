import { t } from '../../../locales';
import { IMatch } from '../../../models/model-interfaces';
import { useViewport } from '../../../utils/hooks/useViewport';
import { MatchesTablePlayerLineUpDateCell } from './MatchesTablePlayerLineUpCells';
import { FrenoyWeekLink } from '../../controls/Buttons/FrenoyButton';
import MatchVs from '../Match/MatchVs';
import OwnPlayer from '../Match/OwnPlayer';
import { PlayerCompetitionBadge } from '../../players/PlayerBadges';
import { MatchBlock } from '../Match/MatchBlock';
import { useTtcSelector, selectLineupConflicts } from '../../../utils/hooks/storeHooks';
import { conflictKey } from '../../../models/utils/lineupConflicts';

type MatchesTableHeaderProps = {
  editMode: boolean;
  matches: IMatch[];
};

export const MatchesTableHeader = ({ editMode, matches }: MatchesTableHeaderProps) => {
  const viewport = useViewport();
  const showDate = viewport.width > 350 || matches.some(match => !match.isSyncedWithFrenoy);
  return (
    <thead>
      <tr>
        {showDate ? <th>{t('common.date')}</th> : null}
        <th className="d-none d-sm-table-cell">{t('common.frenoy')}</th>
        <th>{t('teamCalendar.match')}</th>
        <th>{editMode ? t('match.plys.blockMatchTitle') : t('teamCalendar.score')}</th>
      </tr>
    </thead>
  );
};

export const MatchesTableDateCell = ({ matches, match }: { matches: IMatch[]; match: IMatch }) => {
  const viewport = useViewport();
  const showDate = viewport.width > 350 || matches.some(m => !m.isSyncedWithFrenoy);
  if (!showDate) {
    return null;
  }
  return <MatchesTablePlayerLineUpDateCell match={match} team={match.getTeam()} />;
};

export const MatchesTableFrenoyLinkCell = ({ match }: { match: IMatch }) => (
  <td className="d-none d-sm-table-cell">
    <FrenoyWeekLink match={match} />
  </td>
);

type MatchesTableMatchVsCellProps = {
  match: IMatch;
  ownTeamLink?: 'main' | 'matches' | 'ranking' | 'players' | 'matchesTable' | 'week';
  allowOpponentOnly?: boolean;
};

export const MatchesTableMatchVsCell = ({ match, ownTeamLink, allowOpponentOnly }: MatchesTableMatchVsCellProps) => {
  const viewport = useViewport();
  return (
    <td>
      <MatchVs match={match} opponentOnly={allowOpponentOnly && viewport.width < 450} ownTeamLink={ownTeamLink} withLinks withPosition={viewport.width > 400} />
    </td>
  );
};

const matchBlockStyle = {
  display: 'inline-block',
  marginRight: 7,
  verticalAlign: 'middle',
};

type ReadOnlyMatchPlayersProps = {
  match: IMatch;
  /** Display line up that is not yet blocked */
  displayNonBlocked: boolean;
};

export const ReadOnlyMatchPlayers = ({ match, displayNonBlocked }: ReadOnlyMatchPlayersProps) => {
  const conflicts = useTtcSelector(selectLineupConflicts);

  // A walkover syncs with no games, so getOwnPlayers() still holds every pre-match selection
  // (not the played 4). Fall through to render the blocked formation instead, like an
  // unplayed-but-blocked match.
  if (match.isSyncedWithFrenoy && match.scoreType !== 'WalkOver') {
    return (
      <div style={{ marginBottom: 4 }}>
        {match.getOwnPlayers().map(ply => (
          <div style={{ display: 'inline-block', marginRight: 7 }} key={`ply-${ply.playerId}`}>
            <OwnPlayer match={match} ply={ply} />
          </div>
        ))}
      </div>
    );
  }

  let players = match.getPlayerFormation('onlyFinal');
  if (!match.block && displayNonBlocked) {
    players = match.getPlayerFormation('Captain');
  }
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={matchBlockStyle}>
        <MatchBlock block={match.block} displayNonBlocked={displayNonBlocked} />
      </span>
      {players.map(plyInfo => (
        <PlayerCompetitionBadge
          plyInfo={plyInfo}
          competition={match.competition}
          style={{ marginBottom: 4, marginRight: 5 }}
          conflictTeams={conflicts.get(conflictKey(match.id, plyInfo.id))}
          key={`ply-${plyInfo.player.id}`}
        />
      ))}
    </div>
  );
};
