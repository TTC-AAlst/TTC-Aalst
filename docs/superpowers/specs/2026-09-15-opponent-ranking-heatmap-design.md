# Opponent Ranking Heatmap — Design

**Date:** 2026-09-15
**Status:** Approved, ready for implementation plan

## Problem

`PlayerIndividual.tsx` already shows how a player performs against each opponent
ranking: won/lost, win percentage, belles, and a totals footer. The numbers are all
there, but a player has to read every row to find their weak spot. Nothing draws the
eye to "you lose to B2".

## Solution

Colour the existing win-percentage cell by win rate, desaturated by sample size.
The table keeps its rows, its belles column, its totals footer and the `accentuate`
styling on the player's own ranking.

This was chosen over adding a separate horizontal tier strip (duplicates the numbers,
breaks below ~350px once a player has met eight or more tiers) and over replacing the
table with such a strip (loses per-tier belles).

## Colour model

Two independent visual axes:

| Axis       | Encodes      | Never collides because             |
| ---------- | ------------ | ---------------------------------- |
| Hue        | win rate     | hue only ever comes from the bucket |
| Saturation | sample size  | greying changes saturation, not hue |

A player at 100% off two games gets a near-grey cell; the same 100% off twelve games
is vivid. A confident 70% stays a saturated light green and can never be mistaken for
a washed-out 95%.

### Buckets

Upper bound exclusive, so exactly 30% is orange.

| Win %    | Colour      | Hex       |
| -------- | ----------- | --------- |
| 0 – 30   | red         | `#d9534f` |
| 30 – 50  | orange      | `#e8833a` |
| 50 – 65  | yellow      | `#e6c229` |
| 65 – 80  | light green | `#8bc34a` |
| 80 – 100 | green       | `#3d9140` |

### Confidence

```
confidence = min(games / 5, 1)
```

Five games against a tier gives full colour. This matches the threshold the
brainstorm already used for the Clutch King minimum, so the site stays consistent
about what counts as enough data.

### Mixing

Channel-wise linear interpolation toward `#999` (`rgb(153,153,153)`):

```
channel = round(bucket * confidence + 153 * (1 - confidence))
```

Returned as an `rgb(r, g, b)` string. Mixed in JS rather than via CSS `color-mix`
so the result is a deterministic string a test can assert, with no browser-support
question.

Worked example — one game lost against B2, `confidence = 0.2`:

```
red #d9534f = (217, 83, 79)
R = 217*0.2 + 153*0.8 = 166
G =  83*0.2 + 153*0.8 = 139
B =  79*0.2 + 153*0.8 = 138   ->  rgb(166, 139, 138)
```

### Text colour

Constant `#333`.

Red is the darkest bucket at relative luminance 0.215, and desaturation moves every
colour toward `#999` at 0.318 — lighter, never darker. The whole palette and all its
greyed variants therefore sit above the 0.179 white/black crossover, so a luminance
calculation would return dark text in every reachable case. A constant is the same
answer with less code.

## Components

### `frontend/src/components/controls/controls/heatColor.ts` (new)

```ts
export type HeatColor = { bg: string; fg: string };
export function getHeatColor(won: number, lost: number): HeatColor | undefined;
```

Pure, no React, no imports from the app. Returns `undefined` when `won + lost === 0`
so the caller renders the cell exactly as it does today.

### `frontend/src/components/controls/controls/PercentageLabel.tsx` (modified)

Gains an optional `heat?: boolean`. Default off, so the other call site
(`TeamOverviewPlayerStats.tsx:10`) is unaffected. When on, the percentage renders as
a padded, rounded pill carrying `bg` and `fg`.

### `frontend/src/components/players/Player/PlayerIndividual.tsx` (modified)

Passes `heat` on both the per-ranking rows and the totals footer. No other change.

## Decisions

- **Totals footer is coloured.** It is always at full confidence, and it gives the
  table a summary that pops.
- **Belles column stays uncoloured.** Per-tier belle counts are 0–2, so every cell
  would render near-grey, and a second colour system competes with the first for
  attention.

## Testing

TDD. `PlayerIndividual` has no spec today, so the boy scout rule in the project
CLAUDE.md applies.

### `controls/spec/heatColorSpec.ts`

- bucket boundaries: 0%, 29%, 30%, 49%, 50%, 64%, 65%, 79%, 80%, 100%
- `won + lost === 0` returns `undefined`
- confidence ramp at 1, 2, 3, 4, 5 and 12 games — 5 and 12 identical
- one game lands near grey (the worked example above)
- `fg` is `#333` in every case

### `players/Player/spec/PlayerIndividualSpec.tsx`

- one coloured cell per ranking row
- a low-sample row renders greyer than a high-sample row at the same percentage
- existing table content still renders: belles column, totals footer, `accentuate`
  on the player's own ranking

## Out of scope

- Club-aggregate heatmap across all players
- Colouring the belles column
- Any change to `getPlayerStats`; the data is already exactly right
