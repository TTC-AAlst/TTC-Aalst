# Opponent Ranking Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colour the win-percentage cell of the per-opponent-ranking table on the player page by win rate, desaturated by sample size.

**Architecture:** One pure function turns `(won, lost)` into a background colour. `PercentageLabel` grows an opt-in `heat` prop that renders the percentage as a coloured pill. `PlayerIndividual` passes that prop on its ranking rows and its totals footer. No data layer changes — `getPlayerStats` already returns `won`/`lost` keyed by opponent ranking.

**Tech Stack:** React 19, TypeScript, vitest + @testing-library/react, happy-dom. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-15-opponent-ranking-heatmap-design.md`

**Note on commits:** the project CLAUDE.md says not to commit without asking. The commit steps below are written out, but ask before running them.

---

## File Structure

| File | Responsibility |
| ---- | -------------- |
| `frontend/src/components/controls/controls/heatColor.ts` (new) | Pure `(won, lost) -> {bg, fg}`. No React, no app imports. |
| `frontend/src/components/controls/controls/spec/heatColorSpec.ts` (new) | Bucket boundaries, confidence ramp, zero-games case. |
| `frontend/src/components/controls/controls/PercentageLabel.tsx` (modify) | Optional `heat` prop renders the pill. |
| `frontend/src/components/controls/controls/spec/PercentageLabelSpec.tsx` (new) | Prop off by default, pill when on. |
| `frontend/src/components/players/Player/PlayerIndividual.tsx` (modify) | Passes `heat` on rows + footer. |
| `frontend/src/components/players/Player/spec/PlayerIndividualSpec.tsx` (new) | Table renders coloured cells, existing content intact. |

All commands run from `frontend/`.

---

### Task 1: The colour function

**Files:**
- Create: `frontend/src/components/controls/controls/heatColor.ts`
- Test: `frontend/src/components/controls/controls/spec/heatColorSpec.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/controls/controls/spec/heatColorSpec.ts`.

`globals: true` is set in `vite.config.ts`, so `describe`/`it`/`expect` need no import.

```ts
import { getHeatColor } from '../heatColor';

