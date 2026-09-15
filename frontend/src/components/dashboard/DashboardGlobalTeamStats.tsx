import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Strike } from '../controls/controls/Strike';
import { TeamRankingBadges } from '../teams/controls/TeamRankingBadges';
import { TeamPosition } from '../teams/controls/TeamPosition';
import { selectTeams, selectUserTeams, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';
import { useViewport } from '../../utils/hooks/useViewport';
import { browseTo } from '../../routes';
import { ITeam } from '../../models/model-interfaces';
import t from '../../locales';
import { Icon } from '../controls/Icons/Icon';
import { loadTeamPositions, hasEnoughWeeks } from '../../reducers/rankingHistoryReducer';
import { DashboardTeamPositions } from './DashboardTeamPositions';

export const DashboardGlobalTeamStats = () => {
  const dispatch = useTtcDispatch();
  const teams = useTtcSelector(selectTeams);
  const userTeams = useTtcSelector(selectUserTeams);
  const positions = useTtcSelector(state => state.rankingHistory.positions);
  const viewport = useViewport();
  const isLargeDevice = viewport.width >= 1200;
  const isSmallDevice = viewport.width < 576;
  const [showOtherTeams, setShowOtherTeams] = useState(false);

  useEffect(() => {
    dispatch(loadTeamPositions());
  }, [dispatch]);

  const userTeamIds = userTeams.map(team => team.id);
  const primaryTeams = userTeams;
  const otherTeams = teams.filter(team => !userTeamIds.includes(team.id));

  const renderPrimaryTeamStats = (team: ITeam) => {
    const ranking = team.getDivisionRanking();
    if (ranking.empty) {
      return null;
    }

    return (
      <div
        key={team.id}
        style={{
          padding: 10,
          marginBottom: 8,
          backgroundColor: '#F0F0F0',
          borderRadius: 4,
          border: '2px solid #4CAF50',
        }}
      >
        <Link to={browseTo.getTeam(team)} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TeamPosition team={team} />
              <div>
                <strong>{team.renderOwnTeamTitle()}</strong>
                {!isSmallDevice && <div style={{ fontSize: '0.9em', color: '#666' }}>{team.getDivisionDescription()}</div>}
              </div>
            </div>
            <TeamRankingBadges team={team} style={isSmallDevice ? { fontSize: 18, marginTop: -5 } : undefined} />
          </div>
        </Link>
      </div>
    );
  };

  const renderCompactTeamStats = (team: ITeam) => {
    const ranking = team.getDivisionRanking();
    if (ranking.empty) {
      return null;
    }

    return (
      <Link key={team.id} to={browseTo.getTeam(team)} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            padding: 6,
            marginBottom: 4,
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
        </div>
      </Link>
    );
  };

  let smallGridTemplateColumns = isLargeDevice ? '1fr 1fr 1fr' : '1fr 1fr';
  if (isSmallDevice) smallGridTemplateColumns = '1fr';

  const cards = (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: isLargeDevice ? '1fr 1fr' : '1fr', gap: 8, marginTop: 8 }}>
        {primaryTeams.map(team => renderPrimaryTeamStats(team))}
      </div>

      {otherTeams.length > 0 &&
        (isSmallDevice && !showOtherTeams ? (
          <button
            type="button"
            onClick={() => setShowOtherTeams(true)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '0.9em',
              color: '#666',
            }}
          >
            Meer Teams Tonen
          </button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: smallGridTemplateColumns, gap: 4 }}>{otherTeams.map(team => renderCompactTeamStats(team))}</div>
        ))}
    </>
  );

  return (
    <div style={{ marginBottom: 20 }}>
      <Strike text={t('dashboard.globalTeamStats')} style={{ marginBottom: 6 }} />
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
