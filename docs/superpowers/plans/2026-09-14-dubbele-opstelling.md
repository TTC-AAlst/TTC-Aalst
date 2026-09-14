# Dubbele opstelling in dezelfde speelweek — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een speler die in dezelfde competitie én speelweek in twee opstellingen staat, krijgt een rode badge met een uitroepteken dat in een tooltip zegt in welke andere ploeg hij ook speelt.

**Architecture:** Alles gebeurt in de frontend; de redux store bevat al alle matchen van het seizoen. Een pure functie `findLineupConflicts(matches)` levert een `Map` van `"matchId-playerId"` naar de labels van de andere ploegen. Een memoized selector `selectLineupConflicts` voedt die functie met alle matchen (derbies uitgeklapt) en de badge-componenten lezen de map uit.

**Tech Stack:** React 18, TypeScript, Redux Toolkit (`createSelector`), vitest + React Testing Library, bun.

Spec: `docs/superpowers/specs/2026-09-14-dubbele-opstelling-design.md`

Alle commando's draaien vanuit `frontend/`.

---

## File Structure

| Bestand | Verantwoordelijkheid |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/models/utils/getPlayerFormation.ts` *(nieuw, verhuisd)*               | De opgestelde spelers van één match (block of Captain)              |
| `src/models/utils/lineupConflicts.ts` *(nieuw)*                            | De conflictregel: pure functie over een lijst matchen               |
| `src/models/utils/spec/lineupConflictsSpec.ts` *(nieuw)*                   | Tests voor die regel                                                |
| `src/utils/hooks/storeHooks.ts` *(wijzigen)*                               | `selectLineupConflicts`: store → conflictmap, derbies uitgeklapt    |
| `src/utils/hooks/spec/selectLineupConflictsSpec.ts` *(nieuw)*              | Test voor de derby-uitklapping                                      |
| `src/utils/locales-nl.ts` *(wijzigen)*                                     | `match.plys.alsoPlaysIn`                                            |
| `src/components/players/PlayerBadges.tsx` *(wijzigen)*                      | Rode badge + waarschuwingsicoon                                     |
| `src/components/matches/MatchesTable/MatchesTableCells.tsx` *(wijzigen)*    | Geeft conflicten door aan de badges                                 |
| `src/components/matches/MobileLiveMatches/MobileLiveMatchInProgress.tsx` *(wijzigen)* | Idem voor "ONZE OPSTELLING"                              |
| `src/components/matches/MatchesTable/MatchesTablePlayerLineUpCells.tsx` *(wijzigen)* | De opstellingsmatrix heeft een eigen badge-markup          |
| `src/components/matches/MatchesTable/matchesTableUtil.ts` *(wijzigen)*     | Verliest `getPlayerFormation`                                       |

---

### Task 1: Verhuis `getPlayerFormation` naar de model-laag

`lineupConflicts.ts` (model-laag) heeft deze functie nodig; ze staat nu in een component-map. Zuivere verhuis, geen gedragswijziging.

**Files:**
- Create: `src/models/utils/getPlayerFormation.ts`
- Modify: `src/components/matches/MatchesTable/matchesTableUtil.ts`
- Modify: `src/components/dashboard/UpcomingMatchMiniView.tsx:7`
- Modify: `src/components/matches/Matches.tsx:10`
- Modify: `src/components/matches/MatchesTable/MatchesTablePlayerLineUp.tsx:3`
- Modify: `src/components/matches/MatchesTable/MatchesTableEditPlayerLineUp.tsx:3`
- Modify: `src/components/teams/Teams.tsx:25`

- [ ] **Step 1: Maak het nieuwe bestand**

`src/models/utils/getPlayerFormation.ts`:

```ts
import { IMatch, IMatchPlayerInfo } from '../model-interfaces';

/** The players picked for a match: the blocked formation, or the captain's draft when not blocked yet */
export const getPlayerFormation = (match: IMatch): IMatchPlayerInfo[] => {
  if (match.block === 'Major' || match.block === 'Captain') {
    return match.getPlayerFormation(match.block);
  }
  return match.getPlayerFormation('Captain');
};
```

- [ ] **Step 2: Haal de functie uit `matchesTableUtil.ts`**

Verwijder in `src/components/matches/MatchesTable/matchesTableUtil.ts` dit blok (regel 18-23):

```ts
export const getPlayerFormation = (match: IMatch) => {
  if (match.block === 'Major' || match.block === 'Captain') {
    return match.getPlayerFormation(match.block);
  }
  return match.getPlayerFormation('Captain');
};
```

De eerste regel van dat bestand wordt:

```ts
import { ITeam, ITeamPlayerInfo, PickedPlayer, IMatch } from '../../../models/model-interfaces';
```

`IMatch` blijft nodig voor `getRowStripeColor`.

- [ ] **Step 3: Werk de vijf imports bij**

| Bestand | Nieuwe import |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/components/dashboard/UpcomingMatchMiniView.tsx:7` | `import { getPlayerFormation } from '../../models/utils/getPlayerFormation';` |
| `src/components/matches/Matches.tsx:10`           | `import { getPlayerFormation } from '../../models/utils/getPlayerFormation';` |
| `src/components/teams/Teams.tsx:25`               | `import { getPlayerFormation } from '../../models/utils/getPlayerFormation';` |

