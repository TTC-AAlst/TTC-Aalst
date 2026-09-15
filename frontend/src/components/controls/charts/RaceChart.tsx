import { ReactNode, useState } from 'react';
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, TooltipContentProps, XAxis, YAxis } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import dayjs from 'dayjs';
import { toChartRows, ChartRow, MutedColor, RaceSeries } from './chartRows';
import './RaceChart.css';

// A 1.5px line is almost unhittable, so every series also gets a fat transparent twin to hover.
const HitAreaWidth = 14;

export type RaceChartProps<T> = {
  series: RaceSeries<T>[];
  /** Position charts count down: 1 belongs at the top. */
  yInverted?: boolean;
  /** Picked elsewhere — the division table rows select into the chart. */
  selectedKey?: string;
  onSelect?: (key: string | undefined) => void;
  renderTooltip: (row: ChartRow<T>, series: RaceSeries<T>[], activeKey: string | undefined) => ReactNode;
};

type EndLabelProps = { x?: string | number; y?: string | number; index?: number };

export const RaceChart = <T,>({ series, yInverted = false, selectedKey, onSelect, renderTooltip }: RaceChartProps<T>) => {
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  const rows = toChartRows(series);
  const activeKey = hovered ?? selectedKey;

  const lastIndex = (s: RaceSeries<T>) => rows.findLastIndex(row => row.byKey[s.key]);
  const isEmphasized = (s: RaceSeries<T>) => (activeKey ? activeKey === s.key : s.highlighted);

  const tooltip = ({ active, label }: TooltipContentProps<ValueType, NameType>) => {
    const row = rows.find(r => r.weekDate === label);
    return active && row ? renderTooltip(row, series, activeKey) : null;
  };

  return (
    <ResponsiveContainer width="100%" height={400} className="race-chart">
      <LineChart data={rows} margin={{ top: 10, right: 100, bottom: 5, left: 0 }}>
        <CartesianGrid stroke="#e7e7e2" vertical={false} />
        <XAxis
          dataKey="weekDate"
          type="number"
          domain={['dataMin', 'dataMax']}
          ticks={rows.map(r => r.weekDate)}
          tickFormatter={ts => dayjs(ts).format('DD/MM')}
          tick={{ fill: '#6b6b64', fontSize: 12 }}
          stroke="#c9c9c2"
        />
        <YAxis
          reversed={yInverted}
          domain={yInverted ? [1, 'dataMax'] : [0, 'dataMax']}
          allowDecimals={false}
          width={32}
          tick={{ fill: '#6b6b64', fontSize: 12 }}
          stroke="#c9c9c2"
        />
        <Tooltip content={tooltip} />

        {series.map(s => {
          const emphasized = isEmphasized(s);
          const color = s.color ?? MutedColor;
          return (
            <Line
              key={s.key}
              name={s.label}
              type="linear"
              dataKey={(row: ChartRow<T>) => row.byKey[s.key]?.value}
              connectNulls
              isAnimationActive={false}
              stroke={color}
              strokeWidth={emphasized ? 3 : 1.5}
              strokeOpacity={activeKey && !emphasized ? 0.25 : 1}
              dot={emphasized ? { r: 4, strokeWidth: 0, fill: color } : false}
              activeDot={false}
            >
              {(s.color || emphasized) && (
                <LabelList
                  dataKey={(row: ChartRow<T>) => row.byKey[s.key]?.value}
                  content={({ x, y, index }: EndLabelProps) =>
                    index === lastIndex(s) ? (
                      <text className="race-chart-end-label" x={Number(x) + 8} y={Number(y)} dy={4} fill={color}>
                        {s.label}
                      </text>
                    ) : (
                      <g />
                    )
                  }
                />
              )}
            </Line>
          );
        })}

        {series.map(s => (
          <Line
            key={`hit-${s.key}`}
            type="linear"
            dataKey={(row: ChartRow<T>) => row.byKey[s.key]?.value}
            connectNulls
            isAnimationActive={false}
            stroke="transparent"
            strokeWidth={HitAreaWidth}
            dot={false}
            activeDot={false}
            className="race-chart-hit-area"
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(undefined)}
            onClick={() => onSelect?.(selectedKey === s.key ? undefined : s.key)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};
