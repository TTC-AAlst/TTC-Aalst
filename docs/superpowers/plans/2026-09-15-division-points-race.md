# Division Points Race Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show how a division's season unfolded — a line chart of cumulative points on the team ranking page, and of position across all our teams on the dashboard.

**Architecture:** A new `DivisionRankingWeek` table stores one row per team per week, filled from Frenoy's `GetDivisionRanking` with a `WeekName` parameter during the existing per-team sync. Two endpoints read it. The frontend renders both charts through one hand-rolled SVG `LineChart` component — no charting dependency.

**Tech Stack:** .NET 10, EF Core, MySQL, xUnit. React 19, TypeScript, Redux Toolkit, vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-09-15-division-points-race-design.md`

**Note on commits:** the project CLAUDE.md says not to commit without asking. Commit steps are written out; ask before running them.

---

## File Structure

| File | Responsibility |
| ---- | -------------- |
| `backend/src/Ttc.DataEntities/DivisionRankingWeekEntity.cs` (new) | One team's standing in one division in one week |
| `backend/src/Ttc.DataAccess/TtcDbContext.cs` (modify) | DbSet + index |
| `backend/src/Ttc.Model/Teams/DivisionRankingWeek.cs` (new) | API model |
| `backend/src/Frenoy.Api/RankingWeekPlanner.cs` (new) | Pure: which weeks need fetching |
| `backend/src/Frenoy.Api/FrenoyTeamsApi.cs` (modify) | Fetch + upsert the weeks the planner picked |
| `backend/src/Ttc.DataAccess/Services/TeamService.cs` (modify) | Read the two shapes |
| `backend/src/Ttc.DataAccess/Services/MatchService.cs` (modify) | Call the sync from `FrenoyTeamSync` |
| `backend/src/Ttc.WebApi/Controllers/TeamsController.cs` (modify) | Two endpoints |
| `frontend/src/components/controls/charts/chartScales.ts` (new) | Pure: domains, scales, polyline paths |
| `frontend/src/components/controls/charts/LineChart.tsx` (new) | Generic SVG line chart |
| `frontend/src/reducers/rankingHistoryReducer.ts` (new) | Thunks + slice |
| `frontend/src/components/teams/DivisionPointsRace.tsx` (new) | Points chart, used by `DivisionRanking.tsx` |
| `frontend/src/components/dashboard/DashboardTeamPositions.tsx` (new) | Position chart for the dashboard tab |

Backend commands run from `backend/`, frontend from `frontend/`.

---

### Task 1: The entity and its table

**Files:**
- Create: `backend/src/Ttc.DataEntities/DivisionRankingWeekEntity.cs`
- Modify: `backend/src/Ttc.DataAccess/TtcDbContext.cs`

- [ ] **Step 1: Create the entity**

Follow the existing entity style (see `EventEntity.cs`: `[Table]`, `[Key]`, data annotations).

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Ttc.Model.Players;

namespace Ttc.DataEntities;

/// <summary>
/// A division's standings as they were after a given week.
/// Frenoy serves these per week, so past weeks are re-fetchable and this table
/// can always be rebuilt from scratch.
/// </summary>
[Table("DivisionRankingWeek")]
[Index(nameof(Year), nameof(Competition), nameof(FrenoyDivisionId), nameof(Week))]
public class DivisionRankingWeekEntity
{
    [Key]
    public int Id { get; set; }

    public int Year { get; set; }
    public Competition Competition { get; set; }
    public int FrenoyDivisionId { get; set; }
    public int Week { get; set; }

    public int Position { get; set; }
    public int Points { get; set; }
    public int GamesPlayed { get; set; }
    public int GamesWon { get; set; }
    public int GamesLost { get; set; }
    public int GamesDraw { get; set; }

    public int ClubId { get; set; }

    [StringLength(10)]
    public string TeamCode { get; set; } = "";

    [StringLength(100)]
    public string TeamName { get; set; } = "";
}
```

- [ ] **Step 2: Register the DbSet**

In `backend/src/Ttc.DataAccess/TtcDbContext.cs`, in the `#region DbSets` block, after the `Toog` line:

```csharp
    public DbSet<DivisionRankingWeekEntity> DivisionRankingWeeks { get; set; } = null!;
```

- [ ] **Step 3: Create the migration**

```bash
cd backend && dotnet ef migrations add DivisionRankingWeek -p src/Ttc.DataAccess -s src/Ttc.DataAccess
```

Expected: a new pair of files under `src/Ttc.DataAccess/Migrations/`.

- [ ] **Step 4: Read the generated migration**

Open the generated `*_DivisionRankingWeek.cs` and confirm it creates one table with the columns above and the index — and nothing else. If it contains unrelated changes, stop and report: that means the model snapshot was already out of sync before this task.

