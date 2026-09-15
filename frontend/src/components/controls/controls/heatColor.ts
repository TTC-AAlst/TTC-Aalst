type HeatColor = {
  bg: string;
  fg: string;
};

const GREY = 153;
const FULL_CONFIDENCE_GAMES = 5;

// Saturation carries sample size so hue is free to carry win rate alone: a pale green
// always means "few games", never a lower bucket.
const BUCKETS: { belowPct: number; rgb: [number, number, number] }[] = [
  { belowPct: 30, rgb: [217, 83, 79] },
  { belowPct: 50, rgb: [232, 131, 58] },
  { belowPct: 65, rgb: [230, 194, 41] },
  { belowPct: 80, rgb: [139, 195, 74] },
  { belowPct: Infinity, rgb: [61, 145, 64] },
];

export function getHeatColor(won: number, lost: number): HeatColor | undefined {
  const games = won + lost;
  if (!games) {
    return undefined;
  }

  const percentage = (won / games) * 100;
  const bucket = BUCKETS.find(b => percentage < b.belowPct)!;

  const confidence = Math.min(games / FULL_CONFIDENCE_GAMES, 1);
  const towardGrey = (channel: number) => Math.round(channel * confidence + GREY * (1 - confidence));

  const [r, g, b] = bucket.rgb;
  return { bg: `rgb(${towardGrey(r)}, ${towardGrey(g)}, ${towardGrey(b)})`, fg: '#333' };
}
