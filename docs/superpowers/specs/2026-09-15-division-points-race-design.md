# Division Points Race — Design

**Date:** 2026-09-15
**Status:** Approved, ready for implementation plan

## Problem

The site shows a division's standings as they are today. It cannot show how they got
there. A season is a story — who led in October, when we overtook them, whether the
gap is closing — and none of that is visible.

## Spike findings

Both were verified against the live Frenoy (TabT) API before designing. They overturn
the assumption that this feature needs weekly snapshots taken from now on.

| Call | Result |
| ---- | ------ |
| `GetMatches` with `DivisionId` and no `Club` | Returns every match in the division, all clubs, with `WeekName` and `Score` (including forfeits as `13-3 (af)`). 132 matches for VTTL division 8695. |
| `GetDivisionRanking` with `WeekName` | **Returns the standings as of that week**: position, points, games played. Verified on division 8695 at weeks 1, 5 and 22. |

`GetDivisionRanking` + `WeekName` is the one we use. It gives the whole race
retroactively, for any past season, without reimplementing the competition's points
rules — which are not derivable from the data anyway, since a draw's value is not
stated anywhere we read.

Two incidental findings that shape the design:

- **Sporta teams A and B are both in division 1957.** Any "find our team in this
  division" logic that assumes a single match is wrong.
- Division ids are per-season. Division 9513 exists in season 27 and returns nothing
  in season 26.

### Season state at time of writing

- VTTL has not started; first match is 2026-09-18.
- Sporta has played 2 weeks.

Neither matters, because `WeekName` backfills both. Recorded only to explain why the
VTTL charts will be empty on first deploy.

## Storage

Rankings are not persisted today: `TeamService.cs:76` fetches live from Frenoy into a
static in-memory `RankingCache`. A race needs ~22 calls per division at roughly 1.5s
each, so on-demand fetching is a 30-second page load and in-memory warming is ~3
minutes of SOAP on every restart. The data has to be stored.

The storage is **backfillable**, which is the important difference from snapshotting:
lose the table, change the schema, or miss a week, and a re-run restores it exactly.

### `DivisionRankingWeek`

New EF entity `DivisionRankingWeekEntity`.

| Column | Note |
| ------ | ---- |
| `Id` | identity |
| `Year` | season, matching `TeamEntity.Year` |
| `Competition` | VTTL and Sporta division ids are independent sequences and may collide |
| `FrenoyDivisionId` | |
| `Week` | |
| `Position`, `Points`, `GamesPlayed`, `GamesWon`, `GamesLost`, `GamesDraw` | from `GetDivisionRanking` |
| `ClubId`, `TeamCode` | |
| `TeamName` | stored verbatim from Frenoy (e.g. `St.-Niklase A`). Other clubs in a division are not guaranteed to resolve from our clubs table, and a join buys nothing. |

Index on `(Year, Competition, FrenoyDivisionId, Week)`.
Uniqueness on `(Year, Competition, FrenoyDivisionId, Week, TeamCode)`.

## Sync

`FrenoyTeamsApi.SyncDivisionRankingHistory(divisionId, competition, year)`, called
from `MatchService.FrenoyTeamSync(teamId)` right after `SyncTeamMatches`. That is the
existing per-team sync the admin UI triggers, so syncing a team also refreshes its
division's race:

1. Read the weeks already stored for the division.
2. Derive the current week from the division's own match calendar — matches with a
   date on or before today, already in our matches table. No extra API call.
3. Fetch every missing week, plus re-fetch the last 2 stored weeks to pick up
   forfeits and retroactive corrections.
4. Upsert on `(Year, Competition, FrenoyDivisionId, Week, TeamCode)`.

Idempotent, so re-running is always safe. The first run backfills the season; later
runs cost about two calls per division.

## API

Two endpoints, deliberately not one. A single combined endpoint would ship ~1300 rows
to a dashboard that needs 200.

| Endpoint | Returns |
| -------- | ------- |
| `GET /api/teams/RankingHistory/{competition}/{divisionId:int}` | every team in the division, every stored week, with points |
| `GET /api/teams/RankingHistoryPositions` | our teams only, every stored week, with position and division size |

The first mirrors the existing `Ranking/{competition}/{divisionId:int}` route on
`TeamsController`, and its frontend thunk mirrors `loadTeamRanking` in
`teamsReducer.ts:35`.

## Frontend

### `components/controls/charts/LineChart.tsx`

One generic hand-rolled SVG line chart, no dependency. The project has no charting
library and this needs a dozen lines on numeric axes, which is not worth ~100KB.
Hand-rolling also keeps the draw-on-load animation under our control and leaves the
result assertable as DOM, consistent with how the rest of the suite tests.

```ts
type Series = {
  label: string;
  points: { x: number; y: number }[];
  highlighted: boolean;
};

type LineChartProps = {
  series: Series[];
  yInverted?: boolean;
  formatTooltip: (series: Series, point: { x: number; y: number }) => string;
};
```

### Consumers

| Where | File | Y axis | Series |
| ----- | ---- | ------ | ------ |
| `/ploegen/:competition/:team/ranking` | `teams/DivisionRanking.tsx` | cumulative points | all teams in the division; ours bold in club colour, others muted |
| Dashboard Teams section | `dashboard/DashboardGlobalTeamStats.tsx` | position, inverted so 1 is top | our teams only, behind Cards/Graph tabs |

Points on the division page because every line there is a real competitor racing the
same opponents. Position on the dashboard because our teams are spread across
different divisions — five of them in Sporta alone — and points across divisions are
not comparable.

Position is plotted raw (1..largest division size) rather than normalised, because
"3rd" is the number people actually say. The cost is that last-of-10 plots above
last-of-12; the tooltip carries the context as `3rd of 12`.

## Decisions

- **Hide the chart below 2 weeks of data.** One point is a dot, not a race. This is
  why VTTL shows nothing until after 2026-09-18.
- **Animation:** draw-on-load via `stroke-dasharray` / `stroke-dashoffset`, disabled
  under `prefers-reduced-motion`.
- **Legend:** twelve teams would swamp the division chart. Direct end-of-line labels
  for our teams only; other teams identified on hover.
- **Tooltip:** nearest week on hover.
- **Two highlighted lines** on Sporta division 1957, where both A and B play.

## Testing

- Backend: missing-week fill, recent-week refetch, upsert idempotency, and the
  current-week derivation from the match calendar.
- Frontend: the pure scale and path-building functions unit-tested directly;
  `LineChart` asserted on rendered SVG DOM; both consumers tested for the
  hide-below-2-weeks rule and for highlighting two of our teams in one division.

## Out of scope

- Any other chart from the brainstorm (streaks, clutch, heatmap variants)
- Click-through from a chart point to the match
- Past-season browsing; the charts show the current season only
