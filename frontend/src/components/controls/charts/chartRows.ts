export type RacePoint<T> = {
  /** ISO date of the monday the matches were played, so competitions on different calendars line up. */
  weekDate: string;
  value: number;
  /** Whatever that chart's tooltip needs to render this point. */
  meta: T;
};

export type RaceSeries<T> = {
  key: string;
  label: string;
  /** Drawn thick while nothing else is hovered or selected. */
  highlighted: boolean;
  /** Colourless series are drawn muted and carry no end label until they are picked. */
  color?: string;
  points: RacePoint<T>[];
};

export type ChartRow<T> = {
  weekDate: number;
  byKey: Record<string, RacePoint<T>>;
};

/** Slots 1 and 2 of a colourblind-safe categorical palette, validated against a light surface. */
export const SeriesColors = ['#2a78d6', '#eb6834'];

export const MutedColor = '#9a9a93';

export function toChartRows<T>(series: RaceSeries<T>[]): ChartRow<T>[] {
  const rows = new Map<number, ChartRow<T>>();

  series.forEach(s =>
    s.points.forEach(p => {
      const weekDate = new Date(p.weekDate).getTime();
      let row = rows.get(weekDate);
      if (!row) {
        row = { weekDate, byKey: {} };
        rows.set(weekDate, row);
      }
      row.byKey[s.key] = p;
    }),
  );

  return [...rows.values()].sort((a, b) => a.weekDate - b.weekDate);
}
