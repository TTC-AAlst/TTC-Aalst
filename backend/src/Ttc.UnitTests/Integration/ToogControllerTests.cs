using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ttc.DataEntities;
using Ttc.Model;
using Ttc.Model.Players;
using Ttc.Model.Toog;
using Ttc.WebApi.Utilities.Auth;

namespace Ttc.UnitTests.Integration;

public class ToogControllerTests : IntegrationTestBase
{
    private const int TeamId = 940;
    private const int SecondTeamId = 941;
    private const int PlainPlayerId = 942;
    private const int BoardPlayerId = 943;
    private const int OtherPlayerId = 944;
    private const int HomeMatchId = 950;
    private const int SameDayHomeMatchId = 951;
    private const int AwayMatchId = 952;

    private static readonly DateTime HomeDay = DateTime.Today.AddDays(7).AddHours(20);
    private static readonly DateTime AwayDay = DateTime.Today.AddDays(9).AddHours(20);

    public ToogControllerTests(TtcWebApplicationFactory factory) : base(factory)
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        await using var context = GetDbContext();
        await context.Database.MigrateAsync();
        // The migrations annotate identity columns with Pomelo's "MySql:ValueGenerationStrategy", which
        // MySql.EntityFrameworkCore ignores, so a migrated database has no AUTO_INCREMENT anywhere.
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE Toog MODIFY Id INT NOT NULL AUTO_INCREMENT");

        if (!await context.Parameters.AnyAsync())
        {
            context.Parameters.Add(new ParameterEntity { Key = "year", Value = "2024" });
            await context.SaveChangesAsync();
        }

        if (!await context.Teams.AnyAsync(x => x.Id == TeamId))
        {
            context.Teams.Add(new TeamEntity { Id = TeamId, Competition = Competition.Vttl, Year = 2024, TeamCode = "A" });
            context.Teams.Add(new TeamEntity { Id = SecondTeamId, Competition = Competition.Sporta, Year = 2024, TeamCode = "B" });
            context.Players.Add(NewPlayer(PlainPlayerId, "Plain", PlayerAccess.Player));
            context.Players.Add(NewPlayer(BoardPlayerId, "Board", PlayerAccess.Board));
            context.Players.Add(NewPlayer(OtherPlayerId, "Other", PlayerAccess.Player));
            context.Matches.Add(NewMatch(HomeMatchId, HomeDay, TeamId, isHome: true));
            context.Matches.Add(NewMatch(SameDayHomeMatchId, HomeDay.AddHours(-1), SecondTeamId, isHome: true));
            context.Matches.Add(NewMatch(AwayMatchId, AwayDay, TeamId, isHome: false));
            await context.SaveChangesAsync();
        }

        await using var cleanup = GetDbContext();
        cleanup.Toog.RemoveRange(await cleanup.Toog.ToArrayAsync());
        await cleanup.SaveChangesAsync();
    }

    private static PlayerEntity NewPlayer(int id, string alias, PlayerAccess access) => new()
    {
        Id = id,
        Alias = alias,
        FirstName = alias,
        LastName = "Tester",
        Security = access,
    };

    private static MatchEntity NewMatch(int id, DateTime date, int teamId, bool isHome) => new()
    {
        Id = id,
        Date = date,
        ShouldBePlayed = true,
        Week = 1,
        Competition = Competition.Vttl,
        FrenoySeason = 25,
        FrenoyDivisionId = 1,
        HomeTeamId = isHome ? teamId : null,
        HomeClubId = isHome ? Constants.OwnClubId : 2,
        HomeTeamCode = "A",
        AwayTeamId = isHome ? null : teamId,
        AwayClubId = isHome ? 2 : Constants.OwnClubId,
        AwayTeamCode = "B",
    };

    private HttpClient CreateClientFor(int playerId)
    {
        using var scope = Factory.Services.CreateScope();
        var userProvider = scope.ServiceProvider.GetRequiredService<UserProvider>();
        string token = userProvider.GenerateJwtToken(new User { PlayerId = playerId, Alias = "Tester", Teams = [TeamId] });

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task GetMine_ReturnsOneRowPerHomeDay()
    {
        using var client = CreateClientFor(PlainPlayerId);

        var days = await client.GetFromJsonAsync<ToogDay[]>("api/toog/mine");

        Assert.NotNull(days);
        var day = Assert.Single(days, x => x.Date.Date == HomeDay.Date);
        Assert.Equal([TeamId, SecondTeamId], day.HomeTeamIds.OrderBy(x => x));
        Assert.False(day.Available);
        Assert.DoesNotContain(days, x => x.Date.Date == AwayDay.Date);
    }

    [Fact]
    public async Task SetMine_Available_AddsARow()
    {
        using var client = CreateClientFor(PlainPlayerId);

        var response = await client.PostAsJsonAsync("api/toog/mine", new ToogAvailabilityRequest { Date = HomeDay.Date, Available = true });

        response.EnsureSuccessStatusCode();
        await using var context = GetDbContext();
        var row = Assert.Single(await context.Toog.Where(x => x.PlayerId == PlainPlayerId).ToArrayAsync());
        Assert.Equal(HomeDay.Date, row.Date);
        Assert.False(row.Assigned);
    }

    [Fact]
    public async Task SetMine_Unavailable_RemovesTheRow()
    {
        using var client = CreateClientFor(PlainPlayerId);
        (await client.PostAsJsonAsync("api/toog/mine", new ToogAvailabilityRequest { Date = HomeDay.Date, Available = true })).EnsureSuccessStatusCode();

        var response = await client.PostAsJsonAsync("api/toog/mine", new ToogAvailabilityRequest { Date = HomeDay.Date, Available = false });

        response.EnsureSuccessStatusCode();
        await using var context = GetDbContext();
        Assert.Empty(await context.Toog.Where(x => x.PlayerId == PlainPlayerId).ToArrayAsync());
    }

    [Fact]
    public async Task SetMine_OnADayWithoutHomeMatch_IsForbidden()
    {
        using var client = CreateClientFor(PlainPlayerId);

        var response = await client.PostAsJsonAsync("api/toog/mine", new ToogAvailabilityRequest { Date = AwayDay.Date, Available = true });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await using var context = GetDbContext();
        Assert.Empty(await context.Toog.ToArrayAsync());
    }
}
