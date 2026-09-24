using System.Collections.Concurrent;
using Frenoy.Api;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Ttc.DataAccess.Utilities;
using Ttc.DataAccess.Utilities.Excel;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Clubs;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Ttc.DataAccess.Services;

public class TeamService
{
    private readonly ITtcDbContext _context;
    private readonly CacheHelper _cache;
    private static readonly ConcurrentDictionary<TeamRankingKey, ICollection<DivisionRanking>> RankingCache = new();
    private static readonly TimeSpan FrenoyTeamRankingExpiration = TimeSpan.FromMinutes(30);

    public TeamService(ITtcDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = new CacheHelper(cache);
    }

    public async Task<CacheResponse<Team>?> GetForCurrentYear(DateTime? lastChecked)
    {
        var teams = await _cache.GetOrSet("teams", GetForCurrentYear, TimeSpan.FromHours(1));
        //if (lastChecked.HasValue && lastChecked.Value >= teams.LastChange)
        //{
        //    return null;
        //}
        return teams;
    }

    private async Task<CacheResponse<Team>> GetForCurrentYear()
    {
        int currentSeason = _context.CurrentSeason;
        var teams = await _context.Teams
            .Include(x => x.Players)
            .Include(x => x.Opponents)
            .AsSingleQuery()
            .Where(x => x.Year == currentSeason)
            .ToArrayAsync();

        var lastChange = teams.Max(x => x.Audit.ModifiedOn) ?? DateTime.MinValue;
        var result = EntityMapper.ToTeams(teams);
        return new CacheResponse<Team>(result, lastChange);
    }

    public async Task<Team> GetTeam(int teamId)
    {
        var teams = await GetForCurrentYear(null);
        var team = teams!.Data.Single(x => x.Id == teamId);
        return team;
    }

    public async Task<IEnumerable<DivisionRanking>> GetTeamRanking(Competition competition, int divisionId)
    {
        InvalidateCache();
        var ranking = await GetFrenoyRanking(competition, divisionId);
        return ranking;
    }

    private async Task<ICollection<DivisionRanking>> GetFrenoyRanking(Competition competition, int divisionId)
    {
        var key = new TeamRankingKey(competition, divisionId);
        if (RankingCache.TryGetValue(key, out ICollection<DivisionRanking>? frenoyRanking))
        {
            return frenoyRanking;
        }

        var frenoy = new FrenoyTeamsApi(_context, competition);
        var ranking = await frenoy.GetTeamRankings(divisionId);
        RankingCache.TryAdd(key, ranking);
        return ranking;
    }

    #region DivisionCache
    private class TeamRankingKey : IEquatable<TeamRankingKey>
    {
        private readonly DateTime _created;
        private readonly Competition _competition;
        private readonly int _divisionId;

        public TeamRankingKey(Competition competition, int divisionId)
        {
            _competition = competition;
            _divisionId = divisionId;
            _created = DateTime.Now;
        }

        public bool IsExpired()
        {
            return _created.Add(FrenoyTeamRankingExpiration) < DateTime.Now;
        }

        public override bool Equals(object? obj)
        {
            if (obj is null)
            {
                return false;
            }

            if (ReferenceEquals(this, obj))
            {
                return true;
            }

            if (obj.GetType() != GetType())
            {
                return false;
            }

            return Equals((TeamRankingKey)obj);
        }

        public bool Equals(TeamRankingKey? other)
        {
            if (other is null)
            {
                return false;
            }

            if (ReferenceEquals(this, other))
            {
                return true;
            }

            return _competition == other._competition && _divisionId == other._divisionId;
        }

        public override int GetHashCode()
        {
            return HashCode.Combine((int)_competition, _divisionId);
        }

        public override string ToString() => $"Competition={_competition}, DivisionId={_divisionId}";
    }

    private static void InvalidateCache()
    {
        foreach (var pair in RankingCache.ToArray())
        {
            if (pair.Key.IsExpired())
            {
                RankingCache.TryRemove(pair);
            }
        }
    }
    #endregion

    public async Task<ICollection<DivisionRankingWeek>> GetRankingHistory(Competition competition, int divisionId)
    {
        return await _context.DivisionRankingWeeks
            .Where(x => x.Year == _context.CurrentSeason
                        && x.Competition == competition
                        && x.FrenoyDivisionId == divisionId)
            .OrderBy(x => x.Week)
            .Select(x => new DivisionRankingWeek
            {
                Week = x.Week,
                WeekDate = x.WeekDate,
                Position = x.Position,
                Points = x.Points,
                GamesPlayed = x.GamesPlayed,
                ClubId = x.ClubId,
                TeamCode = x.TeamCode,
                TeamName = x.TeamName,
            })
            .ToListAsync();
    }

    public async Task<ICollection<TeamPositionWeek>> GetOwnTeamPositions()
    {
        var teams = await _context.Teams
            .Where(x => x.Year == _context.CurrentSeason)
            .Select(x => new OwnTeam(x.Id, x.Competition, x.FrenoyDivisionId, x.TeamCode))
            .ToListAsync();

        var weeks = await _context.DivisionRankingWeeks
            .Where(x => x.Year == _context.CurrentSeason)
            .ToListAsync();

        return OwnTeamPositions.Build(weeks, teams);
    }

    public async Task<Team> ToggleTeamPlayer(TeamToggleRequest req)
    {
        var team = _context.Teams.Include(x => x.Players).Single(x => x.Id == req.TeamId);
        var exPlayer = team.Players.SingleOrDefault(x => x.PlayerId == req.PlayerId);
        if (exPlayer == null)
        {
            team.Players.Add(new TeamPlayerEntity
            {
                PlayerId = req.PlayerId,
                TeamId = req.TeamId,
                PlayerType = (TeamPlayerType)Enum.Parse(typeof(TeamPlayerType), req.Role)
            });
        }
        else
        {
            _context.Entry(exPlayer).State = EntityState.Deleted;
        }
        await _context.SaveChangesAsync();
        _cache.Remove("teams");
        return await GetTeam(req.TeamId);
    }

    public async Task<byte[]> GetExcelExport()
    {
        int currentSeason = _context.CurrentSeason;
        var teams = await _context.Teams
            .Include(x => x.Players)
            .ThenInclude(x => x.Player)
            .Where(x => x.Year == currentSeason)
            .ToArrayAsync();

        int currentFrenoySeason = _context.CurrentFrenoySeason;
        var matches = await _context.Matches
            .Include(x => x.Players)
            .Where(x => x.HomeClubId == Constants.OwnClubId || x.AwayClubId == Constants.OwnClubId)
            .Where(x => x.FrenoySeason == currentFrenoySeason)
            .ToListAsync();

        var clubs = await _context.Clubs.ToArrayAsync();

        var assigned = await _context.Toog
            .Where(x => x.Assigned)
            .Include(x => x.Player)
            .ToArrayAsync();

        // Geen enkele index dwingt één aanduiding per dag af, dus een dubbele mag de export niet kelderen
        var toogPerDay = assigned
            .GroupBy(x => x.Date)
            .ToDictionary(x => x.Key, x =>
            {
                var player = x.First().Player!;
                return player.Alias ?? player.FirstName ?? "???";
            });

        var excelCreator = TeamsExcelCreator.CreateFormation(teams, matches, clubs, toogPerDay);
        return excelCreator.Create();
    }
}

public class TeamToggleRequest
{
    public int TeamId { get; set; }
    public int PlayerId { get; set; }
    public string Role { get; set; } = "";

    public override string ToString() => $"TeamId={TeamId}, PlayerId={PlayerId}, Role={Role}";
}
