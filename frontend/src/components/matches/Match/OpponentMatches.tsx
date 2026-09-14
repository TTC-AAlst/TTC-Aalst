import { useState } from 'react';
import cn from 'classnames';
import Table from 'react-bootstrap/Table';
import { OtherMatchPlayerResultsTableRow } from './OtherMatchPlayerResults';
import { MatchPlayerRankings } from '../controls/MatchPlayerRankings';
import { OtherMatchTeamTitle } from './OtherMatchTeamTitle';
import { OpponentMatchScore } from './OpponentMatchScore';
import { SwitchBetweenFirstAndLastRoundButton, getFirstOrLastMatches, getFirstOrLast } from '../../teams/SwitchBetweenFirstAndLastRoundButton';
import { Spinner } from '../../controls/controls/Spinner';
import { TrophyIcon } from '../../controls/Icons/TrophyIcon';
import { IMatch, ITeam, ITeamOpponent } from '../../../models/model-interfaces';
import { useViewport } from '../../../utils/hooks/useViewport';
import { t } from '../../../locales';

type OpponentMatchesProps = {
  readonlyMatches: IMatch[];
  team: ITeam;
  roundSwitchButton?: boolean;
  opponent?: ITeamOpponent;
};

export const OpponentMatches = ({ team, opponent, readonlyMatches, roundSwitchButton }: OpponentMatchesProps) => {
  const viewport = useViewport();
  const [matchesFilter, setMatchesFilter] = useState<ReturnType<typeof getFirstOrLast>>(roundSwitchButton ? getFirstOrLast() : 'all');
  const [showMatch, setShowMatch] = useState<{ [matchId: number]: boolean }>({});

  const widthShortDate = viewport.width < 770;
  const widthWithDate = viewport.width > 500;
  const widthWithFormation = viewport.width > 770;

  const { matches } = getFirstOrLastMatches(readonlyMatches, matchesFilter);
  if (matches.length === 0) {
    return (
      <div className="match-card-tab-content">
        <h3>
          <Spinner />
        </h3>
      </div>
    );
  }

  return (
    <Table size="sm" striped className="match-card-tab-table">
      <thead>
        <tr>
          {widthWithDate ? <th key="1">{t('common.date')}</th> : null}
          <th key="2">{t('match.opponents.homeTeam')}</th>
          {widthWithFormation ? <th key="3">{t('common.teamFormation')}</th> : null}
          <th key="4">{t('match.opponents.awayTeam')}</th>
          {widthWithFormation ? <th key="5">{t('common.teamFormation')}</th> : null}
          <th key="6">{widthWithDate ? t('match.opponents.outcome') : null}</th>
        </tr>
      </thead>
      <tbody>
        {matches.map(match => {
          const isTheirHomeMatch = opponent && match.home.clubId === opponent.clubId && match.home.teamCode === opponent.teamCode;
          const isTheirOutMatch = opponent && !isTheirHomeMatch;
          return [
            <tr
              key={match.id}
              className={cn({ clickable: match.isSyncedWithFrenoy, 'accentuate success': match.isOurMatch })}
              onClick={() => setShowMatch({ ...showMatch, [match.id]: !showMatch[match.id] })}
            >
              {widthWithDate ? <td key="1">{match.getDisplayDate(widthShortDate ? 's' : 'd')}</td> : null}

              <td key="2">
                <OpponentTeamTitle team={team} readonlyMatch={match} isHome isMarked={!!isTheirHomeMatch} />
              </td>
              {widthWithFormation ? (
                <td key="3" style={{ fontWeight: isTheirHomeMatch ? 'bold' : undefined }}>
                  <MatchPlayerRankings match={match} homeTeam />
                </td>
              ) : null}

              <td key="4">
                <OpponentTeamTitle team={team} readonlyMatch={match} isHome={false} isMarked={!!isTheirOutMatch} />
              </td>
              {widthWithFormation ? (
                <td key="5" style={{ fontWeight: isTheirOutMatch ? 'bold' : undefined }}>
                  <MatchPlayerRankings match={match} homeTeam={false} />
                </td>
              ) : null}

              <td key="6">
                <OpponentMatchScore readonlyMatch={match} ownTeamId={team.id} />
              </td>
            </tr>,
            <OtherMatchPlayerResultsTableRow key="7" show={match.isSyncedWithFrenoy && !!showMatch[match.id]} match={match} colSpan={6} />,
          ];
        })}
      </tbody>
      {roundSwitchButton ? (
        <tfoot>
          <tr>
            <td colSpan={6}>
              <SwitchBetweenFirstAndLastRoundButton setMatchesFilter={setMatchesFilter} matchesFilter={matchesFilter} />
            </td>
          </tr>
        </tfoot>
      ) : null}
    </Table>
  );
};

type OpponentTeamTitleProps = {
  team: ITeam;
  readonlyMatch: IMatch;
  isHome: boolean;
  isMarked: boolean;
};

const OpponentTeamTitle = ({ team, readonlyMatch, isHome, isMarked }: OpponentTeamTitleProps) => {
  const viewport = useViewport();
  const otherMatchTeamTitle = (
    <div style={{ fontWeight: isMarked ? 'bold' : undefined, display: 'inline' }}>
      <OtherMatchTeamTitle team={team} readonlyMatch={readonlyMatch} isHome={isHome} withPosition={viewport.width > 500 && !isMarked} />
    </div>
  );

  if (readonlyMatch.isOurMatch || viewport.width < 400) {
    return otherMatchTeamTitle;
  }
  return (
    <div>
      {otherMatchTeamTitle}
      {isHome && readonlyMatch.scoreType === 'Lost' ? <TrophyIcon style={{ marginLeft: 10 }} /> : null}
      {!isHome && readonlyMatch.scoreType === 'Won' ? <TrophyIcon style={{ marginLeft: 10 }} /> : null}
    </div>
  );
};
