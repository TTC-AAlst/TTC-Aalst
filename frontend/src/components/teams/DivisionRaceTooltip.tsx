import { ChartRow, MutedColor, RaceSeries } from '../controls/charts/chartRows';
import dayjs from 'dayjs';

export type DivisionRacePoint = { position: number; points: number };

type DivisionRaceTooltipProps = {
  row: ChartRow<DivisionRacePoint>;
  series: RaceSeries<DivisionRacePoint>[];
  activeKey: string | undefined;
};

/** The whole standing of that week, so a line can be read against the ones around it. */
export const DivisionRaceTooltip = ({ row, series, activeKey }: DivisionRaceTooltipProps) => {
  const standing = series.filter(s => row.byKey[s.key]).sort((a, b) => row.byKey[a.key]!.meta.position - row.byKey[b.key]!.meta.position);

  return (
    <div className="race-chart-tooltip">
      <div className="race-chart-tooltip-week">Week van {dayjs(row.weekDate).format('DD/MM/YYYY')}</div>
      {standing.map(s => {
        const { position, points } = row.byKey[s.key]!.meta;
        const bold = s.highlighted || s.key === activeKey;
        return (
          <div key={s.key} className={bold ? 'race-chart-tooltip-team race-chart-tooltip-own' : 'race-chart-tooltip-team'}>
            <span className="race-chart-tooltip-bullet" style={{ backgroundColor: s.color ?? MutedColor }} />
            {position}) {s.label} &middot; {points} punten
          </div>
        );
      })}
    </div>
  );
};
