using Frenoy.Api;
using Ttc.DataEntities;

namespace Ttc.UnitTests;

/// <summary>
/// Two TTC Aalst teams can share a division, so the match itself decides which
/// of our teams plays it. The team that triggered the sync cannot.
/// </summary>
public class FrenoyMatchTeamMappingTests
{
    private const int OtherClubId = 42;
    private const int TeamAId = 493;
    private const int TeamBId = 494;

    private static TeamEntity[] OwnTeamsInDivision =>
    [
        new() { Id = TeamAId, TeamCode = "A", FrenoyDivisionId = 1957 },
        new() { Id = TeamBId, TeamCode = "B", FrenoyDivisionId = 1957 },
    ];

    [Fact]
    public void MapOwnTeams_HomeMatch_MapsHomeTeamOnly()
    {
        var match = new MatchEntity
        {
            HomeClubId = Constants.OwnClubId,
            HomeTeamCode = "B",
            AwayClubId = OtherClubId,
            AwayTeamCode = "A"
        };

        FrenoyMatchesApi.MapOwnTeams(match, OwnTeamsInDivision);

        Assert.Equal(TeamBId, match.HomeTeamId);
        Assert.Null(match.AwayTeamId);
    }

    [Fact]
    public void MapOwnTeams_AwayMatch_MapsAwayTeamOnly()
    {
        var match = new MatchEntity
        {
            HomeClubId = OtherClubId,
            HomeTeamCode = "A",
            AwayClubId = Constants.OwnClubId,
            AwayTeamCode = "B"
        };

        FrenoyMatchesApi.MapOwnTeams(match, OwnTeamsInDivision);

        Assert.Null(match.HomeTeamId);
        Assert.Equal(TeamBId, match.AwayTeamId);
    }

    [Fact]
    public void MapOwnTeams_Derby_MapsBothTeams()
    {
        var match = new MatchEntity
        {
            HomeClubId = Constants.OwnClubId,
            HomeTeamCode = "A",
            AwayClubId = Constants.OwnClubId,
            AwayTeamCode = "B"
        };

        FrenoyMatchesApi.MapOwnTeams(match, OwnTeamsInDivision);

        Assert.Equal(TeamAId, match.HomeTeamId);
        Assert.Equal(TeamBId, match.AwayTeamId);
    }

    [Fact]
    public void MapOwnTeams_MatchBetweenOtherClubs_MapsNoTeam()
    {
        var match = new MatchEntity
        {
            HomeTeamId = TeamAId,
            AwayTeamId = TeamBId,
            HomeClubId = OtherClubId,
            HomeTeamCode = "A",
            AwayClubId = OtherClubId + 1,
            AwayTeamCode = "B"
        };

        FrenoyMatchesApi.MapOwnTeams(match, OwnTeamsInDivision);

        Assert.Null(match.HomeTeamId);
        Assert.Null(match.AwayTeamId);
    }

    [Fact]
    public void MapOwnTeams_FreeWeek_MapsPlayingTeamOnly()
    {
        var match = new MatchEntity
        {
            HomeClubId = Constants.OwnClubId,
            HomeTeamCode = "A",
            AwayClubId = 0,
            AwayTeamCode = null
        };

        FrenoyMatchesApi.MapOwnTeams(match, OwnTeamsInDivision);

        Assert.Equal(TeamAId, match.HomeTeamId);
        Assert.Null(match.AwayTeamId);
    }
}
