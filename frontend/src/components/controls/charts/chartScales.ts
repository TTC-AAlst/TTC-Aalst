export type Point = { x: number; y: number };

export type Series = {
  label: string;
  points: Point[];
  highlighted: boolean;
};

type Domain = { minX: number; maxX: number; minY: number; maxY: number };

export type Box = { width: number; height: number; padding: number };

export function getDomain(series: Series[]): Domain | undefined {
  const points = series.flatMap(s => s.points);
  if (!points.length) {
    return undefined;
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export function toSvgPoint(point: Point, domain: Domain, box: Box, yInverted: boolean): Point {
  const plotWidth = box.width - box.padding * 2;
  const plotHeight = box.height - box.padding * 2;

  // A single week, or every team on equal points, gives a zero-width domain.
  const spanX = domain.maxX - domain.minX;
  const spanY = domain.maxY - domain.minY;

  const ratioX = spanX === 0 ? 0.5 : (point.x - domain.minX) / spanX;
  const ratioY = spanY === 0 ? 0.5 : (point.y - domain.minY) / spanY;

  return {
    x: box.padding + ratioX * plotWidth,
    y: box.padding + (yInverted ? ratioY : 1 - ratioY) * plotHeight,
  };
}

export function buildPath(points: Point[], domain: Domain, box: Box, yInverted: boolean): string {
  return points
    .map(p => {
      const svg = toSvgPoint(p, domain, box, yInverted);
      return `${svg.x},${svg.y}`;
    })
    .join(' ');
}
