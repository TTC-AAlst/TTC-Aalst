using System.Diagnostics;
using Frenoy.Api;
using Microsoft.EntityFrameworkCore;
using Ttc.DataAccess.Utilities;
using Ttc.DataAccess.Utilities.Excel;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Matches;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Ttc.DataAccess.Services;

public class MatchService
{
    /// <summary>
    /// Players that are not a captain or board member may only touch the formation once the match is imminent
    /// </summary>
    private const int FormationEditWindowHours = 2;

    private readonly ITtcDbContext _context;
    private readonly IUserProvider _userProvider;

    public MatchService(ITtcDbContext context, IUserProvider userProvider)
    {
        _context = context;
        _userProvider = userProvider;
    }

    public async Task<bool> MayEditFormation(int matchId)
    {
        int? playerId = _userProvider.PlayerId;
        if (!playerId.HasValue)
        {
            return false;
        }

        var match = await _context.Matches.SingleOrDefaultAsync(x => x.Id == matchId);
        if (match == null)
        {
            return false;
        }

        if (match.Date <= TtcDbContext.GetCurrentBelgianDateTime().AddHours(FormationEditWindowHours))
        {
            return true;
        }

        var player = await _context.Players.FindAsync(playerId.Value);
        if (player != null && player.Security != PlayerAccess.Player)
        {
            return true;
        }

        int? teamId = match.HomeTeamId ?? match.AwayTeamId;
        return await _context.TeamPlayers
            .AnyAsync(x => x.TeamId == teamId && x.PlayerId == playerId && x.PlayerType == TeamPlayerType.Captain);
    }

    #region Getters
    public async Task<IList<Match>> GetMatches()
    {
        var currentFrenoySeason = _context.CurrentFrenoySeason;
        var matchEntities = await _context.Matches
            .WithIncludes()
            //.Where(x => x.Id == 802)
            .Where(x => x.HomeClubId == Constants.OwnClubId || x.AwayClubId == Constants.OwnClubId)
            .Where(x => x.FrenoySeason == currentFrenoySeason)
            .AsSplitQuery()
            .ToListAsync();

        var matchIds = matchEntities.Select(x => x.Id).ToArray();
        var comments = await _context.MatchComments.Where(x => matchIds.Contains(x.MatchId)).ToArrayAsync();
        foreach (var match in matchEntities)
        {
            match.Comments = comments.Where(x => x.MatchId == match.Id).ToArray();
        }

        var result = EntityMapper.ToMatches(matchEntities);
        return result;
    }

    public async Task<ICollection<OtherMatch>> GetOpponentMatches(int teamId, OpposingTeam? opponent = null)
    {
        var team = await _context.Teams.SingleAsync(x => x.Id == teamId);

        async Task<MatchEntity[]> GetMatchEntities()
        {
            var matches = _context.Matches
                .WithIncludes()
                .AsSingleQuery()
                .Where(match => match.FrenoyDivisionId == team.FrenoyDivisionId);

            if (opponent != null)
            {
                matches = matches.Where(match =>
                    (match.AwayClubId == opponent.ClubId && match.AwayTeamCode == opponent.TeamCode) ||
                    (match.HomeClubId == opponent.ClubId && match.HomeTeamCode == opponent.TeamCode)
                );
            }

            return await matches.ToArrayAsync();
        }


        MatchEntity[] matchEntities = await GetMatchEntities();

        if (opponent != null)
        {
            // TODO BUG: This means that when called from Team Week Overview, no opponent is set and there is no sync...
            // TODO PERFORMANCE: This executes too many times, make it part of initial competition load
            var frenoy = new FrenoyMatchesApi(_context, team.Competition);
            await frenoy.SyncOpponentMatches(team, opponent);

            matchEntities = await GetMatchEntities();
        }

        // No comments for OpponentMatches

        var result = EntityMapper.ToOtherMatches(matchEntities);
        return result;

        // TODO: Bug PreSeason code: This doesn't work! These results are NOT displayed in the MatchCard, the spinner just keeps on spinnin'
        // Pre season: Fetch last year matches instead
        //int? divisionId = frenoy.SyncLastYearOpponentMatches(team, opponent);
        //if (divisionId.HasValue)
        //{
        //    var matchEntities = dbContext.Matches
        //        .WithIncludes()
        //        .Where(match => (match.AwayClubId == opponent.ClubId && match.AwayTeamCode == opponent.TeamCode) || (match.HomeClubId == opponent.ClubId && match.HomeTeamCode == opponent.TeamCode))
        //        .Where(match => match.FrenoyDivisionId == divisionId.Value)
        //        .ToList();

        //    // No comments for OpponentMatches

        //    // HACK: hack om vorig jaar matchen te tonen in de frontend zonder te moeten berekenen wat hun "last year division id" is
        //    foreach (var match in matchEntities)
        //    {
        //        match.FrenoyDivisionId = team.FrenoyDivisionId;
        //    }

        //    var result = Mapper.Map<IList<MatchEntity>, IList<OtherMatch>>(matchEntities);
        //    return result;
        //}
    }
    #endregion

