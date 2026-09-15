import { useNavigate } from 'react-router-dom';
import { Badge, Offcanvas } from 'react-bootstrap';
import { t } from '../../../locales';
import { selectMatchesBeingPlayed, selectPlayers, selectUser, useTtcSelector } from '../../../utils/hooks/storeHooks';
import PlayerModel from '../../../models/PlayerModel';

type NavigationProps = {
  closeNav: () => void;
  navOpen: boolean;
};

export const Navigation = ({ navOpen, closeNav }: NavigationProps) => {
  const matchesToday = useTtcSelector(selectMatchesBeingPlayed);
  const navigate = useNavigate();
  const user = useTtcSelector(selectUser);
  const players = useTtcSelector(selectPlayers);
  const hasYouthTeam = useTtcSelector(state => state.teams.some(team => team.competition === 'Jeugd'));
  const currentPlayer = user.playerId ? players.find(p => p.id === user.playerId) : null;
  const playerUrl = currentPlayer ? t.route('player').replace(':playerId', encodeURI(new PlayerModel(currentPlayer).slug)) : '';

  const handleClickHelpButton = () => {
    window.open('https://ttc-aalst.github.io/onboarding/', '_blank');
  };

  const goto = (url: string) => {
    closeNav();
    navigate(url);
  };

  return (
    <Offcanvas show={navOpen} onHide={closeNav} placement="start">
      <Offcanvas.Header closeButton className="bg-primary text-white">
        <Offcanvas.Title className="clickable" style={{ fontSize: '1.7rem' }} onClick={closeNav}>
          {t('clubName')}
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="p-0">
        <div className="list-group list-group-flush">
          <button className="list-group-item list-group-item-action" onClick={() => goto('/')}>
            {t('nav.home')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('matches'))}>
            {t('nav.matches')}
          </button>
          {matchesToday.length ? (
            <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('matchesToday'))}>
              {t('nav.matchesToday')} <Badge bg="secondary">{matchesToday.length}</Badge>
            </button>
          ) : null}
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('matchesWeek'))}>
            {t('nav.matchesWeek')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('teams', { competition: 'Vttl' }))}>
            {t('nav.teamsVttl')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('teams', { competition: 'Sporta' }))}>
            {t('nav.teamsSporta')}
          </button>
          {hasYouthTeam && (
            <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('teams', { competition: 'Jeugd' }))}>
              {t('nav.teamsJeugd')}
            </button>
          )}
          {currentPlayer && (
            <button className="list-group-item list-group-item-action" onClick={() => goto(playerUrl)}>
              {t('nav.myPlayerPage')}
            </button>
          )}
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('players'))}>
            {t('nav.players')}
          </button>
          {user.isAdmin() ? (
            <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('admin'))}>
              {t('nav.admin')}
            </button>
          ) : null}
          <hr className="my-0" />
          {currentPlayer && (
            <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('publicHome'))}>
              {t('nav.publicHome')}
            </button>
          )}
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('generalInfo'))}>
            {t('nav.generalInfo')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('administration'))}>
            {t('nav.administration')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('links'))}>
            {t('nav.links')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={() => goto(t.route('facts'))}>
            {t('nav.facts')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={handleClickHelpButton}>
            {t('nav.help')}
          </button>
          <button className="list-group-item list-group-item-action" onClick={closeNav}>
            {t('nav.closeMenu')}
          </button>
          <hr className="my-0" />
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};
