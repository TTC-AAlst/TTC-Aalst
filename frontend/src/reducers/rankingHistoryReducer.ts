import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import http from '../utils/httpClient';
import { IStoreTeam } from '../models/model-interfaces';

export type DivisionRankingWeek = {
  week: number;
  position: number;
  points: number;
  gamesPlayed: number;
  clubId: number;
  teamCode: string;
  teamName: string;
};

export type TeamPositionWeek = {
  teamId: number;
  week: number;
  position: number;
  teamsInDivision: number;
};

type RankingHistoryState = {
  divisions: Record<number, DivisionRankingWeek[]>;
  positions: TeamPositionWeek[];
};

const initialState: RankingHistoryState = { divisions: {}, positions: [] };

export const loadRankingHistory = createAsyncThunk('rankingHistory/Division', async ({ team }: { team: IStoreTeam }) => {
  const url = `/teams/RankingHistory/${team.competition}/${team.frenoy.divisionId}`;
  const response = await http.get<DivisionRankingWeek[]>(url);
  return { divisionId: team.frenoy.divisionId, weeks: response };
});

export const loadTeamPositions = createAsyncThunk('rankingHistory/Positions', async () => {
  return http.get<TeamPositionWeek[]>('/teams/RankingHistoryPositions');
});

const rankingHistorySlice = createSlice({
  name: 'rankingHistory',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(loadRankingHistory.fulfilled, (state, action: PayloadAction<{ divisionId: number; weeks: DivisionRankingWeek[] }>) => {
      state.divisions[action.payload.divisionId] = action.payload.weeks;
    });
    builder.addCase(loadTeamPositions.fulfilled, (state, action: PayloadAction<TeamPositionWeek[]>) => {
      state.positions = action.payload;
    });
  },
});

export default rankingHistorySlice.reducer;
