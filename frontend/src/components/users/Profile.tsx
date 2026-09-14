import { useNavigate, Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';
import { TabbedContainer } from '../controls/TabbedContainer';
import { ChangePassword } from './ChangePassword';
import { ChangePlayerDetails } from './ChangePlayerDetails';
import ProfilePhotoForm, { ProfilePhotoAvatarForm } from './ProfilePhotoForm';
import PlayerLineup from './PlayerLineup';
import { IPlayer } from '../../models/model-interfaces';
import { t } from '../../locales';
import { selectTeams, selectUser, useTtcDispatch, useTtcSelector } from '../../utils/hooks/storeHooks';
import { displayMobile } from '../../models/PlayerModel';
import { logout } from '../../reducers/userReducer';
import { CaptainPlayerLineup } from './CaptainPlayerLineup';

const tabEventKeys = {
  main: 'main',
  editDetails: 'editDetails',
  editPicture: 'editPicture',
  editAvatar: 'editAvatar',
  editPassword: 'editPassword',
  editHolidays: 'editHolidays',
  editCaptain: 'editCaptain',
};

export const Profile = () => {
  const navigate = useNavigate();
  const user = useTtcSelector(selectUser);
  const player = useTtcSelector(state => state.players.find(x => x.id === user.playerId))!;
  const dispatch = useTtcDispatch();
  const allTeams = useTtcSelector(selectTeams);
  const yourTeams = allTeams.filter(team => user.teams.includes(team.id));
  const yourCaptainTeams = yourTeams.filter(team => team.isCaptain(user.getPlayer()));

  const logoutAndGoHome = () => {
    dispatch(logout());
    navigate('/');
  };

  const renderTabContent = (eventKey: string) => {
    switch (eventKey) {
      case tabEventKeys.main:
        return <ProfilePlayerDetails player={user.getPlayer()} logoutAndGoHome={logoutAndGoHome} />;
      case tabEventKeys.editDetails:
        return <ChangePlayerDetails player={player} />;
      case tabEventKeys.editPicture:
        return <ProfilePhotoForm user={user} />;
      case tabEventKeys.editAvatar:
        return <ProfilePhotoAvatarForm />;
      case tabEventKeys.editPassword:
        return <ChangePassword />;
      case tabEventKeys.editHolidays:
        return <PlayerLineup teams={yourTeams} playerId={user.playerId} disableBlockedMatches showToog />;
      case tabEventKeys.editCaptain:
        return <CaptainPlayerLineup teams={yourCaptainTeams} />;
      default:
        return null;
    }
  };

  if (!user.playerId) {
    return <div />;
  }

  const tabConfig = [
    { key: tabEventKeys.main, title: t('profile.main') },
    { key: tabEventKeys.editHolidays, title: t('profile.editHolidays') },
    { key: tabEventKeys.editPassword, title: t('profile.editPassword') },
    { key: tabEventKeys.editDetails, title: t('profile.editDetails') },
    { key: tabEventKeys.editPicture, title: t('profile.editPicture') },
    { key: tabEventKeys.editAvatar, title: t('profile.editAvatar') },
  ];
  if (yourCaptainTeams.length) {
    tabConfig.splice(2, 0, { key: tabEventKeys.editCaptain, title: t('profile.editCaptain') });
  }

  if (user.isSystem()) {
    return (
      <div>
        <h1>SYSTEM USER</h1>
        <Button variant="secondary" style={{ marginTop: -15 }} onClick={logoutAndGoHome}>
          {t('login.logoutButton')}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 15, marginBottom: 20 }}>
      <TabbedContainer
        widthTreshold={760}
        selectedTab={tabEventKeys.main}
        tabKeys={tabConfig}
        route={{ base: t.route('profile'), subs: 'profileTabs' }}
        tabRenderer={eventKey => renderTabContent(eventKey)}
      />
    </div>
  );
};

type ProfilePlayerDetailsProps = {
  player: IPlayer;
  logoutAndGoHome: () => void;
};

const ProfilePlayerDetails = ({ player, logoutAndGoHome }: ProfilePlayerDetailsProps) => {
  const playerSlug = player.name.toLowerCase().replace(/\s/g, '-');
  const playerUrl = t.route('player').replace(':playerId', encodeURI(playerSlug));

  return (
    <div style={{ padding: 10 }}>
      <h3>{player.name}</h3>
      <p>
        <strong>{t('player.email')}</strong>&nbsp;{player.contact.email}
        <br />
        <strong>{t('player.gsm')}</strong>&nbsp;{displayMobile(player.contact.mobile)}
        <br />
        <strong>{t('player.address')}</strong>&nbsp;{player.contact.address}
        <br />
        <strong>{t('player.city')}</strong>&nbsp;{player.contact.city}
      </p>

      <Link to={playerUrl}>
        <Button variant="primary" style={{ marginTop: 15, marginRight: 10 }}>
          {t('nav.myPlayerPage')}
        </Button>
      </Link>
      <Button variant="secondary" style={{ marginTop: 15 }} onClick={() => logoutAndGoHome()}>
        {t('login.logoutButton')}
      </Button>
    </div>
  );
};
