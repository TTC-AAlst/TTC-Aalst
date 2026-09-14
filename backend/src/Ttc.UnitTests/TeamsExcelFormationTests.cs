using Ttc.DataAccess.Utilities.Excel;
using Ttc.DataEntities;
using Ttc.Model.Matches;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Ttc.UnitTests;

/// <summary>
/// Sporta A and B can share a division, so a sheet cannot take everything in it
/// </summary>
public class TeamsExcelFormationTests
{
    private const int DivisionId = 1957;
    private const int TeamAId = 493;
    private const int TeamBId = 494;
    private const int OtherClubId = 28;
    private const int AnnA = 1;
    private const int BertB = 2;

    private static readonly ClubEntity[] Clubs = [new() { Id = Constants.OwnClubId, Name = "Aalst" }, new() { Id = OtherClubId, Name = "Aaigem" }];

    private static readonly PlayerEntity[] Players =
    [
        new() { Id = AnnA, Alias = "Ann", RankingSporta = "D6" },
        new() { Id = BertB, Alias = "Bert", RankingSporta = "E0" },
    ];

    private static TeamEntity[] NewTeams() =>
    [
        NewTeam(TeamAId, "A", AnnA),
        NewTeam(TeamBId, "B", BertB),
    ];

    private static TeamEntity NewTeam(int id, string teamCode, int playerId) => new()
    {
        Id = id,
        Competition = Competition.Sporta,
        TeamCode = teamCode,
        FrenoyDivisionId = DivisionId,
        Players = [new TeamPlayerEntity { TeamId = id, PlayerId = playerId, PlayerType = TeamPlayerType.Standard }],
    };

    private static MatchEntity NewMatch(int id, int? homeTeamId, int? awayTeamId) => new()
    {
        Id = id,
        FrenoyMatchId = $"O{id:00}/001",
        Date = new DateTime(2026, 9, 7).AddDays(id),
        FrenoyDivisionId = DivisionId,
        Competition = Competition.Sporta,
        HomeTeamId = homeTeamId,
        HomeClubId = homeTeamId.HasValue ? Constants.OwnClubId : OtherClubId,
        HomeTeamCode = homeTeamId == TeamBId ? "B" : "A",
        AwayTeamId = awayTeamId,
        AwayClubId = awayTeamId.HasValue ? Constants.OwnClubId : OtherClubId,
        AwayTeamCode = awayTeamId == TeamBId ? "B" : "A",
    };

    private static readonly Dictionary<DateTime, string> NoToog = [];

    private static TeamExcelModel SheetFor(IEnumerable<TeamExcelModel> sheets, string teamCode) => sheets.Single(x => x.Team == $"Sporta {teamCode}");

    [Fact]
    public void BuildFormationModel_TwoTeamsInOneDivision_GivesEachTeamOnlyItsOwnMatches()
    {
        List<MatchEntity> matches = [NewMatch(1, TeamAId, null), NewMatch(2, null, TeamBId)];

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Players, Clubs, NoToog);

        Assert.Equal(["O01/001"], SheetFor(sheets, "A").Matches.Select(x => x.Match.FrenoyMatchId));
        Assert.Equal(["O02/001"], SheetFor(sheets, "B").Matches.Select(x => x.Match.FrenoyMatchId));
    }

    [Fact]
    public void BuildFormationModel_Derby_IsOnBothSheets()
    {
        List<MatchEntity> matches = [NewMatch(1, TeamAId, TeamBId)];

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Players, Clubs, NoToog);

        Assert.Equal("Aalst A", Assert.Single(SheetFor(sheets, "A").Matches).Home);
        Assert.Equal("Aalst B", Assert.Single(SheetFor(sheets, "B").Matches).Out);
    }

    [Fact]
    public void BuildFormationModel_Derby_KeepsEachSheetToItsOwnSideFormation()
    {
        var derby = NewMatch(1, TeamAId, TeamBId);
        derby.Players.Add(new MatchPlayerEntity { PlayerId = AnnA, Name = "Ann", Home = true, Status = PlayerMatchStatus.Play });
        derby.Players.Add(new MatchPlayerEntity { PlayerId = BertB, Name = "Bert", Home = false, Status = PlayerMatchStatus.NotPlay });
        List<MatchEntity> matches = [derby];

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Players, Clubs, NoToog);

        Assert.Equal(new Dictionary<string, string> { ["Ann"] = PlayerMatchStatus.Play }, Assert.Single(SheetFor(sheets, "A").Matches).PlayerDecisions);
        Assert.Equal(new Dictionary<string, string> { ["Bert"] = PlayerMatchStatus.NotPlay }, Assert.Single(SheetFor(sheets, "B").Matches).PlayerDecisions);
    }

    [Fact]
    public void BuildFormationModel_AssignedToog_OnlyLandsOnTheHomeSheet()
    {
        var homeMatch = NewMatch(1, TeamAId, null);
        var awayMatch = NewMatch(2, null, TeamBId);
        List<MatchEntity> matches = [homeMatch, awayMatch];
        var toogPerDay = new Dictionary<DateTime, string>
        {
            [homeMatch.Date.Date] = "Ann",
            [awayMatch.Date.Date] = "Bert",
        };

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Players, Clubs, toogPerDay);

        Assert.Equal("Ann", Assert.Single(SheetFor(sheets, "A").Matches).Toog);
        Assert.Null(Assert.Single(SheetFor(sheets, "B").Matches).Toog);
    }
}
