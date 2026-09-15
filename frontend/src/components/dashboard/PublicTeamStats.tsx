import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Strike } from '../controls/controls/Strike';
import { TeamPosition } from '../teams/controls/TeamPosition';
import { TeamMatchButton } from './TeamMatchButton';
import { selectMatchesBeingPlayed, selectTeams, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';
import { browseTo } from '../../routes';
import { ITeam } from '../../models/model-interfaces';
import t from '../../locales';
import { Icon } from '../controls/Icons/Icon';
import { hasEnoughWeeks, loadTeamPositions } from '../../reducers/rankingHistoryReducer';
import { DashboardTeamPositions } from './DashboardTeamPositions';

const CompactTeamCard = ({ team }: { team: ITeam }) => {
  const ranking = team.getDivisionRanking();

  if (ranking.empty) {
    return null;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 4 }}>
      <Link
        to={browseTo.getTeam(team)}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          flex: 1,
          padding: 6,
          backgroundColor: '#fafafa',
          borderRadius: 4,
          border: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.85em',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TeamPosition team={team} style={{ marginRight: 4, marginTop: 0, fontSize: '0.9em' }} />
          <span>{team.renderOwnTeamTitle()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1.2em' }}>
          <span style={{ color: '#4CAF50', marginRight: 4 }}>
            <Icon fa="fa fa-thumbs-up" style={{ marginRight: 2 }} />
            {ranking.gamesWon}
          </span>
          <span style={{ color: '#FF9800', marginRight: 4 }}>
            <Icon fa="fa fa-meh-o" style={{ marginRight: 2 }} />
            {ranking.gamesDraw}
          </span>
          <span style={{ color: '#f44336' }}>
            <Icon fa="fa fa-thumbs-down" style={{ marginRight: 2 }} />
            {ranking.gamesLost}
          </span>
        </div>
      </Link>
      <TeamMatchButton team={team} />
    </div>
  );
};

export const PublicTeamStats = () => {
  const dispatch = useTtcDispatch();
  const teams = useTtcSelector(selectTeams);
  const matchesBeingPlayed = useTtcSelector(selectMatchesBeingPlayed);
  const positions = useTtcSelector(state => state.rankingHistory.positions);

  useEffect(() => {
    dispatch(loadTeamPositions());
  }, [dispatch]);

  const vttlTeams = teams.filter(team => team.competition === 'Vttl' && !team.getDivisionRanking().empty);
  const sportaTeams = teams.filter(team => team.competition === 'Sporta' && !team.getDivisionRanking().empty);

  if (vttlTeams.length === 0 && sportaTeams.length === 0) {
    return null;
  }

  const cards = (
    <Row>
      <Col md={6}>
        {vttlTeams.map(team => (
          <CompactTeamCard key={team.id} team={team} />
        ))}
      </Col>
      <Col md={6}>
        {sportaTeams.map(team => (
          <CompactTeamCard key={team.id} team={team} />
        ))}
      </Col>
    </Row>
  );

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <Strike text={t('dashboard.globalTeamStats')} style={{ flex: 1, marginBottom: 0 }} />
        {matchesBeingPlayed.length > 0 && (
          <Link to={t.route('matchesToday')}>
            <Button variant="success" size="sm" style={{ whiteSpace: 'nowrap' }}>
              {t('dashboard.matchesBeingPlayed', { count: matchesBeingPlayed.length })}
            </Button>
          </Link>
        )}
      </div>
      {hasEnoughWeeks(positions) ? (
        <Tabs defaultActiveKey="cards">
          <Tab eventKey="cards" title={t('dashboard.teamStatsCards')}>
            {cards}
          </Tab>
          <Tab eventKey="graph" title={t('dashboard.teamStatsGraph')}>
            <DashboardTeamPositions />
          </Tab>
        </Tabs>
      ) : (
        cards
      )}
    </div>
  );
};
