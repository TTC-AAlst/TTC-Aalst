import { getDomain, buildPath, toSvgPoint } from '../chartScales';

const box = { width: 800, height: 400, padding: 40 };

describe('getDomain', () => {
  it('spans the x and y range of every series', () => {
    const domain = getDomain([
      {
        label: 'a',
        highlighted: false,
        points: [
          { x: 1, y: 3 },
          { x: 5, y: 20 },
        ],
      },
      {
        label: 'b',
        highlighted: false,
        points: [
          { x: 1, y: 0 },
          { x: 7, y: 12 },
        ],
      },
    ]);
    expect(domain).toEqual({ minX: 1, maxX: 7, minY: 0, maxY: 20 });
  });

  it('ignores empty series', () => {
    const domain = getDomain([
      { label: 'a', highlighted: false, points: [{ x: 2, y: 5 }] },
      { label: 'b', highlighted: false, points: [] },
    ]);
    expect(domain).toEqual({ minX: 2, maxX: 2, minY: 5, maxY: 5 });
  });

  it('has no domain without points', () => {
    expect(getDomain([])).toBeUndefined();
  });
});

describe('toSvgPoint', () => {
  const domain = { minX: 1, maxX: 5, minY: 0, maxY: 20 };

  it('puts the first point at the left padding', () => {
    expect(toSvgPoint({ x: 1, y: 0 }, domain, box, false).x).toBe(40);
  });

  it('puts the last point at the right edge minus padding', () => {
    expect(toSvgPoint({ x: 5, y: 0 }, domain, box, false).x).toBe(760);
  });

  it('puts the highest y at the top', () => {
    expect(toSvgPoint({ x: 1, y: 20 }, domain, box, false).y).toBe(40);
  });

  it('puts the lowest y at the bottom', () => {
    expect(toSvgPoint({ x: 1, y: 0 }, domain, box, false).y).toBe(360);
  });

  it('flips y when inverted, so position 1 is on top', () => {
    const positions = { minX: 1, maxX: 5, minY: 1, maxY: 12 };
    expect(toSvgPoint({ x: 1, y: 1 }, positions, box, true).y).toBe(40);
    expect(toSvgPoint({ x: 1, y: 12 }, positions, box, true).y).toBe(360);
  });

  it('centres a flat series instead of dividing by zero', () => {
    const flat = { minX: 1, maxX: 1, minY: 5, maxY: 5 };
    const point = toSvgPoint({ x: 1, y: 5 }, flat, box, false);
    expect(point.x).toBe(400);
    expect(point.y).toBe(200);
  });
});

describe('buildPath', () => {
  it('joins points into a polyline string', () => {
    const domain = { minX: 1, maxX: 2, minY: 0, maxY: 10 };
    const path = buildPath(
      [
        { x: 1, y: 0 },
        { x: 2, y: 10 },
      ],
      domain,
      box,
      false,
    );
    expect(path).toBe('40,360 760,40');
  });

  it('is empty for a series with no points', () => {
    const domain = { minX: 1, maxX: 2, minY: 0, maxY: 10 };
    expect(buildPath([], domain, box, false)).toBe('');
  });
});
