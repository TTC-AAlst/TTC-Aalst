using System.Drawing;
using System.Globalization;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using Ttc.DataEntities;
using Ttc.Model.Matches;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Ttc.DataAccess.Utilities.Excel;

internal class TeamsExcelCreator
{
    #region Fields & Constructor
    private readonly ICollection<TeamExcelModel> _model;

    public TeamsExcelCreator(ICollection<TeamExcelModel> model)
    {
        _model = model;
    }
    #endregion

    public byte[] Create()
    {
        using (var package = new ExcelPackage())
        {
            var centerStyle = package.Workbook.Styles.CreateNamedStyle("Center");
            centerStyle.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
            //centerStyle.Style.Border.Top.Style = ExcelBorderStyle.Thin;
            //centerStyle.Style.Border.Left.Style = ExcelBorderStyle.Thin;
            //centerStyle.Style.Border.Right.Style = ExcelBorderStyle.Thin;
            //centerStyle.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;

            foreach (var team in _model)
            {
                var sheet = package.Workbook.Worksheets.Add(team.Team);
                var playerToColumnMapping = SetHeader(team, sheet, out int totalColumnCount);

                int rowIndex = 2;
                foreach (var match in team.Matches)
                {
                    sheet.Cells[rowIndex, 1].Value = match.Match.FrenoyMatchId;
                    sheet.Cells[rowIndex, 2].Value = DateTimeFormatInfo.CurrentInfo.GetDayName(match.Match.Date.DayOfWeek);
                    sheet.Cells[rowIndex, 3].Value = match.Match.Date.ToString("dd/MM/yyyy");
                    sheet.Cells[rowIndex, 4].Value = match.Match.Date.ToString("HH:mm");
                    if (match.Match.Date.Hour != Constants.DefaultStartHour || match.Match.Date.Minute != 0)
                    {
                        sheet.Cells[rowIndex, 4].Style.Font.Bold = true;
                    }
                    sheet.Cells[rowIndex, 5].Value = match.Home;
                    sheet.Cells[rowIndex, 6].Value = match.Out;

                    if (match.CaptainDecisions.Any())
                    {
                        foreach (var captainDecision in match.CaptainDecisions.Where(x => playerToColumnMapping.ContainsKey(x)))
                        {
                            var cellColumn = playerToColumnMapping[captainDecision];
                            sheet.Cells[rowIndex, cellColumn].Value = "X";
                            sheet.Cells[rowIndex, cellColumn].StyleName = "Center";
                            // Doesn't work on LibreOffice, therefor workaround with StyleName="Center"
                            //sheet.Cells[rowIndex, cellColumn].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                            //http://stackoverflow.com/questions/34660560/epplus-isnt-honoring-excelhorizontalalignment-center-or-right
                        }

                        string blockName = match.Match.Block == PlayerMatchStatus.Major ? ExcelExportResources.MatchBlockAdminName : ExcelExportResources.MatchBlockCaptainName;
                        sheet.Cells[rowIndex, totalColumnCount - 1].Value = blockName;
                    }

                    if (!string.IsNullOrEmpty(match.Toog))
                    {
                        sheet.Cells[rowIndex, totalColumnCount].Value = match.Toog;
                    }

                    foreach (var playerDecision in match.PlayerDecisions.Where(x => playerToColumnMapping.ContainsKey(x.Key)))
                    {
                        var cellColumn = playerToColumnMapping[playerDecision.Key];
                        var cellColor = GetColor(playerDecision.Value);
                        if (cellColor.HasValue)
                        {
                            sheet.Cells[rowIndex, cellColumn].Style.Fill.PatternType = ExcelFillStyle.Solid;
                            sheet.Cells[rowIndex, cellColumn].Style.Fill.BackgroundColor.SetColor(cellColor.Value);
                        }
                    }

                    rowIndex++;
                }

                sheet.Cells.AutoFitColumns();
            }

            return package.GetAsByteArray();
        }
    }

    private static Color? GetColor(string value)
    {
        switch (value)
        {
            case PlayerMatchStatus.Play:
                return Color.FromArgb(92, 184, 92);
            case PlayerMatchStatus.NotPlay:
                return Color.FromArgb(217, 83, 79);
            case PlayerMatchStatus.Maybe:
                return Color.FromArgb(91, 192, 222);
        }
        return null;
    }

    #region Helpers
    private static Dictionary<string, int> SetHeader(TeamExcelModel team, ExcelWorksheet sheet, out int totalHeaderCount)
    {
        var headers = new List<string>() { ExcelExportResources.MatchFrenoyId, ExcelExportResources.MatchDay, ExcelExportResources.MatchDate, ExcelExportResources.MatchHour, ExcelExportResources.MatchHome, ExcelExportResources.MatchOut };
        int baseColumnIndex = headers.Count;

        var sortedPlayers = team.Players
            .OrderBy(x => x.Reserve)
            .ThenBy(x => x.Ranking)
            .ThenBy(x => x.Name)
            .ToArray();

        var players = sortedPlayers
            .Select((player, index) => new { player.Name, player.Ranking, ColumnIndex = index + baseColumnIndex + 1 })
            .ToArray();
        headers.AddRange(players.Select(x => $"{x.Name} ({x.Ranking})"));
        headers.Add(ExcelExportResources.MatchBlock);
        headers.Add(ExcelExportResources.MatchToog);
        totalHeaderCount = headers.Count;
        var playerNameToColumnIndex = players.ToDictionary(x => x.Name, x => x.ColumnIndex);

        ExcelHelper.SetHeader(sheet, headers.ToArray());

        foreach (var player in sortedPlayers)
        {
            baseColumnIndex++;
            if (player.Reserve)
            {
                sheet.Cells[1, baseColumnIndex].Style.Font.Italic = true;
            }
            if (player.Captain)
            {
                sheet.Cells[1, baseColumnIndex].Style.Font.Color.SetColor(Color.Yellow);
                sheet.Cells[1, baseColumnIndex].Value = "\u2b50 " + sheet.Cells[1, baseColumnIndex].Text;
            }
        }

        return playerNameToColumnIndex;
    }
    #endregion



