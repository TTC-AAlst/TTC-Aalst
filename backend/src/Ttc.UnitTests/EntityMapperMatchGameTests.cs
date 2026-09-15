using Ttc.DataAccess.Utilities;
using Ttc.DataEntities;
using Ttc.Model.Matches;

namespace Ttc.UnitTests;

public class EntityMapperMatchGameTests
{
    private static MatchGameEntity Game(string? scores) => new()
    {
        Id = 1,
        MatchId = 2,
        MatchNumber = 3,
        HomePlayerUniqueIndex = 101,
        AwayPlayerUniqueIndex = 201,
        HomePlayerSets = 3,
        AwayPlayerSets = 1,
        WalkOver = WalkOver.None,
        Scores = scores,
    };

    [Fact]
    public void ToMatchGame_PassesTheSetScoresThrough()
    {
        var game = EntityMapper.ToMatchGame(Game("1|-9,2|8,3|5,4|13"));

        Assert.Equal("1|-9,2|8,3|5,4|13", game.Scores);
    }

    [Fact]
    public void ToMatchGame_WithoutSetScores_HasNoScores()
    {
        var game = EntityMapper.ToMatchGame(Game(null));

        Assert.Null(game.Scores);
    }
}