describe('getHeatColor', () => {
  it('has no colour without games', () => {
    expect(getHeatColor(0, 0)).toBeUndefined();
  });

  describe('buckets, at full confidence', () => {
    it('reds 0%', () => {
      expect(getHeatColor(0, 10)?.bg).toBe('rgb(217, 83, 79)');
    });

    it('reds just below the orange boundary', () => {
      expect(getHeatColor(29, 71)?.bg).toBe('rgb(217, 83, 79)');
    });

    it('oranges exactly 30%', () => {
      expect(getHeatColor(3, 7)?.bg).toBe('rgb(232, 131, 58)');
    });

    it('oranges just below the yellow boundary', () => {
      expect(getHeatColor(49, 51)?.bg).toBe('rgb(232, 131, 58)');
    });

    it('yellows exactly 50%', () => {
      expect(getHeatColor(5, 5)?.bg).toBe('rgb(230, 194, 41)');
    });

    it('yellows just below the light green boundary', () => {
      expect(getHeatColor(64, 36)?.bg).toBe('rgb(230, 194, 41)');
    });

    it('light greens exactly 65%', () => {
      expect(getHeatColor(65, 35)?.bg).toBe('rgb(139, 195, 74)');
    });

    it('light greens just below the green boundary', () => {
      expect(getHeatColor(79, 21)?.bg).toBe('rgb(139, 195, 74)');
    });

    it('greens exactly 80%', () => {
      expect(getHeatColor(80, 20)?.bg).toBe('rgb(61, 145, 64)');
    });

    it('greens 100%', () => {
      expect(getHeatColor(10, 0)?.bg).toBe('rgb(61, 145, 64)');
    });
  });

  describe('confidence', () => {
    it('is near grey after one game', () => {
      expect(getHeatColor(1, 0)?.bg).toBe('rgb(135, 151, 135)');
    });

    it('climbs at two games', () => {
      expect(getHeatColor(2, 0)?.bg).toBe('rgb(116, 150, 117)');
    });

    it('climbs at three games', () => {
      expect(getHeatColor(3, 0)?.bg).toBe('rgb(98, 148, 100)');
    });

    it('climbs at four games', () => {
      expect(getHeatColor(4, 0)?.bg).toBe('rgb(79, 147, 82)');
    });

    it('is full at five games', () => {
      expect(getHeatColor(5, 0)?.bg).toBe('rgb(61, 145, 64)');
    });

    it('does not keep climbing past five', () => {
      expect(getHeatColor(12, 0)?.bg).toBe(getHeatColor(5, 0)?.bg);
    });

    it('greys a losing record just the same', () => {
      expect(getHeatColor(0, 1)?.bg).toBe('rgb(166, 139, 138)');
    });
  });

  it('always asks for dark text', () => {
    expect(getHeatColor(0, 1)?.fg).toBe('#333');
    expect(getHeatColor(10, 0)?.fg).toBe('#333');
    expect(getHeatColor(5, 5)?.fg).toBe('#333');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && bunx vitest run src/components/controls/controls/spec/heatColorSpec.ts
```

Expected: FAIL — `Failed to resolve import "../heatColor"`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/controls/controls/heatColor.ts`:

```ts
export type HeatColor = {
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
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && bunx vitest run src/components/controls/controls/spec/heatColorSpec.ts
```

Expected: PASS, 20 tests.

- [ ] **Step 5: Commit** (ask first)

```bash
git add frontend/src/components/controls/controls/heatColor.ts frontend/src/components/controls/controls/spec/heatColorSpec.ts
git commit -m "Add win-rate heat colour desaturated by sample size"
```

---

### Task 2: The `heat` prop on PercentageLabel

**Files:**
- Modify: `frontend/src/components/controls/controls/PercentageLabel.tsx`
- Test: `frontend/src/components/controls/controls/spec/PercentageLabelSpec.tsx`

`PercentageLabel` has two call sites. `TeamOverviewPlayerStats.tsx:10` must keep its
current appearance, so the prop defaults to off.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/controls/controls/spec/PercentageLabelSpec.tsx`:

```tsx
import { render } from '@testing-library/react';
import { PercentageLabel } from '../PercentageLabel';

describe('PercentageLabel', () => {
  it('renders nothing without games', () => {
    const { container } = render(<PercentageLabel won={0} lost={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a plain percentage by default', () => {
    const { container } = render(<PercentageLabel won={1} lost={4} />);
    expect(container.textContent).toBe('20%');
    expect(container.querySelector('span')).toBeNull();
  });

  it('honours decimals', () => {
    const { container } = render(<PercentageLabel won={3} lost={4} decimals={2} />);
    expect(container.textContent).toBe('42,86%');
  });

  it('paints the percentage when asked', () => {
    const { container } = render(<PercentageLabel won={1} lost={4} heat />);
    const pill = container.querySelector('span');
    expect(pill).not.toBeNull();
    expect(pill!.style.backgroundColor).toBe('rgb(217, 83, 79)');
    expect(pill!.style.color).toBe('rgb(51, 51, 51)');
  });

  it('mutes the paint on a small sample', () => {
    const { container } = render(<PercentageLabel won={2} lost={0} heat />);
    expect(container.querySelector('span')!.style.backgroundColor).toBe('rgb(116, 150, 117)');
  });

  it('still reads as the same number when painted', () => {
    const { container } = render(<PercentageLabel won={1} lost={4} heat />);
    expect(container.textContent).toBe('20%');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && bunx vitest run src/components/controls/controls/spec/PercentageLabelSpec.tsx
```

Expected: FAIL — the `heat` tests fail because `container.querySelector('span')` is null. TypeScript also rejects the unknown `heat` prop.

- [ ] **Step 3: Write the implementation**

Replace the whole of `frontend/src/components/controls/controls/PercentageLabel.tsx`:

```tsx
import { getHeatColor } from './heatColor';

type PercentageLabelProps = {
  won: number;
  lost: number;
  decimals?: number;
  heat?: boolean;
};

export const PercentageLabel = ({ won, lost, decimals = 0, heat = false }: PercentageLabelProps) => {
  if (!won && !lost) {
    return null;
  }

  let percentage = ((won / (lost + won)) * 100).toFixed(decimals);
  if (decimals && percentage.substr(percentage.indexOf('.')) === '.00') {
    percentage = percentage.substr(0, percentage.indexOf('.'));
  }

  const label = percentage.replace('.', ',') + '%';
  if (!heat) {
    return <div className="pull-right">{label}</div>;
  }

  const color = getHeatColor(won, lost);
  return (
    <div className="pull-right">
      <span style={color ? { backgroundColor: color.bg, color: color.fg, padding: '2px 6px', borderRadius: 3 } : undefined}>{label}</span>
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && bunx vitest run src/components/controls/controls/spec/PercentageLabelSpec.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Verify the other call site did not change**

```bash
cd frontend && bunx vitest run
```

Expected: PASS, no new failures. `TeamOverviewPlayerStats` passes no `heat`, so it takes the unchanged branch.

- [ ] **Step 6: Commit** (ask first)

```bash
git add frontend/src/components/controls/controls/PercentageLabel.tsx frontend/src/components/controls/controls/spec/PercentageLabelSpec.tsx
git commit -m "Let PercentageLabel paint itself by win rate"
```

---

### Task 3: Wire it into the player table

**Files:**
- Modify: `frontend/src/components/players/Player/PlayerIndividual.tsx` (the two `PercentageLabel` usages, currently lines 67 and 81)
- Test: `frontend/src/components/players/Player/spec/PlayerIndividualSpec.tsx`

The component has no spec today; the project CLAUDE.md boy scout rule says to add one.

`getPlayerStats` resolves players through `storeUtil.getPlayer`, so that module is
mocked the way `players/spec/PlayersSpec.tsx` already does it.

Fixture shape, and the numbers every assertion below depends on:

| Opponent ranking | Record | Win % | Games | Confidence | Expected `bg` |
| ---------------- | ------ | ----- | ----- | ---------- | ------------- |
| B2               | 1-4    | 20%   | 5     | full       | `rgb(217, 83, 79)` |
| C2 (own ranking) | 0-0    | —     | 0     | —          | no pill rendered |
| C4               | 2-0    | 100%  | 2     | 0.4        | `rgb(116, 150, 117)` |
| Footer total     | 3-4    | 42,86% | 7    | full       | `rgb(232, 131, 58)` |

C4 at a perfect 2-0 rendering greyer than B2 at 1-4 is the whole point of the feature,
so it is asserted directly.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/players/Player/spec/PlayerIndividualSpec.tsx`:

```tsx
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../utils/test-utils';
import { PlayerIndividual } from '../PlayerIndividual';
import PlayerModel from '../../../../models/PlayerModel';
import { IPlayerCompetition } from '../../../../models/model-interfaces';

const player = new PlayerModel({
  id: 1,
  firstName: 'Jan',
  lastName: 'Peeters',
  vttl: { competition: 'Vttl', ranking: 'C2', uniqueIndex: 1 } as IPlayerCompetition,
});

vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: vi.fn(),
    getTeams: vi.fn().mockReturnValue([]),
    getClub: vi.fn(),
    getPlayer: vi.fn(() => player),
    getMatch: vi.fn(),
    getMatches: vi.fn().mockReturnValue([]),
    matches: { getAllMatches: vi.fn().mockReturnValue([]) },
  },
}));

const game = (outPlayerUniqueIndex: number, outcome: 'Won' | 'Lost', matchNumber: number) => ({
  matchNumber,
  homePlayerUniqueIndex: 1,
  outPlayerUniqueIndex,
  outcome,
});

const storeMatch = {
  id: 1,
  competition: 'Vttl',
  isSyncedWithFrenoy: true,
  isHomeMatch: true,
  date: '2026-01-10T20:00:00',
  opponent: {},
  comments: [],
  players: [
    { playerId: 1, name: 'Jan Peeters', uniqueIndex: 1, ranking: 'C2' },
    { name: 'opp B2', uniqueIndex: -1, ranking: 'B2' },
    { name: 'opp C4', uniqueIndex: -2, ranking: 'C4' },
  ],
  games: [
    game(-1, 'Won', 1),
    game(-1, 'Lost', 2),
    game(-1, 'Lost', 3),
    game(-1, 'Lost', 4),
    game(-1, 'Lost', 5),
    game(-2, 'Won', 6),
    game(-2, 'Won', 7),
  ],
};

const renderTable = () =>
  renderWithProviders(<PlayerIndividual player={player} competition="Vttl" />, {
    preloadedState: { matches: [storeMatch] as never },
  });

describe('PlayerIndividual', () => {
  it('paints a cell per ranking the player met', () => {
    const { container } = renderTable();
    const pills = container.querySelectorAll('tbody tr td:nth-child(3) span');
    expect(pills).toHaveLength(2);
  });

  it('paints a poor record against B2 fully red', () => {
    const { container } = renderTable();
    const pills = container.querySelectorAll<HTMLElement>('tbody tr td:nth-child(3) span');
    expect(pills[0]!.textContent).toBe('20%');
    expect(pills[0]!.style.backgroundColor).toBe('rgb(217, 83, 79)');
  });

  it('mutes a perfect but two-game record against C4', () => {
    const { container } = renderTable();
    const pills = container.querySelectorAll<HTMLElement>('tbody tr td:nth-child(3) span');
    expect(pills[1]!.textContent).toBe('100%');
    expect(pills[1]!.style.backgroundColor).toBe('rgb(116, 150, 117)');
  });

  it('paints the totals footer', () => {
    const { container } = renderTable();
    const footer = container.querySelector<HTMLElement>('tfoot tr td:nth-child(3) span');
    expect(footer!.textContent).toBe('42,86%');
    expect(footer!.style.backgroundColor).toBe('rgb(232, 131, 58)');
  });

  it('leaves the own-ranking row unpainted when it has no games', () => {
    const { container } = renderTable();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[1]!.querySelector('td:nth-child(3) span')).toBeNull();
  });

  it('keeps the existing table intact', () => {
    const { container } = renderTable();
    expect(container.querySelector('tbody tr.accentuate')).not.toBeNull();
    expect(container.querySelectorAll('thead th')).toHaveLength(4);
    expect(container.querySelector('tfoot')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && bunx vitest run src/components/players/Player/spec/PlayerIndividualSpec.tsx
```

Expected: FAIL — the painting tests find zero `span` elements, because `PlayerIndividual` does not pass `heat` yet. The two structural tests (own-ranking row, table intact) should already pass.

If instead every test errors on rendering, the fixture is wrong rather than the
component — fix the fixture before touching `PlayerIndividual`.

- [ ] **Step 3: Write the implementation**

In `frontend/src/components/players/Player/PlayerIndividual.tsx`, add `heat` to both
`PercentageLabel` usages.

The row (currently line 67):

```tsx
              <td>
                <PercentageLabel won={won} lost={lost} heat />
              </td>
```

The footer (currently line 81):

```tsx
          <td>
            <PercentageLabel won={total.won} lost={total.lost} decimals={2} heat />
          </td>
```

Nothing else in the file changes.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && bunx vitest run src/components/players/Player/spec/PlayerIndividualSpec.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit** (ask first)

```bash
git add frontend/src/components/players/Player/PlayerIndividual.tsx frontend/src/components/players/Player/spec/PlayerIndividualSpec.tsx
git commit -m "Colour the player ranking table by win rate"
```

---

### Task 4: Full verification

- [ ] **Step 1: Whole suite**

```bash
cd frontend && bunx vitest run
```

Expected: PASS, no failures.

- [ ] **Step 2: Lint**

```bash
cd frontend && bun run lint
```

Expected: zero warnings, zero errors. The project CLAUDE.md requires zero linter warnings.

- [ ] **Step 3: Types**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Dead code**

```bash
cd frontend && bun run knip
```

Expected: no new unused exports. `HeatColor` is exported for the `PercentageLabel`
signature; if knip flags it as unused, inline the type and drop the export.

- [ ] **Step 5: Look at it**

```bash
cd frontend && bun start
```

Open a player page, both competition tabs. Check that a player with few games against
a tier shows a muted cell and a well-established tier shows a vivid one. This is the
one genuinely visual check — Wouter verifies it.

---

## Out of scope

- Club-aggregate heatmap across all players
- Colouring the belles column
- Any change to `getPlayerStats`
