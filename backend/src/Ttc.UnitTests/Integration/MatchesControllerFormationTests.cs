using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ttc.DataEntities;
using Ttc.Model;
using Ttc.Model.Players;
using Ttc.Model.Teams;
using Ttc.WebApi.Utilities.Auth;

namespace Ttc.UnitTests.Integration;

public class MatchesControllerFormationTests : IntegrationTestBase
{
    private const int TeamId = 900;
    private const int PlainPlayerId = 901;
    private const int BoardPlayerId = 902;
    private const int CaptainPlayerId = 903;
    private const int DerbyTeamId = 904;
    private const int DerbyCaptainPlayerId = 905;
    private const int FarAwayMatchId = 910;
    private const int ImminentMatchId = 911;
    private const int DerbyMatchId = 912;

    public MatchesControllerFormationTests(TtcWebApplicationFactory factory) : base(factory)
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        await using var context = GetDbContext();
        await context.Database.MigrateAsync();
        // The migrations annotate identity columns with Pomelo's "MySql:ValueGenerationStrategy", which
        // MySql.EntityFrameworkCore ignores, so a migrated database has no AUTO_INCREMENT anywhere.
        await context.Database.ExecuteSqlRawAsync("ALTER TABLE MatchPlayer MODIFY Id INT NOT NULL AUTO_INCREMENT");

        if (!await context.Parameters.AnyAsync())
        {
            context.Parameters.Add(new ParameterEntity { Key = "year", Value = "2024" });
            await context.SaveChangesAsync();
        }

        if (!await context.Teams.AnyAsync(x => x.Id == TeamId))
        {
            context.Teams.Add(new TeamEntity { Id = TeamId, Competition = Competition.Vttl, Year = 2024, TeamCode = "A" });
            context.Teams.Add(new TeamEntity { Id = DerbyTeamId, Competition = Competition.Vttl, Year = 2024, TeamCode = "B" });
            context.Players.Add(NewPlayer(PlainPlayerId, "Plain", PlayerAccess.Player));
            context.Players.Add(NewPlayer(BoardPlayerId, "Board", PlayerAccess.Board));
            context.Players.Add(NewPlayer(CaptainPlayerId, "Captain", PlayerAccess.Player));
            context.Players.Add(NewPlayer(DerbyCaptainPlayerId, "DerbyCaptain", PlayerAccess.Player));
            context.TeamPlayers.Add(new TeamPlayerEntity { Id = 900, TeamId = TeamId, PlayerId = CaptainPlayerId, PlayerType = TeamPlayerType.Captain });
            context.TeamPlayers.Add(new TeamPlayerEntity { Id = 901, TeamId = DerbyTeamId, PlayerId = DerbyCaptainPlayerId, PlayerType = TeamPlayerType.Captain });
            context.Matches.Add(NewMatch(FarAwayMatchId, DateTime.Now.AddDays(5)));
            context.Matches.Add(NewMatch(ImminentMatchId, DateTime.Now.AddHours(1)));
            context.Matches.Add(NewDerbyMatch(DerbyMatchId, DateTime.Now.AddDays(5)));
            await context.SaveChangesAsync();
        }
    }

    private static PlayerEntity NewPlayer(int id, string alias, PlayerAccess access) => new()
    {
        Id = id,
        Alias = alias,
        FirstName = alias,
        LastName = "Tester",
        Security = access,
    };

    private static MatchEntity NewMatch(int id, DateTime date) => new()
    {
        Id = id,
        Date = date,
        ShouldBePlayed = true,
        Week = 1,
        Competition = Competition.Vttl,
        FrenoySeason = 25,
        FrenoyDivisionId = 1,
        HomeTeamId = TeamId,
        HomeClubId = 1,
        HomeTeamCode = "A",
        AwayClubId = 2,
        AwayTeamCode = "B",
    };

    private static MatchEntity NewDerbyMatch(int id, DateTime date)
    {
        var match = NewMatch(id, date);
        match.AwayTeamId = DerbyTeamId;
        match.AwayClubId = Constants.OwnClubId;
        return match;
    }

    private HttpClient CreateClientFor(int playerId)
    {
        using var scope = Factory.Services.CreateScope();
        var userProvider = scope.ServiceProvider.GetRequiredService<UserProvider>();
        string token = userProvider.GenerateJwtToken(new User { PlayerId = playerId, Alias = "Tester", Teams = [TeamId] });

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static object Formation(int matchId, int teamId = TeamId, int playerId = PlainPlayerId) => new
    {
        MatchId = matchId,
        TeamId = teamId,
        PlayerIds = new[] { playerId },
        NewStatus = "Major",
        BlockAlso = true,
        Comment = "",
    };

    [Fact]
    public async Task EditMatchPlayers_PlainPlayerLongBeforeMatch_IsForbidden()
    {
        using var client = CreateClientFor(PlainPlayerId);

        var response = await client.PostAsJsonAsync("api/matches/EditMatchPlayers", Formation(FarAwayMatchId));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        await using var context = GetDbContext();
        Assert.Empty(await context.MatchPlayers.Where(x => x.MatchId == FarAwayMatchId).ToArrayAsync());
    }

    [Fact]
    public async Task EditMatchPlayers_PlainPlayerWithinTwoHours_IsAllowed()
    {
        using var client = CreateClientFor(PlainPlayerId);

        var response = await client.PostAsJsonAsync("api/matches/EditMatchPlayers", Formation(ImminentMatchId));

        response.EnsureSuccessStatusCode();
        await using var context = GetDbContext();
        Assert.NotEmpty(await context.MatchPlayers.Where(x => x.MatchId == ImminentMatchId).ToArrayAsync());
    }

    [Fact]
    public async Task EditMatchPlayers_BoardMemberLongBeforeMatch_IsAllowed()
    {
        using var client = CreateClientFor(BoardPlayerId);

        var response = await client.PostAsJsonAsync("api/matches/EditMatchPlayers", Formation(FarAwayMatchId));

        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task EditMatchPlayers_CaptainLongBeforeMatch_IsAllowed()
    {
        using var client = CreateClientFor(CaptainPlayerId);

        var response = await client.PostAsJsonAsync("api/matches/EditMatchPlayers", Formation(FarAwayMatchId));

        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task EditMatchPlayers_DerbyAwayTeamCaptain_IsAllowed()
    {
        using var client = CreateClientFor(DerbyCaptainPlayerId);

        var response = await client.PostAsJsonAsync("api/matches/EditMatchPlayers", Formation(DerbyMatchId, DerbyTeamId, DerbyCaptainPlayerId));

        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task EditMatchPlayers_Derby_LeavesTheOtherOwnTeamFormationAlone()
    {
        using var client = CreateClientFor(BoardPlayerId);

        (await client.PostAsJsonAsync("api/matches/EditMatchPlayers", Formation(DerbyMatchId, TeamId, PlainPlayerId))).EnsureSuccessStatusCode();
        var response = await client.PostAsJsonAsync("api/matches/EditMatchPlayers", Formation(DerbyMatchId, DerbyTeamId, CaptainPlayerId));

        response.EnsureSuccessStatusCode();
        await using var context = GetDbContext();
        var players = await context.MatchPlayers.Where(x => x.MatchId == DerbyMatchId).ToArrayAsync();
        Assert.Equal(PlainPlayerId, Assert.Single(players, x => x.Home).PlayerId);
        Assert.Equal(CaptainPlayerId, Assert.Single(players, x => !x.Home).PlayerId);
    }
}
