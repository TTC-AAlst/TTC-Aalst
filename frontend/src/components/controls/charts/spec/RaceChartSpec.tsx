import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { cloneElement, ReactElement } from 'react';
import { RaceChart } from '../RaceChart';
import { RaceSeries, SeriesColors } from '../chartRows';

// ResponsiveContainer measures its parent, which is 0x0 under happy-dom, so nothing would draw.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement<{ width?: number; height?: number }> }) => cloneElement(children, { width: 800, height: 400 }),
  };
});

type Point = { note: string };

const series = (key: string, color: string | undefined, points: [string, number][]): RaceSeries<Point> => ({
  key,
  label: key.toUpperCase(),
  highlighted: !!color,
  color,
  points: points.map(([weekDate, value]) => ({ weekDate, value, meta: { note: `${value} punten` } })),
});

/** Recharts keeps an off-screen measurement span on document.body, so queries stay inside the container. */
const ticks = (container: HTMLElement, axis: 'x' | 'y') =>
  [...container.querySelectorAll(`.recharts-${axis}Axis-tick-labels text`)].map(t => ({ text: t.textContent, y: Number(t.getAttribute('y')) }));

const drawn = (container: HTMLElement) => [...container.querySelectorAll('.recharts-line-curve')].filter(l => l.getAttribute('stroke') !== 'transparent');

const endLabels = (container: HTMLElement) => [...container.querySelectorAll('.race-chart-end-label')].map(l => l.textContent);

const twoWeeks = (a: number, b: number): [string, number][] => [
  ['2026-09-14T00:00:00', a],
  ['2026-09-21T00:00:00', b],
];

const renderChart = (all: RaceSeries<Point>[], extra: Partial<Parameters<typeof RaceChart<Point>>[0]> = {}) =>
  render(<RaceChart series={all} renderTooltip={() => null} {...extra} />);

describe('RaceChart', () => {
  it('draws a line per series', () => {
    const { container } = renderChart([series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))]);

    expect(drawn(container)).toHaveLength(2);
  });

  it('labels the x axis with the monday of each week', () => {
    const { container } = renderChart([series('a', SeriesColors[0], twoWeeks(3, 6))]);

    expect(ticks(container, 'x').map(t => t.text)).toEqual(['14/09', '21/09']);
  });

  it('puts two competitions playing different mondays on one axis', () => {
    const { container } = renderChart([
      series('sporta', SeriesColors[1], twoWeeks(3, 6)),
      series('vttl', SeriesColors[0], [
        ['2026-09-21T00:00:00', 2],
        ['2026-09-28T00:00:00', 4],
      ]),
    ]);

    expect(ticks(container, 'x').map(t => t.text)).toEqual(['14/09', '21/09', '28/09']);
  });

  it('names a coloured series at the end of its line', () => {
    const { container } = renderChart([series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))]);

    expect(endLabels(container)).toEqual(['A']);
  });

  it('draws our line thicker than the rest', () => {
    const { container } = renderChart([series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))]);

    expect(drawn(container).map(l => l.getAttribute('stroke-width'))).toEqual(['3', '1.5']);
  });

  it('counts a position axis down from the top, where first place belongs', () => {
    const { container } = renderChart([series('a', SeriesColors[0], twoWeeks(1, 3))], { yInverted: true });

    const axis = ticks(container, 'y');
    expect(axis[0]!.text).toBe('1');
    expect(axis[0]!.y).toBeLessThan(axis[axis.length - 1]!.y);
  });

  it('gives every line a fat transparent twin to hover, since 1.5px is unhittable', () => {
    const { container } = renderChart([series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))]);

    const hit = [...container.querySelectorAll('.race-chart-hit-area .recharts-line-curve')];
    expect(hit).toHaveLength(2);
    expect(hit.map(l => l.getAttribute('stroke-width'))).toEqual(['14', '14']);
  });

  it('never draws the dots that line up under the cursor', () => {
    const { container } = renderChart([series('a', SeriesColors[0], twoWeeks(3, 6))]);

    expect(container.querySelectorAll('.recharts-active-dot')).toHaveLength(0);
  });

  describe('selection', () => {
    const muted = [series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))];

    it('emphasises the selected line and dims the rest', () => {
      const { container } = renderChart(muted, { selectedKey: 'b' });

      expect(drawn(container).map(l => l.getAttribute('stroke-width'))).toEqual(['1.5', '3']);
      expect(drawn(container).map(l => l.getAttribute('stroke-opacity'))).toEqual(['0.25', '1']);
    });

    it('names a selected line at the end of its line too', () => {
      const { container } = renderChart(muted, { selectedKey: 'b' });

      expect(endLabels(container)).toEqual(expect.arrayContaining(['A', 'B']));
    });

    it('reports a click on a line', () => {
      const onSelect = vi.fn();
      const { container } = renderChart(muted, { onSelect });

      fireEvent.click(container.querySelectorAll('.race-chart-hit-area .recharts-line-curve')[1]!);

      expect(onSelect).toHaveBeenCalledWith('b');
    });

    it('clicking the selected line clears the selection', () => {
      const onSelect = vi.fn();
      const { container } = renderChart(muted, { selectedKey: 'b', onSelect });

      fireEvent.click(container.querySelectorAll('.race-chart-hit-area .recharts-line-curve')[1]!);

      expect(onSelect).toHaveBeenCalledWith(undefined);
    });
  });
});