In `src/components/matches/MatchesTable/MatchesTablePlayerLineUp.tsx:3` en
`src/components/matches/MatchesTable/MatchesTableEditPlayerLineUp.tsx:3` staat een
gecombineerde import. Vervang in beide:

```ts
import { getPlayerFormation, getTablePlayers, tableMatchViewportWidths } from './matchesTableUtil';
```

door:

```ts
import { getTablePlayers, tableMatchViewportWidths } from './matchesTableUtil';
import { getPlayerFormation } from '../../../models/utils/getPlayerFormation';
```

- [ ] **Step 4: Controleer dat niets breekt**

```sh
bun run test && bun run lint && bun run build
```

Verwacht: alle tests groen, 0 lint-warnings, build slaagt.

- [ ] **Step 5: Commit**

```sh
git add src/models/utils/getPlayerFormation.ts src/components
git commit -m "Move getPlayerFormation to the model layer"
```

---

### Task 2: De conflictregel

**Files:**
- Create: `src/models/utils/lineupConflicts.ts`
- Test: `src/models/utils/spec/lineupConflictsSpec.ts`

- [ ] **Step 1: Schrijf de falende test**

`src/models/utils/spec/lineupConflictsSpec.ts`:

```ts
import { conflictKey, findLineupConflicts } from '../lineupConflicts';
import { Competition, IMatch, IMatchPlayerInfo, MatchPlayerStatus } from '../../model-interfaces';

const plyInfo = (playerId: number, status: MatchPlayerStatus): IMatchPlayerInfo =>
  ({ id: playerId, player: { id: playerId, alias: `Ply${playerId}` }, matchPlayer: { status } }) as unknown as IMatchPlayerInfo;

type MatchOptions = {
  id: number;
  teamCode: string;
  week?: number;
  competition?: Competition;
  block?: MatchPlayerStatus | '';
  players?: IMatchPlayerInfo[];
  shouldBePlayed?: boolean;
  isSyncedWithFrenoy?: boolean;
};

const match = ({
  id,
  teamCode,
  week = 3,
  competition = 'Sporta',
  block = 'Captain',
  players = [],
  shouldBePlayed = true,
  isSyncedWithFrenoy = false,
}: MatchOptions): IMatch =>
  ({
    id,
    week,
    competition,
    block,
    shouldBePlayed,
    isSyncedWithFrenoy,
    getTeam: () => ({ teamCode }),
    getPlayerFormation: (filter: string) => players.filter(ply => ply.matchPlayer.status === filter || (filter === 'onlyFinal' && ply.matchPlayer.status === 'Major')),
  }) as unknown as IMatch;

describe('findLineupConflicts', () => {
  it('flags a player picked for two teams in the same competition and week', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.get(conflictKey(1, 7))).toEqual(['Sporta B']);
    expect(conflicts.get(conflictKey(2, 7))).toEqual(['Sporta A']);
  });

  it('leaves a player picked once alone', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(8, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('allows the same player in another playing week', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', week: 3, players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', week: 4, players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('allows Sporta and Vttl in the same week', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', competition: 'Sporta', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'A', competition: 'Vttl', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('ignores a player who only said he is available', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Play')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('ignores a match that should not be played', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', shouldBePlayed: false, players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });

  it('flags the open match but not the one already synced with frenoy', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', isSyncedWithFrenoy: true, block: '', players: [plyInfo(7, 'Major')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.get(conflictKey(1, 7))).toBeUndefined();
    expect(conflicts.get(conflictKey(2, 7))).toEqual(['Sporta A']);
  });

  it('names every other team when a player is picked three times', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 2, teamCode: 'B', players: [plyInfo(7, 'Captain')] }),
      match({ id: 3, teamCode: 'C', players: [plyInfo(7, 'Captain')] }),
    ]);

    expect(conflicts.get(conflictKey(1, 7))).toEqual(['Sporta B', 'Sporta C']);
  });

  it('treats the two views on a derby as one match', () => {
    const conflicts = findLineupConflicts([
      match({ id: 1, teamCode: 'A', players: [plyInfo(7, 'Captain')] }),
      match({ id: 1, teamCode: 'B', players: [plyInfo(8, 'Captain')] }),
    ]);

    expect(conflicts.size).toBe(0);
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

```sh
bun run test src/models/utils/spec/lineupConflictsSpec.ts
```

Verwacht: FAIL — `Failed to resolve import "../lineupConflicts"`.

- [ ] **Step 3: Schrijf de implementatie**

`src/models/utils/lineupConflicts.ts`:

```ts
import { IMatch, IMatchPlayerInfo } from '../model-interfaces';
import { getPlayerFormation } from './getPlayerFormation';

