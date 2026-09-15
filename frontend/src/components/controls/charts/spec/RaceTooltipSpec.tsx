import { render } from '@testing-library/react';
import { RaceTooltip } from '../RaceTooltip';
import { toChartRows, RaceSeries } from '../chartRows';

const series = (key: string, value: number, note: string, highlighted = false): RaceSeries => ({
  key,
  label: key.toUpperCase(),
  highlighted,
  points: [{ weekDate: '2026-09-14T00:00:00', value, note }],
});

const renderTooltip = (all: RaceSeries[], yInverted = false) => render(<RaceTooltip row={toChartRows(all)[0]!} series={all} yInverted={yInverted} />);

describe('RaceTooltip', () => {
  it('heads with the monday of the week', () => {
    const { container } = renderTooltip([series('a', 6, '1e - 6 punten')]);

    expect(container.querySelector('.race-chart-tooltip-week')?.textContent).toBe('Week van 14/09/2026');
  });

  it('ranks a points race with the leader first', () => {
    const { container } = renderTooltip([series('a', 3, '2e - 3 punten'), series('b', 6, '1e - 6 punten')]);

    expect([...container.querySelectorAll('.race-chart-tooltip-team')].map(d => d.textContent)).toEqual(['B: 1e - 6 punten', 'A: 2e - 3 punten']);
  });

  it('ranks a position chart with the lowest position first', () => {
    const { container } = renderTooltip([series('a', 8, '8e van 12'), series('b', 2, '2e van 10')], true);

    expect([...container.querySelectorAll('.race-chart-tooltip-team')].map(d => d.textContent)).toEqual(['B: 2e van 10', 'A: 8e van 12']);
  });

  it('marks our own team', () => {
    const { container } = renderTooltip([series('a', 3, '2e - 3 punten', true), series('b', 6, '1e - 6 punten')]);

    expect([...container.querySelectorAll('.race-chart-tooltip-own')].map(d => d.textContent)).toEqual(['A: 2e - 3 punten']);
  });
});
