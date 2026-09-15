import { toPositionSeries } from '../teamPositionSeries';
import { TeamPositionWeek } from '../../../reducers/rankingHistoryReducer';
import { SeriesColors } from '../../controls/charts/chartRows';
import { ITeam } from '../../../models/model-interfaces';

const pos = (teamId: number, week: number, position: number, teamsInDivision: number): TeamPositionWeek => ({
  teamId,
  week,
  weekDate: `2026-09-${7 + week * 7}T00:00:00`,
  position,
  teamsInDivision,
});

const teams = [
  { id: 1, competition: 'Vttl', teamCode: 'A' },
  { id: 2, competition: 'Sporta', teamCode: 'C' },
] as ITeam[];

describe('toPositionSeries', () => {
  it('makes one series per team', () => {
    const series = toPositionSeries([pos(1, 1, 3, 12), pos(2, 1, 8, 10)], teams);

    expect(series.map(s => s.label)).toEqual(['Vttl A', 'Sporta C']);
  });

  it('colours by competition, since a team is identified by its end label', () => {
    const series = toPositionSeries([pos(1, 1, 3, 12), pos(2, 1, 8, 10)], teams);

    expect(series.map(s => s.color)).toEqual([SeriesColors[0], SeriesColors[1]]);
  });

  it('puts the division size in the note, because last of 10 is not last of 12', () => {
    const series = toPositionSeries([pos(1, 1, 3, 12), pos(1, 2, 3, 11)], teams);

    expect(series[0]!.points.map(p => p.note)).toEqual(['3e van 12', '3e van 11']);
  });

  it('falls back to the team id when the team is not loaded yet', () => {
    const series = toPositionSeries([pos(7, 1, 3, 12)], teams);

    expect(series[0]!.label).toBe('7');
  });

  it('orders the points chronologically', () => {
    const series = toPositionSeries([pos(1, 2, 2, 12), pos(1, 1, 3, 12)], teams);

    expect(series[0]!.points.map(p => p.value)).toEqual([3, 2]);
  });
});
