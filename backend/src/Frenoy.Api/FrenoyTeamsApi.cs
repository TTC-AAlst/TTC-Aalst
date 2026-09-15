using FrenoyVttl;
using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Frenoy.Api;

public class FrenoyTeamsApi : FrenoyApiBase
{
    public FrenoyTeamsApi(ITtcDbContext ttcDbContext, Competition comp) : base(ttcDbContext, comp)
    {

    }

    public async Task<IList<DivisionRanking>> GetTeamRankings(int divisionId)
    {
        try
        {
            var rankingsResult = await _frenoy.GetDivisionRankingAsync(new GetDivisionRankingRequest1
            {
                GetDivisionRankingRequest = new GetDivisionRankingRequest()
                {
                    DivisionId = divisionId.ToString(),
                }
            });

            var rankings = rankingsResult.GetDivisionRankingResponse.RankingEntries
                .Select(x =>
                {
                    var rank = new DivisionRanking
                    {
                        Position = int.Parse(x.Position),
                        GamesDraw = int.Parse(x.GamesDraw),
                        GamesWon = int.Parse(x.GamesWon),
                        GamesLost = int.Parse(x.GamesLost),
                        Points = int.Parse(x.Points),
                        ClubId = GetClubId(x.TeamClub).Result,
                        TeamCode = ExtractTeamCodeFromFrenoyName(x.Team) ?? "",
                        IsForfait = ExtractIsForfaitFromFrenoyName(x.Team),
                    };
                    return rank;
                }).ToList();

            return rankings;
        }
        catch
        {
            return new List<DivisionRanking>();
        }
    }

    public async Task SyncDivisionRankingHistory(int divisionId, DivisionWeekCalendar calendar, bool refetchRecent)
    {
        var stored = await _db.DivisionRankingWeeks
            .Where(x => x.Year == _settings.Year
                        && x.Competition == _settings.Competition
                        && x.FrenoyDivisionId == divisionId)
            .Select(x => x.Week)
            .Distinct()
            .ToListAsync();

        // A week without a dated match cannot be placed on a chart's axis, so it is not stored either.
        var weeks = RankingWeekPlanner.WeeksToFetch(stored, calendar.CurrentWeek, refetchRecent)
            .Where(calendar.MondayByWeek.ContainsKey);

        foreach (var week in weeks)
        {
            var response = await _frenoy.GetDivisionRankingAsync(new GetDivisionRankingRequest1
            {
                GetDivisionRankingRequest = new GetDivisionRankingRequest
                {
                    DivisionId = divisionId.ToString(),
                    WeekName = week.ToString(),
                }
            });

            await _db.DivisionRankingWeeks
                .Where(x => x.Year == _settings.Year
                            && x.Competition == _settings.Competition
                            && x.FrenoyDivisionId == divisionId
                            && x.Week == week)
                .ExecuteDeleteAsync();

            foreach (var entry in response.GetDivisionRankingResponse.RankingEntries)
            {
                var teamName = entry.Team ?? "";
                _db.DivisionRankingWeeks.Add(new DivisionRankingWeekEntity
                {
                    Year = _settings.Year,
                    Competition = _settings.Competition,
                    FrenoyDivisionId = divisionId,
                    Week = week,
                    WeekDate = calendar.MondayByWeek[week],
                    Position = int.Parse(entry.Position),
                    Points = int.Parse(entry.Points),
                    GamesPlayed = int.Parse(entry.GamesPlayed),
                    GamesWon = int.Parse(entry.GamesWon),
                    GamesLost = int.Parse(entry.GamesLost),
                    GamesDraw = int.Parse(entry.GamesDraw),
                    ClubId = await GetClubId(entry.TeamClub),
                    TeamCode = ExtractTeamCodeFromFrenoyName(teamName) ?? "",
                    TeamName = teamName,
                });
            }

            await _db.SaveChangesAsync();
        }
    }
}
