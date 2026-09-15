import { Series, getDomain, buildPath, toSvgPoint, Box } from './chartScales';
import './LineChart.css';

const box: Box = { width: 800, height: 400, padding: 40 };

type LineChartProps = {
  series: Series[];
  yInverted?: boolean;
  formatTooltip: (series: Series, point: { x: number; y: number }) => string;
};

export const LineChart = ({ series, yInverted = false, formatTooltip }: LineChartProps) => {
  const domain = getDomain(series);
  if (!domain) {
    return null;
  }

  return (
    <svg className="line-chart" viewBox={`0 0 ${box.width} ${box.height}`} preserveAspectRatio="xMidYMid meet">
      {series.map(s => (
        <polyline key={s.label} className={s.highlighted ? 'series highlighted' : 'series'} points={buildPath(s.points, domain, box, yInverted)} fill="none" />
      ))}

      {series.map(s => {
        const last = s.points[s.points.length - 1];
        if (!s.highlighted || !last) {
          return null;
        }
        const at = toSvgPoint(last, domain, box, yInverted);
        return (
          <text key={s.label} className="series-label" x={at.x + 6} y={at.y}>
            {s.label}
          </text>
        );
      })}

      {series.flatMap(s =>
        s.points.map(p => {
          const at = toSvgPoint(p, domain, box, yInverted);
          return (
            <circle key={`${s.label}-${p.x}`} className="point" cx={at.x} cy={at.y} r={4}>
              <title>{formatTooltip(s, p)}</title>
            </circle>
          );
        }),
      )}
    </svg>
  );
};
