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

public class PlayerNotesControllerTests : IntegrationTestBase
{
    private const int PlayerId = 960;
    private const int OtherPlayerId = 961;
    private const int OpponentUniqueIndex = 123456;

    /// <summary>
    /// De api schrijft enums als string (<see cref="JsonStringEnumConverter"/> in Program.cs),
    /// de defaults van ReadFromJsonAsync lezen enkel getallen.
    /// </summary>
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public PlayerNotesControllerTests(TtcWebApplicationFactory factory) : base(factory)
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        await using var context = GetDbContext();
        await context.Database.MigrateAsync();

        if (!await context.Players.AnyAsync(x => x.Id == PlayerId))
        {
            context.Players.Add(NewPlayer(PlayerId, "Noter"));
            context.Players.Add(NewPlayer(OtherPlayerId, "Other"));
            await context.SaveChangesAsync();
        }

        await using var cleanup = GetDbContext();
        cleanup.PlayerNotes.RemoveRange(await cleanup.PlayerNotes.ToArrayAsync());
        await cleanup.SaveChangesAsync();
    }

    private static PlayerEntity NewPlayer(int id, string alias) => new()
    {
        Id = id,
        Alias = alias,
        FirstName = alias,
        LastName = "Tester",
        Security = PlayerAccess.Player,
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

    private static PlayerNoteRequest NewRequest(string note, int uniqueIndex = OpponentUniqueIndex) => new()
    {
        Competition = Competition.Vttl,
        OpponentUniqueIndex = uniqueIndex,
        OpponentName = "Jan Tegenstander",
        Note = note,
    };

    [Fact]
    public async Task Save_CreatesTheNote()
    {
        using var client = CreateClientFor(PlayerId);

        var response = await client.PostAsJsonAsync("api/playernotes", NewRequest("Speelt zeer defensief"), JsonOptions);

        response.EnsureSuccessStatusCode();
        var saved = await response.Content.ReadFromJsonAsync<PlayerNote>(JsonOptions);
        Assert.NotNull(saved);
        Assert.Equal("Speelt zeer defensief", saved.Note);
        Assert.Equal(Competition.Vttl, saved.Competition);
        Assert.Equal(OpponentUniqueIndex, saved.OpponentUniqueIndex);

        await using var context = GetDbContext();
        var row = Assert.Single(await context.PlayerNotes.ToArrayAsync());
        Assert.Equal(PlayerId, row.PlayerId);
        Assert.Equal("Jan Tegenstander", row.OpponentName);
    }

    [Fact]
    public async Task Save_Twice_OverwritesTheSameNote()
    {
        using var client = CreateClientFor(PlayerId);
        (await client.PostAsJsonAsync("api/playernotes", NewRequest("Eerste versie"), JsonOptions)).EnsureSuccessStatusCode();

        (await client.PostAsJsonAsync("api/playernotes", NewRequest("Tweede versie"), JsonOptions)).EnsureSuccessStatusCode();

        await using var context = GetDbContext();
        var row = Assert.Single(await context.PlayerNotes.ToArrayAsync());
        Assert.Equal("Tweede versie", row.Note);
    }

    [Fact]
    public async Task Save_EmptyNote_RemovesTheNote()
    {
        using var client = CreateClientFor(PlayerId);
        (await client.PostAsJsonAsync("api/playernotes", NewRequest("Backhand is zwak"), JsonOptions)).EnsureSuccessStatusCode();

        (await client.PostAsJsonAsync("api/playernotes", NewRequest("   "), JsonOptions)).EnsureSuccessStatusCode();

        await using var context = GetDbContext();
        Assert.Empty(await context.PlayerNotes.ToArrayAsync());
    }

    [Fact]
    public async Task Save_WithoutOpponent_IsBadRequest()
    {
        using var client = CreateClientFor(PlayerId);

        var response = await client.PostAsJsonAsync("api/playernotes", NewRequest("Geen tegenstander", uniqueIndex: 0), JsonOptions);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await using var context = GetDbContext();
        Assert.Empty(await context.PlayerNotes.ToArrayAsync());
    }

    [Fact]
    public async Task GetMine_ReturnsOnlyMyOwnNotes()
    {
        using var mine = CreateClientFor(PlayerId);
        using var theirs = CreateClientFor(OtherPlayerId);
        (await mine.PostAsJsonAsync("api/playernotes", NewRequest("Mijn notitie"), JsonOptions)).EnsureSuccessStatusCode();
        (await theirs.PostAsJsonAsync("api/playernotes", NewRequest("Hun notitie"), JsonOptions)).EnsureSuccessStatusCode();

        var notes = await mine.GetFromJsonAsync<PlayerNote[]>("api/playernotes", JsonOptions);

        Assert.NotNull(notes);
        var note = Assert.Single(notes);
        Assert.Equal("Mijn notitie", note.Note);
    }

    [Fact]
    public async Task Delete_OfSomebodyElsesNote_IsNotFound()
    {
        using var mine = CreateClientFor(PlayerId);
        using var theirs = CreateClientFor(OtherPlayerId);
        var response = await theirs.PostAsJsonAsync("api/playernotes", NewRequest("Hun notitie"), JsonOptions);
        response.EnsureSuccessStatusCode();
        var theirNote = await response.Content.ReadFromJsonAsync<PlayerNote>(JsonOptions);

        var deleteResponse = await mine.DeleteAsync($"api/playernotes/{theirNote!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, deleteResponse.StatusCode);
        await using var context = GetDbContext();
        Assert.Single(await context.PlayerNotes.ToArrayAsync());
    }

    [Fact]
    public async Task Delete_OfMyOwnNote_RemovesIt()
    {
        using var client = CreateClientFor(PlayerId);
        var response = await client.PostAsJsonAsync("api/playernotes", NewRequest("Weg ermee"), JsonOptions);
        response.EnsureSuccessStatusCode();
        var note = await response.Content.ReadFromJsonAsync<PlayerNote>(JsonOptions);

        var deleteResponse = await client.DeleteAsync($"api/playernotes/{note!.Id}");

        deleteResponse.EnsureSuccessStatusCode();
        await using var context = GetDbContext();
        Assert.Empty(await context.PlayerNotes.ToArrayAsync());
    }

    [Fact]
    public async Task GetMine_WhenNotLoggedIn_IsUnauthorized()
    {
        var response = await Client.GetAsync("api/playernotes");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
