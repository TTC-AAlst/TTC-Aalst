import { ChartRow, RaceSeries } from './chartRows';
import dayjs from 'dayjs';

export const MutedColor = '#9a9a93';

type RaceTooltipProps = {
  row: ChartRow;
  series: RaceSeries[];
  yInverted: boolean;
};

/** The whole standing of that week, best first, so a line can be read against the ones around it. */
export const RaceTooltip = ({ row, series, yInverted }: RaceTooltipProps) => {
  const standing = series.filter(s => row.byKey[s.key]).sort((a, b) => (yInverted ? 1 : -1) * (row.byKey[a.key]!.value - row.byKey[b.key]!.value));

  return (
    <div className="race-chart-tooltip">
      <div className="race-chart-tooltip-week">Week van {dayjs(row.weekDate).format('DD/MM/YYYY')}</div>
      {standing.map(s => (
        <div key={s.key} className={s.highlighted ? 'race-chart-tooltip-team race-chart-tooltip-own' : 'race-chart-tooltip-team'}>
          <span className="race-chart-tooltip-bullet" style={{ backgroundColor: s.color ?? MutedColor }} />
          {s.label}: {row.byKey[s.key]!.note}
        </div>
      ))}
    </div>
  );
};
