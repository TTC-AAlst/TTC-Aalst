import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Button, ButtonGroup, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { IMatch } from '../../../models/model-interfaces';
import OwnPlayer from '../Match/OwnPlayer';
import OpponentPlayer from '../Match/OpponentPlayer';
import { IndividualMatches } from '../Match/IndividualMatches';
import { MatchReport } from '../Match/MatchReport';
import { OpponentMatches } from '../Match/OpponentMatches';
import { OpponentsFormation } from '../Match/OpponentsFormation';
import { OpponentsTeamFormation } from '../Match/OpponentsTeamFormation';
import { selectOpponentMatches } from '../../../reducers/selectors/selectOpponentMatches';
import { useViewport } from '../../../utils/hooks/useViewport';
import { PreviousEncounters } from '../Match/PreviousEncounters';
import { Scoresheet } from '../Match/Scoresheet';
import { PlayerCompetitionBadge } from '../../players/PlayerBadges';
import { Icon } from '../../controls/Icons/Icon';
import { EditIcon } from '../../controls/Icons/EditIcon';
import { t } from '../../../locales';
import { selectReadOnlyMatches, selectUser, useTtcDispatch, useTtcSelector } from '../../../utils/hooks/storeHooks';
import { getOpponentMatches } from '../../../reducers/readonlyMatchesReducer';
import { DivisionMatchesSection } from './DivisionMatchesSection';
import { getPreviousEncounters } from '../../../reducers/matchInfoReducer';
import { OpponentPlayerSelector } from './OpponentPlayerSelector';
import { OwnPlayerSelector } from './OwnPlayerSelector';
import { TeamRankingBadges } from '../../teams/controls/TeamRankingBadges';
import { MatchOtherRoundButton } from '../controls/ViewMatchDetailsButton';
import { MatchCardAdmin } from '../Match/MatchCardAdmin';

type MobileLiveMatchInProgressProps = {
  match: IMatch;
  /** When true, buttons show icons only (for multi-card layouts like /vandaag) */
  compact?: boolean;
};

// Players can only be picked before the match is decided (Frenoy-synced — incl. walkovers, which
// have a final result but no games) and before any games have been entered.
const canPickPlayers = (match: IMatch) => !match.isSyncedWithFrenoy && match.games.length === 0;

export const MobileLiveMatchInProgress = ({ match, compact = false }: MobileLiveMatchInProgressProps) => {
  const hasPlayersOrGames = match.games.length || match.getTheirPlayers().length;
  const hasStarted = match.date.isBefore(dayjs());
  const canEnterOpponents = match.date.subtract(1, 'hour').isBefore(dayjs());

  // Pre-start: show our formation and away match details
  const isToday = match.date.isSame(dayjs(), 'day');
  if (!hasPlayersOrGames) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 8 }}>
        {!isToday && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon fa="fa fa-calendar" />
            <span style={{ fontWeight: 600 }}>{match.date.format('dddd D MMMM')}</span>
            {!match.isStandardStartTime() && <span style={{ color: '#666' }}>- {match.date.format('HH:mm')}</span>}
          </div>
        )}
        <OurFormationPreStart match={match} />
        {!match.isHomeMatch && !hasStarted && <AwayMatchDetails match={match} />}
        {canEnterOpponents && <OpponentPlayersPreStart match={match} />}
        <MatchActionButtons match={match} compact={compact} />
      </div>
    );
  }

  // Match in progress or finished
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <FormationsWithResults match={match} />
      <MatchActionButtons match={match} compact={compact} />
    </div>
  );
};

