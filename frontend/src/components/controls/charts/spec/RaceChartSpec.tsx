import { vi } from 'vitest';
import { render } from '@testing-library/react';
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

const series = (key: string, color: string | undefined, points: [string, number][]): RaceSeries => ({
  key,
  label: key.toUpperCase(),
  highlighted: !!color,
  color,
  points: points.map(([weekDate, value]) => ({ weekDate, value, note: `${value} punten` })),
});

/** Recharts keeps an off-screen measurement span on document.body, so queries stay inside the container. */
const ticks = (container: HTMLElement, axis: 'x' | 'y') =>
  [...container.querySelectorAll(`.recharts-${axis}Axis-tick-labels text`)].map(t => ({ text: t.textContent, y: Number(t.getAttribute('y')) }));

const twoWeeks = (a: number, b: number): [string, number][] => [
  ['2026-09-14T00:00:00', a],
  ['2026-09-21T00:00:00', b],
];

describe('RaceChart', () => {
  it('draws a line per series', () => {
    const { container } = render(<RaceChart series={[series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))]} />);

    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(2);
  });

  it('labels the x axis with the monday of each week', () => {
    const { container } = render(<RaceChart series={[series('a', SeriesColors[0], twoWeeks(3, 6))]} />);

    expect(ticks(container, 'x').map(t => t.text)).toEqual(['14/09', '21/09']);
  });

  it('puts two competitions playing different mondays on one axis', () => {
    const { container } = render(
      <RaceChart
        series={[
          series('sporta', SeriesColors[1], twoWeeks(3, 6)),
          series('vttl', SeriesColors[0], [
            ['2026-09-21T00:00:00', 2],
            ['2026-09-28T00:00:00', 4],
          ]),
        ]}
      />,
    );

    expect(ticks(container, 'x').map(t => t.text)).toEqual(['14/09', '21/09', '28/09']);
  });

  it('names a coloured series at the end of its line, and leaves the muted ones to the tooltip', () => {
    const { container } = render(<RaceChart series={[series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))]} />);

    const labels = [...container.querySelectorAll('.race-chart-end-label')].map(l => l.textContent);
    expect(labels).toEqual(['A']);
  });

  it('draws our line thicker than the rest', () => {
    const { container } = render(<RaceChart series={[series('a', SeriesColors[0], twoWeeks(3, 6)), series('b', undefined, twoWeeks(0, 3))]} />);

    const widths = [...container.querySelectorAll('.recharts-line-curve')].map(l => l.getAttribute('stroke-width'));
    expect(widths).toEqual(['3', '1.5']);
  });

  it('counts a position axis down from the top, where first place belongs', () => {
    const { container } = render(<RaceChart series={[series('a', SeriesColors[0], twoWeeks(1, 3))]} yInverted />);

    const axis = ticks(container, 'y');
    expect(axis[0]!.text).toBe('1');
    expect(axis[0]!.y).toBeLessThan(axis[axis.length - 1]!.y);
  });
});
