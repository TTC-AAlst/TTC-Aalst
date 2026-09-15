import { render } from '@testing-library/react';
import { DivisionRaceTooltip, DivisionRacePoint } from '../DivisionRaceTooltip';
import { toChartRows, RaceSeries } from '../../controls/charts/chartRows';

const series = (key: string, points: number, highlighted = false): RaceSeries<DivisionRacePoint> => ({
  key,
  label: key.toUpperCase(),
  highlighted,
  points: [{ weekDate: '2026-09-14T00:00:00', value: points, meta: { points } }],
});

const renderTooltip = (all: RaceSeries<DivisionRacePoint>[]) => render(<DivisionRaceTooltip row={toChartRows(all)[0]!} series={all} />);

const teamRows = (container: HTMLElement) => [...container.querySelectorAll('.race-chart-tooltip-team')].map(d => d.textContent);

describe('DivisionRaceTooltip', () => {
  it('heads with the monday of the week', () => {
    const { container } = renderTooltip([series('a', 6)]);

    expect(container.querySelector('.race-chart-tooltip-week')?.textContent).toBe('Week van 14/09/2026');
  });

  it('names the team and its points, leader first', () => {
    const { container } = renderTooltip([series('a', 3), series('b', 6)]);

    expect(teamRows(container)).toEqual(['B · 6 punten', 'A · 3 punten']);
  });

  it('marks our own team', () => {
    const { container } = renderTooltip([series('a', 3, true), series('b', 6)]);

    expect([...container.querySelectorAll('.race-chart-tooltip-own')].map(d => d.textContent)).toEqual(['A · 3 punten']);
  });
});
