using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Ttc.Model.ClubTournaments;

namespace Ttc.UnitTests.Integration;

public class ClubTournamentsControllerTests : IntegrationTestBase
{
    private const string Slug = "clubkampioenschap-test";

    public ClubTournamentsControllerTests(TtcWebApplicationFactory factory) : base(factory)
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        await using var context = GetDbContext();
        await context.Database.MigrateAsync();
        await context.ClubTournaments.Where(x => x.Slug == Slug).ExecuteDeleteAsync();
    }

    private static string Payload(string winner) => $$"""
        {
          "version": 1,
          "slug": "{{Slug}}",
          "url": "https://tournooike.ttc-aalst.be/{{Slug}}",
          "name": "Clubkampioenschap Test",
          "date": "2026-12-14",
          "eventType": "Clubkampioenschap",
          "type": "enkel",
          "top4": [
            { "place": 1, "name": "{{winner}}", "klassement": "B6" },
            { "place": 2, "name": "Luc Mertens", "klassement": "D2" }
          ],
          "notableWins": [
            { "winner": "Luc Mertens", "winnerKlassement": "D2", "loser": "Tom Claes", "loserKlassement": "C2", "diff": 4, "round": "Kwartfinale", "score": "3-0" }
          ]
        }
        """;

    private async Task<HttpResponseMessage> Push(string body, string? secret)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/club-tournaments")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        if (secret != null)
        {
            request.Headers.Add("X-Tournooike-Secret", secret);
        }

        return await Client.SendAsync(request);
    }

    [Fact]
    public async Task Push_WithoutSecret_IsUnauthorized()
    {
        var response = await Push(Payload("Pieter Van Damme"), null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Push_WithWrongSecret_IsUnauthorized()
    {
        var response = await Push(Payload("Pieter Van Damme"), "wrong");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Push_InvalidPayload_IsBadRequest()
    {
        var response = await Push("""{ "slug": "x" }""", TtcWebApplicationFactory.TournooikeSecret);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Push_StoresTournament_AndRepushOverwrites()
    {
        var first = await Push(Payload("Pieter Van Damme"), TtcWebApplicationFactory.TournooikeSecret);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await Push(Payload("Wim Janssens"), TtcWebApplicationFactory.TournooikeSecret);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var all = await Client.GetFromJsonAsync<ClubTournament[]>("/api/club-tournaments");
        Assert.NotNull(all);
        var stored = Assert.Single(all, x => x.Slug == Slug);
        Assert.Equal("Wim Janssens", stored.Winner);
        Assert.Equal("Clubkampioenschap", stored.EventType);
        Assert.Equal(new DateTime(2026, 12, 14), stored.Date);
        Assert.Equal(4, stored.Results.GetProperty("notableWins")[0].GetProperty("diff").GetInt32());

        var single = await Client.GetFromJsonAsync<ClubTournament>($"/api/club-tournaments/{Slug}");
        Assert.NotNull(single);
        Assert.Equal(stored.Id, single.Id);
    }

    [Fact]
    public async Task Get_UnknownSlug_IsNotFound()
    {
        var response = await Client.GetAsync("/api/club-tournaments/does-not-exist");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
