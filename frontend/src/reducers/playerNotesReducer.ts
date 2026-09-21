import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import http from '../utils/httpClient';
import { showSnackbar } from './configReducer';
import { t } from '../locales';
import { Competition, IPlayerNote } from '../models/model-interfaces';
import { RootState } from '../store';
import { logout } from './userReducer';

type PlayerNotesState = {
  notes: IPlayerNote[];
  loaded: boolean;
};

type SavePlayerNoteParams = {
  competition: Competition;
  opponentUniqueIndex: number;
  opponentName: string;
  note: string;
};

export const fetchPlayerNotes = createAsyncThunk('playerNotes/GetMine', async (_: void, { getState }) => {
  const state = getState() as RootState;
  if (state.playerNotes.loaded || !state.user.playerId) {
    return null;
  }
  return http.get<IPlayerNote[]>('/playernotes');
});

export const savePlayerNote = createAsyncThunk('playerNotes/Save', async (params: SavePlayerNoteParams, { dispatch }) => {
  try {
    const saved = await http.post<IPlayerNote | undefined>('/playernotes', params);
    return { params, saved: saved ?? null };
  } catch (err) {
    dispatch(showSnackbar(t('common.apiFail')));
    throw err;
  }
});

export const deletePlayerNote = createAsyncThunk('playerNotes/Delete', async (noteId: number, { dispatch }) => {
  try {
    await http.delete(`/playernotes/${noteId}`);
    return noteId;
  } catch (err) {
    dispatch(showSnackbar(t('common.apiFail')));
    throw err;
  }
});

const initialState: PlayerNotesState = { notes: [], loaded: false };

const playerNotesSlice = createSlice({
  name: 'playerNotes',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(logout, () => initialState);

    builder.addCase(fetchPlayerNotes.fulfilled, (state, action) => {
      if (!action.payload) {
        return state;
      }
      return { notes: action.payload, loaded: true };
    });

    builder.addCase(savePlayerNote.fulfilled, (state, action) => {
      const { params, saved } = action.payload;
      const others = state.notes.filter(note => note.competition !== params.competition || note.opponentUniqueIndex !== params.opponentUniqueIndex);
      return { ...state, notes: saved ? others.concat(saved) : others };
    });

    builder.addCase(deletePlayerNote.fulfilled, (state, action) => ({
      ...state,
      notes: state.notes.filter(note => note.id !== action.payload),
    }));
  },
});

export const selectPlayerNote = (state: RootState, competition: Competition, opponentUniqueIndex: number): IPlayerNote | undefined =>
  state.playerNotes.notes.find(note => note.competition === competition && note.opponentUniqueIndex === opponentUniqueIndex);

export default playerNotesSlice.reducer;
