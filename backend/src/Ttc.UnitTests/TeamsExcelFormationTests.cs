using OfficeOpenXml;
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
    static TeamsExcelFormationTests() => ExcelPackage.License.SetNonCommercialOrganization("TTC Aalst");

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
        NewTeam(TeamAId, "A", Players[0]),
        NewTeam(TeamBId, "B", Players[1]),
    ];

    private static TeamEntity NewTeam(int id, string teamCode, PlayerEntity player) => new()
    {
        Id = id,
        Competition = Competition.Sporta,
        TeamCode = teamCode,
        FrenoyDivisionId = DivisionId,
        Players = [new TeamPlayerEntity { TeamId = id, PlayerId = player.Id, Player = player, PlayerType = TeamPlayerType.Standard }],
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

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Clubs, NoToog);

        Assert.Equal(["O01/001"], SheetFor(sheets, "A").Matches.Select(x => x.Match.FrenoyMatchId));
        Assert.Equal(["O02/001"], SheetFor(sheets, "B").Matches.Select(x => x.Match.FrenoyMatchId));
    }

    [Fact]
    public void BuildFormationModel_Derby_IsOnBothSheets()
    {
        List<MatchEntity> matches = [NewMatch(1, TeamAId, TeamBId)];

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Clubs, NoToog);

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

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Clubs, NoToog);

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

        var sheets = TeamsExcelCreator.BuildFormationModel(NewTeams(), matches, Clubs, toogPerDay);

        Assert.Equal("Ann", Assert.Single(SheetFor(sheets, "A").Matches).Toog);
        Assert.Null(Assert.Single(SheetFor(sheets, "B").Matches).Toog);
    }

    [Fact]
    public void BuildFormationModel_PlayerWhoQuit_StaysOnTheTeamSheet()
    {
        var quitter = new PlayerEntity { Id = 3, Alias = "Quinten", RankingSporta = "C6", QuitYear = 2026 };
        TeamEntity[] teams = [NewTeam(TeamAId, "A", quitter)];

        var sheets = TeamsExcelCreator.BuildFormationModel(teams, [], Clubs, NoToog);

        Assert.Equal("Quinten", Assert.Single(SheetFor(sheets, "A").Players).Name);
    }

    [Fact]
    public void Create_PutsBlockAndToogInTheTwoColumnsAfterThePlayers()
    {
        var homeMatch = NewMatch(1, TeamAId, null);
        homeMatch.Date = homeMatch.Date.AddHours(Constants.DefaultStartHour);
        homeMatch.Block = PlayerMatchStatus.Captain;
        homeMatch.Players.Add(new MatchPlayerEntity { PlayerId = AnnA, Name = "Ann", Home = true, Status = PlayerMatchStatus.Captain });
        List<MatchEntity> matches = [homeMatch];
        var toogPerDay = new Dictionary<DateTime, string> { [homeMatch.Date.Date] = "Bert" };

        byte[] excel = TeamsExcelCreator.CreateFormation(NewTeams(), matches, Clubs, toogPerDay).Create();

        using var package = new ExcelPackage(new MemoryStream(excel));
        var sheet = package.Workbook.Worksheets["Sporta A"];
        Assert.Equal(ExcelExportResources.MatchBlock, sheet.Cells[1, 8].Text);
        Assert.Equal(ExcelExportResources.MatchToog, sheet.Cells[1, 9].Text);
        Assert.Equal(ExcelExportResources.MatchBlockCaptainName, sheet.Cells[2, 8].Text);
        Assert.Equal("Bert", sheet.Cells[2, 9].Text);
    }
}