    #region Boilerplate code
    public async Task<Match> GetMatch(int matchId)
    {
        var match = await _context.Matches
            .WithIncludes()
            .AsSingleQuery()
            .SingleAsync(x => x.Id == matchId);

        // This used to crash with mysql when doing directly as an Include
        // Is this still the case?
        var comments = await _context.MatchComments.Where(x => x.MatchId == matchId).ToArrayAsync();
        match.Comments = comments;

        var matchModel = EntityMapper.ToMatch(match);
        return matchModel;
    }

    public async Task<OtherMatch> GetOpponentMatch(int matchId)
    {
        var match = await _context.Matches
            .WithIncludes()
            .AsSingleQuery()
            .SingleAsync(x => x.Id == matchId);

        var matchModel = EntityMapper.ToOtherMatch(match);
        return matchModel;
    }
    #endregion

    #region Putters
    public async Task<Match> UpdateScore(int matchId, MatchScore score)
    {
        var match = await _context.Matches
            .WithIncludes()
            .AsSingleQuery()
            .SingleAsync(x => x.Id == matchId);

        if (match.IsSyncedWithFrenoy)
        {
            return await GetMatch(match.Id);
        }

        match.AwayScore = score.Out;
        match.HomeScore = score.Home;
        await _context.SaveChangesAsync();

        return await GetMatch(match.Id);
    }

    #region Players
    public async Task<Match> SetMyFormation(MatchPlayer matchPlayer)
    {
        var existingPlayer = await _context.MatchPlayers
            .Include(x => x.Match)
            .Where(x => x.MatchId == matchPlayer.MatchId && x.PlayerId == matchPlayer.PlayerId)
            .FirstOrDefaultAsync(x => x.Status != PlayerMatchStatus.Captain && x.Status != PlayerMatchStatus.Major);

        if (existingPlayer != null)
        {
            existingPlayer.Status = matchPlayer.Status;
            existingPlayer.StatusNote = matchPlayer.StatusNote;
        }
        else
        {
            var playerEntity = EntityMapper.ToMatchPlayerEntity(matchPlayer);
            _context.MatchPlayers.Add(playerEntity);
        }
        await _context.SaveChangesAsync();
        var newMatch = await GetMatch(matchPlayer.MatchId);
        return newMatch;
    }

    /// <summary>
    /// Toggle Captain/Major player by any player of the team
    /// </summary>
    public async Task<Match> ToggleMatchPlayer(MatchPlayer matchPlayer)
    {
        Debug.Assert(matchPlayer.Status is PlayerMatchStatus.Captain or PlayerMatchStatus.Major);
        var match = await _context.Matches.FindAsync(matchPlayer.MatchId);
        if (match == null || match.IsSyncedWithFrenoy)
        {
            return await GetMatch(matchPlayer.MatchId);
        }

        var existingPlayer = await _context.MatchPlayers
            .Where(x => x.MatchId == matchPlayer.MatchId && x.PlayerId == matchPlayer.PlayerId)
            .FirstOrDefaultAsync(x => x.Status == matchPlayer.Status);

        match.Block = matchPlayer.Status;
        if (existingPlayer != null)
        {
            _context.MatchPlayers.Remove(existingPlayer);
        }
        else
        {
            _context.MatchPlayers.Add(EntityMapper.ToMatchPlayerEntity(matchPlayer));
        }
        await _context.SaveChangesAsync();
        var newMatch = await GetMatch(matchPlayer.MatchId);
        return newMatch;
    }

