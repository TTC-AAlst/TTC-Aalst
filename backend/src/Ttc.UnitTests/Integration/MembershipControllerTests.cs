using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ttc.DataEntities;
using Ttc.Model;
using Ttc.Model.Players;
using Ttc.WebApi.Utilities.Auth;

namespace Ttc.UnitTests.Integration;

public class MembershipControllerTests : IntegrationTestBase
{
    private const int BoardId = 970;
    private const int PlayerId = 971;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public MembershipControllerTests(TtcWebApplicationFactory factory) : base(factory)
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        await using var context = GetDbContext();
        await context.Database.MigrateAsync();

        if (!await context.Players.AnyAsync(x => x.Id == BoardId))
        {
            context.Players.Add(NewPlayer(BoardId, "Bestuur", PlayerAccess.Board));
            context.Players.Add(NewPlayer(PlayerId, "Lid", PlayerAccess.Player));
            await context.SaveChangesAsync();
        }

        await using var cleanup = GetDbContext();
        cleanup.PlayerMemberships.RemoveRange(await cleanup.PlayerMemberships.ToArrayAsync());
        await cleanup.SaveChangesAsync();
    }

    private static PlayerEntity NewPlayer(int id, string alias, PlayerAccess security) => new()
    {
        Id = id,
        Alias = alias,
        FirstName = alias,
        LastName = "Tester",
        Security = security,
    };

    private HttpClient CreateClientFor(int playerId)
    {
        using var scope = Factory.Services.CreateScope();
        var userProvider = scope.ServiceProvider.GetRequiredService<UserProvider>();
        string token = userProvider.GenerateJwtToken(new User { PlayerId = playerId, Alias = "Tester", Teams = [] });

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static PlayerMembership NewMembership() => new()
    {
        PlayerId = PlayerId,
        Vttl = false,
        Sporta = true,
        Status = MembershipStatus.Recreational,
        BirthDate = new DateTime(1990, 5, 17),
        Gender = "M",
        Street = "Kerkstraat",
        HouseNumber = "12",
        PostalCode = "9300",
        Town = "Aalst",
    };

    [Fact]
    public async Task Get_AsPlayer_IsForbidden()
    {
        var client = CreateClientFor(PlayerId);

        var response = await client.GetAsync($"/api/membership/{PlayerId}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Get_Anonymous_IsUnauthorized()
    {
        var response = await Client.GetAsync($"/api/membership/{PlayerId}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_WithoutMembership_ReturnsEmpty()
    {
        var client = CreateClientFor(BoardId);

        var result = await client.GetFromJsonAsync<PlayerMembership>($"/api/membership/{PlayerId}", JsonOptions);

        Assert.Equal(PlayerId, result!.PlayerId);
        Assert.Null(result.BirthDate);
        Assert.True(result.Vttl);
    }

    [Fact]
    public async Task Save_RoundTripsAndSyncsPlayerAddress()
    {
        var client = CreateClientFor(BoardId);

        var response = await client.PostAsJsonAsync("/api/membership", NewMembership(), JsonOptions);
        response.EnsureSuccessStatusCode();

        var result = await client.GetFromJsonAsync<PlayerMembership>($"/api/membership/{PlayerId}", JsonOptions);
        Assert.Equal(MembershipStatus.Recreational, result!.Status);
        Assert.False(result.Vttl);
        Assert.True(result.Sporta);
        Assert.Equal(new DateTime(1990, 5, 17), result.BirthDate);

        await using var context = GetDbContext();
        var player = await context.Players.SingleAsync(x => x.Id == PlayerId);
        Assert.Equal("Kerkstraat 12", player.Address);
        Assert.Equal("9300 Aalst", player.City);
    }

    [Fact]
    public async Task Save_UnknownPlayer_IsNotFound()
    {
        var client = CreateClientFor(BoardId);
        var membership = NewMembership();
        membership.PlayerId = 99999;

        var response = await client.PostAsJsonAsync("/api/membership", membership, JsonOptions);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Email_WithInvalidAddress_IsBadRequest()
    {
        var client = CreateClientFor(BoardId);

        var response = await client.PostAsJsonAsync("/api/membership/Email", new { to = new[] { "geen-email" }, cc = Array.Empty<string>(), subject = "x", email = "x" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
