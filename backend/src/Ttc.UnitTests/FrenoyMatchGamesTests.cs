using Frenoy.Api;
using FrenoyVttl;
using Ttc.DataEntities;

namespace Ttc.UnitTests;

/// <summary>
/// Frenoy does not fill every index array for every competition, so the number of
/// unique indexes is the only reliable way to tell a doubles game from a singles one.
/// </summary>
public class FrenoyMatchGamesTests
{
    private static IndividualMatchResultEntryType Game(string[] homeUnique, string[] awayUnique, string[]? homeMatchIndex, string[]? awayMatchIndex) => new()
    {
        Position = "1",
        HomePlayerUniqueIndex = homeUnique,
        AwayPlayerUniqueIndex = awayUnique,
        HomePlayerMatchIndex = homeMatchIndex!,
        AwayPlayerMatchIndex = awayMatchIndex!,
        HomeSetCount = "3",
        AwaySetCount = "1",
    };

    [Fact]
    public void AddMatchGames_DoublesWithoutMatchIndexes_DoesNotThrow()
    {
        var match = new MatchEntity { Id = 1 };

        FrenoyMatchesApi.AddMatchGames(Game(["101", "102"], ["201", "202"], null, null), match);

        var game = Assert.Single(match.Games);
        Assert.Equal(101, game.HomePlayerUniqueIndex);
        Assert.Equal(102, game.HomePlayerUniqueIndex2);
        Assert.Equal(201, game.AwayPlayerUniqueIndex);
        Assert.Equal(202, game.AwayPlayerUniqueIndex2);
    }

    [Fact]
    public void AddMatchGames_Singles_MapsBothPlayers()
    {
        var match = new MatchEntity { Id = 1 };

        FrenoyMatchesApi.AddMatchGames(Game(["101"], ["201"], ["1"], ["1"]), match);

        var game = Assert.Single(match.Games);
        Assert.Equal(101, game.HomePlayerUniqueIndex);
        Assert.Equal(201, game.AwayPlayerUniqueIndex);
        Assert.Equal(0, game.HomePlayerUniqueIndex2);
    }

    [Fact]
    public void AddMatchGames_DoublesWithMatchIndexes_MapsBothPairs()
    {
        var match = new MatchEntity { Id = 1 };

        FrenoyMatchesApi.AddMatchGames(Game(["101", "102"], ["201", "202"], ["1", "2"], ["1", "2"]), match);

        var game = Assert.Single(match.Games);
        Assert.Equal(102, game.HomePlayerUniqueIndex2);
        Assert.Equal(202, game.AwayPlayerUniqueIndex2);
    }
}
