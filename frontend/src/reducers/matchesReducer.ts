import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { mergeInStore2 } from './immutableHelpers';
import { IFullStoreMatchOwn, IMatchComment, IStoreMatchCommon, MatchPlayerStatus } from '../models/model-interfaces';
import http from '../utils/httpClient';
import { t } from '../locales';
import { showSnackbar } from './configReducer';
import storeUtil from '../storeUtil';
import { PlayersPlaying } from '../components/matches/MatchesWeeks/htmlBuilder';

export const fetchMatches = createAsyncThunk('matches/Get', async () => {
  const response = await http.get<IFullStoreMatchOwn[]>('/matches');
  return response;
});

export const fetchMatch = createAsyncThunk('matches/GetOne', async ({ id }: { id: number }) => {
  const response = await http.get<IFullStoreMatchOwn>(`/matches/${id}`);
  return response;
});

export const shouldSync = (match: IStoreMatchCommon) => !match.isSyncedWithFrenoy && dayjs().isAfter(match.date) && match.shouldBePlayed;

export const frenoyMatchSync = createAsyncThunk('matches/FrenoyMatchSync', async (data: { match: IStoreMatchCommon; forceSync?: boolean }, { dispatch }) => {
  if (data.forceSync || shouldSync(data.match)) {
    try {
      const newMatch = await http.post<IFullStoreMatchOwn>(`/matches/FrenoyMatchSync?forceSync=${data.forceSync || false}`, { id: data.match.id });
      dispatch(simpleLoaded(newMatch));
    } catch (_err) {
      if (data.forceSync) {
        dispatch(showSnackbar(t('common.apiFail')));
      }
    }
  }
});

export const updateScore = createAsyncThunk('matches/UpdateScore', async (data: { matchId: number; home: number; out: number }, { dispatch }) => {
  try {
    const newMatch = await http.post<IFullStoreMatchOwn>('/matches/UpdateScore', data);
    dispatch(simpleLoaded(newMatch));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

export const postReport = createAsyncThunk('matches/Report', async (report: { matchId: number; text: string; playerId: number }, { dispatch }) => {
  try {
    const newMatch = await http.post<IFullStoreMatchOwn>('/matches/Report', report);
    dispatch(simpleLoaded(newMatch));
    dispatch(showSnackbar(t('match.report.reportPosted')));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

export const postComment = createAsyncThunk('matches/Comment', async (comment: IMatchComment, { dispatch }) => {
  try {
    const newMatch = await http.post<IFullStoreMatchOwn>('/matches/Comment', comment);
    dispatch(simpleLoaded(newMatch));
    dispatch(showSnackbar(t('match.report.commentPosted')));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

export const deleteComment = createAsyncThunk('matches/DeleteComment', async (data: { id: number }, { dispatch }) => {
  try {
    const newMatch = await http.post<IFullStoreMatchOwn>('/matches/DeleteComment', data);
    dispatch(simpleLoaded(newMatch));
    dispatch(showSnackbar(t('match.report.commentDeleted')));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

export const selectPlayer = createAsyncThunk(
  'matches/SelectPlayer',
  async (data: { matchId: number; status: MatchPlayerStatus; statusNote: string | null; playerId: number }, { dispatch }) => {
    const match = storeUtil.getMatch(data.matchId);
    const player = storeUtil.getPlayer(data.playerId);
    const comp = player.getCompetition(match.competition);

    let matchPlayer = match.plays(player); // TODO: this is causing the crashes in the backend?
    if (!matchPlayer) {
      matchPlayer = {
        id: 0,
        matchId: match.id,
        playerId: player.id,
        home: match.isHomeMatch,
        position: match.players.length + 1,
        ranking: comp.ranking,
        name: player.alias,
        alias: player.alias,
        uniqueIndex: comp.uniqueIndex,
        status: data.status,
        statusNote: data.statusNote || '',
        won: 0,
      };
    } else {
      matchPlayer = {
        ...matchPlayer,
        status: data.status,
        uniqueIndex: comp.uniqueIndex,
      };
    }

    const isMyFormation = data.statusNote !== null; // TODO: this is weird?
    if (isMyFormation) {
      matchPlayer.statusNote = data.statusNote || '';
    }

    try {
      const newMatch = await http.post<IFullStoreMatchOwn>(`/matches/${isMyFormation ? 'SetMyFormation' : 'TogglePlayer'}`, matchPlayer);
      dispatch(simpleLoaded(newMatch));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('selectPlayer', data, err);
    }
  },
);

type EditMatchPlayersParams = {
  matchId: number;
  /** Which of our teams is editing: a derby has two */
  teamId: number;
  playerIds: number[];
  blockAlso: boolean;
  newStatus: string;
  comment: string;
};

export const editMatchPlayers = createAsyncThunk('matches/EditMatchPlayers', async (data: EditMatchPlayersParams, { dispatch }) => {
  try {
    const result = await http.post<IFullStoreMatchOwn>('/matches/EditMatchPlayers', data);
    dispatch(simpleLoaded(result));
    dispatch(showSnackbar(t('common.apiSuccess')));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('editMatchPlayers', data, err);
  }
});

/** New season team sync */
export const frenoyTeamSync = createAsyncThunk('matches/FrenoyTeamSync', async (data: { teamId: number }, { dispatch }) => {
  try {
    await http.post('/matches/FrenoyTeamSync', { id: data.teamId });
    dispatch(showSnackbar(`${t('common.apiSuccess')}: Duw F5 om de wijzigingen te zien`));
  } catch (_err) {
    dispatch(showSnackbar(t('common.apiFail')));
  }
});

export const emailFormation = createAsyncThunk(
  'matches/WeekCompetitionEmail',
  async (data: { title: string; email: string; justMe: boolean; players: PlayersPlaying }, { dispatch }) => {
    try {
      await http.post('/matches/WeekCompetitionEmail', data);
      dispatch(showSnackbar(t('week.formationMailed')));
    } catch (_err) {
      dispatch(showSnackbar('Fout bij versturen email!?'));
    }
  },
);

const matchesSlice = createSlice({
  name: 'matches',
  initialState: [] as IFullStoreMatchOwn[],
  reducers: {
    simpleLoaded: (state, action: PayloadAction<IFullStoreMatchOwn | IFullStoreMatchOwn[]>) => {
      const newState = mergeInStore2(state, action.payload, m => m.shouldBePlayed);
      return newState;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchMatches.fulfilled, (state, action) => mergeInStore2(state, action.payload, m => m.shouldBePlayed));
    builder.addCase(fetchMatch.fulfilled, (state, action) => mergeInStore2(state, action.payload, m => m.shouldBePlayed));
  },
});

export const freeMatchesSlice = createSlice({
  name: 'freeMatches',
  initialState: [] as IFullStoreMatchOwn[],
  reducers: {
    simpleLoaded: (state, action: PayloadAction<IFullStoreMatchOwn | IFullStoreMatchOwn[]>) => {
      const newState = mergeInStore2(state, action.payload, m => !m.shouldBePlayed);
      return newState;
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchMatches.fulfilled, (state, action) => mergeInStore2(state, action.payload, m => !m.shouldBePlayed));
  },
});

export const { simpleLoaded } = matchesSlice.actions;

export default matchesSlice.reducer;