    /// <summary>
    /// Set all players for the match to Captain/Major
    /// </summary>
    /// <param name="blockAlso">Also block the match to the newStatus level</param>
    public async Task<Match> EditMatchPlayers(int matchId, int[] playerIds, string newStatus, bool blockAlso, string comment)
    {
        Debug.Assert(newStatus is PlayerMatchStatus.Captain or PlayerMatchStatus.Major);
        var match = await _context.Matches.SingleAsync(x => x.Id == matchId);
        if (match.IsSyncedWithFrenoy)
        {
            return await GetMatch(matchId);
        }

        match.FormationComment = comment;
        match.Block = blockAlso && playerIds.Any() ? newStatus : null;
        var existingPlayers = await _context.MatchPlayers
            .Where(x => x.MatchId == matchId)
            .Where(x => x.Status == "Captain" || x.Status == "Major")
            .ToArrayAsync();
        _context.MatchPlayers.RemoveRange(existingPlayers);

        if (!blockAlso)
        {
            newStatus = "Captain";
        }

        for (int i = 0; i < playerIds.Length; i++)
        {
            var player = await _context.Players.FindAsync(playerIds[i]);
            if (player == null)
            {
                continue;
            }
            var newMatchPlayer = new MatchPlayerEntity
            {
                MatchId = matchId,
                PlayerId = player.Id,
                Name = player.Alias ?? "",
                Status = newStatus,
                Ranking = (match.Competition is Competition.Vttl or Competition.Jeugd ? player.RankingVttl : player.RankingSporta) ?? "",
                Home = match.IsHomeMatch ?? false,
                Position = i,
                UniqueIndex = match.Competition is Competition.Vttl or Competition.Jeugd ? player.ComputerNummerVttl ?? 0 : player.LidNummerSporta ?? 0
            };
            _context.MatchPlayers.Add(newMatchPlayer);
        }
        await _context.SaveChangesAsync();
        var newMatch = await GetMatch(matchId);
        return newMatch;
    }

    public async Task<Match> EditOpponentPlayers(int matchId, ClubPlayer[] players)
    {
        var match = await _context.Matches.SingleAsync(x => x.Id == matchId);
        if (match.IsSyncedWithFrenoy)
        {
            return await GetMatch(matchId);
        }

        var existingOpponentPlayers = await _context.MatchPlayers
            .Where(x => x.MatchId == matchId)
            .Where(x => x.Home != (match.IsHomeMatch ?? false))
            .ToArrayAsync();
        _context.MatchPlayers.RemoveRange(existingOpponentPlayers);

        bool isOpponentHome = !(match.IsHomeMatch ?? false);
        for (int i = 0; i < players.Length; i++)
        {
            var newMatchPlayer = new MatchPlayerEntity
            {
                MatchId = matchId,
                PlayerId = null,
                Name = players[i].Name,
                Status = PlayerMatchStatus.Captain,
                StatusNote = null,
                Ranking = players[i].Ranking,
                UniqueIndex = players[i].UniqueIndex,
                Home = isOpponentHome,
                Position = i,
                Won = 0
            };
            _context.MatchPlayers.Add(newMatchPlayer);
        }
        await _context.SaveChangesAsync();
        return await GetMatch(matchId);
    }
    #endregion

    #region Report & Comments
    public async Task<Match> UpdateReport(MatchReport report)
    {
        var existingMatch = await _context.Matches.FirstAsync(x => x.Id == report.MatchId);
        existingMatch.ReportPlayerId = report.PlayerId;
        existingMatch.Description = report.Text;

        var clubEvent = EventEntity.MatchReport(report);
        await _context.Events.AddAsync(clubEvent);

        await _context.SaveChangesAsync();
        var newMatch = await GetMatch(report.MatchId);
        return newMatch;
    }

    public async Task<Match> AddComment(MatchComment comment)
    {
        var entity = EntityMapper.ToMatchCommentEntity(comment);
        entity.PostedOn = TtcDbContext.GetCurrentBelgianDateTime();
        _context.MatchComments.Add(entity);
        await _context.SaveChangesAsync();

        var clubEvent = EventEntity.MatchComment(entity);
        await _context.Events.AddAsync(clubEvent);

        await _context.SaveChangesAsync();
        var newMatch = await GetMatch(comment.MatchId);
        return newMatch;
    }

    public async Task<Match> DeleteComment(int commentId)
    {
        var comment = await _context.MatchComments.SingleAsync(x => x.Id == commentId);
        _context.MatchComments.Remove(comment);
        await _context.SaveChangesAsync();

        return await GetMatch(comment.MatchId);
    }
    #endregion

    #region Frenoy Sync
    public async Task<OtherMatch?> FrenoyOtherMatchSync(int matchId, bool forceSync = false)
    {
        if (await FrenoyMatchSyncCore(matchId, forceSync))
        {
            var match = _context.Matches
                .WithIncludes()
                .AsSingleQuery()
                .Single(x => x.Id == matchId);
            return EntityMapper.ToOtherMatch(match);
        }
        return null;
    }

