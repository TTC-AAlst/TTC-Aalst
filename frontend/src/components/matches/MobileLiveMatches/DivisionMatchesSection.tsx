import React, { useState, useEffect } from 'react';
import { Modal, Table } from 'react-bootstrap';
import { IMatch } from '../../../models/model-interfaces';
import { OtherMatchPlayerResults } from '../Match/OtherMatchPlayerResults';
import { ReadonlyIndividualMatches } from '../Match/IndividualMatches';
import { OpponentMatchScore } from '../Match/OpponentMatchScore';
import { OpponentLink } from '../../teams/controls/OpponentLink';
import { Icon } from '../../controls/Icons/Icon';
import { selectReadOnlyMatches, useTtcDispatch, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { frenoyReadOnlyMatchSync } from '../../../reducers/readonlyMatchesReducer';

type DivisionMatchesSectionProps = {
  match: IMatch;
};

export const DivisionMatchesSection = ({ match }: DivisionMatchesSectionProps) => {
  const dispatch = useTtcDispatch();
  const readonlyMatches = useTtcSelector(selectReadOnlyMatches);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [modalMatch, setModalMatch] = useState<IMatch | null>(null);

  const team = match.getTeam();
  const competition = team.competition === 'Sporta' ? 'Sporta' : 'Vttl';

  const todayDivisionMatches = readonlyMatches
    .filter(m => m.competition === competition)
    .filter(m => m.frenoyDivisionId === team.frenoy.divisionId)
    .filter(m => m.week === match.week)
    .filter(m => m.shouldBePlayed)
    .filter(m => !m.isOurMatch);

  // Auto-sync every 10 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        todayDivisionMatches.forEach(m => dispatch(frenoyReadOnlyMatchSync(m)));
      },
      10 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, [todayDivisionMatches, dispatch]);

  if (todayDivisionMatches.length === 0) {
    return <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: 8 }}>Geen andere wedstrijden vandaag</div>;
  }

  const handleRowClick = (matchId: number) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  const handleFullView = (m: IMatch) => {
    setModalMatch(m);
  };

  const teamCellStyle: React.CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 120,
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Table size="sm" striped hover style={{ marginBottom: 0, tableLayout: 'fixed' }}>
        <tbody>
          {todayDivisionMatches.map(m => {
            const hasPlayers = m.players.length > 0;
            const isPlayed = m.isSyncedWithFrenoy && m.score;
            const homeWon = isPlayed && m.score.home > m.score.out;
            const awayWon = isPlayed && m.score.out > m.score.home;
            const isDifferentDay = !m.date.isSame(match.date, 'day');
            return (
              <React.Fragment key={m.id}>
                <tr style={{ cursor: hasPlayers ? 'pointer' : 'default' }} onClick={() => hasPlayers && handleRowClick(m.id)}>
                  <td style={teamCellStyle}>
                    <OpponentLink team={team} opponent={m.home} />
                    {homeWon && <Icon fa="fa fa-trophy" style={{ marginLeft: 4, color: '#ffc107' }} />}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 600, width: 70 }}>
                    {isDifferentDay && m.scoreType !== 'WalkOver' && !m.isSyncedWithFrenoy ? (
                      <span style={{ color: '#666', fontWeight: 400 }}>{m.date.format('ddd')}</span>
                    ) : !m.isSyncedWithFrenoy && m.scoreType !== 'WalkOver' ? (
                      <span style={{ color: '#666', fontWeight: 400 }}>{m.date.format('HH:mm')}</span>
                    ) : (
                      <OpponentMatchScore readonlyMatch={m} ownTeamId={team.id} />
                    )}
                  </td>
                  <td style={{ ...teamCellStyle, textAlign: 'right' }}>
                    {awayWon && <Icon fa="fa fa-trophy" style={{ marginRight: 4, color: '#ffc107' }} />}
                    <OpponentLink team={team} opponent={m.away} />
                  </td>
                </tr>
                {expandedMatch === m.id && hasPlayers && (
                  <tr>
                    <td colSpan={3} style={{ padding: 8 }}>
                      <OtherMatchPlayerResults match={m} onFullView={handleFullView} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </Table>

      <Modal show={!!modalMatch} onHide={() => setModalMatch(null)} fullscreen style={{ zIndex: 99999 }}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMatch?.getClub('home')?.name} {modalMatch?.home.teamCode} vs {modalMatch?.getClub('away')?.name} {modalMatch?.away.teamCode}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 6 }}>{modalMatch && <ReadonlyIndividualMatches match={modalMatch} />}</Modal.Body>
      </Modal>
    </div>
  );
};
