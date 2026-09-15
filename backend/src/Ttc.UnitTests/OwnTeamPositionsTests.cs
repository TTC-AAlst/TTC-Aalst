using Ttc.DataAccess.Services;
using Ttc.DataEntities;
using Ttc.Model.Players;

namespace Ttc.UnitTests;

/// <summary>
/// Two TTC Aalst teams can share a division (Sporta A and B both play division 1957),
/// and every other club in that division fields an A team too.
/// </summary>
public class OwnTeamPositionsTests
{
    private const int Division = 1957;
    private const int OtherClubId = 42;
    private const int TeamAId = 493;
    private const int TeamBId = 494;

    private static DivisionRankingWeekEntity Week(int week, string teamCode, int clubId, int position) => new()
    {
        Year = 2026,
        Competition = Competition.Sporta,
        FrenoyDivisionId = Division,
        Week = week,
        TeamCode = teamCode,
        ClubId = clubId,
        Position = position,
    };

    private static OwnTeam[] OwnTeams =>
    [
        new(TeamAId, Competition.Sporta, Division, "A"),
        new(TeamBId, Competition.Sporta, Division, "B"),
    ];

    [Fact]
    public void AnotherClubsTeamCode_IsNotOurs()
    {
        var weeks = new[]
        {
            Week(1, "A", Constants.OwnClubId, 3),
            Week(1, "A", OtherClubId, 8),
        };

        var result = OwnTeamPositions.Build(weeks, OwnTeams);

        Assert.Single(result);
        Assert.Equal(3, result.Single().Position);
    }

    [Fact]
    public void TwoOfOurTeamsInOneDivision_BothCarry()
    {
        var weeks = new[]
        {
            Week(1, "A", Constants.OwnClubId, 3),
            Week(1, "B", Constants.OwnClubId, 7),
        };

        var result = OwnTeamPositions.Build(weeks, OwnTeams);

        Assert.Equal([TeamAId, TeamBId], result.Select(x => x.TeamId));
    }

    [Fact]
    public void DivisionSize_CountsEveryClub_NotJustOurs()
    {
        var weeks = new[]
        {
            Week(1, "A", Constants.OwnClubId, 3),
            Week(1, "B", Constants.OwnClubId, 7),
            Week(1, "A", OtherClubId, 1),
            Week(1, "C", OtherClubId, 2),
        };

        var result = OwnTeamPositions.Build(weeks, OwnTeams);

        Assert.All(result, x => Assert.Equal(4, x.TeamsInDivision));
    }

    [Fact]
    public void OrdersByTeamThenWeek()
    {
        var weeks = new[]
        {
            Week(2, "B", Constants.OwnClubId, 6),
            Week(1, "B", Constants.OwnClubId, 7),
            Week(2, "A", Constants.OwnClubId, 2),
            Week(1, "A", Constants.OwnClubId, 3),
        };

        var result = OwnTeamPositions.Build(weeks, OwnTeams);

        Assert.Equal([(TeamAId, 1), (TeamAId, 2), (TeamBId, 1), (TeamBId, 2)], result.Select(x => (x.TeamId, x.Week)));
    }

    [Fact]
    public void ATeamWithNoStoredWeeks_IsAbsent()
    {
        var weeks = new[] { Week(1, "A", Constants.OwnClubId, 3) };

        var result = OwnTeamPositions.Build(weeks, OwnTeams);

        Assert.DoesNotContain(result, x => x.TeamId == TeamBId);
    }

    [Fact]
    public void NoStoredWeeks_IsEmpty()
    {
        var result = OwnTeamPositions.Build([], OwnTeams);

        Assert.Empty(result);
    }
}
