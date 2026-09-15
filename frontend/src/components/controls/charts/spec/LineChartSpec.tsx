import { render } from '@testing-library/react';
import { LineChart } from '../LineChart';
import { Series } from '../chartScales';

const series: Series[] = [
  {
    label: 'Aalst A',
    highlighted: true,
    points: [
      { x: 1, y: 3 },
      { x: 2, y: 6 },
    ],
  },
  {
    label: 'Ronse B',
    highlighted: false,
    points: [
      { x: 1, y: 0 },
      { x: 2, y: 3 },
    ],
  },
];

describe('LineChart', () => {
  it('draws one polyline per series', () => {
    const { container } = render(<LineChart series={series} formatTooltip={() => ''} />);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('marks the highlighted series so it can be styled apart', () => {
    const { container } = render(<LineChart series={series} formatTooltip={() => ''} />);
    const lines = container.querySelectorAll('polyline');
    expect(lines[0]!.classList.contains('highlighted')).toBe(true);
    expect(lines[1]!.classList.contains('highlighted')).toBe(false);
  });

  it('labels only the highlighted series directly', () => {
    const { container } = render(<LineChart series={series} formatTooltip={() => ''} />);
    const labels = [...container.querySelectorAll('text.series-label')].map(t => t.textContent);
    expect(labels).toEqual(['Aalst A']);
  });

  it('handles more than one highlighted series', () => {
    const twoOfOurs: Series[] = [
      { label: 'Aalst A', highlighted: true, points: [{ x: 1, y: 3 }] },
      { label: 'Aalst B', highlighted: true, points: [{ x: 1, y: 1 }] },
    ];
    const { container } = render(<LineChart series={twoOfOurs} formatTooltip={() => ''} />);
    const labels = [...container.querySelectorAll('text.series-label')].map(t => t.textContent);
    expect(labels).toEqual(['Aalst A', 'Aalst B']);
  });

  it('renders nothing when there is nothing to plot', () => {
    const { container } = render(<LineChart series={[]} formatTooltip={() => ''} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when every series is empty', () => {
    const empty: Series[] = [{ label: 'a', highlighted: false, points: [] }];
    const { container } = render(<LineChart series={empty} formatTooltip={() => ''} />);
    expect(container.innerHTML).toBe('');
  });

  it('puts the tooltip text on each point', () => {
    const { container } = render(<LineChart series={series} formatTooltip={(s, p) => `${s.label} @ ${p.x}`} />);
    const titles = [...container.querySelectorAll('title')].map(t => t.textContent);
    expect(titles).toContain('Aalst A @ 1');
    expect(titles).toContain('Ronse B @ 2');
  });
});