/** Key into the map returned by findLineupConflicts */
export const conflictKey = (matchId: number, playerId: number): string => `${matchId}-${playerId}`;

type Booking = {
  match: IMatch;
  playerId: number;
};

// A synced match no longer has a block: frenoy marks whoever played as Major
const formationOf = (match: IMatch): IMatchPlayerInfo[] =>
  match.isSyncedWithFrenoy ? match.getPlayerFormation('onlyFinal') : getPlayerFormation(match);

const teamLabel = (match: IMatch): string => `${match.competition} ${match.getTeam().teamCode}`;

/**
 * A player may be lined up only once per competition per playing week.
 *
 * @returns conflictKey(matchId, playerId) -> the other teams he is lined up for that week.
 *          A synced match gets no entry of its own: it cannot be changed anymore.
 */
export function findLineupConflicts(matches: IMatch[]): Map<string, string[]> {
  const perWeek = new Map<string, Booking[]>();
  matches
    .filter(match => match.shouldBePlayed)
    .forEach(match => {
      const weekKey = `${match.competition}-${match.week}`;
      const bookings = perWeek.get(weekKey) ?? [];
      formationOf(match).forEach(plyInfo => bookings.push({ match, playerId: plyInfo.player.id }));
      perWeek.set(weekKey, bookings);
    });

  const conflicts = new Map<string, string[]>();
  perWeek.forEach(bookings => {
    bookings.forEach(booking => {
      if (booking.match.isSyncedWithFrenoy) {
        return;
      }
      const elsewhere = bookings.filter(other => other.playerId === booking.playerId && other.match.id !== booking.match.id);
      if (elsewhere.length) {
        conflicts.set(
          conflictKey(booking.match.id, booking.playerId),
          elsewhere.map(other => teamLabel(other.match)),
        );
      }
    });
  });
  return conflicts;
}
```

- [ ] **Step 4: Draai de test tot hij groen is**

```sh
bun run test src/models/utils/spec/lineupConflictsSpec.ts
```

Verwacht: PASS, 9 tests.

- [ ] **Step 5: Commit**

```sh
git add src/models/utils/lineupConflicts.ts src/models/utils/spec/lineupConflictsSpec.ts
git commit -m "Detect a player picked twice in one playing week"
```

---

### Task 3: Selector die de store aan de regel voedt

Een derby staat één keer in de store met de tweede opstelling op `home: false`; `getOwnPlayers()` filtert die weg. De selector klapt zo'n match uit naar twee views via het bestaande `mirrorDerbyMatch`.

**Files:**
- Modify: `src/utils/hooks/storeHooks.ts`
- Test: `src/utils/hooks/spec/selectLineupConflictsSpec.ts`

- [ ] **Step 1: Schrijf de falende test**

`src/utils/hooks/spec/selectLineupConflictsSpec.ts`:

```ts
import { vi } from 'vitest';
import { selectLineupConflicts } from '../storeHooks';
import { conflictKey } from '../../../models/utils/lineupConflicts';
import { OwnClubId } from '../../../models/ClubModel';
import { IFullStoreMatchOwn, IMatchPlayer } from '../../../models/model-interfaces';
import type { RootState } from '../../../store';

// getTeam() logs a warning for a team without an id, so hand back a complete one
vi.mock('../../../storeUtil', () => ({
  default: {
    getTeam: (teamId: number) => ({ id: teamId, teamCode: teamId === 1 ? 'A' : 'B' }),
    getPlayer: (playerId: number) => ({ id: playerId, alias: `Ply${playerId}`, getCompetition: () => ({ position: playerId }) }),
  },
}));

const player = (playerId: number, home: boolean): IMatchPlayer =>
  ({ id: playerId, matchId: 1, playerId, home, position: playerId, status: 'Captain', uniqueIndex: playerId }) as unknown as IMatchPlayer;