const FormationsWithResults = ({ match }: { match: IMatch }) => {
  const [showEditOpponents, setShowEditOpponents] = useState(false);
  const [showEditOwn, setShowEditOwn] = useState(false);
  const user = useTtcSelector(selectUser);
  const canEditPlayers = canPickPlayers(match);

  return (
    <div style={{ padding: 8 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <SectionTitle>{t('match.playersVictoryTitle')}</SectionTitle>
            {canEditPlayers && user.canEditFormation(match) && <EditIcon style={{ cursor: 'pointer' }} onClick={() => setShowEditOwn(!showEditOwn)} />}
          </div>
          {match
            .getOwnPlayers()
            .filter(ply => ply.status === match.block)
            .map(ply => (
              <OwnPlayer key={ply.position} match={match} ply={ply} showRanking />
            ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <SectionTitle>{t('match.playersOpponentsTitle')}</SectionTitle>
            {canEditPlayers && user.playerId > 0 && <EditIcon style={{ cursor: 'pointer' }} onClick={() => setShowEditOpponents(!showEditOpponents)} />}
          </div>
          {match.getTheirPlayers().map(ply => (
            <OpponentPlayer key={ply.position} ply={ply} t={t} competition={match.competition} fullName={false} />
          ))}
        </div>
      </div>
      {showEditOwn && (
        <div style={{ marginTop: 16 }}>
          <OwnPlayerSelector match={match} initialOpen onClose={() => setShowEditOwn(false)} />
        </div>
      )}
      {showEditOpponents && (
        <div style={{ marginTop: 16 }}>
          <OpponentPlayerSelector match={match} initialOpen onClose={() => setShowEditOpponents(false)} />
        </div>
      )}
    </div>
  );
};

const MatchActionButtons = ({ match, compact = false }: { match: IMatch; compact?: boolean }) => {
  const [showGames, setShowGames] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOpponentModal, setShowOpponentModal] = useState(false);
  const [showEncountersModal, setShowEncountersModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showDivision, setShowDivision] = useState(false);
  const user = useTtcSelector(selectUser);
  const dispatch = useTtcDispatch();
  const opponentMatches = useTtcSelector(state => selectOpponentMatches(state, match));
  const opponentMatchesList = [...opponentMatches.home, ...opponentMatches.away].filter(m => m.shouldBePlayed);
  const readonlyMatches = useTtcSelector(selectReadOnlyMatches);
  const viewport = useViewport();
  // In compact mode (multi-card layout), always show icons only
  // In non-compact mode (single card), use viewport to determine
  const isMobile = compact || viewport.width < 768;

  const hasReportOrComments = !!match.description || match.comments.length > 0;
  const hasTheirPlayers = match.getTheirPlayers().length > 0;

  // Calculate today's division matches (same week as our match)
  const team = match.getTeam();
  const competition = team.competition === 'Sporta' ? 'Sporta' : 'Vttl';
  const todayDivisionMatches = readonlyMatches
    .filter(m => m.competition === competition)
    .filter(m => m.frenoyDivisionId === team.frenoy.divisionId)
    .filter(m => m.week === match.week)
    .filter(m => m.shouldBePlayed)
    .filter(m => !m.isOurMatch);

  useEffect(() => {
    dispatch(getOpponentMatches({ teamId: match.teamId, opponent: match.opponent }));
    // Fetch ALL division matches (for Afdeling button)
    dispatch(getOpponentMatches({ teamId: match.teamId }));
  }, [dispatch, match.teamId, match.opponent]);

  useEffect(() => {
    if (hasTheirPlayers) {
      dispatch(getPreviousEncounters(match));
    }
  }, [dispatch, match, hasTheirPlayers]);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <ButtonGroup size={isMobile ? undefined : 'sm'}>
          <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.tabs.report')}</Tooltip>}>
            <Button variant="outline-secondary" onClick={() => setShowReportModal(true)}>
              <Icon fa={hasReportOrComments ? 'fa fa-commenting-o' : 'fa fa-comment-o'} />
              {!isMobile && <span style={{ marginLeft: 4 }}>{t('match.tabs.report')}</span>}
            </Button>
          </OverlayTrigger>
          {match.games.length > 0 && (
            <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.tabs.matchesTitle')}</Tooltip>}>
              <Button variant={showGames ? 'secondary' : 'outline-secondary'} onClick={() => setShowGames(!showGames)}>
                <Icon fa="fa fa-list-ol" />
                {!isMobile && <span style={{ marginLeft: 4 }}>{t('match.tabs.matches')}</span>}
              </Button>
            </OverlayTrigger>
          )}
          <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.tabs.opponentsFormationTitle')}</Tooltip>}>
            <Button variant="outline-secondary" onClick={() => setShowOpponentModal(true)}>
              <Icon fa="fa fa-users" />
              {!isMobile && <span style={{ marginLeft: 4 }}>{t('match.individual.opponentPlayer')}</span>}
            </Button>
          </OverlayTrigger>
          <MatchOtherRoundButton match={match} shortLabel={isMobile} small={!isMobile} />
          {hasTheirPlayers && (
            <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.tabs.previousEncountersTitle')}</Tooltip>}>
              <Button variant="outline-secondary" onClick={() => setShowEncountersModal(true)}>
                <Icon fa="fa fa-history" />
                {!isMobile && <span style={{ marginLeft: 4 }}>{t('match.tabs.previousEncounters')}</span>}
              </Button>
            </OverlayTrigger>
          )}
          {todayDivisionMatches.length > 0 && (
            <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.tabs.division')}</Tooltip>}>
              <Button variant={showDivision ? 'secondary' : 'outline-secondary'} onClick={() => setShowDivision(!showDivision)}>
                <Icon fa="fa fa-table" />
                {!isMobile && <span style={{ marginLeft: 4 }}>{t('match.tabs.division')}</span>}
              </Button>
            </OverlayTrigger>
          )}
          {user.isDev() && (
            <Button variant="outline-secondary" aria-label="admin" onClick={() => setShowAdminModal(true)}>
              <Icon fa="fa fa-cog" />
            </Button>
          )}
        </ButtonGroup>
      </div>

      {showGames && (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <IndividualMatches match={match} ownPlayerId={user.playerId} />
        </div>
      )}

      {showDivision && (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <DivisionMatchesSection match={match} />
        </div>
      )}

      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} fullscreen style={{ zIndex: 99999 }}>
        <Modal.Header closeButton>
          <Modal.Title>
            {match.getTeam().renderOwnTeamTitle()} vs {match.renderOpponentTitle()}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 6 }}>
          <MatchReport match={match} skipContainerClass />
        </Modal.Body>
      </Modal>

      <Modal show={showOpponentModal} onHide={() => setShowOpponentModal(false)} fullscreen style={{ zIndex: 99999 }}>
        <Modal.Header closeButton>
          <Modal.Title>
            {match.renderOpponentTitle()}
            <div style={{ marginLeft: -6, marginTop: -8 }}>
              <TeamRankingBadges team={match.getTeam()} opponent={match.opponent} small />
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 6 }}>
          <h4>{t('match.tabs.opponentsFormationTitle')}</h4>
          <OpponentsTeamFormation matches={opponentMatchesList} opponent={match.opponent} limitRows />

          <h4 style={{ marginTop: 24 }}>{t('teamCalendar.individual')}</h4>
          <OpponentsFormation match={match} opponent={match.opponent} />

          <h4 style={{ marginTop: 24 }}>{t('teamCalendar.matches')}</h4>
          <OpponentMatches team={match.getTeam()} readonlyMatches={opponentMatchesList} opponent={match.opponent} roundSwitchButton />
        </Modal.Body>
      </Modal>

      <Modal show={showEncountersModal} onHide={() => setShowEncountersModal(false)} fullscreen style={{ zIndex: 99999 }}>
        <Modal.Header closeButton>
          <Modal.Title>{t('match.tabs.previousEncountersTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 6 }}>
          <PreviousEncounters match={match} />
        </Modal.Body>
      </Modal>

      <Modal show={showAdminModal} onHide={() => setShowAdminModal(false)} fullscreen style={{ zIndex: 99999 }}>
        <Modal.Header closeButton>
          <Modal.Title>admin</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 6 }}>
          <MatchCardAdmin match={match} />
        </Modal.Body>
      </Modal>
    </div>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontWeight: 600,
      fontSize: '0.85em',
      color: '#666',
      marginBottom: 8,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const OurFormationPreStart = ({ match }: { match: IMatch }) => {
  const [showScoresheet, setShowScoresheet] = useState(false);
  const [showEditOwn, setShowEditOwn] = useState(false);
  const user = useTtcSelector(selectUser);
  const playingPlayers = match.getPlayerFormation('onlyFinal').map(x => x.player);
  const canEdit = canPickPlayers(match) && user.canEditFormation(match);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <SectionTitle>{t('match.tabs.playersTitle')}</SectionTitle>
          {playingPlayers.length > 0 && canEdit && <EditIcon style={{ cursor: 'pointer' }} onClick={() => setShowEditOwn(!showEditOwn)} />}
        </div>
        {playingPlayers.length > 0 && (
          <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.tabs.scoresheet')}</Tooltip>}>
            <Button size="sm" variant={showScoresheet ? 'secondary' : 'outline-secondary'} onClick={() => setShowScoresheet(!showScoresheet)}>
              <Icon fa="fa fa-table" />
            </Button>
          </OverlayTrigger>
        )}
      </div>
      {playingPlayers.length === 0 && canEdit && <OwnPlayerSelector match={match} />}
      {playingPlayers.length === 0 && !canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666' }}>
          <Icon fa="fa fa-question-circle" />
          <span style={{ fontStyle: 'italic' }}>{t('match.formationUnknown')}</span>
        </div>
      )}
      {playingPlayers.length > 0 && showEditOwn && (
        <div style={{ marginBottom: 8 }}>
          <OwnPlayerSelector match={match} initialOpen onClose={() => setShowEditOwn(false)} />
        </div>
      )}
      {playingPlayers.length > 0 && showScoresheet && <Scoresheet match={match} hideDownload />}
      {playingPlayers.length > 0 && !showScoresheet && !showEditOwn && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {playingPlayers.map(ply => (
            <PlayerCompetitionBadge
              key={ply.id}
              plyInfo={{ player: ply, matchPlayer: { status: 'Major' } }}
              competition={match.competition}
              style={{ marginBottom: 0 }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AwayMatchDetails = ({ match }: { match: IMatch }) => {
  const [showInfo, setShowInfo] = useState(false);
  const club = match.getOpponentClub();
  const loc = club?.mainLocation;
  const altLocations = club?.alternativeLocations?.filter(l => l.address) || [];
  const hasExtraInfo = loc?.comment || altLocations.length > 0;

  return (
    <div>
      <SectionTitle>{t('match.tabs.clubTitle')}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!match.isStandardStartTime() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon fa="fa fa-clock-o" />
            <span style={{ fontWeight: 600 }}>{match.date.format('HH:mm')}</span>
          </div>
        )}
        {loc?.address ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon fa="fa fa-map-marker" />
                <span style={{ fontWeight: 600 }}>{loc.description}</span>
              </div>
              <ButtonGroup size="sm">
                {hasExtraInfo && (
                  <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.club.showInfo')}</Tooltip>}>
                    <Button variant={showInfo ? 'secondary' : 'outline-secondary'} onClick={() => setShowInfo(!showInfo)}>
                      <Icon fa="fa fa-info-circle" />
                    </Button>
                  </OverlayTrigger>
                )}
                <OverlayTrigger placement="top" overlay={<Tooltip>{t('match.navigateToClub')}</Tooltip>}>
                  <Button
                    variant="outline-secondary"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.address}, ${loc.postalCode} ${loc.city}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon fa="fa fa-location-arrow" />
                  </Button>
                </OverlayTrigger>
              </ButtonGroup>
            </div>
            <div style={{ fontSize: '0.9em', color: '#666', marginLeft: 17, textTransform: 'capitalize' }}>
              {loc.address}, {loc.postalCode} {loc.city}
            </div>
            {showInfo && (
              <div style={{ marginTop: 8, marginLeft: 17 }}>
                {loc.comment && (
                  <div style={{ fontSize: '0.85em', color: '#856404', backgroundColor: '#fff3cd', padding: '4px 8px', borderRadius: 4, marginBottom: 8 }}>
                    <Icon fa="fa fa-info-circle" style={{ marginRight: 4 }} />
                    {loc.comment}
                  </div>
                )}
                {altLocations.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8em', color: '#666', textTransform: 'uppercase', marginBottom: 4 }}>{t('match.club.alternativeLocations')}</div>
                    {altLocations.map((altLoc, i) => (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 600 }}>{altLoc.description}</div>
                        <div style={{ fontSize: '0.9em', color: '#666', textTransform: 'capitalize' }}>
                          {altLoc.address}, {altLoc.postalCode} {altLoc.city}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#666', fontStyle: 'italic' }}>{t('match.club.locationUnknown')}</div>
        )}
      </div>
    </div>
  );
};

const OpponentPlayersPreStart = ({ match }: { match: IMatch }) => {
  const canEdit = canPickPlayers(match);

  return (
    <div>
      <SectionTitle>{t('match.theirFormation')}</SectionTitle>
      {canEdit ? <OpponentPlayerSelector match={match} /> : <div style={{ color: '#666', fontStyle: 'italic' }}>{t('match.opponentPlayersLocked')}</div>}
    </div>
  );
};
