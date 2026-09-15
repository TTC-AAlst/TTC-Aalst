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
| `WeekDate` | the monday that week was played on, so charts can put two competitions on one axis |
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
2. Build a `DivisionWeekCalendar` from the division's own match calendar, already in
   our matches table — no extra API call. It gives the current week (matches dated on
   or before today, ignoring the ones Frenoy has not scheduled yet) and the monday
   each week belongs to. A week with no dated match is not fetched: it could not be
   placed on an axis.
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

### `components/controls/charts/RaceChart.tsx`

One generic line chart on **Recharts**, behind `LazyRaceChart` so the ~91KB gzipped
dependency never enters the eager bundle: only the two pages that chart anything pay
for it. Hand-rolling was tried first and abandoned — axes, tick layout, label
collision and hover hit-testing are most of what a charting library is.

```ts
type RacePoint<T> = { weekDate: string; value: number; meta: T };
type RaceSeries<T> = { key: string; label: string; highlighted: boolean; color?: string; points: RacePoint<T>[] };
type RaceChartProps<T> = {
  series: RaceSeries<T>[];
  yInverted?: boolean;
  selectedKey?: string;
  onSelect?: (key: string | undefined) => void;
  renderTooltip: (row: ChartRow<T>, series: RaceSeries<T>[], activeKey: string | undefined) => ReactNode;
};
```

The point payload is opaque to the chart: each consumer decides what its tooltip
needs and renders it.

### The x axis is a date, not a week number

VTTL week 3 and Sporta week 3 are not the same date, so a shared week-number axis
silently compares two calendars. Matches are bucketed by the **monday of the week
they were played**, and that monday is both the x value and the tick label. The
backend stores it per row (`DivisionRankingWeekEntity.WeekDate`), derived from the
division's own match calendar by `DivisionWeekCalendar`.

`chartRows.toChartRows` merges every series onto one row per monday, which is what
lets a VTTL line and a Sporta line share an axis honestly.

### Colour

Slots 1 and 2 of a CVD-validated categorical palette (`#2a78d6`, `#eb6834`); every
other line is muted grey.

| Chart | Colour carries | Identity carries |
| ----- | -------------- | ---------------- |
| Division points race | ours vs. the rest (two slots, since Sporta A and B share division 1957) | end-of-line label for ours, tooltip for the rest |
| Dashboard positions | the competition | end-of-line label per team |

Nine of our teams cannot get nine distinguishable hues, so the dashboard encodes the
competition in colour and the team in its label.

### Picking a line

Hovering or selecting a line emphasises it, labels its end and dims the rest. A 1.5px
stroke is essentially unhittable, so every series is shadowed by a 14px transparent
twin that carries the mouse handlers.

Selection is shared, not owned by the chart: clicking a row in the division ranking
table picks that line, and clicking a line picks its row. Both sides key off
`divisionSeriesKey(clubId, teamCode)`, because every division has an A team.

Nothing is highlighted by default on the dashboard. Every line there is ours, so
emphasising all of them emphasises none, and the field flashed as the mouse crossed
the gap between lines.

### Consumers

| Where | File | Y axis | Series |
| ----- | ---- | ------ | ------ |
| `/ploegen/:competition/:team/ranking` | `teams/DivisionPointsRace.tsx` | cumulative points, from 0 | all teams in the division |
| Dashboard Teams section | `dashboard/DashboardTeamPositions.tsx` | position, inverted, from 1 | our teams only, behind Cards/Graph tabs |

Points on the division page because every line there is a real competitor racing the
same opponents. Position on the dashboard because our teams are spread across
different divisions and points across divisions are not comparable.

Position is plotted raw (1..largest division size) rather than normalised, because
"3rd" is the number people actually say. The cost is that last-of-10 plots above
last-of-12; the tooltip carries the context as a `3 / 12` badge.

## Decisions

- **Hide the chart below 2 weeks of data.** One point is a dot, not a race. This is
  why VTTL shows nothing until after 2026-09-18.
- **Legend:** twelve teams would swamp the division chart. Direct end-of-line labels
  for coloured series only; muted teams are identified in the tooltip.
- **A tooltip per chart, because they answer different questions.** The division race
  lists the whole standing of that week, leader first, so a line can be read against
  the ones around it. The dashboard shows only the hovered team — position badge,
  division, playing week, won/drawn/lost — since ranking teams from different
  divisions against each other means nothing.
- **No active dots.** Recharts' default drops a dot on every line at the hovered
  week, which reads as noise on a twelve-line chart.
- **Two highlighted lines** on Sporta division 1957, where both A and B play.

## Testing

- Backend: missing-week fill, recent-week refetch, upsert idempotency, and
  `DivisionWeekCalendar` — current week and monday derivation, including the undated
  matches that Frenoy has not scheduled yet.
- Frontend: `toChartRows` and both series builders unit-tested directly; `RaceChart`
  and `RaceTooltip` asserted on rendered DOM; both consumers tested for the
  hide-below-2-weeks rule.

## Out of scope

- Any other chart from the brainstorm (streaks, clutch, heatmap variants)
- Click-through from a chart point to the match
- Past-season browsing; the charts show the current season only