- [ ] **Step 5: Apply it**

```bash
cd backend && dotnet ef database update -p src/Ttc.DataAccess -s src/Ttc.DataAccess
```

- [ ] **Step 6: Build**

```bash
cd backend && dotnet build Ttc.slnx
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 7: Commit** (ask first)

```bash
git add backend/src/Ttc.DataEntities/DivisionRankingWeekEntity.cs backend/src/Ttc.DataAccess/TtcDbContext.cs backend/src/Ttc.DataAccess/Migrations
git commit -m "Add a table for weekly division standings"
```

---

### Task 2: Which weeks to fetch

The only genuinely logical part of the sync, so it is extracted as a pure static and
unit-tested. The SOAP call and the upsert around it are integration code.

**Files:**
- Create: `backend/src/Frenoy.Api/RankingWeekPlanner.cs`
- Test: `backend/src/Ttc.UnitTests/RankingWeekPlannerTests.cs`

- [ ] **Step 1: Write the failing test**

Tests use xUnit with `[Fact]`, matching `FrenoyMatchTeamMappingTests.cs`.

```csharp
using Frenoy.Api;

namespace Ttc.UnitTests;

public class RankingWeekPlannerTests
{
    [Fact]
    public void NothingStored_FetchesEveryPlayedWeek()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [], currentWeek: 5);
        Assert.Equal([1, 2, 3, 4, 5], weeks);
    }

    [Fact]
    public void SeasonNotStarted_FetchesNothing()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [], currentWeek: 0);
        Assert.Empty(weeks);
    }

    [Fact]
    public void FetchesTheMissingWeeks()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3], currentWeek: 5);
        Assert.Contains(4, weeks);
        Assert.Contains(5, weeks);
    }

    [Fact]
    public void RefetchesTheTwoMostRecentStoredWeeks()
    {
        // A forfeit or correction can change a week that was already stored.
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3], currentWeek: 5);
        Assert.Contains(2, weeks);
        Assert.Contains(3, weeks);
        Assert.DoesNotContain(1, weeks);
    }

    [Fact]
    public void FullyUpToDate_StillRefetchesRecentWeeks()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3, 4, 5], currentWeek: 5);
        Assert.Equal([4, 5], weeks);
    }

    [Fact]
    public void ReturnsWeeksInOrderWithoutDuplicates()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 2, 3], currentWeek: 6);
        Assert.Equal([2, 3, 4, 5, 6], weeks);
    }

    [Fact]
    public void GapInStoredWeeks_IsFilled()
    {
        var weeks = RankingWeekPlanner.WeeksToFetch(stored: [1, 4], currentWeek: 4);
        Assert.Contains(2, weeks);
        Assert.Contains(3, weeks);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && dotnet test src/Ttc.UnitTests --filter RankingWeekPlannerTests
```

Expected: build failure — `RankingWeekPlanner` does not exist.

- [ ] **Step 3: Write the implementation**

```csharp
namespace Frenoy.Api;

public static class RankingWeekPlanner
{
    private const int RefetchRecentWeeks = 2;

    /// <summary>
    /// Frenoy rewrites a week's standings when a forfeit or correction lands, so the
    /// most recent stored weeks are always re-fetched rather than trusted.
    /// </summary>
    public static int[] WeeksToFetch(IReadOnlyCollection<int> stored, int currentWeek)
    {
        if (currentWeek < 1)
        {
            return [];
        }

        var wanted = new HashSet<int>();
        for (var week = 1; week <= currentWeek; week++)
        {
            if (!stored.Contains(week))
            {
                wanted.Add(week);
            }
        }

        foreach (var week in stored.OrderByDescending(x => x).Take(RefetchRecentWeeks))
        {
            wanted.Add(week);
        }

        return wanted.Order().ToArray();
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd backend && dotnet test src/Ttc.UnitTests --filter RankingWeekPlannerTests
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit** (ask first)

```bash
git add backend/src/Frenoy.Api/RankingWeekPlanner.cs backend/src/Ttc.UnitTests/RankingWeekPlannerTests.cs
git commit -m "Decide which division ranking weeks need fetching"
```

---

### Task 3: Fetch and store the weeks

**Files:**
- Modify: `backend/src/Frenoy.Api/FrenoyTeamsApi.cs`
- Modify: `backend/src/Ttc.DataAccess/Services/MatchService.cs` (in `FrenoyTeamSync`, currently around line 409)

Read `FrenoyTeamsApi.cs` first — `GetTeamRankings(int divisionId)` already shows how a
`GetDivisionRankingRequest` is built and how `RankingEntries` are mapped.

The spike verified that adding `WeekName` to that same request returns the standings as
of that week. `WeekName` is a string in the WSDL.

- [ ] **Step 1: Add the sync method to `FrenoyTeamsApi`**

```csharp
    public async Task SyncDivisionRankingHistory(int divisionId, int currentWeek)
    {
        var stored = await _db.DivisionRankingWeeks
            .Where(x => x.Year == _settings.Year
                        && x.Competition == _settings.Competition
                        && x.FrenoyDivisionId == divisionId)
            .Select(x => x.Week)
            .Distinct()
            .ToListAsync();

        foreach (var week in RankingWeekPlanner.WeeksToFetch(stored, currentWeek))
        {
            var response = await _frenoy.GetDivisionRankingAsync(new GetDivisionRankingRequest1
            {
                GetDivisionRankingRequest = new GetDivisionRankingRequest
                {
                    DivisionId = divisionId.ToString(),
                    WeekName = week.ToString(),
                }
            });

            await _db.DivisionRankingWeeks
                .Where(x => x.Year == _settings.Year
                            && x.Competition == _settings.Competition
                            && x.FrenoyDivisionId == divisionId
                            && x.Week == week)
                .ExecuteDeleteAsync();

            foreach (var entry in response.GetDivisionRankingResponse.RankingEntries)
            {
                _db.DivisionRankingWeeks.Add(new DivisionRankingWeekEntity
                {
                    Year = _settings.Year,
                    Competition = _settings.Competition,
                    FrenoyDivisionId = divisionId,
                    Week = week,
                    Position = int.Parse(entry.Position),
                    Points = int.Parse(entry.Points),
                    GamesPlayed = int.Parse(entry.GamesPlayed),
                    GamesWon = int.Parse(entry.GamesWon),
                    GamesLost = int.Parse(entry.GamesLost),
                    GamesDraw = int.Parse(entry.GamesDraw),
                    ClubId = ParseClubId(entry.TeamClub),
                    TeamCode = entry.Team ?? "",
                    TeamName = entry.Team ?? "",
                });
            }

            await _db.SaveChangesAsync();
        }
    }
```

Delete-then-insert per week is how a re-fetch replaces a corrected week without needing
an upsert key.

**The exact property names on `entry` and the existing `ParseClubId`-equivalent must be
taken from the real `GetTeamRankings` mapping in this same file.** Read it and match it
— do not invent property names. If `GamesDraw` or `TeamName` is not available on the
response type, report it rather than guessing.

- [ ] **Step 2: Derive the current week and call it from the team sync**

In `MatchService.FrenoyTeamSync` (currently around line 409), after `SyncTeamMatches`:

```csharp
    public async Task FrenoyTeamSync(int teamId)
    {
        var team = await _context.Teams.SingleAsync(x => x.Id == teamId);
        var frenoySync = new FrenoyMatchesApi(_context, team.Competition);
        await frenoySync.SyncTeamMatches(team);

        var currentWeek = await _context.Matches
            .Where(x => x.FrenoyDivisionId == team.FrenoyDivisionId
                        && x.FrenoySeason == _context.CurrentFrenoySeason
                        && x.Date <= DateTime.Now)
            .Select(x => (int?)x.WeekName)
            .MaxAsync() ?? 0;

        var teamsApi = new FrenoyTeamsApi(_context, team.Competition);
        await teamsApi.SyncDivisionRankingHistory(team.FrenoyDivisionId, currentWeek);
    }
```

**Check `MatchEntity`'s actual week column name before writing this** — it may be
`WeekName`, `Week`, or stored as a string. Match what is there. If matches do not carry
a week number at all, stop and report: the current-week derivation needs rethinking and
that changes the design.

- [ ] **Step 3: Build**

```bash
cd backend && dotnet build Ttc.slnx
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 4: Run the whole backend suite**

```bash
cd backend && dotnet test Ttc.slnx
```

Expected: no new failures. Establish the baseline before your change so you can tell
yours from pre-existing ones.

- [ ] **Step 5: Commit** (ask first)

```bash
git add backend/src/Frenoy.Api/FrenoyTeamsApi.cs backend/src/Ttc.DataAccess/Services/MatchService.cs
git commit -m "Fill weekly division standings during the team sync"
```

---

### Task 4: The two endpoints

**Files:**
- Create: `backend/src/Ttc.Model/Teams/DivisionRankingWeek.cs`
- Modify: `backend/src/Ttc.DataAccess/Services/TeamService.cs`
- Modify: `backend/src/Ttc.WebApi/Controllers/TeamsController.cs`

- [ ] **Step 1: Create the API model**

```csharp
namespace Ttc.Model.Teams;

public class DivisionRankingWeek
{
    public int Week { get; set; }
    public int Position { get; set; }
    public int Points { get; set; }
    public int GamesPlayed { get; set; }
    public int ClubId { get; set; }
    public string TeamCode { get; set; } = "";
    public string TeamName { get; set; } = "";
}

public class TeamPositionWeek
{
    public int TeamId { get; set; }
    public int Week { get; set; }
    public int Position { get; set; }
    public int TeamsInDivision { get; set; }
}
```

- [ ] **Step 2: Add the service reads**

In `TeamService`:

```csharp
    public async Task<ICollection<DivisionRankingWeek>> GetRankingHistory(Competition competition, int divisionId)
    {
        return await _context.DivisionRankingWeeks
            .Where(x => x.Year == _context.CurrentSeason
                        && x.Competition == competition
                        && x.FrenoyDivisionId == divisionId)
            .OrderBy(x => x.Week)
            .Select(x => new DivisionRankingWeek
            {
                Week = x.Week,
                Position = x.Position,
                Points = x.Points,
                GamesPlayed = x.GamesPlayed,
                ClubId = x.ClubId,
                TeamCode = x.TeamCode,
                TeamName = x.TeamName,
            })
            .ToListAsync();
    }

    public async Task<ICollection<TeamPositionWeek>> GetOwnTeamPositions()
    {
        var teams = await _context.Teams
            .Where(x => x.Year == _context.CurrentSeason)
            .Select(x => new { x.Id, x.Competition, x.FrenoyDivisionId, x.TeamCode })
            .ToListAsync();

        var weeks = await _context.DivisionRankingWeeks
            .Where(x => x.Year == _context.CurrentSeason)
            .ToListAsync();

        var sizes = weeks
            .GroupBy(x => new { x.Competition, x.FrenoyDivisionId, x.Week })
            .ToDictionary(g => g.Key, g => g.Count());

        return weeks
            .Join(teams,
                w => new { w.Competition, w.FrenoyDivisionId, w.TeamCode },
                t => new { t.Competition, t.FrenoyDivisionId, t.TeamCode },
                (w, t) => new TeamPositionWeek
                {
                    TeamId = t.Id,
                    Week = w.Week,
                    Position = w.Position,
                    TeamsInDivision = sizes[new { w.Competition, w.FrenoyDivisionId, w.Week }],
                })
            .OrderBy(x => x.TeamId).ThenBy(x => x.Week)
            .ToList();
    }
```

The join is on `TeamCode` within a division, which is what makes both Sporta A and B in
division 1957 come back as two separate series rather than one.

**`_context.CurrentSeason` may not be the actual member name** — `TtcDbContext` exposes
`CurrentFrenoySeason`; check which one matches `TeamEntity.Year` and use that. Do not
guess.

- [ ] **Step 3: Add the endpoints**

In `TeamsController`, next to the existing `Ranking` route:

```csharp
    [HttpGet]
    [AllowAnonymous]
    [Route("RankingHistory/{competition}/{divisionId:int}")]
    public async Task<IEnumerable<DivisionRankingWeek>> RankingHistory(Competition competition, int divisionId)
    {
        return await _service.GetRankingHistory(competition, divisionId);
    }

    [HttpGet]
    [AllowAnonymous]
    [Route("RankingHistoryPositions")]
    public async Task<IEnumerable<TeamPositionWeek>> RankingHistoryPositions()
    {
        return await _service.GetOwnTeamPositions();
    }
```

- [ ] **Step 4: Build and test**

```bash
cd backend && dotnet build Ttc.slnx && dotnet test Ttc.slnx
```

Expected: 0 warnings, 0 errors, no new test failures.

- [ ] **Step 5: Commit** (ask first)

```bash
git add backend/src/Ttc.Model/Teams/DivisionRankingWeek.cs backend/src/Ttc.DataAccess/Services/TeamService.cs backend/src/Ttc.WebApi/Controllers/TeamsController.cs
git commit -m "Serve weekly division standings and own team positions"
```

---

### Task 5: Chart maths

Pure functions, no React. Everything about the chart that can be wrong in a way a test
can catch lives here.

**Files:**
- Create: `frontend/src/components/controls/charts/chartScales.ts`
- Test: `frontend/src/components/controls/charts/spec/chartScalesSpec.ts`

- [ ] **Step 1: Write the failing test**

`globals: true` is set, so no describe/it/expect imports.

```ts
import { getDomain, buildPath, toSvgPoint } from '../chartScales';

const box = { width: 800, height: 400, padding: 40 };

describe('getDomain', () => {
  it('spans the x and y range of every series', () => {
    const domain = getDomain([
      { label: 'a', highlighted: false, points: [{ x: 1, y: 3 }, { x: 5, y: 20 }] },
      { label: 'b', highlighted: false, points: [{ x: 1, y: 0 }, { x: 7, y: 12 }] },
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
    const path = buildPath([{ x: 1, y: 0 }, { x: 2, y: 10 }], domain, box, false);
    expect(path).toBe('40,360 760,40');
  });

  it('is empty for a series with no points', () => {
    const domain = { minX: 1, maxX: 2, minY: 0, maxY: 10 };
    expect(buildPath([], domain, box, false)).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && bunx vitest run src/components/controls/charts/spec/chartScalesSpec.ts
```

Expected: FAIL — cannot resolve `../chartScales`.

- [ ] **Step 3: Write the implementation**

```ts
export type Point = { x: number; y: number };

export type Series = {
  label: string;
  points: Point[];
  highlighted: boolean;
};

export type Domain = { minX: number; maxX: number; minY: number; maxY: number };

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
  return points.map(p => {
    const svg = toSvgPoint(p, domain, box, yInverted);
    return `${svg.x},${svg.y}`;
  }).join(' ');
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && bunx vitest run src/components/controls/charts/spec/chartScalesSpec.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit** (ask first)

```bash
git add frontend/src/components/controls/charts/chartScales.ts frontend/src/components/controls/charts/spec/chartScalesSpec.ts
git commit -m "Add pure scale and path helpers for line charts"
```

---

### Task 6: The LineChart component

**Files:**
- Create: `frontend/src/components/controls/charts/LineChart.tsx`
- Test: `frontend/src/components/controls/charts/spec/LineChartSpec.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render } from '@testing-library/react';
import { LineChart } from '../LineChart';
import { Series } from '../chartScales';

const series: Series[] = [
  { label: 'Aalst A', highlighted: true, points: [{ x: 1, y: 3 }, { x: 2, y: 6 }] },
  { label: 'Ronse B', highlighted: false, points: [{ x: 1, y: 0 }, { x: 2, y: 3 }] },
];

describe('LineChart', () => {
  it('draws one polyline per series', () => {
    const { container } = render(<LineChart series={series} formatTooltip={() => ''} />);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('marks the highlighted series so it can be styled apart', () => {
    const { container } = render(<LineChart series={series} formatTooltip={() => ''} />);
    const lines = container.querySelectorAll('polyline');
    expect(lines[0]!.classList.contains('highlighted')).toBe(true);
    expect(lines[1]!.classList.contains('highlighted')).toBe(false);
  });

  it('labels only the highlighted series directly', () => {
    const { container } = render(<LineChart series={series} formatTooltip={() => ''} />);
    const labels = [...container.querySelectorAll('text.series-label')].map(t => t.textContent);
    expect(labels).toEqual(['Aalst A']);
  });

  it('handles more than one highlighted series', () => {
    const twoOfOurs: Series[] = [
      { label: 'Aalst A', highlighted: true, points: [{ x: 1, y: 3 }] },
      { label: 'Aalst B', highlighted: true, points: [{ x: 1, y: 1 }] },
    ];
    const { container } = render(<LineChart series={twoOfOurs} formatTooltip={() => ''} />);
    const labels = [...container.querySelectorAll('text.series-label')].map(t => t.textContent);
    expect(labels).toEqual(['Aalst A', 'Aalst B']);
  });

  it('renders nothing when there is nothing to plot', () => {
    const { container } = render(<LineChart series={[]} formatTooltip={() => ''} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when every series is empty', () => {
    const empty: Series[] = [{ label: 'a', highlighted: false, points: [] }];
    const { container } = render(<LineChart series={empty} formatTooltip={() => ''} />);
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && bunx vitest run src/components/controls/charts/spec/LineChartSpec.tsx
```

Expected: FAIL — cannot resolve `../LineChart`.

- [ ] **Step 3: Write the implementation**

```tsx
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
        <polyline
          key={s.label}
          className={s.highlighted ? 'series highlighted' : 'series'}
          points={buildPath(s.points, domain, box, yInverted)}
          fill="none"
        />
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
```

`<title>` inside `<circle>` is the native SVG tooltip — no hover state, no library, and
it reads out to screen readers.

- [ ] **Step 4: Add the stylesheet**

Create `frontend/src/components/controls/charts/LineChart.css`:

```css
.line-chart {
  width: 100%;
  height: auto;
}

.line-chart .series {
  stroke: #bbb;
  stroke-width: 1.5;
}

.line-chart .series.highlighted {
  stroke: #d9534f;
  stroke-width: 3;
}

.line-chart .series-label {
  font-size: 13px;
  font-weight: 700;
  fill: #d9534f;
}

.line-chart .point {
  fill: transparent;
}

/* Draw-on-load: the dash pattern is one long dash, offset out of view, then pulled in. */
@media (prefers-reduced-motion: no-preference) {
  .line-chart .series {
    stroke-dasharray: 2000;
    stroke-dashoffset: 2000;
    animation: line-chart-draw 1.2s ease-out forwards;
  }
}

@keyframes line-chart-draw {
  to {
    stroke-dashoffset: 0;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd frontend && bunx vitest run src/components/controls/charts/spec/LineChartSpec.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Commit** (ask first)

```bash
git add frontend/src/components/controls/charts/LineChart.tsx frontend/src/components/controls/charts/LineChart.css frontend/src/components/controls/charts/spec/LineChartSpec.tsx
git commit -m "Add a hand-rolled SVG line chart"
```

---

### Task 7: Redux wiring

**Files:**
- Create: `frontend/src/reducers/rankingHistoryReducer.ts`
- Modify: `frontend/src/store.ts` (register the slice)
- Modify: `frontend/src/utils/test-utils.tsx` (add it to the test root reducer)

Mirror `loadTeamRanking` and `teamRankingsSlice` in `teamsReducer.ts:35` — read those
first and follow the same shape.

- [ ] **Step 1: Write the reducer**

```ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import http from '../utils/httpClient';
import { IStoreTeam } from '../models/model-interfaces';

export type DivisionRankingWeek = {
  week: number;
  position: number;
  points: number;
  gamesPlayed: number;
  clubId: number;
  teamCode: string;
  teamName: string;
};

export type TeamPositionWeek = {
  teamId: number;
  week: number;
  position: number;
  teamsInDivision: number;
};

type RankingHistoryState = {
  divisions: Record<number, DivisionRankingWeek[]>;
  positions: TeamPositionWeek[];
};

const initialState: RankingHistoryState = { divisions: {}, positions: [] };

export const loadRankingHistory = createAsyncThunk('rankingHistory/Division', async ({ team }: { team: IStoreTeam }) => {
  const url = `/teams/RankingHistory/${team.competition}/${team.frenoy.divisionId}`;
  const response = await http.get<DivisionRankingWeek[]>(url);
  return { divisionId: team.frenoy.divisionId, weeks: response };
});

export const loadTeamPositions = createAsyncThunk('rankingHistory/Positions', async () => {
  return http.get<TeamPositionWeek[]>('/teams/RankingHistoryPositions');
});

const rankingHistorySlice = createSlice({
  name: 'rankingHistory',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(loadRankingHistory.fulfilled, (state, action: PayloadAction<{ divisionId: number; weeks: DivisionRankingWeek[] }>) => {
      state.divisions[action.payload.divisionId] = action.payload.weeks;
    });
    builder.addCase(loadTeamPositions.fulfilled, (state, action: PayloadAction<TeamPositionWeek[]>) => {
      state.positions = action.payload;
    });
  },
});

export default rankingHistorySlice.reducer;
```

- [ ] **Step 2: Register it in the store**

Add `rankingHistory: rankingHistoryReducer` to the root reducer in
`frontend/src/store.ts`, and the same line to the `rootReducer` in
`frontend/src/utils/test-utils.tsx` so `renderWithProviders` can preload it.

- [ ] **Step 3: Typecheck**

```bash
cd frontend && bunx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Full suite**

```bash
cd frontend && bunx vitest run
```

Expected: no new failures.

- [ ] **Step 5: Commit** (ask first)

```bash
git add frontend/src/reducers/rankingHistoryReducer.ts frontend/src/store.ts frontend/src/utils/test-utils.tsx
git commit -m "Add ranking history to the store"
```

---

### Task 8: The points chart on the ranking page

**Files:**
- Create: `frontend/src/components/teams/DivisionPointsRace.tsx`
- Test: `frontend/src/components/teams/spec/DivisionPointsRaceSpec.tsx`
- Modify: `frontend/src/components/teams/DivisionRanking.tsx`

Read `DivisionRanking.tsx` first to see what it already has in scope.

- [ ] **Step 1: Write the failing test**

```tsx
import { renderWithProviders } from '../../../utils/test-utils';
import { DivisionPointsRace } from '../DivisionPointsRace';
import { DivisionRankingWeek } from '../../../reducers/rankingHistoryReducer';

const week = (w: number, teamCode: string, points: number, clubId: number): DivisionRankingWeek => ({
  week: w,
  position: 1,
  points,
  gamesPlayed: w,
  clubId,
  teamCode,
  teamName: `Team ${teamCode}`,
});

const OwnClubId = 1;
const divisionId = 1957;

const renderRace = (weeks: DivisionRankingWeek[]) =>
  renderWithProviders(<DivisionPointsRace divisionId={divisionId} ownClubId={OwnClubId} ownTeamCodes={['A', 'B']} />, {
    preloadedState: { rankingHistory: { divisions: { [divisionId]: weeks }, positions: [] } as never },
  });

describe('DivisionPointsRace', () => {
  it('renders nothing with no data at all', () => {
    const { container } = renderRace([]);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing with only one week', () => {
    const { container } = renderRace([week(1, 'A', 3, OwnClubId), week(1, 'C', 0, 99)]);
    expect(container.innerHTML).toBe('');
  });

  it('draws a line per team once two weeks exist', () => {
    const { container } = renderRace([
      week(1, 'A', 3, OwnClubId), week(1, 'C', 0, 99),
      week(2, 'A', 6, OwnClubId), week(2, 'C', 3, 99),
    ]);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('highlights both of our teams when we have two in one division', () => {
    const { container } = renderRace([
      week(1, 'A', 3, OwnClubId), week(1, 'B', 1, OwnClubId), week(1, 'C', 0, 99),
      week(2, 'A', 6, OwnClubId), week(2, 'B', 2, OwnClubId), week(2, 'C', 3, 99),
    ]);
    expect(container.querySelectorAll('polyline.highlighted')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && bunx vitest run src/components/teams/spec/DivisionPointsRaceSpec.tsx
```

Expected: FAIL — cannot resolve `../DivisionPointsRace`.

- [ ] **Step 3: Write the implementation**

```tsx
import { LineChart } from '../controls/charts/LineChart';
import { Series } from '../controls/charts/chartScales';
import { useTtcSelector } from '../../utils/hooks/storeHooks';

const MinimumWeeksToPlot = 2;

type DivisionPointsRaceProps = {
  divisionId: number;
  ownClubId: number;
  ownTeamCodes: string[];
};

export const DivisionPointsRace = ({ divisionId, ownClubId, ownTeamCodes }: DivisionPointsRaceProps) => {
  const weeks = useTtcSelector(state => state.rankingHistory.divisions[divisionId]) ?? [];

  const distinctWeeks = new Set(weeks.map(w => w.week));
  if (distinctWeeks.size < MinimumWeeksToPlot) {
    return null;
  }

  const byTeam = new Map<string, Series>();
  weeks.forEach(w => {
    const key = `${w.clubId}-${w.teamCode}`;
    let series = byTeam.get(key);
    if (!series) {
      series = {
        label: w.teamName,
        highlighted: w.clubId === ownClubId && ownTeamCodes.includes(w.teamCode),
        points: [],
      };
      byTeam.set(key, series);
    }
    series.points.push({ x: w.week, y: w.points });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.x - b.x));

  return <LineChart series={series} formatTooltip={(s, p) => `Week ${p.x}: ${s.label} - ${p.y} punten`} />;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && bunx vitest run src/components/teams/spec/DivisionPointsRaceSpec.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Wire it into the ranking page**

In `DivisionRanking.tsx`, dispatch `loadRankingHistory({ team })` on mount and render
`<DivisionPointsRace ... />` above the standings table. `ownTeamCodes` is every one of
our teams sharing that `divisionId` — read them from the teams store, do not assume one.

- [ ] **Step 6: Full suite, lint, typecheck**

```bash
cd frontend && bunx vitest run && bun run lint && bunx tsc --noEmit
```

Expected: all pass, zero warnings, no tsc output.

- [ ] **Step 7: Commit** (ask first)

```bash
git add frontend/src/components/teams/DivisionPointsRace.tsx frontend/src/components/teams/spec/DivisionPointsRaceSpec.tsx frontend/src/components/teams/DivisionRanking.tsx
git commit -m "Chart the division points race on the ranking page"
```

---

### Task 9: The position chart on the dashboard

**Files:**
- Create: `frontend/src/components/dashboard/DashboardTeamPositions.tsx`
- Test: `frontend/src/components/dashboard/spec/DashboardTeamPositionsSpec.tsx`
- Modify: `frontend/src/components/dashboard/DashboardGlobalTeamStats.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { renderWithProviders } from '../../../utils/test-utils';
import { DashboardTeamPositions } from '../DashboardTeamPositions';
import { TeamPositionWeek } from '../../../reducers/rankingHistoryReducer';

const pos = (teamId: number, week: number, position: number, teamsInDivision: number): TeamPositionWeek => ({
  teamId,
  week,
  position,
  teamsInDivision,
});

const renderPositions = (positions: TeamPositionWeek[]) =>
  renderWithProviders(<DashboardTeamPositions />, {
    preloadedState: { rankingHistory: { divisions: {}, positions } as never },
  });

describe('DashboardTeamPositions', () => {
  it('renders nothing without data', () => {
    const { container } = renderPositions([]);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing with only one week', () => {
    const { container } = renderPositions([pos(1, 1, 3, 12)]);
    expect(container.innerHTML).toBe('');
  });

  it('draws one line per team', () => {
    const { container } = renderPositions([
      pos(1, 1, 3, 12), pos(1, 2, 2, 12),
      pos(2, 1, 8, 10), pos(2, 2, 9, 10),
    ]);
    expect(container.querySelectorAll('polyline')).toHaveLength(2);
  });

  it('puts the division size in the tooltip', () => {
    const { container } = renderPositions([
      pos(1, 1, 3, 12), pos(1, 2, 2, 12),
    ]);
    const titles = [...container.querySelectorAll('title')].map(t => t.textContent);
    expect(titles.some(t => t?.includes('van 12'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd frontend && bunx vitest run src/components/dashboard/spec/DashboardTeamPositionsSpec.tsx
```

Expected: FAIL — cannot resolve `../DashboardTeamPositions`.

- [ ] **Step 3: Write the implementation**

Every one of our teams is highlighted here — they are all ours, so `highlighted` is
`true` throughout and the muted style never applies.

```tsx
import { LineChart } from '../controls/charts/LineChart';
import { Series } from '../controls/charts/chartScales';
import { useTtcSelector, selectTeams } from '../../utils/hooks/storeHooks';

const MinimumWeeksToPlot = 2;

export const DashboardTeamPositions = () => {
  const positions = useTtcSelector(state => state.rankingHistory.positions);
  const teams = useTtcSelector(selectTeams);

  const distinctWeeks = new Set(positions.map(p => p.week));
  if (distinctWeeks.size < MinimumWeeksToPlot) {
    return null;
  }

  const sizeByLabel = new Map<string, number>();
  const byTeam = new Map<number, Series>();
  positions.forEach(p => {
    let series = byTeam.get(p.teamId);
    if (!series) {
      const team = teams.find(t => t.id === p.teamId);
      series = {
        label: team ? `${team.competition} ${team.teamCode}` : String(p.teamId),
        highlighted: true,
        points: [],
      };
      byTeam.set(p.teamId, series);
    }
    sizeByLabel.set(series.label, p.teamsInDivision);
    series.points.push({ x: p.week, y: p.position });
  });

  const series = [...byTeam.values()];
  series.forEach(s => s.points.sort((a, b) => a.x - b.x));

  return (
    <LineChart
      series={series}
      yInverted
      formatTooltip={(s, p) => `Week ${p.x}: ${s.label} - ${p.y}e van ${sizeByLabel.get(s.label)}`}
    />
  );
};
```

Keying the division size by series label keeps `Series` generic — the chart stays
ignorant of divisions, and the tooltip reads `Week 5: Vttl A - 3e van 12`.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd frontend && bunx vitest run src/components/dashboard/spec/DashboardTeamPositionsSpec.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Add the Cards/Graph tabs**

In `DashboardGlobalTeamStats.tsx`, wrap the existing card content in a tab labelled
`Cards` (the existing view, still the default) and add a `Graph` tab rendering
`<DashboardTeamPositions />`. Use `react-bootstrap` `Tabs`/`Tab`, matching how tabs are
done elsewhere in the project — find an existing example rather than inventing a style.

Dispatch `loadTeamPositions()` when the Graph tab is first shown.

- [ ] **Step 6: Full suite, lint, typecheck, knip**

```bash
cd frontend && bunx vitest run && bun run lint && bunx tsc --noEmit && bun run knip
```

Expected: all pass, zero warnings, no unused exports.

- [ ] **Step 7: Commit** (ask first)

```bash
git add frontend/src/components/dashboard/DashboardTeamPositions.tsx frontend/src/components/dashboard/spec/DashboardTeamPositionsSpec.tsx frontend/src/components/dashboard/DashboardGlobalTeamStats.tsx
git commit -m "Chart our teams' positions on the dashboard"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Backend**

```bash
cd backend && dotnet build Ttc.slnx && dotnet test Ttc.slnx
```

Expected: 0 warnings, 0 errors, all tests pass.

- [ ] **Step 2: Frontend**

```bash
cd frontend && bunx vitest run && bun run lint && bunx tsc --noEmit && bun run knip
```

Expected: all clean.

- [ ] **Step 3: Trigger a real sync**

Start the app, sign in as admin, and run the team sync for one Sporta team (Sporta has
played weeks; VTTL has not started as of 2026-09-15). Then check the database:

```sql
SELECT Week, COUNT(*) FROM DivisionRankingWeek GROUP BY Week ORDER BY Week;
```

Expected: one row per team per week, roughly 10-12 rows per week.

- [ ] **Step 4: Look at it**

```bash
cd frontend && bun start
```

- `/ploegen/Sporta/A/ranking` — points race above the standings, our A and B lines both highlighted
- `/ploegen/Vttl/A/ranking` — no chart, VTTL has not started
- Dashboard Teams section — Graph tab, position lines, 1 at the top

This is the visual check; Wouter verifies it.

---

## Out of scope

- Other brainstorm features (streaks, clutch, events)
- Click-through from a chart point to the match
- Past-season browsing
