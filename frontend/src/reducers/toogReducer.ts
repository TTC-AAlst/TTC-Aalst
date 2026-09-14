import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import http from '../utils/httpClient';
import { showSnackbar } from './configReducer';
import { t } from '../locales';
import { IToogAdminDay, IToogDay } from '../models/model-interfaces';

type ToogState = {
  mine: IToogDay[];
  admin: IToogAdminDay[];
};

export const fetchMyToog = createAsyncThunk('toog/GetMine', async () => http.get<IToogDay[]>('/toog/mine'));

export const toggleMyToog = createAsyncThunk('toog/SetMine', async (params: { date: string; available: boolean }, { dispatch }) => {
  try {
    return await http.post<IToogDay[]>('/toog/mine', params);
  } catch (err) {
    dispatch(showSnackbar(t('common.apiFail')));
    throw err;
  }
});

export const fetchToogAdmin = createAsyncThunk('toog/Get', async () => http.get<IToogAdminDay[]>('/toog'));

export const assignToog = createAsyncThunk('toog/Assign', async (params: { date: string; playerId: number | null }, { dispatch }) => {
  try {
    return await http.post<IToogAdminDay[]>('/toog/assign', params);
  } catch (err) {
    dispatch(showSnackbar(t('common.apiFail')));
    throw err;
  }
});

const toogSlice = createSlice({
  name: 'toog',
  initialState: { mine: [], admin: [] } as ToogState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchMyToog.fulfilled, (state, action) => ({ ...state, mine: action.payload }));
    builder.addCase(toggleMyToog.fulfilled, (state, action) => ({ ...state, mine: action.payload }));
    builder.addCase(fetchToogAdmin.fulfilled, (state, action) => ({ ...state, admin: action.payload }));
    builder.addCase(assignToog.fulfilled, (state, action) => ({ ...state, admin: action.payload }));
  },
});

export default toogSlice.reducer;
