import { useParams } from 'react-router-dom';
import { TabbedContainer } from '../controls/TabbedContainer';
import { AdminPlayers } from './AdminPlayers';
import AdminTeams from './AdminTeams';
import AdminClubs from './AdminClubs';
import AdminDev from './AdminDev';
import { AdminPlayerLineup } from './AdminPlayerLineup';
import ProfilePhotoForm, { ProfilePhotoAvatarForm } from '../users/ProfilePhotoForm';
import { AdminEmail } from './AdminEmail';
import { AdminMatches } from './AdminMatches';
import { AdminParams } from './AdminParams';
import { AdminToog } from './AdminToog';
import { t } from '../../locales';
import { selectTeams, selectUser, useTtcSelector } from '../../utils/hooks/storeHooks';

const tabEventKeys = {
  players: 'players',
  teams: 'teams',
  clubs: 'clubs',
  formation: 'formation',
  toog: 'toog',
  pictures: 'pictures',
  emails: 'emails',
  matches: 'matches',
  configParams: 'configParams',
  dev: 'dev',
};

const Admin = () => {
  const user = useTtcSelector(selectUser);
  const teams = useTtcSelector(selectTeams);
  const params = useParams();
  if (!user.isAdmin()) {
    return null;
  }

  const renderSection = (eventKey: string) => {
    switch (eventKey) {
      case tabEventKeys.teams:
        return <AdminTeams teams={teams} />;
      case tabEventKeys.players:
        return <AdminPlayers />;
      case tabEventKeys.clubs:
        return <AdminClubs />;
      case tabEventKeys.formation:
        return <AdminPlayerLineup />;
      case tabEventKeys.toog:
        return <AdminToog />;
      case tabEventKeys.pictures:
        return (
          <div>
            <h1 style={{ marginLeft: 25 }}>Foto</h1>
            <ProfilePhotoForm user={user} />
            <hr style={{ marginTop: 50 }} />
            <h1 style={{ marginLeft: 25 }}>Avatar</h1>
            <ProfilePhotoAvatarForm />
          </div>
        );
      case tabEventKeys.emails:
        return <AdminEmail />;
      case tabEventKeys.dev:
        return <AdminDev />;
      case tabEventKeys.matches:
        return <AdminMatches />;
      case tabEventKeys.configParams:
        return <AdminParams />;
      default:
        return null;
    }
  };

  const tabConfig = [
    { key: tabEventKeys.players, title: 'Spelers' },
    { key: tabEventKeys.teams, title: 'Teams' },
    { key: tabEventKeys.clubs, title: 'Clubs' },
    { key: tabEventKeys.formation, title: 'Opstellingen' },
    { key: tabEventKeys.toog, title: 'Toog' },
    { key: tabEventKeys.matches, title: 'Matchen' },
    { key: tabEventKeys.pictures, title: "Foto's" },
    { key: tabEventKeys.emails, title: 'Email' },
    { key: tabEventKeys.configParams, title: 'Params' },
    { key: tabEventKeys.dev, title: 'Dev' },
  ];

  return (
    <TabbedContainer
      selectedTab={params.tabKey ?? tabEventKeys.players}
      style={{ marginTop: 10, marginBottom: 20 }}
      route={{ base: t.route('admin') }}
      tabKeys={tabConfig}
      tabRenderer={eventKey => renderSection(eventKey)}
    />
  );
};

export default Admin;
