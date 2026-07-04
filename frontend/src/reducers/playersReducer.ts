import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { mergeInStore2 } from './immutableHelpers';
import { preservePredictions } from './preservePredictions';
import { ICacheResponse, IPlayerCompetition, IPlayerStyle, IStorePlayer, PredictionResult, IPlayerEvent } from '../models/model-interfaces';
import http from '../utils/httpClient';
import { t } from '../locales';
import { showSnackbar } from './configReducer';
import { uploadPlayer } from './userActions';
import { RootState } from '../store';

export const fetchPlayers = createAsyncThunk('players/Get', async (_, { getState }) => {
  const state = getState() as RootState;
  const lastChecked = state.config.caches.players;
  const response = await http.get<ICacheResponse<IStorePlayer>>('/players', { lastChecked });
  return response;
});

export const fetchQuitters = createAsyncThunk('players/GetQuitters', async () => {
  const response = await http.get<IStorePlayer[]>('/players/Quitters');
  return response;
});

export const fetchRankingPredictions = createAsyncThunk('players/RankingPredictions', async () => {
  const response = await http.get<PredictionResult[]>('/players/GetNextYearRankings');
  return response;
});

export const fetchPlayerEvents = createAsyncThunk('players/Events', async () => {
  const response = await http.get<IPlayerEvent[]>('/players/Events');
  return response;
});

export const fetchPlayer = createAsyncThunk('players/GetOne', async ({ id }: { id: number }) => {
  const response = await http.get<IStorePlayer>(`/players/${id}`);
  return response;
});

export const deletePlayer = createAsyncThunk('players/DeletePlayer', async (data: { playerId: number }, { dispatch }) => {
  try {
    await http.post<IStorePlayer>(`/players/DeletePlayer/${data.playerId}`);
    dispatch(showSnackbar(t('player.deletePlaterSuccess')));
    return data.playerId;
  } catch (_err) {
    dispatch(showSnackbar(t('player.deletePlayerFail')));
    return null;
  }
});

