import { ComponentType, lazy, Suspense } from 'react';
import type { RaceChartProps } from './RaceChart';

// Recharts is ~90KB gzipped and only two pages chart anything, so it stays out of the eager bundle.
// React.lazy cannot carry a generic, so the payload type is erased across the boundary and restored here.
const Chart = lazy(() => import('./RaceChart').then(m => ({ default: m.RaceChart as ComponentType<RaceChartProps<unknown>> })));

export const LazyRaceChart = <T,>(props: RaceChartProps<T>) => (
  <Suspense fallback={<div className="race-chart-loading" />}>
    <Chart {...(props as RaceChartProps<unknown>)} />
  </Suspense>
);
