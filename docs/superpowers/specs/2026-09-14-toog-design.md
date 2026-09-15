# Toog-beschikbaarheid

Spelers geven op `/profiel/ploegopstelling` aan of ze op een clubthuisdag de toog kunnen doen.
Een admin duidt per dag één verantwoordelijke aan.

## Domein

**Toog** = bardienst in het clubhuis. Hoort bij een *dag*, niet bij een match: op één avond kunnen
meerdere ploegen thuis spelen en dat is één toogbeurt. Een speler kan de toog doen op een dag
waarop zijn eigen ploeg uit speelt of niet speelt.

**Clubthuisdag** = een datum waarop minstens één TTC Aalst-ploeg thuis speelt. Afgeleid uit de
matchen (`HomeTeamId != null`) van het huidige seizoen, niet opgeslagen.

Beschikbaarheid is admin-informatie. De aanduiding wordt buiten de admin-pagina en de
Excel-export nergens getoond.

## Datamodel

Nieuwe tabel `Toog` (`ToogEntity` in `Ttc.DataEntities`):

| Kolom      | Type        | Betekenis                              |
|------------|-------------|----------------------------------------|
| `Id`       | int PK      |                                        |
| `Date`     | date        | clubthuisdag, zonder tijd              |
| `PlayerId` | int FK      | → `Player`                             |
| `Assigned` | bool        | deze speler doet de toog die dag       |
| `Volunteered` | bool     | de speler gaf zich zelf op             |

Unieke index op (`Date`, `PlayerId`).

Het bestaan van een rij betekent "kan toog doen". Duidt de admin iemand aan die zich niet opgaf,
dan wordt een rij aangemaakt met `Assigned = true`; die speler verschijnt daardoor ook in de
opgegeven-lijst, wat klopt — hij doet de toog.

`Volunteered` onderscheidt een rij die de speler zelf maakte van een rij die het bestuur aanmaakte
om iemand aan te duiden die zich niet opgaf. Zonder dat onderscheid zou zo'n bestuursrij, nadat de
aanduiding naar iemand anders gaat, achterblijven als valse vrijwilliger. Bij het wisselen van
aanduiding verdwijnt een rij met `Volunteered = false`; een rij van een vrijwilliger blijft staan
met `Assigned = false`.

Hoogstens één `Assigned = true` per datum. De service dwingt dat af door bij een nieuwe aanduiding
eerst de bestaande te wissen.

## API

`ToogController` + `ToogService` in `Ttc.DataAccess`.

| Verb | Route              | Auth   | Body                     | Response                                              |
|------|--------------------|--------|--------------------------|-------------------------------------------------------|
| GET  | `/api/toog/mine`   | speler | —                        | `{date, homeTeamIds[], available, assigned}[]`         |
| POST | `/api/toog/mine`   | speler | `{date, available}`      | de bijgewerkte lijst                                   |
| GET  | `/api/toog`        | admin  | —                        | `{date, homeTeamIds[], availablePlayerIds[], assignedPlayerId?}[]` |
| POST | `/api/toog/assign` | admin  | `{date, playerId?}`      | de bijgewerkte admin-lijst                             |

`homeTeamIds` zijn de eigen ploegen die die dag thuis spelen; beide schermen tonen ze naast de
datum. `assigned` in `/mine` is waar als déze speler die dag is aangeduid — de frontend leidt het
slot daaruit af.

Regels:

- De speler-endpoints halen `playerId` uit de token, nooit uit de body.
- `available: false` verwijdert de rij.
- `available: false` op een rij met `Assigned = true` wordt geweigerd — de speler kan zich niet
  zelf terugtrekken zodra hij aangeduid is.
- `POST` op een datum die geen clubthuisdag is, wordt geweigerd.
- `httpClient` kent enkel `get` en `post`, vandaar POST voor `/assign`.
- `playerId: null` op `/assign` wist de aanduiding; de beschikbaarheidsrij blijft bestaan als de
  speler zich zelf had opgegeven.
- Alleen komende dagen (datum ≥ vandaag) komen in beide GET-responses. Oudere rijen blijven in de
  tabel staan voor de Excel-export.

## Frontend

### `/profiel/ploegopstelling`

`PlayerLineup.tsx` toont rijen = komende matchen van zijn ploegen ∪ komende clubthuisdagen,
gesorteerd op datum. De tabel krijgt een extra kolom "Toog".

| Rijtype                                        | Matchkolom                                  | Toog-kolom                    |
|------------------------------------------------|---------------------------------------------|-------------------------------|
| Eigen match op een thuisdag                     | ongewijzigd                                 | toggle                        |
| Eigen match op een dag zonder clubthuismatch    | ongewijzigd                                 | leeg                          |
| Thuisdag zonder eigen match                     | datum + grijze tekst welke ploegen thuis spelen | toggle                    |
| Thuisdag waarop hij aangeduid is                | zoals hierboven                             | slot + melding (zie onder)    |

Bij een aanduiding vervalt de toggle en verschijnt, naar analogie met de geblokkeerde opstelling,
`fa-lock` + "Neem contact op met het bestuur als je de toog toch niet kan doen".

Heeft de speler twee matchen op dezelfde thuisdag (VTTL + Sporta), dan staat de toggle op de
eerste rij en toont de tweede niets: het is één toogbeurt.

De Vttl/Sporta-filter en de eerste/laatste-ronde-knop laten toog-only rijen ongemoeid — toog is
club-breed.

`PlayerLineup` wordt hergebruikt door `CaptainPlayerLineup` om de opstelling van iemand anders in
te vullen. De toog-kolom verschijnt daar niet: de toog-endpoints werken altijd op de ingelogde
speler. Een nieuwe prop `showToog` zet de kolom aan, en enkel `Profile.tsx` geeft ze mee.

### Admin-tab "Toog"

`AdminToog.tsx`, als tab in `Admin.tsx` naast "Opstellingen". Per komende thuisdag:

- datum en welke ploegen thuis spelen
- de opgegeven spelers als knoppen; klikken duidt aan
- `PlayerAutoComplete` om een speler te kiezen die zich niet opgaf
- de aangeduide speler als actieve knop met kruisje om te wissen
- dagen zonder aanduiding gemarkeerd

### Redux

Nieuwe `toogReducer.ts` met `fetchToog`, `toggleMyToog` en `assignToog`. Geen SignalR.

## Excel-export

`TeamsExcelCreator` krijgt een kolom "Toog" achter "Blok", op thuismatch-rijen gevuld met de naam
van de aangeduide speler. Leeg als er niemand aangeduid is.

## Tests

Backend, integratietests op `ToogService` (`IntegrationTestBase`):

- toggle aan maakt een rij, toggle uit verwijdert ze
- aanduiden vervangt de vorige aanduiding van die dag
- uitzetten wordt geweigerd zolang `Assigned = true`
- aanduiden van een speler zonder rij maakt er een met `Assigned = true`
- thuisdag-afleiding: alleen dagen met een thuismatch, ontdubbeld over ploegen heen

Frontend, vitest:

- `PlayerLineup`: toog-only rij verschijnt, toggle verstuurt de juiste datum, slot + melding bij
  aanduiding, één toggle bij twee matchen op dezelfde dag
- `AdminToog`: knop per opgegeven speler, aanduiden en wissen

## Bewust weggelaten

- Meerdere toogverantwoordelijken of shiften per dag
- Melding of mail wanneer een dag onbemand blijft
- De aanduiding tonen op de matchpagina, het dashboard of de ploegopstellingstabel
