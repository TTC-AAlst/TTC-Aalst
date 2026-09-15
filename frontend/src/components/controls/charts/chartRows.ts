export type RacePoint = {
  /** ISO date of the monday the matches were played, so competitions on different calendars line up. */
  weekDate: string;
  value: number;
  note: string;
};

export type RaceSeries = {
  key: string;
  label: string;
  /** Always drawn thick, whether or not it is hovered. */
  highlighted: boolean;
  /** Colourless series are drawn muted and carry no end label. */
  color?: string;
  points: RacePoint[];
};

/** Slots 1 and 2 of a colourblind-safe categorical palette, validated against a light surface. */
export const SeriesColors = ['#2a78d6', '#eb6834'];

export type ChartRow = {
  weekDate: number;
  byKey: Record<string, { value: number; note: string }>;
};

export function toChartRows(series: RaceSeries[]): ChartRow[] {
  const rows = new Map<number, ChartRow>();

  series.forEach(s =>
    s.points.forEach(p => {
      const weekDate = new Date(p.weekDate).getTime();
      let row = rows.get(weekDate);
      if (!row) {
        row = { weekDate, byKey: {} };
        rows.set(weekDate, row);
      }
      row.byKey[s.key] = { value: p.value, note: p.note };
    }),
  );

  return [...rows.values()].sort((a, b) => a.weekDate - b.weekDate);
}
