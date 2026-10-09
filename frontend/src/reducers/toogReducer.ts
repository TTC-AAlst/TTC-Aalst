import dayjs from 'dayjs';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import http from '../utils/httpClient';
import { showSnackbar } from './configReducer';
import { t } from '../locales';
import { IToogAdminDay, IToogAssignment, IToogDay } from '../models/model-interfaces';

type ToogState = {
  mine: IToogDay[];
  admin: IToogAdminDay[];
  assigned: IToogAssignment[];
};

const dayKey = (date: string) => dayjs(date).format('YYYY-MM-DD');

export const fetchToogAssigned = createAsyncThunk('toog/GetAssigned', async () => http.get<IToogAssignment[]>('/toog/assigned'));

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
  initialState: { mine: [], admin: [], assigned: [] } as ToogState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchMyToog.fulfilled, (state, action) => ({ ...state, mine: action.payload }));
    builder.addCase(toggleMyToog.fulfilled, (state, action) => ({ ...state, mine: action.payload }));
    builder.addCase(fetchToogAdmin.fulfilled, (state, action) => ({ ...state, admin: action.payload }));
    builder.addCase(fetchToogAssigned.fulfilled, (state, action) => ({ ...state, assigned: action.payload }));
    builder.addCase(assignToog.fulfilled, (state, action) => {
      const adminDays = new Set(action.payload.map(day => dayKey(day.date)));
      const fromAdmin = action.payload.filter(day => day.assignedPlayerId).map(day => ({ date: day.date, playerId: day.assignedPlayerId! }));
      const assigned = state.assigned.filter(a => !adminDays.has(dayKey(a.date))).concat(fromAdmin);
      return { ...state, admin: action.payload, assigned };
    });
  },
});

export default toogSlice.reducer;
