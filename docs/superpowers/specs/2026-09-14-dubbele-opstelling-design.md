# Waarschuwing bij dubbele opstelling in dezelfde speelweek

**Date:** 2026-09-14
**Status:** Approved design

## Context & probleem

Een speler mag per competitie maar één keer per speelweek opgesteld worden: twee keer
Sporta in dezelfde speelweek mag niet, twee keer Vttl evenmin. Sporta én Vttl in
dezelfde week mag wél.

Vandaag detecteert de site dat niet. Concreet voorbeeld: Arne staat in de opstelling
van zowel Sporta A (vs Sint-Pauwels A) als Sporta B (vs Hof ter Burst) in dezelfde
speelweek. Beide badges zijn gewoon groen — niets wijst de kapitein op het conflict.

## Doel

De opstellings-badge van een dubbel opgestelde speler valt op en zegt in welke andere
ploeg hij die week ook speelt, op elke plek waar de opstelling getoond wordt.

## Non-goals

- Geen match-niveau icoon naast de tegenstander (enkel de badge zelf).
- Geen markering in de speelweek-mail (`MatchesWeeks/htmlBuilder.ts`).
- Geen blokkering bij het opslaan van een opstelling — enkel een visuele melding.
- Geen backend-wijziging: de store heeft alle nodige matchen al.

## De regel

Een speler is **dubbel opgesteld** wanneer hij in de finale opstelling staat van twee
of meer matchen met dezelfde `competition` én dezelfde `week`.

- **Speelweek** = het veld `match.week` (Frenoy-weeknummer), niet de kalenderdatum en
  niet de `WeekCalcer`-index uit de URL. Twee matchen van dezelfde competitie met
  hetzelfde weeknummer zitten in dezelfde speelweek.
- **Competitie** = `match.competition` (`Vttl` | `Sporta` | `Jeugd`). Weeknummers zijn
  enkel binnen één competitie vergelijkbaar, dus de groepering is
  `${competition}-${week}`.
- **Finale opstelling** = `getPlayerFormation(match)` zoals de matchesTable die al
  gebruikt: `match.block ? match.getPlayerFormation(match.block) : match.getPlayerFormation('Captain')`.
  Zelf aangeduide beschikbaarheid (`Play`, `Maybe`, `DontKnow`, `NotPlay`) telt niet mee.
- Matchen met `shouldBePlayed === false` tellen niet mee.
- Een reeds gespeelde match telt wél mee als conflictbron: speelt Sporta A dinsdag en
  staat dezelfde speler donderdag bij Sporta B, dan moet die donderdag-badge waarschuwen.
  Een gesynchroniseerde match heeft niet altijd een `block`, dus daar is de opstelling
  `match.getPlayerFormation('onlyFinal')` (de spelers die Frenoy op `Major` zette):

  ```ts
  const formationOf = (match: IMatch) => (match.isSyncedWithFrenoy ? match.getPlayerFormation('onlyFinal') : getPlayerFormation(match));
  ```

- Een gesynchroniseerde match krijgt zelf **geen** waarschuwing: daar valt niets meer aan
  te veranderen, die badge blijft groen. Enkel de nog niet gespeelde match van het
  conflictpaar wordt rood. `findLineupConflicts` schrijft dus geen entry weg voor een
  match met `isSyncedWithFrenoy === true`, ook al telt die match wel mee als bron.

### Derby

Een derby (twee eigen ploegen tegen elkaar) staat één keer in de store. Op dat ene
record is `players[].home === true` de opstelling van `match.teamId`; de opstelling van
`match.opponentTeamId` zit erin met `home === false` en wordt door `getOwnPlayers()`
weggefilterd. Zonder extra werk wordt die tweede opstelling dus nooit gescand.

Oplossing: bij het opbouwen van de conflictenlijst wordt een derby uitgeklapt naar twee
`MatchModel`s via het bestaande `mirrorDerbyMatch`.

## Ontwerp

### Nieuwe en verplaatste modules

