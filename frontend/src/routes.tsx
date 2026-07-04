import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes as Switch, useLocation } from 'react-router-dom';
import { logger } from './utils/logger';
import { Competition, ITeam, ITeamOpponent } from './models/model-interfaces';
import { useInitialLoad } from './utils/initialLoad';
import { App } from './components/App/App';
import Intro from './components/App/Intro';
import { NotFound } from './components/other/NotFound';
import { useErrorHandling } from './utils/hooks/useErrorHandling';
import t from './locales';
import { useSignalR } from './utils/hooks/useSignalR';

const Players = React.lazy(() => import('./components/players/Players').then(m => ({ default: m.Players })));
const Player = React.lazy(() => import('./components/players/Player').then(m => ({ default: m.Player })));
const Login = React.lazy(() => import('./components/users/Login').then(m => ({ default: m.Login })));
const ForgotPassword = React.lazy(() => import('./components/users/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ForgotPasswordReset = React.lazy(() => import('./components/users/ForgotPassword').then(m => ({ default: m.ForgotPasswordReset })));
const Profile = React.lazy(() => import('./components/users/Profile').then(m => ({ default: m.Profile })));
const Links = React.lazy(() => import('./components/other/Links'));
const Administration = React.lazy(() => import('./components/other/Administration').then(m => ({ default: m.Administration })));
const GeneralInfo = React.lazy(() => import('./components/other/GeneralInfo').then(m => ({ default: m.GeneralInfo })));
const Matches = React.lazy(() => import('./components/matches/Matches').then(m => ({ default: m.Matches })));
const MatchesToday = React.lazy(() => import('./components/matches/MatchesToday').then(m => ({ default: m.MatchesToday })));
const MatchesWeek = React.lazy(() => import('./components/matches/MatchesWeek').then(m => ({ default: m.MatchesWeek })));
const RoutedMatchCard = React.lazy(() => import('./components/matches/Match/RoutedMatchCard').then(m => ({ default: m.RoutedMatchCard })));
const Facts = React.lazy(() => import('./components/other/Facts'));
const Teams = React.lazy(() => import('./components/teams/Teams').then(m => ({ default: m.Teams })));
const Admin = React.lazy(() => import('./components/admin/Admin'));
const OpponentOverview = React.lazy(() => import('./components/teams/OpponentOverview').then(m => ({ default: m.OpponentOverview })));

const RouterEffects = () => {
  const location = useLocation();
  useEffect(() => {
    logger.breadcrumb('route', { to: location.pathname });
  }, [location.pathname]);
  return null;
};

const Routes = () => {
  useInitialLoad();
  useErrorHandling();
  useSignalR();

  return (
    <BrowserRouter>
      <RouterEffects />
      <Switch>
        <Route path={`${t.route('matchesWeek')}/:week?/:comp?`} element={<App Component={MatchesWeek} />} />
        <Route path={`${t.route('teams')}/:tabKey?/:view?`} element={<App Component={Teams} />} />
        <Route path={t.route('opponent')} element={<App Component={OpponentOverview} />} />

        <Route path={t.route('matchesToday')} element={<App Component={MatchesToday} />} />
        <Route path={t.route('matches')} element={<App Component={Matches} />} />
        <Route path={`${t.route('match')}/:tabKey?`} element={<App Component={RoutedMatchCard} />} />

        <Route path={`${t.route('profile')}/:tabKey?`} element={<App Component={Profile} />} />
        <Route path={t.route('forgotPassword')} element={<App Component={ForgotPassword} />} />
        <Route path={`${t.route('forgotPassword')}/:guid`} element={<App Component={ForgotPasswordReset} />} />
        <Route path={t.route('login')} element={<App Component={Login} />} />

        <Route path={`${t.route('players')}/:tabKey?`} element={<App Component={Players} />} />
        <Route path={t.route('player')} element={<App Component={Player} />} />

        <Route path={t.route('generalInfo')} element={<App Component={GeneralInfo} />} />
        <Route path={t.route('facts')} element={<App Component={Facts} />} />
        <Route path={t.route('administration')} element={<App Component={Administration} />} />
        <Route path={t.route('links')} element={<App Component={Links} />} />

        <Route path={`${t.route('admin')}/:tabKey?`} element={<App Component={Admin} />} />

        <Route path="/" element={<App Component={Intro} />} />
        <Route path="*" element={<App Component={NotFound} />} />
      </Switch>
    </BrowserRouter>
  );
};

export const browseTo = {
  getTeam({ competition, teamCode = 'A' }: ITeam, view = 'main') {
    return `${t.route('teams').replace(':competition', competition)}/${teamCode}/${view}`;
  },
  getOpponent(competition: Competition, { clubId, teamCode }: ITeamOpponent) {
    return t
      .route('opponent')
      .replace(':competition', competition)
      .replace(':clubId', clubId?.toString())
      .replace(':teamCode', teamCode || '');
  },
};

export default Routes;
