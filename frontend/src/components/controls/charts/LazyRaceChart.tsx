import { lazy, Suspense } from 'react';
import { RaceSeries } from './chartRows';

// Recharts is ~100KB and only two pages chart anything, so it stays out of the eager bundle.
const RaceChart = lazy(() => import('./RaceChart').then(m => ({ default: m.RaceChart })));

type LazyRaceChartProps = {
  series: RaceSeries[];
  yInverted?: boolean;
};

export const LazyRaceChart = (props: LazyRaceChartProps) => (
  <Suspense fallback={<div className="race-chart-loading" />}>
    <RaceChart {...props} />
  </Suspense>
);
