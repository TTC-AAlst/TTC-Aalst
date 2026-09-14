import React from 'react';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import type { RootState } from '../store';
import matchesReducer, { freeMatchesSlice } from '../reducers/matchesReducer';
import configReducer from '../reducers/configReducer';
import userReducer from '../reducers/userReducer';
import playersReducer, { playersQuittersSlice, eventsSlice } from '../reducers/playersReducer';
import teamsReducer, { teamRankingsSlice } from '../reducers/teamsReducer';
import clubsReducer from '../reducers/clubsReducer';
import readonlyMatchesReducer from '../reducers/readonlyMatchesReducer';
import matchInfoReducer from '../reducers/matchInfoReducer';
import clubPlayersReducer from '../reducers/clubPlayersReducer';
import toogReducer from '../reducers/toogReducer';

type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

const rootReducer = combineReducers({
  config: configReducer,
  user: userReducer,
  matches: matchesReducer,
  freeMatches: freeMatchesSlice.reducer,
  readonlyMatches: readonlyMatchesReducer,
  matchInfo: matchInfoReducer,
  teams: teamsReducer,
  teamRankings: teamRankingsSlice.reducer,
  players: playersReducer,
  playersQuitters: playersQuittersSlice.reducer,
  events: eventsSlice.reducer,
  clubs: clubsReducer,
  clubPlayers: clubPlayersReducer,
  toog: toogReducer,
});

function createTestStore(preloadedState?: DeepPartial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as Partial<RootState>,
  });
}

type RenderWithStoreOptions = {
  preloadedState?: DeepPartial<RootState>;
} & Omit<RenderOptions, 'wrapper'>;

export function renderWithProviders(ui: React.ReactElement, { preloadedState, ...renderOptions }: RenderWithStoreOptions = {}) {
  const store = createTestStore(preloadedState);
  const Wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

export const TestRouter = ({ children, ...props }: MemoryRouterProps) => <MemoryRouter {...props}>{children}</MemoryRouter>;
