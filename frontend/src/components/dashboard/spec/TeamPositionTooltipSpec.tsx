import { render } from '@testing-library/react';
import { TeamPositionTooltip, TeamPositionPoint } from '../TeamPositionTooltip';
import { toChartRows, RaceSeries } from '../../controls/charts/chartRows';

const series = (key: string, meta: Partial<TeamPositionPoint> = {}): RaceSeries<TeamPositionPoint> => ({
  key,
  label: `Sporta ${key.toUpperCase()}`,
  highlighted: false,
  color: '#eb6834',
  points: [
    {
      weekDate: '2026-09-14T00:00:00',
      value: meta.position ?? 1,
      meta: { week: 5, position: 1, teamsInDivision: 10, division: 'Afdeling 1B', gamesWon: 7, gamesLost: 2, gamesDraw: 1, ...meta },
    },
  ],
});

const renderTooltip = (all: RaceSeries<TeamPositionPoint>[], activeKey: string | undefined) =>
  render(<TeamPositionTooltip row={toChartRows(all)[0]!} series={all} activeKey={activeKey} />);

describe('TeamPositionTooltip', () => {
  it('shows only the hovered team, since the others are in other divisions', () => {
    const { container } = renderTooltip([series('a'), series('b', { position: 4 })], 'b');

    expect(container.textContent).toContain('Sporta B');
    expect(container.textContent).not.toContain('Sporta A');
  });

  it('badges the position against the division size', () => {
    const { container } = renderTooltip([series('a', { position: 3, teamsInDivision: 12 })], 'a');

    expect(container.querySelector('.race-chart-tooltip-badge')?.textContent).toBe('3 / 12');
  });

  it('names the division and the playing week', () => {
    const { container } = renderTooltip([series('a')], 'a');

    expect(container.textContent).toContain('Afdeling 1B');
    expect(container.querySelector('.race-chart-tooltip-team')?.textContent).toBe('Speelweek 5 · 14/09/2026');
  });

  it('tallies won, drawn and lost', () => {
    const { container } = renderTooltip([series('a')], 'a');

    expect([...container.querySelectorAll('.race-chart-tooltip-tally span')].map(s => s.textContent?.trim())).toEqual(['7', '1', '2']);
  });

  it('shows nothing until a line is hovered', () => {
    const { container } = renderTooltip([series('a')], undefined);

    expect(container.innerHTML).toBe('');
  });
});
