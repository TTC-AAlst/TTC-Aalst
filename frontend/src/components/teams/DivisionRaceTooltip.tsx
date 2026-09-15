import { ChartRow, MutedColor, RaceSeries } from '../controls/charts/chartRows';
import dayjs from 'dayjs';

export type DivisionRacePoint = { points: number };

type DivisionRaceTooltipProps = {
  row: ChartRow<DivisionRacePoint>;
  series: RaceSeries<DivisionRacePoint>[];
};

/** The whole standing of that week, leader first, so a line can be read against the ones around it. */
export const DivisionRaceTooltip = ({ row, series }: DivisionRaceTooltipProps) => {
  const standing = series.filter(s => row.byKey[s.key]).sort((a, b) => row.byKey[b.key]!.value - row.byKey[a.key]!.value);

  return (
    <div className="race-chart-tooltip">
      <div className="race-chart-tooltip-week">Week van {dayjs(row.weekDate).format('DD/MM/YYYY')}</div>
      {standing.map(s => (
        <div key={s.key} className={s.highlighted ? 'race-chart-tooltip-team race-chart-tooltip-own' : 'race-chart-tooltip-team'}>
          <span className="race-chart-tooltip-bullet" style={{ backgroundColor: s.color ?? MutedColor }} />
          {s.label} &middot; {row.byKey[s.key]!.meta.points} punten
        </div>
      ))}
    </div>
  );
};
