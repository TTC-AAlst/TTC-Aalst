import { useState } from 'react';
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, TooltipContentProps, XAxis, YAxis } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import dayjs from 'dayjs';
import { toChartRows, RaceSeries, ChartRow } from './chartRows';
import { MutedColor, RaceTooltip } from './RaceTooltip';
import './RaceChart.css';

type RaceChartProps = {
  series: RaceSeries[];
  /** Position charts count down: 1 belongs at the top. */
  yInverted?: boolean;
};

type EndLabelProps = { x?: string | number; y?: string | number; index?: number };

export const RaceChart = ({ series, yInverted = false }: RaceChartProps) => {
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  const rows = toChartRows(series);

  const lastIndex = (s: RaceSeries) => rows.findLastIndex(row => row.byKey[s.key]);
  const isEmphasized = (s: RaceSeries) => (hovered ? hovered === s.key : s.highlighted);

  const renderTooltip = ({ active, label }: TooltipContentProps<ValueType, NameType>) => {
    const row = rows.find(r => r.weekDate === label);
    return active && row ? <RaceTooltip row={row} series={series} yInverted={yInverted} /> : null;
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
        <Tooltip content={renderTooltip} />

        {series.map(s => {
          const emphasized = isEmphasized(s);
          const end = lastIndex(s);
          return (
            <Line
              key={s.key}
              name={s.label}
              type="linear"
              dataKey={(row: ChartRow) => row.byKey[s.key]?.value}
              connectNulls
              isAnimationActive={false}
              stroke={s.color ?? MutedColor}
              strokeWidth={emphasized ? 3 : 1.5}
              strokeOpacity={hovered && !emphasized ? 0.25 : 1}
              dot={emphasized ? { r: 4, strokeWidth: 0, fill: s.color ?? MutedColor } : false}
              activeDot={{ r: 5 }}
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(undefined)}
            >
              {s.color && (
                <LabelList
                  dataKey={(row: ChartRow) => row.byKey[s.key]?.value}
                  content={({ x, y, index }: EndLabelProps) =>
                    index === end ? (
                      <text className="race-chart-end-label" x={Number(x) + 8} y={Number(y)} dy={4} fill={s.color}>
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
      </LineChart>
    </ResponsiveContainer>
  );
};