const derby = (): IFullStoreMatchOwn =>
  ({
    id: 1,
    week: 3,
    competition: 'Sporta',
    block: 'Captain',
    shouldBePlayed: true,
    isSyncedWithFrenoy: false,
    date: '2026-09-15T20:00:00',
    teamId: 1,
    opponentTeamId: 2,
    isHomeMatch: true,
    opponent: { clubId: OwnClubId, teamCode: 'B' },
    score: { home: 0, out: 0 },
    scoreType: 'NotYetPlayed',
    players: [player(7, true), player(8, false)],
    games: [],
    comments: [],
  }) as unknown as IFullStoreMatchOwn;

const otherMatch = (): IFullStoreMatchOwn =>
  ({
    ...derby(),
    id: 2,
    teamId: 1,
    opponentTeamId: null,
    opponent: { clubId: 999, teamCode: 'C' },
    players: [player(8, true)],
  }) as unknown as IFullStoreMatchOwn;

const state = (matches: IFullStoreMatchOwn[]): RootState =>
  ({
    matches,
    teams: [
      { id: 1, teamCode: 'A', competition: 'Sporta' },
      { id: 2, teamCode: 'B', competition: 'Sporta' },
    ],
  }) as unknown as RootState;

describe('selectLineupConflicts', () => {
  it('sees the away formation of a derby', () => {
    const conflicts = selectLineupConflicts(state([derby(), otherMatch()]));

    expect(conflicts.get(conflictKey(2, 8))).toEqual(['Sporta B']);
    expect(conflicts.get(conflictKey(1, 8))).toEqual(['Sporta A']);
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

```sh
bun run test src/utils/hooks/spec/selectLineupConflictsSpec.ts
```

Verwacht: FAIL — `selectLineupConflicts is not a function`.

- [ ] **Step 3: Voeg de selector toe**

In `src/utils/hooks/storeHooks.ts`, na `selectMatches` (regel 19). Vul de bestaande
imports bovenaan het bestand aan:

```ts
import { mirrorDerbyMatch } from '../../models/utils/mirrorDerbyMatch';
import { findLineupConflicts } from '../../models/utils/lineupConflicts';
```

En de selector zelf:

```ts
/**
 * A derby is stored once, with the second team's formation on home: false where
 * getOwnPlayers() drops it, so both views on it have to be handed to the rule.
 */
export const selectLineupConflicts = createSelector(
  [(state: RootState) => state.matches, (state: RootState) => state.teams],
  (matches, teams) =>
    findLineupConflicts(
      matches.flatMap(m => {
        const match = new MatchModel(m) as IMatch;
        if (!m.opponentTeamId) {
          return [match];
        }
        const ownTeamCode = teams.find(team => team.id === m.teamId)?.teamCode ?? '';
        return [match, new MatchModel(mirrorDerbyMatch(m, ownTeamCode)) as IMatch];
      }),
    ),
);
```

- [ ] **Step 4: Draai de test tot hij groen is**

```sh
bun run test src/utils/hooks/spec/selectLineupConflictsSpec.ts
```

Verwacht: PASS.

- [ ] **Step 5: Commit**

```sh
git add src/utils/hooks/storeHooks.ts src/utils/hooks/spec/selectLineupConflictsSpec.ts
git commit -m "Feed every team's formation, derbies included, to the conflict rule"
```

---

### Task 4: Rode badge met waarschuwingsicoon

**Files:**
- Modify: `src/utils/locales-nl.ts:304-317`
- Modify: `src/components/players/PlayerBadges.tsx:8-31`
- Test: `src/components/players/spec/PlayerBadgesSpec.tsx`

- [ ] **Step 1: Schrijf de falende test**

Voeg onderaan `src/components/players/spec/PlayerBadgesSpec.tsx` toe, binnen het
bestaande `describe('PlayerCompetitionBadge', ...)`-blok:

```tsx
  it('turns red and warns when the player is picked elsewhere that week', () => {
    renderWithProviders(
      <TestRouter>
        <PlayerCompetitionBadge plyInfo={plyInfo('Major') as never} competition="Vttl" conflictTeams={['Sporta B']} />
      </TestRouter>,
    );
    expect(screen.getByText('Wouter').className).toContain('bg-danger');
    expect(document.querySelector('.fa-exclamation-triangle')).toBeInTheDocument();
  });

  it('stays green without a conflict', () => {
    renderWithProviders(
      <TestRouter>
        <PlayerCompetitionBadge plyInfo={plyInfo('Major') as never} competition="Vttl" />
      </TestRouter>,
    );
    expect(screen.getByText('Wouter').className).toContain('bg-success');
    expect(document.querySelector('.fa-exclamation-triangle')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Draai de test en zie hem falen**

```sh
bun run test src/components/players/spec/PlayerBadgesSpec.tsx
```

Verwacht: FAIL — `bg-success` gevonden waar `bg-danger` verwacht werd.

- [ ] **Step 3: Voeg de locale-sleutel toe**

In `src/utils/locales-nl.ts`, in het `plys`-blok (regel 304-317), na `extraComment`:

```ts
        alsoPlaysIn: 'Speelt deze week ook in ${}',
```

- [ ] **Step 4: Pas de badge aan**

`src/components/players/PlayerBadges.tsx`. Voeg bovenaan toe:

```ts
import { t } from '../../locales';
```

`Icon` wordt al geïmporteerd. Vervang het hele `PlayerCompetitionBadge`-blok
(regel 8-31) door:

```tsx
type PlayerCompetitionBadgeProps = {
  style?: React.CSSProperties;
  plyInfo: {
    matchPlayer: { status: MatchPlayerStatus };
    player: IPlayer;
  };
  competition: Competition;
  /** Other teams the player is also lined up for this playing week */
  conflictTeams?: string[];
};

export const PlayerCompetitionBadge = ({ plyInfo, competition, style = {}, conflictTeams }: PlayerCompetitionBadgeProps) => {
  const comp = plyInfo.player.getCompetition(competition);
  const color = conflictTeams?.length ? 'danger' : getPlayingStatusClass(plyInfo.matchPlayer.status) || 'primary';
  return (
    <PlayerLink player={plyInfo.player} className="clickable">
      <span
        className={`clickable badge label-as-badge bg-${color}`}
        key={plyInfo.player.id + plyInfo.matchPlayer.status}
        style={{ fontSize: 14, display: 'inline-block', ...style }}
      >
        {plyInfo.player.alias}
        {competition && comp ? <span style={{ marginLeft: 5, fontSize: 10 }}>{comp.ranking}</span> : null}
        {conflictTeams?.length ? (
          <Icon fa="fa fa-exclamation-triangle" style={{ marginLeft: 5, marginRight: 0 }} tooltip={t('match.plys.alsoPlaysIn', conflictTeams.join(', '))} />
        ) : null}
      </span>
    </PlayerLink>
  );
};
```

- [ ] **Step 5: Draai de test tot hij groen is**

```sh
bun run test src/components/players/spec/PlayerBadgesSpec.tsx
```

Verwacht: PASS, 5 tests.

- [ ] **Step 6: Commit**

```sh
git add src/components/players/PlayerBadges.tsx src/components/players/spec/PlayerBadgesSpec.tsx src/utils/locales-nl.ts
git commit -m "Turn a double-booked player's badge red"
```

---

### Task 5: Koppel de matchesTable-badges

Dekt `/ploegen/*/matches`, "Volgende matchen" op de ploegpagina en `/speelweek/*`.

**Files:**
- Modify: `src/components/matches/MatchesTable/MatchesTableCells.tsx:72-106`
- Test: `src/components/matches/MatchesTable/spec/ReadOnlyMatchPlayersSpec.tsx`

- [ ] **Step 1: Schrijf de falende test**

In `src/components/matches/MatchesTable/spec/ReadOnlyMatchPlayersSpec.tsx`. De
`storeUtil`-mock bovenaan is nu leeg; de selector heeft er `getPlayer` en `getTeam` uit
nodig. Vervang:

```tsx
vi.mock('../../../../storeUtil', () => ({ default: {} }));
```

door:

```tsx
vi.mock('../../../../storeUtil', () => ({
  default: {
    getTeam: (teamId: number) => ({ id: teamId, teamCode: teamId === 1 ? 'A' : 'B' }),
    getPlayer: (playerId: number) => ({ id: playerId, alias: 'Arne', getCompetition: () => ({ position: 1 }) }),
  },
}));
```

Laat de badge-mock ook `conflictTeams` tonen, in één tekstknoop zodat
`getByText` exact blijft werken:

```tsx
vi.mock('../../../players/PlayerBadges', () => ({
  PlayerCompetitionBadge: ({ plyInfo, conflictTeams }: { plyInfo: IMatchPlayerInfo; conflictTeams?: string[] }) => (
    <span>{`FORM:${plyInfo.player.alias}${conflictTeams?.length ? `!${conflictTeams.join(',')}` : ''}`}</span>
  ),
}));
```

En voeg onderaan het bestand toe:

```tsx
// Two Sporta matches in week 3 that both pick player 7
const storeMatch = (id: number, teamId: number) => ({
  id,
  week: 3,
  competition: 'Sporta',
  block: 'Captain',
  shouldBePlayed: true,
  isSyncedWithFrenoy: false,
  date: '2026-09-15T20:00:00',
  teamId,
  opponentTeamId: null,
  isHomeMatch: true,
  opponent: { clubId: 999, teamCode: 'X' },
  score: { home: 0, out: 0 },
  scoreType: 'NotYetPlayed',
  players: [{ playerId: 7, home: true, status: 'Captain', position: 1 }],
  games: [],
  comments: [],
});

const conflictMatch = (): IMatch =>
  ({
    id: 5,
    isSyncedWithFrenoy: false,
    scoreType: 'NotYetPlayed',
    block: 'Captain',
    competition: 'Sporta',
    getOwnPlayers: () => [],
    getPlayerFormation: () => [major('Arne', 7)],
  }) as unknown as IMatch;

describe('ReadOnlyMatchPlayers — dubbele opstelling', () => {
  it('passes the other team to the badge', () => {
    renderWithProviders(
      <TestRouter>
        <ReadOnlyMatchPlayers match={conflictMatch()} displayNonBlocked={false} />
      </TestRouter>,
      { preloadedState: { matches: [storeMatch(5, 1), storeMatch(6, 2)] } as never },
    );
    expect(screen.getByText('FORM:Arne!Sporta B')).toBeInTheDocument();
  });

  it('leaves a player picked once without a conflict', () => {
    renderWithProviders(
      <TestRouter>
        <ReadOnlyMatchPlayers match={conflictMatch()} displayNonBlocked={false} />
      </TestRouter>,
      { preloadedState: { matches: [storeMatch(5, 1)] } as never },
    );
    expect(screen.getByText('FORM:Arne')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

```sh
bun run test src/components/matches/MatchesTable/spec/ReadOnlyMatchPlayersSpec.tsx
```

Verwacht: FAIL op de eerste nieuwe test — `Unable to find an element with the text:
FORM:Arne!Sporta B`, want de component geeft `conflictTeams` nog niet door.

- [ ] **Step 3: Geef de conflicten door**

In `src/components/matches/MatchesTable/MatchesTableCells.tsx`, vul de imports aan:

```ts
import { useTtcSelector, selectLineupConflicts } from '../../../utils/hooks/storeHooks';
import { conflictKey } from '../../../models/utils/lineupConflicts';
```

Voeg in `ReadOnlyMatchPlayers` de hook toe als eerste regel van de component (vóór de
`if (match.isSyncedWithFrenoy ...)`, anders breekt de rules-of-hooks-regel):

```tsx
export const ReadOnlyMatchPlayers = ({ match, displayNonBlocked }: ReadOnlyMatchPlayersProps) => {
  const conflicts = useTtcSelector(selectLineupConflicts);

  // A walkover syncs with no games, so getOwnPlayers() still holds every pre-match selection
```

En geef de prop mee aan de badge:

```tsx
      {players.map(plyInfo => (
        <PlayerCompetitionBadge
          plyInfo={plyInfo}
          competition={match.competition}
          style={{ marginBottom: 4, marginRight: 5 }}
          conflictTeams={conflicts.get(conflictKey(match.id, plyInfo.player.id))}
          key={`ply-${plyInfo.player.id}`}
        />
      ))}
```

- [ ] **Step 4: Draai de tests tot ze groen zijn**

```sh
bun run test src/components/matches/MatchesTable/spec/ReadOnlyMatchPlayersSpec.tsx
```

Verwacht: PASS, 3 tests.

- [ ] **Step 5: Commit**

```sh
git add src/components/matches/MatchesTable/MatchesTableCells.tsx src/components/matches/MatchesTable/spec/ReadOnlyMatchPlayersSpec.tsx
git commit -m "Warn about a double booking in the matches table"
```

---

### Task 6: Koppel "ONZE OPSTELLING" op de matchpagina

**Files:**
- Modify: `src/components/matches/MobileLiveMatches/MobileLiveMatchInProgress.tsx:289-337`

- [ ] **Step 1: Geef de conflicten door**

`selectUser` en `useTtcSelector` worden al geïmporteerd uit `storeHooks`; vul die import
aan met `selectLineupConflicts` en voeg toe:

```ts
import { conflictKey } from '../../../models/utils/lineupConflicts';
```

In `OurFormationPreStart`, na `const user = useTtcSelector(selectUser);`:

```tsx
  const conflicts = useTtcSelector(selectLineupConflicts);
```

En in de badge-lus onderaan diezelfde component:

```tsx
          {playingPlayers.map(ply => (
            <PlayerCompetitionBadge
              key={ply.id}
              plyInfo={{ player: ply, matchPlayer: { status: 'Major' } }}
              competition={match.competition}
              style={{ marginBottom: 0 }}
              conflictTeams={conflicts.get(conflictKey(match.id, ply.id))}
            />
          ))}
```

- [ ] **Step 2: Controleer dat niets breekt**

```sh
bun run test && bun run lint && bun run build
```

Verwacht: alle tests groen, 0 lint-warnings, build slaagt.

- [ ] **Step 3: Commit**

```sh
git add src/components/matches/MobileLiveMatches/MobileLiveMatchInProgress.tsx
git commit -m "Warn about a double booking on the match page formation"
```

---

### Task 7: Koppel de opstellingsmatrix

De matrix (`/ploegen/*/matchesTable`) heeft eigen badge-markup met een eigen
kleurregel: groen als de match geblokkeerd is, oranje zolang dat niet zo is. Rood
overschrijft beide.

**Files:**
- Modify: `src/components/matches/MatchesTable/MatchesTablePlayerLineUpCells.tsx:68-88`
- Test: `src/components/matches/MatchesTable/spec/MatchesTablePlayerLineUpPlayerPlayingCellSpec.tsx`

- [ ] **Step 1: Schrijf de falende test**

`src/components/matches/MatchesTable/spec/MatchesTablePlayerLineUpPlayerPlayingCellSpec.tsx`:

```tsx
import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../utils/test-utils';
import { MatchesTablePlayerLineUpPlayerPlayingCell } from '../MatchesTablePlayerLineUpCells';
import { IMatch, IPlayer, ITeam } from '../../../../models/model-interfaces';

vi.mock('../../../../storeUtil', () => ({ default: {} }));

const player = { id: 7, alias: 'Arne', getCompetition: () => ({ ranking: 'E0' }) } as unknown as IPlayer;
const team = { competition: 'Sporta' } as unknown as ITeam;
const match = { id: 5, block: 'Captain' } as unknown as IMatch;

const renderCell = (conflictTeams?: string[]) =>
  renderWithProviders(
    <table>
      <tbody>
        <tr>
          <MatchesTablePlayerLineUpPlayerPlayingCell display match={match} player={player} team={team} conflictTeams={conflictTeams} />
        </tr>
      </tbody>
    </table>,
  );

describe('MatchesTablePlayerLineUpPlayerPlayingCell', () => {
  it('turns red and warns when the player is picked elsewhere that week', () => {
    renderCell(['Sporta B']);
    expect(screen.getByText('Arne').className).toContain('bg-danger');
    expect(document.querySelector('.fa-exclamation-triangle')).toBeInTheDocument();
  });

  it('keeps the thumbs up without a conflict', () => {
    renderCell();
    expect(screen.getByText('Arne').className).toContain('bg-success');
    expect(document.querySelector('.fa-thumbs-o-up')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Draai de test en zie hem falen**

```sh
bun run test src/components/matches/MatchesTable/spec/MatchesTablePlayerLineUpPlayerPlayingCellSpec.tsx
```

Verwacht: FAIL — de component kent `conflictTeams` nog niet en rendert `bg-success`.

- [ ] **Step 3: Pas de cel aan**

In `src/components/matches/MatchesTable/MatchesTablePlayerLineUpCells.tsx`, vul de
imports aan:

```ts
import { t } from '../../../locales';
```

`Icon` wordt al geïmporteerd. Vervang de typedefinitie en de component (regel 68-88) door:

```tsx
type MatchesTablePlayerLineUpPlayerPlayingCellProps = {
  display: boolean;
  match: IMatch;
  player: IPlayer;
  team: ITeam;
  /** Other teams the player is also lined up for this playing week */
  conflictTeams?: string[];
};

export const MatchesTablePlayerLineUpPlayerPlayingCell = ({
  display,
  player,
  team,
  match,
  conflictTeams,
}: MatchesTablePlayerLineUpPlayerPlayingCellProps) => {
  let color = match.block ? 'bg-success' : 'bg-warning';
  if (conflictTeams?.length) {
    color = 'bg-danger';
  }
  return (
    <td>
      {display && (
        <span className={`badge label-as-badge ${color}`} style={{ fontWeight: 'normal' }}>
          {player.alias}
          <span style={{ marginLeft: 5, marginRight: 5, fontSize: 10 }}>{player.getCompetition(team.competition)?.ranking}</span>
          {conflictTeams?.length ? (
            <Icon fa="fa fa-exclamation-triangle" style={{ marginRight: 0 }} tooltip={t('match.plys.alsoPlaysIn', conflictTeams.join(', '))} />
          ) : (
            <i className="fa fa-thumbs-o-up" />
          )}
        </span>
      )}
    </td>
  );
};
```

- [ ] **Step 4: Draai de test tot hij groen is**

```sh
bun run test src/components/matches/MatchesTable/spec/MatchesTablePlayerLineUpPlayerPlayingCellSpec.tsx
```

Verwacht: PASS, 2 tests.

- [ ] **Step 5: Geef de conflicten door vanuit beide matrix-tabellen**

Voeg in **beide** bestanden deze import toe:

```ts
import { conflictKey } from '../../../models/utils/lineupConflicts';
```

en vul in beide de bestaande `storeHooks`-import aan tot:

```ts
import { selectLineupConflicts, selectUser, useTtcSelector } from '../../../utils/hooks/storeHooks';
```

**`src/components/matches/MatchesTable/MatchesTablePlayerLineUp.tsx`** — voeg de hook toe
onder `const user = ...` (regel 20) en de prop in de enige cel-aanroep (regel 38-45):

```tsx
export const MatchesTablePlayerLineUp = ({ team, matches }: MatchesTablePlayerLineUpProps) => {
  const user = useTtcSelector(selectUser);
  const conflicts = useTtcSelector(selectLineupConflicts);
  const teamPlayers = getTablePlayers(team);
```

```tsx
              {teamPlayers.map(ply => (
                <MatchesTablePlayerLineUpPlayerPlayingCell
                  key={ply.player.id}
                  display={canSeeFormation && playerFormation.some(formation => formation.id === ply.player.id)}
                  match={match}
                  player={ply.player}
                  team={team}
                  conflictTeams={conflicts.get(conflictKey(match.id, ply.player.id))}
                />
              ))}
```

**`src/components/matches/MatchesTable/MatchesTableEditPlayerLineUp.tsx`** — voeg de hook
toe onder `const user = ...` (regel 25) en de prop in de enige cel-aanroep (regel 46-53,
in de `if (!canEditFormation)`-tak):

```tsx
export const MatchesTableEditPlayerLineUp = ({ team, matches, tablePlayers, onTablePlayerSelect }: MatchesTablePlayerLineUpProps) => {
  const user = useTtcSelector(selectUser);
  const conflicts = useTtcSelector(selectLineupConflicts);
  const viewport = useViewport();
  const teamPlayers = getTablePlayers(team);
```

```tsx
                  return (
                    <MatchesTablePlayerLineUpPlayerPlayingCell
                      key={ply.player.id}
                      display={majorOrCaptainFormation.some(formation => formation.id === ply.player.id)}
                      match={match}
                      player={ply.player}
                      team={team}
                      conflictTeams={conflicts.get(conflictKey(match.id, ply.player.id))}
                    />
                  );
```

- [ ] **Step 6: Volledige controle**

```sh
bun run test && bun run lint && bun run build && bun run knip
```

Verwacht: alle tests groen, 0 lint-warnings, build slaagt, knip meldt geen nieuwe dode code.

- [ ] **Step 7: Commit**

```sh
git add src/components/matches/MatchesTable
git commit -m "Warn about a double booking in the formation matrix"
```

---

### Task 8: Verifieer in de app

- [ ] **Step 1: Start de app**

```sh
docker compose -f docker-compose.dev.yml up
```

- [ ] **Step 2: Controleer de vijf pagina's**

Op de dev-data staat Arne opgesteld bij zowel Sporta A als Sporta B in dezelfde
speelweek. Verwacht op elk van deze pagina's een rode badge met een uitroepteken,
tooltip "Speelt deze week ook in Sporta B" (resp. "… Sporta A"):

| URL | |
| ------------------------------------------- | ----------------------- |
| `http://localhost:3000/ploegen/Sporta/A/matchesTable` | opstellingsmatrix |
| `http://localhost:3000/ploegen/Sporta/A/matches`      | matchentabel      |
| `http://localhost:3000/ploegen/Sporta/B`              | Volgende matchen  |
| `http://localhost:3000/match/<matchId>`               | ONZE OPSTELLING   |
| `http://localhost:3000/speelweek/3/Sporta`            | speelweek         |

Rapporteer de URL's en wat er te zien moet zijn; Wouter controleert visueel.