| Bestand | Inhoud |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `models/utils/getPlayerFormation.ts`    | Verhuisd uit `components/matches/MatchesTable/matchesTableUtil.ts` zodat de model-laag hem mag gebruiken. Vier imports aanpassen. |
| `models/utils/lineupConflicts.ts`       | `conflictKey(matchId, playerId)` en `findLineupConflicts(matches: IMatch[]): Map<string, string[]>` |
| `utils/hooks/storeHooks.ts`             | `selectLineupConflicts` |
| `utils/locales-nl.ts`                   | `match.plys.alsoPlaysIn` |

`findLineupConflicts` groepeert de matchen op `${competition}-${week}`, verzamelt per
groep welke matchen elke speler opstellen, en levert voor elke `(matchId, playerId)`
met meer dan één match de labels van de *andere* ploegen op, bv. `['Sporta B']`. Een
speler zonder conflict staat niet in de map.

Het label is `${match.competition} ${match.getTeam().teamCode}`.

De selector werkt op de ruwe `state.matches` (niet op `selectMatches`) omdat hij de
derby-spiegeling zelf moet doen:

```ts
export const selectLineupConflicts = createSelector(
  [(state: RootState) => state.matches, (state: RootState) => state.teams],
  (matches, teams) =>
    findLineupConflicts(
      matches.flatMap(m => {
        const match = new MatchModel(m) as IMatch;
        if (!m.opponentTeamId) return [match];
        const ownTeamCode = teams.find(team => team.id === m.teamId)?.teamCode ?? '';
        return [match, new MatchModel(mirrorDerbyMatch(m, ownTeamCode)) as IMatch];
      }),
    ),
);
```

### UI

Beide badge-renderers krijgen een optionele prop `conflictTeams?: string[]`. Is die
gevuld, dan:

- wordt de statuskleur vervangen door `bg-danger`;
- komt er achter het klassement een `<Icon fa="fa fa-exclamation-triangle" tooltip={t('match.plys.alsoPlaysIn', conflictTeams.join(', '))} />`.

`Icon` is al door `withTooltip` gewikkeld; de tooltip-tekst wordt vooraf vertaald
doorgegeven (dus zonder `translate`-vlag), omdat er een parameter in zit.

Locale: `match.plys.alsoPlaysIn: 'Speelt deze week ook in ${}'`.

| Call site | Dekt |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `components/players/PlayerBadges.tsx` `PlayerCompetitionBadge` | de badge zelf |
| `components/matches/MatchesTable/MatchesTableCells.tsx` `ReadOnlyMatchPlayers` | `/ploegen/*/matches`, "Volgende matchen", `/speelweek/*` |
| `components/matches/MobileLiveMatches/MobileLiveMatchInProgress.tsx` `OurFormationPreStart` | `/match/:id` — "ONZE OPSTELLING" |
| `components/matches/MatchesTable/MatchesTablePlayerLineUpCells.tsx` `MatchesTablePlayerLineUpPlayerPlayingCell` | `/ploegen/*/matchesTable` (opstellingsmatrix) |

De call sites halen de map op met `useTtcSelector(selectLineupConflicts)` en geven
`conflicts.get(conflictKey(match.id, player.id))` door.

`OwnPlayer.tsx` rendert ook een badge achter `playerAsBadge`, maar geen enkele caller
zet die prop; dat pad blijft ongewijzigd.

## Tests

TDD, vitest + React Testing Library.

`models/utils/spec/lineupConflictsSpec.ts`:

- twee matchen, zelfde competitie en `week`, gedeelde speler → conflict op beide matchen,
  met de teamCode van de andere ploeg;
- zelfde competitie, ander `week`-nummer → geen conflict;
- zelfde `week`-nummer maar Sporta vs Vttl → geen conflict;
- speler met status `Play`/`Maybe` in de tweede match → geen conflict;
- match met `shouldBePlayed === false` → genegeerd;
- derby: de speler in de away-opstelling van de derby wordt herkend;
- match die al gespeeld is telt mee als conflictbron voor een latere match in dezelfde week,
  maar krijgt zelf geen entry in de map.

`components/players/spec/PlayerBadgesSpec.tsx`:

- zonder `conflictTeams`: statuskleur, geen icoon;
- met `conflictTeams`: `bg-danger` en het waarschuwingsicoon met de ploegnamen in de tooltip.

Uitbreiding van `components/matches/MatchesTable/spec/ReadOnlyMatchPlayersSpec.tsx` en
een spec voor `MatchesTablePlayerLineUpPlayerPlayingCell`.
