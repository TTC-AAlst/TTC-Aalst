using Ttc.DataEntities;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Ttc.DataAccess.Services;

public record OwnTeam(int Id, Competition Competition, int FrenoyDivisionId, string TeamCode);

public static class OwnTeamPositions
{
    /// <summary>
    /// Every division has an A team, so a stored week only belongs to us when its club matches
    /// as well as its team code. Division size still counts every club's rows.
    /// </summary>
    public static ICollection<TeamPositionWeek> Build(IReadOnlyCollection<DivisionRankingWeekEntity> weeks, IReadOnlyCollection<OwnTeam> teams)
    {
        var sizes = weeks
            .GroupBy(x => new { x.Competition, x.FrenoyDivisionId, x.Week })
            .ToDictionary(g => g.Key, g => g.Count());

        return weeks
            .Where(w => w.ClubId == Constants.OwnClubId)
            .Join(teams,
                w => new { w.Competition, w.FrenoyDivisionId, w.TeamCode },
                t => new { t.Competition, t.FrenoyDivisionId, t.TeamCode },
                (w, t) => new TeamPositionWeek
                {
                    TeamId = t.Id,
                    Week = w.Week,
                    WeekDate = w.WeekDate,
                    Position = w.Position,
                    TeamsInDivision = sizes[new { w.Competition, w.FrenoyDivisionId, w.Week }],
                })
            .OrderBy(x => x.TeamId).ThenBy(x => x.Week)
            .ToList();
    }
}