export const frenoySync = createAsyncThunk('players/FrenoySync', async (_, { dispatch }) => {
  try {
    await http.post('/players/FrenoySync');
    dispatch(showSnackbar(t('common.apiSuccess')));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

// TODO: player sync?
// export function frenoySync() {
//   return dispatch => {
//     return http.post('/players/FrenoySync')
//       .then(function() {
//         dispatch(showSnackbar(trans('common.apiSuccess')));
//       }, function(err) {
//         dispatch(showSnackbar(trans('common.apiFail')));
//         console.log('FrenoySync!', err); // eslint-disable-line
//       });
//   };

export const updatePlayer = createAsyncThunk('players/UpdatePlayer', async (data: { player: IStorePlayer; switchActive?: boolean }, { dispatch }) => {
  try {
    const response = await http.post<IStorePlayer>('/players/UpdatePlayer', data.player);
    dispatch(showSnackbar(t('player.updatePlayerSuccess')));
    return { player: response, switchActive: data.switchActive };
  } catch (_err) {
    dispatch(showSnackbar(t('player.updatePlayerFail')));
    return null;
  }
});

export const saveBoardMember = createAsyncThunk('clubs/Board/save', async (data: { playerId: number; boardFunction: string; sort: number }, { dispatch }) => {
  try {
    await http.post('/clubs/Board', data);
    dispatch(showSnackbar(t('common.apiSuccess')));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

export const deleteBoardMember = createAsyncThunk('clubs/Board/delete', async (data: { playerId: number }, { dispatch }) => {
  try {
    await http.post(`/clubs/Board/${data.playerId}`);
    dispatch(showSnackbar(t('common.apiSuccess')));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

export const updateStyle = createAsyncThunk(
  'players/UpdateStyle',
  async (data: { player: IStorePlayer; newStyle: Omit<IPlayerStyle, 'playerId'>; updatedBy: number | 'system' }, { dispatch }) => {
    try {
      const response = await http.post<IStorePlayer>('/players/UpdateStyle', { playerId: data.player.id, ...data.newStyle });
      dispatch(showSnackbar(t('common.apiSuccess')));
      // const user = storeUtil.getPlayer(data.updatedBy) || {alias: ''};
      // TODO: broadcastSnackbar(t('player.editStyle.saved', {
      //   ply: data.player.alias,
      //   by: user.alias,
      //   newStyle: data.newStyle.name + ': ' + data.newStyle.bestStroke
      // }));
      return response;
    } catch (_err) {
      dispatch(showSnackbar(t('common.apiFail')));
      return null;
    }
  },
);

function getInitialState(): IStorePlayer[] {
  return [];
  // const serializedState = localStorage.getItem("redux_players");
  // if (!serializedState) {
  //   return [];
  // }

  // try {
  //   const players = JSON.parse(serializedState);
  //   return players;
  // } catch {
  //   return [];
  // }
}

const playersSlice = createSlice({
  name: 'players',
  initialState: getInitialState(),
  reducers: {
    simpleLoaded: (state, action: PayloadAction<IStorePlayer | IStorePlayer[]>) => {
      mergeInStore2(state, action.payload, p => p.active);
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchPlayers.fulfilled, (state, action) => {
      if (!action.payload?.data) {
        return state;
      }
      preservePredictions(state, action.payload.data);
      const newState = mergeInStore2(state, action.payload.data, p => p.active);
      return newState;
    });
    builder.addCase(fetchPlayer.fulfilled, (state, action) => {
      if (!action.payload?.active) {
        return state.filter(x => x.id !== action.payload.id);
      }
      preservePredictions(state, action.payload);
      const newState = mergeInStore2(state, action.payload, p => p.active);
      return newState;
    });
    builder.addCase(updateStyle.fulfilled, (state, action) => {
      if (action.payload) {
        return mergeInStore2(state, action.payload, p => p.active);
      }
      return state;
    });
    builder.addCase(updatePlayer.fulfilled, (state, action) => {
      if (action.payload?.switchActive === true) {
        if (action.payload?.player.active) {
          return mergeInStore2(state, action.payload.player, p => p.active);
        }
        return state.filter(p => p.id !== action.payload?.player.id);
      }
      if (action.payload?.player) {
        return mergeInStore2(state, action.payload.player, p => p.active);
      }
      return state;
    });
    builder.addCase(uploadPlayer.fulfilled, (state, action) => {
      const ply = state.find(p => p.id === action.payload.playerId);
      if (ply) {
        ply.imageVersion++;
      }
    });
    builder.addCase(fetchRankingPredictions.fulfilled, (state, action) => {
      action.payload.forEach(prediction => {
        const compKey = prediction.competition.toLowerCase() as 'vttl' | 'sporta';
        const player = state.find(x => x[compKey]?.uniqueIndex === +prediction.uniqueIndex);
        const playerComp = player?.[compKey];
        if (playerComp) {
          playerComp.prediction = prediction.newRanking as IPlayerCompetition['prediction'];
        }
      });
    });
  },
});

export const playersQuittersSlice = createSlice({
  name: 'playersQuitters',
  initialState: [] as IStorePlayer[],
  reducers: {
    simpleLoaded: (state, action: PayloadAction<IStorePlayer | IStorePlayer[]>) => {
      mergeInStore2(state, action.payload, p => !p.active && p.alias !== 'SYSTEM');
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchQuitters.fulfilled, (state, action) => {
      const newState = mergeInStore2(state, action.payload, p => !p.active && p.alias !== 'SYSTEM');
      return newState;
    });
    builder.addCase(updatePlayer.fulfilled, (state, action) => {
      if (action.payload?.switchActive === true) {
        if (!action.payload?.player.active) {
          return mergeInStore2(state, action.payload.player, p => !p.active && p.alias !== 'SYSTEM');
        }
        return state.filter(p => p.id !== action.payload?.player.id);
      }
      if (action.payload?.player) {
        return mergeInStore2(state, action.payload.player, p => !p.active && p.alias !== 'SYSTEM');
      }
      return state;
    });
    builder.addCase(deletePlayer.fulfilled, (state, action) => state.filter(p => p.id !== action.payload));
  },
});

export const eventsSlice = createSlice({
  name: 'events',
  initialState: [] as IPlayerEvent[],
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchPlayerEvents.fulfilled, (state, action) => {
      return action.payload;
    });
  },
});

export default playersSlice.reducer;