    public async Task<Match?> FrenoyMatchSync(int matchId, bool forceSync)
    {
        if (await FrenoyMatchSyncCore(matchId, forceSync))
        {
            return await GetMatch(matchId);
        }
        return null;
    }

    public async Task FrenoyTeamSync(int teamId)
    {
        var team = await _context.Teams.SingleAsync(x => x.Id == teamId);
        var frenoySync = new FrenoyMatchesApi(_context, team.Competition);
        await frenoySync.SyncTeamMatches(team);
    }

    private async Task<bool> FrenoyMatchSyncCore(int matchId, bool forceSync)
    {
        var match = await _context.Matches
            .WithIncludes()
            .Include(x => x.HomeTeam)
            .Include(x => x.AwayTeam)
            .AsSingleQuery()
            .SingleAsync(x => x.Id == matchId);

        if (forceSync || (match.Date < DateTime.Now && !match.IsSyncedWithFrenoy))
        {
            var frenoySync = new FrenoyMatchesApi(_context, match.Competition, forceSync);
            return await frenoySync.SyncMatchDetails(match);
        }
        return false;
    }

    public async Task FrenoyTournamentsSync()
    {
        await _context.Tournaments
            .Where(x => x.FrenoySeason == _context.CurrentFrenoySeason)
            .ExecuteDeleteAsync();
        await _context.SaveChangesAsync();

        var sportaSync = new FrenoyMatchesApi(_context, Competition.Sporta);
        await sportaSync.SyncTournaments(_context.CurrentFrenoySeason);

        var vttlSync = new FrenoyMatchesApi(_context, Competition.Vttl);
        await vttlSync.SyncTournaments(_context.CurrentFrenoySeason);
    }
    #endregion
    #endregion

    #region Excel Export
    public async Task<(byte[] file, SportaMatchFileInfo fileInfo)> GetExcelExport(int matchId, bool fillInOurTeam = true)
    {
        var exceller = await CreateExcelCreator(matchId);
        return (exceller.Create(fillInOurTeam), exceller.FileInfo);
    }

    private async Task<SportaMatchExcelCreator> CreateExcelCreator(int matchId)
    {
        int currentSeason = _context.CurrentSeason;
        var activePlayers = await _context.Players
            .Where(x => x.QuitYear == null)
            .Where(x => x.ClubIdSporta.HasValue)
            .ToArrayAsync();

        var match = await _context.Matches
            .Include(x => x.HomeTeam)
            .Include(x => x.AwayTeam)
            .Include(x => x.Players)
            .SingleAsync(x => x.Id == matchId);

        var teams = await _context.Teams
            .Include(x => x.Opponents).ThenInclude(x => x.Club)
            .Where(x => x.Year == currentSeason)
            .Where(x => x.Competition == Competition.Sporta)
            .ToArrayAsync();

        var frenoy = new FrenoyPlayersApi(_context, Competition.Sporta);
        var theirClubId = match.AwayTeamId.HasValue ? match.HomeClubId : match.AwayClubId;
        var opponentPlayers = await frenoy.GetPlayers(theirClubId);

        var exceller = new SportaMatchExcelCreator(_context, match, activePlayers, teams, opponentPlayers);
        return exceller;
    }
    #endregion

