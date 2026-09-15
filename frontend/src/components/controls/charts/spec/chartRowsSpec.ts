import { toChartRows, RaceSeries } from '../chartRows';

const series = (key: string, points: [string, number][]): RaceSeries<{ note: string }> => ({
  key,
  label: key.toUpperCase(),
  highlighted: false,
  points: points.map(([weekDate, value]) => ({ weekDate, value, meta: { note: `${value}` } })),
});

describe('toChartRows', () => {
  it('has nothing to plot without series', () => {
    expect(toChartRows([])).toEqual([]);
  });

  it('puts every series on one row per week', () => {
    const rows = toChartRows([
      series('a', [
        ['2026-09-14T00:00:00', 3],
        ['2026-09-21T00:00:00', 6],
      ]),
      series('b', [
        ['2026-09-14T00:00:00', 0],
        ['2026-09-21T00:00:00', 2],
      ]),
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.byKey.a!.value).toBe(3);
    expect(rows[0]!.byKey.b!.value).toBe(0);
  });

  it('orders the weeks chronologically', () => {
    const rows = toChartRows([
      series('a', [
        ['2026-09-21T00:00:00', 6],
        ['2026-09-14T00:00:00', 3],
      ]),
    ]);

    expect(rows.map(r => r.weekDate)).toEqual([new Date('2026-09-14T00:00:00').getTime(), new Date('2026-09-21T00:00:00').getTime()]);
  });

  it('interleaves competitions that play on different mondays', () => {
    // VTTL week 1 and Sporta week 1 are not the same date, which is the whole reason
    // the dashboard chart plots dates instead of week numbers.
    const rows = toChartRows([series('vttl', [['2026-09-21T00:00:00', 1]]), series('sporta', [['2026-09-14T00:00:00', 1]])]);

    expect(rows).toHaveLength(2);
    expect(rows[0]!.byKey.sporta).toBeDefined();
    expect(rows[0]!.byKey.vttl).toBeUndefined();
  });

  it('leaves a gap where a series has no week', () => {
    const rows = toChartRows([
      series('a', [
        ['2026-09-14T00:00:00', 3],
        ['2026-09-21T00:00:00', 6],
      ]),
      series('b', [['2026-09-21T00:00:00', 2]]),
    ]);

    expect(rows[0]!.byKey.b).toBeUndefined();
    expect(rows[1]!.byKey.b!.value).toBe(2);
  });

  it('carries the payload the tooltip needs', () => {
    const rows = toChartRows([series('a', [['2026-09-14T00:00:00', 3]])]);

    expect(rows[0]!.byKey.a!.meta.note).toBe('3');
  });
});