    #region Model Creation
    public static TeamsExcelCreator CreateFormation(TeamEntity[] teams, List<MatchEntity> matches, PlayerEntity[] players, ClubEntity[] clubs, Dictionary<DateTime, string> toogPerDay)
        => new(BuildFormationModel(teams, matches, players, clubs, toogPerDay));

    internal static List<TeamExcelModel> BuildFormationModel(TeamEntity[] teams, List<MatchEntity> matches, PlayerEntity[] players, ClubEntity[] clubs, Dictionary<DateTime, string> toogPerDay)
    {
        var result = new List<TeamExcelModel>();
        foreach (var team in teams.OrderByDescending(x => x.Competition).ThenBy(x => x.TeamCode))
        {
            var teamModel = new TeamExcelModel(team.Competition + " " + team.TeamCode);

            foreach (var teamPlayer in team.Players)
            {
                var player = players.First(x => x.Id == teamPlayer.PlayerId);
                var ranking = team.Competition == Competition.Sporta ? player.RankingSporta : player.RankingVttl;
                teamModel.Players.Add(new TeamPlayerExcelModel(player.Alias ?? player.FirstName ?? "???", teamPlayer.PlayerType, ranking ?? ""));
            }

            var teamMatches = matches
                .Where(x => x.HomeTeamId == team.Id || x.AwayTeamId == team.Id)
                .OrderBy(x => x.Date);

            foreach (var match in teamMatches)
            {
                if (match.AwayClubId == 0 || match.HomeClubId == 0)
                {
                    // 'vrije' week
                    continue;
                }

                // Both sides of a derby are ours, so a sheet only wants its own half
                bool isHomeTeam = match.HomeTeamId == team.Id;
                var ourPlayers = match.Players.Where(x => x.Home == isHomeTeam).ToArray();

                var teamMatch = new TeamMatchExcelModel(match, clubs);
                foreach (var matchPlayer in ourPlayers.Where(x => x.Status != PlayerMatchStatus.Captain && x.Status != PlayerMatchStatus.Major))
                {
                    if (!teamMatch.PlayerDecisions.ContainsKey(matchPlayer.Name) && matchPlayer.Status != null)
                    {
                        teamMatch.PlayerDecisions.Add(matchPlayer.Name, matchPlayer.Status);
                    }
                }
                if (!string.IsNullOrWhiteSpace(match.Block))
                {
                    foreach (var matchPlayer in ourPlayers.Where(x => x.Status == match.Block))
                    {
                        if (!teamMatch.CaptainDecisions.Contains(matchPlayer.Name))
                        {
                            teamMatch.CaptainDecisions.Add(matchPlayer.Name);
                        }
                    }
                }

                if (isHomeTeam && toogPerDay.TryGetValue(match.Date.Date, out string? toogName))
                {
                    teamMatch.Toog = toogName;
                }

                teamModel.Matches.Add(teamMatch);
            }

            result.Add(teamModel);
        }

        return result;
    }
    #endregion
}

#region Model Classes
internal class TeamExcelModel
{
    public string Team { get; set; }
    public ICollection<TeamPlayerExcelModel> Players { get; set; }
    public ICollection<TeamMatchExcelModel> Matches { get; set; }

    public TeamExcelModel(string team)
    {
        Team = team;
        Matches = new List<TeamMatchExcelModel>();
        Players = new List<TeamPlayerExcelModel>();
    }

    public override string ToString() => $"{Team}";
}

internal class TeamPlayerExcelModel
{
    public string Name { get; set; }
    public bool Reserve { get; set; }
    public bool Captain { get; set; }
    public string Ranking { get; set; }

    public TeamPlayerExcelModel(string name, TeamPlayerType playerType, string ranking)
    {
        Name = name;
        Reserve = playerType == TeamPlayerType.Reserve;
        Captain = playerType == TeamPlayerType.Captain;
        Ranking = ranking;
    }

    public override string ToString() => $"Name={Name}, Reserve={Reserve}";
}

internal class TeamMatchExcelModel
{
    public MatchEntity Match { get; set; }
    public string Home { get; set; }
    public string Out { get; set; }

    /// <summary>
    /// Keys: playerName
    /// Values: Play/NotPlay/Maybe/...
    /// </summary>
    public IDictionary<string, string> PlayerDecisions { get; set; }
    public IList<string> CaptainDecisions { get; set; }
    public string? Toog { get; set; }

    public TeamMatchExcelModel(MatchEntity match, ClubEntity[] clubs)
    {
        Match = match;
        Home = GetTeamDesc(match.HomeClubId, match.HomeTeamCode ?? "", clubs);
        Out = GetTeamDesc(match.AwayClubId, match.AwayTeamCode ?? "", clubs);
        PlayerDecisions = new Dictionary<string, string>();
        CaptainDecisions = new List<string>();
    }

    private static string GetTeamDesc(int clubId, string? teamCode, ClubEntity[] clubs)
    {
        if (clubId == Constants.OwnClubId)
        {
            return "Aalst " + (teamCode ?? "");
        }
        var club = clubs.Single(x => x.Id == clubId);
        return club.Name + " " + (teamCode ?? "");
    }

    public override string ToString() => $"{Match.FrenoyMatchId}";
}
#endregion
