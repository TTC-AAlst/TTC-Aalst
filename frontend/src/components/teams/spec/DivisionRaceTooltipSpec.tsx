import { render } from '@testing-library/react';
import { DivisionRaceTooltip, DivisionRacePoint } from '../DivisionRaceTooltip';
import { toChartRows, RaceSeries } from '../../controls/charts/chartRows';

const series = (key: string, position: number, points: number, highlighted = false): RaceSeries<DivisionRacePoint> => ({
  key,
  label: key.toUpperCase(),
  highlighted,
  points: [{ weekDate: '2026-09-14T00:00:00', value: points, meta: { position, points } }],
});

const renderTooltip = (all: RaceSeries<DivisionRacePoint>[], activeKey?: string) =>
  render(<DivisionRaceTooltip row={toChartRows(all)[0]!} series={all} activeKey={activeKey} />);

const teamRows = (container: HTMLElement) => [...container.querySelectorAll('.race-chart-tooltip-team')].map(d => d.textContent);
const boldRows = (container: HTMLElement) => [...container.querySelectorAll('.race-chart-tooltip-own')].map(d => d.textContent);

describe('DivisionRaceTooltip', () => {
  it('heads with the monday of the week', () => {
    const { container } = renderTooltip([series('a', 1, 6)]);

    expect(container.querySelector('.race-chart-tooltip-week')?.textContent).toBe('Week van 14/09/2026');
  });

  it('numbers each team by its position that week', () => {
    const { container } = renderTooltip([series('a', 2, 3), series('b', 1, 6)]);

    expect(teamRows(container)).toEqual(['1) B · 6 punten', '2) A · 3 punten']);
  });

  it('orders by position, not by points, so a tie keeps Frenoy own ranking', () => {
    const { container } = renderTooltip([series('a', 2, 6), series('b', 1, 6)]);

    expect(teamRows(container)).toEqual(['1) B · 6 punten', '2) A · 6 punten']);
  });

  it('marks our own team', () => {
    const { container } = renderTooltip([series('a', 2, 3, true), series('b', 1, 6)]);

    expect(boldRows(container)).toEqual(['2) A · 3 punten']);
  });

  it('marks the picked team as well', () => {
    const { container } = renderTooltip([series('a', 2, 3, true), series('b', 1, 6)], 'b');

    expect(boldRows(container)).toEqual(['1) B · 6 punten', '2) A · 3 punten']);
  });
});
