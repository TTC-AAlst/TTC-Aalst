# TTC Aalst Backend

## Project Overview

TTC Aalst backend - ASP.NET Core 10.0 Web API for table tennis club management. Integrates with Belgian table tennis federation (Frenoy) API.

## Commands

```sh
dotnet build Ttc.slnx           # Build
dotnet test Ttc.slnx            # Test
dotnet format Ttc.slnx          # Format
```

## Project Structure

- `Ttc.DataEntities`: EF Core entities (suffixed with `Entity`)
- `Ttc.Model`: DTOs and view models
- `Ttc.DataAccess`: Services and DbContext
- `Ttc.WebApi`: Controllers and API configuration

## Testing

Integration tests use Testcontainers for MySQL. Extend `IntegrationTestBase`.

On Windows: set `TESTCONTAINERS_RYUK_DISABLED=true`

## Migrations

```sh
dotnet ef migrations add Name -p src/Ttc.DataAccess -s src/Ttc.DataAccess
dotnet ef database update -p src/Ttc.DataAccess -s src/Ttc.DataAccess
```

## Frenoy API

External API for Belgian Table Tennis Federation data sync:
- `FrenoyPlayersApi`, `FrenoyMatchesApi`, `FrenoyTeamsApi`
- `FrenoySyncJob`: Background sync (controlled by `TtcSettings.StartSyncJob`)

## EF Core gotchas

`MySql.EntityFrameworkCore` cannot translate `Contains` over a collection of **strings**: it assigns
the parameter no type mapping and throws `Expression '@x' in the SQL tree does not have a type
mapping assigned`. `EF.Constant` does not help. Filter in memory, or build an OR chain.
Collections of `int` translate fine, and a `static readonly string[]` works because it is inlined
as literals instead of parameterized.
