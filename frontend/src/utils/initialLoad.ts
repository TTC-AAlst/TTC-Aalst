import { useEffect } from 'react';
import { fetchClubs } from '../reducers/clubsReducer';
import { useTtcDispatch, useTtcSelector } from './hooks/storeHooks';
import { fetchConfig, setInitialLoad } from '../reducers/configReducer';
import { fetchPlayers, fetchRankingPredictions } from '../reducers/playersReducer';
import { fetchTeams, loadTeamRanking } from '../reducers/teamsReducer';
import { fetchMatches, frenoyMatchSync } from '../reducers/matchesReducer';
import { validateToken } from '../reducers/userActions';
import { logger } from './logger';

export const useInitialLoad = () => {
  const dispatch = useTtcDispatch();
  const playerId = useTtcSelector(state => state.user.playerId);
  const config = useTtcSelector(state => state.config);
  const matches = useTtcSelector(state => state.matches);
  const teams = useTtcSelector(state => state.teams);

  useEffect(() => {
    const initialLoad = async () => {
      if (config.initialLoad === 'done') {
        return;
      }

      const token = localStorage.getItem('token');

      if (token && !playerId) {
        try {
          localStorage.removeItem('token');
          await dispatch(validateToken(token)).unwrap();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Token validation failed', e);
        }
      }

      if (token && config.initialLoad === 'evaluating-start') {
        return;
      }

      try {
        await Promise.all([
          dispatch(fetchClubs()).unwrap(),
          dispatch(fetchConfig()).unwrap(),
          dispatch(fetchPlayers()).unwrap(),
          dispatch(fetchTeams()).unwrap(),
          dispatch(fetchMatches()).unwrap(),
        ]);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Initial Load failed', err);
      }

      dispatch(setInitialLoad('done'));
    };

    try {
      initialLoad().then(
        () => {},
        err => {
          // eslint-disable-next-line no-console
          console.error('Initial Load failed (promise)', err);
        },
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Initial Load failed (catch block)', err);
    }
  }, [playerId, config.initialLoad, dispatch]);

  useEffect(() => {
    if (config.initialLoad === 'done') {
      teams.forEach(team => {
        dispatch(loadTeamRanking({ team }));
      });

      dispatch(fetchRankingPredictions())
        .unwrap()
        .catch(err => {
          logger.error(`ranking predictions failed: ${err?.message || String(err)}`, { stack: err?.stack });
        });

      matches.forEach(match => {
        dispatch(frenoyMatchSync({ match }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.initialLoad]);
};
