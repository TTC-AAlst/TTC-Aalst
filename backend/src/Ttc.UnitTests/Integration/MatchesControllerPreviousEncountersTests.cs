using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ttc.DataAccess.Services;
using Ttc.DataEntities;
using Ttc.Model.Matches;
using Ttc.Model.Players;

namespace Ttc.UnitTests.Integration;

public class MatchesControllerPreviousEncountersTests : IntegrationTestBase
{
    public MatchesControllerPreviousEncountersTests(TtcWebApplicationFactory factory) : base(factory)
    {
    }

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        await using var context = GetDbContext();
        await context.Database.MigrateAsync();

        if (!await context.Parameters.AnyAsync())
        {
            context.Parameters.Add(new ParameterEntity { Key = "year", Value = "2024" });
            await context.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task GetPreviousEncounters_WithOpponentsAndOwnPlayers_DoesNotBlowUpOnTheOtherCompetitionQuery()
    {
        var request = new PreviousEncounterRequest
        {
            MatchId = 77578,
            Competition = Competition.Sporta,
            OpponentPlayerNames = new Dictionary<string, int> { ["Dominiek De Beleyr"] = 46909, ["Gerrit Geerts"] = 46911 },
            OwnPlayerIds = new Dictionary<int, int> { [4] = 8303, [734] = 54959 },
        };

        using var scope = Factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<MatchService>();

        var result = await service.GetPreviousEncounters(request);

        Assert.Empty(result);
    }
}