    public async Task<IEnumerable<PreviousEncounter>> GetPreviousEncounters(PreviousEncounterRequest request)
    {
        // ATTN: This query is not going to work for a derby
        var playerUniqueIds = request.OwnPlayerIds.Values.Union(request.OpponentPlayerNames.Values).ToArray();
        IEnumerable<MatchGameEntity> data = await _context.MatchGames
            .Include(x => x.Match.Players)
            .Where(x => x.MatchId != request.MatchId)
            .Where(x => x.Match.Competition == request.Competition)
            .Where(x => x.Match.IsSyncedWithFrenoy)
            .Where(x => playerUniqueIds.Contains(x.HomePlayerUniqueIndex))
            .Where(x => playerUniqueIds.Contains(x.AwayPlayerUniqueIndex))
            .Where(x => x.AwayPlayerUniqueIndex2 == 0) // Filter out Sporta doubles
            .Where(x => x.WalkOver == WalkOver.None)
            .ToArrayAsync();

        var result = data.Select(game =>
        {
            var homePlayer = game.Match.Players.FirstOrDefault(x => x.UniqueIndex == game.HomePlayerUniqueIndex);
            var awayPlayer = game.Match.Players.FirstOrDefault(x => x.UniqueIndex == game.AwayPlayerUniqueIndex);
            return new PreviousEncounter()
            {
                MatchGameId = game.Id,
                RequestMatchId = request.MatchId,
                MatchId = game.MatchId,
                MatchDate = game.Match.Date,
                Competition = game.Match.Competition,
                HomeName = homePlayer?.Name ?? "",
                HomePlayerUniqueId = game.HomePlayerUniqueIndex,
                HomePlayerSets = game.HomePlayerSets,
                HomeRanking = homePlayer?.Ranking ?? "",
                AwayName = awayPlayer?.Name ?? "",
                AwayPlayerUniqueId = game.AwayPlayerUniqueIndex,
                AwayPlayerSets = game.AwayPlayerSets,
                AwayRanking = awayPlayer?.Ranking ?? "",
            };
        }).ToArray();

        var otherCompetition = request.Competition == Competition.Sporta ? Competition.Vttl : Competition.Sporta;
        var otherCompetitionMatches = await _context.Matches
            .Include(x => x.Games)
            .Include(x => x.Players)
            .Where(x => x.Competition == otherCompetition)
            .Where(x => x.IsSyncedWithFrenoy)
            .Where(x => x.Players.Any(player => request.OpponentPlayerNames.Keys.Contains(player.Name)))
            .Where(x => x.Players.Any(player => player.PlayerId.HasValue && request.OwnPlayerIds.Keys.Contains(player.PlayerId.Value)))
            .ToArrayAsync();

        var otherResult = otherCompetitionMatches.SelectMany(match =>
        {
            var encounters = new List<PreviousEncounter>();

            var ourPlayers = match.Players
                .Where(x => x.PlayerId.HasValue && request.OwnPlayerIds.Keys.Contains(x.PlayerId.Value))
                .ToArray();

            var theirPlayers = match.Players
                .Where(x => !x.PlayerId.HasValue)
                .Where(x => request.OpponentPlayerNames.Keys.Contains(x.Name))
                .ToArray();

            var theirPlayerUniqueIds = theirPlayers.Select(x => x.UniqueIndex).ToArray();

            foreach (var ourPlayer in ourPlayers)
            {
                var games = match.Games
                    .Where(game => game.HomePlayerUniqueIndex == ourPlayer.UniqueIndex || game.AwayPlayerUniqueIndex == ourPlayer.UniqueIndex)
                    .Where(game => theirPlayerUniqueIds.Contains(game.AwayPlayerUniqueIndex) || theirPlayerUniqueIds.Contains(game.HomePlayerUniqueIndex))
                    .Where(game => game.AwayPlayerUniqueIndex2 == 0)
                    .ToArray();

                encounters.AddRange(games.Select(game =>
                {
                    MatchPlayerEntity homePlayer = game.Match.Players.First(x => x.UniqueIndex == ourPlayer.UniqueIndex);
                    int homeUniqueIndex = request.OwnPlayerIds[ourPlayer.PlayerId!.Value];

                    MatchPlayerEntity awayPlayer = theirPlayers.First(x => x.UniqueIndex == game.AwayPlayerUniqueIndex || x.UniqueIndex == game.HomePlayerUniqueIndex);
                    int awayUniqueIndex = request.OpponentPlayerNames[awayPlayer.Name];

                    if (homePlayer.UniqueIndex != game.HomePlayerUniqueIndex)
                    {
                        (homePlayer, awayPlayer) = (awayPlayer, homePlayer);
                        (homeUniqueIndex, awayUniqueIndex) = (awayUniqueIndex, homeUniqueIndex);
                    }

                    return new PreviousEncounter()
                    {
                        MatchGameId = game.Id,
                        RequestMatchId = request.MatchId,
                        MatchId = game.MatchId,
                        MatchDate = game.Match.Date,
                        Competition = game.Match.Competition,
                        HomeName = homePlayer.Name,
                        HomePlayerUniqueId = homeUniqueIndex,
                        HomePlayerSets = game.HomePlayerSets,
                        HomeRanking = homePlayer.Ranking,
                        AwayName = awayPlayer.Name,
                        AwayPlayerUniqueId = awayUniqueIndex,
                        AwayPlayerSets = game.AwayPlayerSets,
                        AwayRanking = awayPlayer.Ranking,
                    };
                }));
            }

            return encounters;
        }).ToArray();

        return result.Concat(otherResult);
    }
}
