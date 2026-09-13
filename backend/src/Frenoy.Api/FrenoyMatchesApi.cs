using System.Diagnostics;
using System.Text.RegularExpressions;
using FrenoyVttl;
using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities;
using Ttc.DataEntities.Core;
using Ttc.Model.Matches;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Frenoy.Api;

public class FrenoyMatchesApi : FrenoyApiBase
{
    /// <summary>
    /// Turn on to force a resync of entire season
    /// </summary>
    public bool ForceResync { get; set; }

    #region Constructor
    public FrenoyMatchesApi(ITtcDbContext ttcDbContext, Competition comp, bool forceSync = false)
        : base(ttcDbContext, comp, forceSync)
    {

    }
    #endregion

    #region Initial Season Load
    /// <summary>
    /// Initial season sync
    /// </summary>
    public async Task SyncTeamsAndMatches()
    {
        var frenoyTeams = await _frenoy.GetClubTeamsAsync(new GetClubTeamsRequest1
        {
            GetClubTeamsRequest = new GetClubTeamsRequest()
            {
                Club = _settings.FrenoyClub,
                Season = _settings.FrenoySeason.ToString()
            }
        });
        await SyncTeamsAndMatches(frenoyTeams.GetClubTeamsResponse);
    }

    private async Task SyncTeamsAndMatches(GetClubTeamsResponse frenoyTeams)
    {
        // ATTN: When doing an after season sync, "Eindrondes" are also included
        //       The GetDivisionRankingAsync crashes on these DivisionIds because
        //       for these, the RankingSystem parameter is required.
        var actualFrenoyTeams = frenoyTeams.TeamEntries
            .Where(team => !team.DivisionName.StartsWith("EINDRONDE"))
            .ToArray();

        foreach (var frenoyTeam in actualFrenoyTeams)
        {
            // Create new division for each team in the club
            // Check if it already exists: Two teams could play in the same division
            TeamEntity? teamEntity = _db.Teams
                .Where(x => x.FrenoyDivisionId.ToString() == frenoyTeam.DivisionId)
                .SingleOrDefault(x => x.TeamCode == frenoyTeam.Team);

            if (teamEntity == null)
            {
                teamEntity = CreateTeam(frenoyTeam);
                _db.Teams.Add(teamEntity);
                await CommitChanges();

                // Create the teams in the new division=reeks
                var frenoyDivision = await _frenoy.GetDivisionRankingAsync(new GetDivisionRankingRequest1
                {
                    GetDivisionRankingRequest = new GetDivisionRankingRequest()
                    {
                        DivisionId = frenoyTeam.DivisionId
                    }
                });

                var teamsInDivision = frenoyDivision.GetDivisionRankingResponse.RankingEntries
                    .Where(x => ExtractTeamCodeFromFrenoyName(x.Team) != frenoyTeam.Team || !IsOwnClub(x.TeamClub))
                    .ToArray();

                foreach (var frenoyTeamsInDivision in teamsInDivision)
                {
                    var teamOpponent = await CreateTeamOpponent(teamEntity, frenoyTeamsInDivision);
                    _db.TeamOpponents.Add(teamOpponent);
                }
                await CommitChanges();
            }

            await SyncTeamMatches(teamEntity);
        }
    }
    #endregion

    #region Public API
    public async Task SyncTeamMatches(TeamEntity team)
    {
        // Create the matches=kalender table in the new  division=reeks
        var matches = await _frenoy.GetMatchesAsync(new GetMatchesRequest1
        {
            GetMatchesRequest = new GetMatchesRequest()
            {
                Club = _settings.FrenoyClub,
                Season = _settings.FrenoySeason.ToString(),
                DivisionId = team.FrenoyDivisionId.ToString(),
                Team = team.TeamCode,
                WithDetailsSpecified = ForceResync,
                WithDetails = ForceResync,
            }
        });

        await SyncTeamMatches(team.FrenoyDivisionId, matches.GetMatchesResponse);
    }

    public async Task<bool> SyncMatchDetails(MatchEntity matchEntity, TeamMatchEntryType? frenoyMatch = null)
    {
        if (_forceSync || ShouldAttemptMatchSync(matchEntity.Id))
        {
            if (frenoyMatch == null)
            {
                GetMatchesResponse1 matches = await _frenoy.GetMatchesAsync(new GetMatchesRequest1
                {
                    GetMatchesRequest = new GetMatchesRequest()
                    {
                        DivisionId = matchEntity.FrenoyDivisionId.ToString(),
                        WithDetailsSpecified = true,
                        WithDetails = true,
                        MatchId = matchEntity.FrenoyMatchId
                    }
                });

                Debug.Assert(matches.GetMatchesResponse.MatchCount == "1");

                frenoyMatch = matches.GetMatchesResponse.TeamMatchesEntries[0];

                var ownTeams = await GetOwnTeamsInDivision(matchEntity.FrenoyDivisionId);
                await MapMatch(matchEntity, ownTeams, matchEntity.FrenoyDivisionId, frenoyMatch, matchEntity.FrenoySeason);
            }

            if (matchEntity.ShouldBePlayed)
            {
                await SyncMatchResults(matchEntity, frenoyMatch);
            }

            if (!matchEntity.IsSyncedWithFrenoy && matchEntity.FrenoySeason < _db.CurrentFrenoySeason)
            {
                matchEntity.IsSyncedWithFrenoy = true;
                matchEntity.Block = PlayerMatchStatus.Major;
            }

            await CommitChanges();
            return true;
        }
        return false;
    }

    // TODO: This is probably some code that fetches opponent team last year performance
    // as an indicator of what they might this year look like. Something for pre season.
    // Probably not worth the trouble...
    //public async Task<int?> SyncLastYearOpponentMatches(TeamEntity team, OpposingTeam opponent)
    //{
    //    const int prevFrenoySeason = Constants.FrenoySeason - 1;
    //    string frenoyOpponentClub = GetFrenoyClubdId(opponent.ClubId);

    //    var opponentTeams = await _frenoy.GetClubTeamsAsync(new GetClubTeamsRequest
    //    {
    //        Club = frenoyOpponentClub,
    //        Season = prevFrenoySeason.ToString()
    //    });

    //    var lastYearTeam = opponentTeams.TeamEntries.SingleOrDefault(x => x.Team == opponent.TeamCode && x.DivisionCategory == Constants.FrenoyTeamCategory);
    //    if (lastYearTeam != null)
    //    {
    //        int lastYearDivisionId = int.Parse(lastYearTeam.DivisionId);
    //        var ourTeam = _db.Teams.SingleOrDefault(x => x.Year == _currentSeason - 1 && x.FrenoyDivisionId == lastYearDivisionId && x.Competition == _settings.Competition.ToString());
    //        if (ShouldAttemptOpponentMatchSync(opponent, team.Id, prevFrenoySeason))
    //        {
    //            var matches = await _frenoy.GetMatchesAsync(new GetMatchesRequest
    //            {
    //                Club = frenoyOpponentClub,
    //                Season = prevFrenoySeason.ToString(),
    //                Team = opponent.TeamCode,
    //                WithDetailsSpecified = false,
    //                WithDetails = false,
    //                DivisionId = lastYearTeam.DivisionId
    //            });
    //            await SyncTeamMatches(ourTeam?.Id, lastYearDivisionId, matches, false, prevFrenoySeason);
    //        }

    //        return lastYearDivisionId;
    //    }
    //    return null;
    //}

    public async Task SyncOpponentMatches(TeamEntity team, OpposingTeam opponent)
    {
        if (ShouldAttemptOpponentMatchSync(opponent, team.Id))
        {
            var matches = await _frenoy.GetMatchesAsync(new GetMatchesRequest1
            {
                GetMatchesRequest = new GetMatchesRequest()
                {
                    Club = GetFrenoyClubId(opponent.ClubId),
                    Season = _settings.FrenoySeason.ToString(),
                    Team = opponent.TeamCode,
                    WithDetailsSpecified = false,
                    WithDetails = false,
                    DivisionId = team.FrenoyDivisionId.ToString()
                }
            });
            await SyncTeamMatches(team.FrenoyDivisionId, matches.GetMatchesResponse);
        }
    }

    public async Task SyncTournaments(int frenoySeason)
    {
        if (!_db.Tournaments.Any(x => x.FrenoySeason == _settings.FrenoySeason && x.Competition == _settings.Competition))
        {
            return;
        }

        var tournaments = await _frenoy.GetTournamentsAsync(new GetTournamentsRequest(new GetTournaments()
        {
            Season = _settings.FrenoySeason.ToString(),
        }));

        foreach (var tournament in tournaments.GetTournamentsResponse.TournamentEntries)
        {
            var tournamentEntity = new TournamentEntity()
            {
                Competition = _settings.Competition,
                FrenoySeason = _settings.FrenoySeason,
                Date = tournament.DateFrom,
                UniqueIndex = tournament.UniqueIndex,
                Name = tournament.Name,
            };

            await _db.Tournaments.AddAsync(tournamentEntity);
        }

        await _db.SaveChangesAsync();
    }
    #endregion

    #region Match Creation
    private async Task SyncTeamMatches(int frenoyDivisionId, GetMatchesResponse matches, int? frenoySeason = null)
    {
        frenoySeason ??= _db.CurrentFrenoySeason;
        var ownTeams = await GetOwnTeamsInDivision(frenoyDivisionId);

        foreach (TeamMatchEntryType frenoyMatch in matches.TeamMatchesEntries)
        {
            // Kalender entries
            MatchEntity? matchEntity = await _db.Matches.SingleOrDefaultAsync(x => x.FrenoyMatchId == frenoyMatch.MatchId && x.FrenoySeason == frenoySeason.Value);
            if (matchEntity == null)
            {
                matchEntity = new MatchEntity();
                await MapMatch(matchEntity, ownTeams, frenoyDivisionId, frenoyMatch, frenoySeason.Value);
                if (ForceResync)
                {
                    await SyncMatchDetails(matchEntity, frenoyMatch);
                }

                _db.Matches.Add(matchEntity);
            }
            else
            {
                if (ForceResync)
                {
                    await SyncMatchDetails(matchEntity, frenoyMatch);
                }
                else
                {
                    await MapMatch(matchEntity, ownTeams, frenoyDivisionId, frenoyMatch, frenoySeason);
                }
            }
            await CommitChanges();
        }
    }

    private async Task MapMatch(MatchEntity entity, IReadOnlyCollection<TeamEntity> ownTeamsInDivision, int frenoyDivisionId, TeamMatchEntryType frenoyMatch, int? frenoySeason)
    {
        frenoySeason ??= _db.CurrentFrenoySeason;

        entity.ShouldBePlayed = !frenoyMatch.HomeTeam.Trim().StartsWith("Vrij") && !frenoyMatch.AwayTeam.Trim().StartsWith("Vrij");
        entity.FrenoyMatchId = frenoyMatch.MatchId;
        entity.Date = frenoyMatch.Date + new TimeSpan(frenoyMatch.Time.Hour, frenoyMatch.Time.Minute, 0);
        if (frenoyMatch.HomeClub != "-")
        {
            entity.HomeClubId = await GetClubId(frenoyMatch.HomeClub);
            entity.HomeTeamCode = ExtractTeamCodeFromFrenoyName(frenoyMatch.HomeTeam);
        }

        Debug.Assert(entity.ShouldBePlayed || frenoyMatch.AwayClub == "-" || frenoyMatch.HomeClub == "-");
        if (frenoyMatch.AwayClub != "-")
        {
            entity.AwayClubId = await GetClubId(frenoyMatch.AwayClub);
            entity.AwayTeamCode = ExtractTeamCodeFromFrenoyName(frenoyMatch.AwayTeam);
        }

        entity.Week = int.Parse(frenoyMatch.WeekName);
        entity.FrenoySeason = frenoySeason.Value;
        entity.FrenoyDivisionId = frenoyDivisionId;
        entity.Competition = _settings.Competition;

        if (!entity.ShouldBePlayed)
        {
            if (frenoyMatch is { IsValidated: true, IsValidatedSpecified: true, IsLocked: true, IsLockedSpecified: true })
            {
                entity.IsSyncedWithFrenoy = true;
                entity.Block = PlayerMatchStatus.Major;
            }


            if (entity.FrenoySeason < _db.CurrentFrenoySeason)
            {
                entity.IsSyncedWithFrenoy = true;
                entity.Block = PlayerMatchStatus.Major;
            }
        }

        MapOwnTeams(entity, ownTeamsInDivision);
    }

    private async Task<TeamEntity[]> GetOwnTeamsInDivision(int frenoyDivisionId)
        => await _db.Teams.Where(x => x.FrenoyDivisionId == frenoyDivisionId).ToArrayAsync();

    /// <summary>
    /// Both sides are a TTC Aalst team when two of our teams share a division (derby),
    /// so the match itself decides which of our teams plays it - not whoever triggered the sync.
    /// </summary>
    public static void MapOwnTeams(MatchEntity entity, IReadOnlyCollection<TeamEntity> ownTeamsInDivision)
    {
        entity.HomeTeamId = FindOwnTeamId(ownTeamsInDivision, entity.HomeClubId, entity.HomeTeamCode);
        entity.AwayTeamId = FindOwnTeamId(ownTeamsInDivision, entity.AwayClubId, entity.AwayTeamCode);
    }

    /// <summary>
    /// Both sides of a derby are ours, so both formations link to our players.
    /// </summary>
    public static bool IsOwnTeamSide(MatchEntity match, bool isHomePlayer)
        => isHomePlayer ? match.HomeTeamId.HasValue : match.AwayTeamId.HasValue;

    private static int? FindOwnTeamId(IReadOnlyCollection<TeamEntity> ownTeamsInDivision, int clubId, string? teamCode)
    {
        if (clubId != Constants.OwnClubId || string.IsNullOrEmpty(teamCode))
        {
            return null;
        }

        return ownTeamsInDivision.SingleOrDefault(x => x.TeamCode == teamCode)?.Id;
    }

    /// <summary>
    /// Sync match score, players and individual results
    /// </summary>
    private async Task SyncMatchResults(MatchEntity matchEntity, TeamMatchEntryType frenoyMatch)
    {
        if (_forceSync || (!matchEntity.IsSyncedWithFrenoy && matchEntity.ShouldBePlayed))
        {
            if (frenoyMatch.Score != null)
            {
                string score = frenoyMatch.Score.ToLowerInvariant();
                bool isForfeit = score.Contains("ff") || score.Contains("af") || score.Contains("gu");
                matchEntity.WalkOver = isForfeit;
                if (matchEntity.WalkOver)
                {
                    matchEntity.IsSyncedWithFrenoy = true;
                    matchEntity.Block = PlayerMatchStatus.Major;
                }

                // Uitslag
                var scoreRex = new Regex(@"^(\d+)-(\d+)");
                var match = scoreRex.Match(frenoyMatch.Score);
                if (match.Success)
                {
                    matchEntity.HomeScore = int.Parse(match.Groups[1].Value);
                    matchEntity.AwayScore = int.Parse(match.Groups[2].Value);
                }
            }

            if (frenoyMatch.MatchDetails != null && frenoyMatch.MatchDetails.DetailsCreated)
            {
                await AddMatchPlayers(frenoyMatch.MatchDetails.HomePlayers.Players, matchEntity, true);
                await AddMatchPlayers(frenoyMatch.MatchDetails.AwayPlayers.Players, matchEntity, false);

                if (!frenoyMatch.IsAwayForfeited && !frenoyMatch.IsHomeForfeited)
                {
                    AddMatchGames(frenoyMatch, matchEntity);
                }

                await RemoveExistingMatchPlayersAndGames(matchEntity);
            }

            if (frenoyMatch is { Score: not null, MatchDetails.DetailsCreated: true })
            {
                int? totalScore = matchEntity.AwayScore + matchEntity.HomeScore;
                if (totalScore.HasValue)
                {
                    if (matchEntity.Competition == Competition.Sporta)
                    {
                        if (totalScore == 10)
                        {
                            matchEntity.IsSyncedWithFrenoy = true;
                            matchEntity.Block = PlayerMatchStatus.Major;
                        }
                    }
                    else
                    {
                        bool IsMatchComplete(string frenoyPrefix, int expectedScore) =>
                            matchEntity.FrenoyMatchId?.StartsWith(frenoyPrefix) == true && totalScore == expectedScore;

                        if (IsMatchComplete("POVLH", 16) || IsMatchComplete("POVLJ", 5))
                        {
                            matchEntity.IsSyncedWithFrenoy = true;
                            matchEntity.Block = PlayerMatchStatus.Major;
                        }
                    }

                    if (!matchEntity.IsSyncedWithFrenoy)
                    {
                        if (frenoyMatch.Date.AddDays(2) < DateTime.Now
                            && frenoyMatch is { IsLocked: true, IsLockedSpecified: true, IsValidated: true, IsValidatedSpecified: true })
                        {
                            var players = frenoyMatch.MatchDetails.AwayPlayers.Players.Concat(frenoyMatch.MatchDetails.HomePlayers.Players);
                            var hasForfeit = players.Any(x => x.IsForfeited && x.IsForfeitedSpecified);
                            matchEntity.IsSyncedWithFrenoy = hasForfeit;
                            if (hasForfeit)
                            {
                                matchEntity.Block = PlayerMatchStatus.Major;
                            }
                        }

                        if (matchEntity.WalkOver)
                        {
                            matchEntity.IsSyncedWithFrenoy = true;
                            matchEntity.Block = PlayerMatchStatus.Major;
                        }
                    }
                }
            }
        }
    }

    private static void AddMatchGames(TeamMatchEntryType frenoyMatch, MatchEntity matchEntity)
    {
        if (frenoyMatch.MatchDetails.IndividualMatchResults != null)
        {
            foreach (var frenoyIndividual in frenoyMatch.MatchDetails.IndividualMatchResults)
            {
                AddMatchGames(frenoyIndividual, matchEntity);
            }
        }
    }

    private async Task RemoveExistingMatchPlayersAndGames(MatchEntity matchEntity)
    {
        var oldMatchPlayers = await _db.MatchPlayers.Where(x => x.MatchId == matchEntity.Id).ToArrayAsync();
        _db.MatchPlayers.RemoveRange(oldMatchPlayers);

        var oldMatchGames = await _db.MatchGames.Where(x => x.MatchId == matchEntity.Id).ToArrayAsync();
        _db.MatchGames.RemoveRange(oldMatchGames);
    }

    private static void AddMatchGames(IndividualMatchResultEntryType frenoyIndividual, MatchEntity matchEntity)
    {
        if (frenoyIndividual.IsHomeForfeited || frenoyIndividual.IsAwayForfeited)
        {
            return;
        }

        MatchGameEntity matchResult;
        if (frenoyIndividual.AwayPlayerMatchIndex?.Length == 2 && frenoyIndividual.AwayPlayerMatchIndex?.Length == 2 &&
            frenoyIndividual.HomePlayerMatchIndex?.Length == 2 && frenoyIndividual.HomePlayerUniqueIndex?.Length == 2 &&
            int.TryParse(frenoyIndividual.HomePlayerUniqueIndex?.First(), out int homeUniqueIndex1) &&
            int.TryParse(frenoyIndividual.AwayPlayerUniqueIndex?.First(), out int awayUniqueIndex1) &&
            int.TryParse(frenoyIndividual.HomePlayerUniqueIndex?.Last(), out int homeUniqueIndex2) &&
            int.TryParse(frenoyIndividual.AwayPlayerUniqueIndex?.Last(), out int awayUniqueIndex2))
        {
            // Sporta doubles match:
            matchResult = new MatchGameEntity
            {
                MatchId = matchEntity.Id,
                MatchNumber = int.Parse(frenoyIndividual.Position),
                HomePlayerUniqueIndex = homeUniqueIndex1,
                AwayPlayerUniqueIndex = awayUniqueIndex1,
                HomePlayerUniqueIndex2 = homeUniqueIndex2,
                AwayPlayerUniqueIndex2 = awayUniqueIndex2,
                WalkOver = WalkOver.None
            };
        }
        else if (int.TryParse(frenoyIndividual.HomePlayerUniqueIndex?.SingleOrDefault(), out int homeUniqueIndex) &&
                 int.TryParse(frenoyIndividual.AwayPlayerUniqueIndex?.SingleOrDefault(), out int awayUniqueIndex))
        {
            // Sporta/Vttl singles match
            matchResult = new MatchGameEntity
            {
                MatchId = matchEntity.Id,
                MatchNumber = int.Parse(frenoyIndividual.Position),
                HomePlayerUniqueIndex = homeUniqueIndex,
                AwayPlayerUniqueIndex = awayUniqueIndex,
                WalkOver = WalkOver.None
            };
        }
        else
        {
            Debug.Fail("Shouldn't get here. This is either a singles or a doubles match...");
            return;
        }

        if (frenoyIndividual.IsHomeForfeited || frenoyIndividual.IsAwayForfeited)
        {
            matchResult.WalkOver = frenoyIndividual.IsHomeForfeited ? WalkOver.Home : WalkOver.Out;
        }
        else
        {
            if (frenoyIndividual.HomeSetCount == null || frenoyIndividual.AwaySetCount == null)
            {
                // If a player forfeited
                return;
            }

            matchResult.HomePlayerSets = int.Parse(frenoyIndividual.HomeSetCount);
            matchResult.AwayPlayerSets = int.Parse(frenoyIndividual.AwaySetCount);
            matchResult.Scores = frenoyIndividual.Scores;
        }
        matchEntity.Games.Add(matchResult);
    }

    private async Task AddMatchPlayers(TeamMatchPlayerEntryType[]? players, MatchEntity match, bool isHomePlayer)
    {
        if (players == null)
        {
            return;
        }

        foreach (var player in players)
        {
            if (string.IsNullOrWhiteSpace(player.UniqueIndex))
            {
                // Even more forfeited stuff
                continue;
            }

            if (player.UniqueIndex == "0")
            {
                // Sometimes dummy records are added to a match
                continue;
            }

            MatchPlayerEntity matchPlayerEntity = new MatchPlayerEntity
            {
                MatchId = match.Id,
                Ranking = player.Ranking,
                Home = isHomePlayer,
                Name = GetSpelerNaam(player),
                Position = int.Parse(player.Position),
                UniqueIndex = int.Parse(player.UniqueIndex),
                Status = PlayerMatchStatus.Major
            };
            if (player.VictoryCount != null)
            {
                matchPlayerEntity.Won = int.Parse(player.VictoryCount);
            }
            else
            {
                Debug.Assert(player.IsForfeited, "Either a VictoryCount or IsForfeited");
            }

            PlayerEntity? dbPlayer = null;
            if (IsOwnTeamSide(match, isHomePlayer))
            {
                if (_isVttl)
                {
                    dbPlayer = await _db.Players.SingleOrDefaultAsync(x => x.ComputerNummerVttl.HasValue && x.ComputerNummerVttl.Value.ToString() == player.UniqueIndex);
                }
                else
                {
                    dbPlayer = await _db.Players.SingleOrDefaultAsync(x => x.LidNummerSporta.HasValue && x.LidNummerSporta.Value.ToString() == player.UniqueIndex);
                }
            }
            if (dbPlayer != null)
            {
                matchPlayerEntity.PlayerId = dbPlayer.Id;
                if (!string.IsNullOrWhiteSpace(dbPlayer.Alias))
                {
                    matchPlayerEntity.Name = dbPlayer.Alias;
                }
            }

            match.Players.Add(matchPlayerEntity);
        }
    }
    #endregion

    #region Cache
    private static readonly TimeSpan FrenoyPesterExpiration = TimeSpan.FromMinutes(10);
    private static readonly Dictionary<int, DateTime> FrenoyNoPesterCache = new();
    private static readonly object FrenoyNoPesterLock = new();
    private static bool ShouldAttemptMatchSync(int matchId)
    {
        lock (FrenoyNoPesterLock)
        {
            if (!FrenoyNoPesterCache.TryGetValue(matchId, out var value))
            {
                FrenoyNoPesterCache.Add(matchId, DateTime.Now);
                return true;
            }

            bool shouldSync = value + FrenoyPesterExpiration < DateTime.Now;
            if (shouldSync)
            {
                FrenoyNoPesterCache.Remove(matchId);
            }
            return shouldSync;
        }
    }

    private static readonly Dictionary<string, DateTime> FrenoyOpponentCache = new();
    private static readonly object FrenoyOpponentLock = new();
    private bool ShouldAttemptOpponentMatchSync(OpposingTeam team, int teamId, int? season = null)
    {
        season ??= _db.CurrentFrenoySeason;

        string hash = season + team.TeamCode + team.ClubId + '-' + teamId;
        lock (FrenoyOpponentLock)
        {
            if (!FrenoyOpponentCache.TryGetValue(hash, out var value))
            {
                FrenoyOpponentCache.Add(hash, DateTime.Now);
                return true;
            }

            bool shouldSync = value + FrenoyPesterExpiration < DateTime.Now;
            if (shouldSync)
            {
                FrenoyOpponentCache.Remove(hash);
            }
            return shouldSync;
        }
    }
    #endregion

    #region Private Implementation
    private bool IsOwnClub(string teamClub)
    {
        return _settings.FrenoyClub == teamClub;
    }

    private static string GetSpelerNaam(TeamMatchPlayerEntryType frenoyVerslagSpeler)
    {
        System.Globalization.TextInfo ti = System.Globalization.CultureInfo.CurrentCulture.TextInfo;
        return ti.ToTitleCase((frenoyVerslagSpeler.FirstName + " " + frenoyVerslagSpeler.LastName).ToLowerInvariant());
    }

    private string GetFrenoyClubId(int clubId)
    {
        if (_isVttl)
        {
            return _db.Clubs.Single(x => x.Id == clubId).CodeVttl!;
        }
        else
        {
            return _db.Clubs.Single(x => x.Id == clubId).CodeSporta!;
        }
    }
    #endregion

    #region Create Teams
    private static readonly Regex VttlDivisionRegex = new(@"Afdeling (\d+)(\w*)");
    private static readonly Regex SportaDivisionRegex = new(@"(\d)(\w)?");
    private const string MatchTypeJeugd = "6";
    private const string MatchTypeVttlMen = "2";
    private const string MatchTypeSportaMen = "4";
    private const string MatchTypeSportaMenOld = "7";
    private TeamEntity CreateTeam(TeamEntryType frenoyTeam)
    {
        var team = new TeamEntity();
        if (frenoyTeam.MatchType == MatchTypeJeugd)
        {
            if (_settings.Competition != Competition.Vttl)
            {
                throw new Exception($"Jeugd is only possible for Vttl. Was={_settings.Competition}");
            }

            team.Competition = Competition.Jeugd;
        }
        else
        {
            if (frenoyTeam.MatchType != MatchTypeVttlMen && frenoyTeam.MatchType != MatchTypeSportaMen && frenoyTeam.MatchType != MatchTypeSportaMenOld)
            {
                throw new Exception($"Expected MatchType to be SportaMen={MatchTypeSportaMen} or VttlMen={MatchTypeVttlMen}. Was={frenoyTeam.MatchType}");
            }

            team.Competition = _settings.Competition;
        }

        team.DivisionType = frenoyTeam.DivisionName.StartsWith("ERE") ? "Ere" : _settings.DivisionType;
        team.Year = _settings.Year;
        team.LinkId = $"{frenoyTeam.DivisionId}_{frenoyTeam.Team}";

        if (_isVttl)
        {
            var teamRegexMatch = VttlDivisionRegex.Match(frenoyTeam.DivisionName);
            team.DivisionNumber = teamRegexMatch.Groups[1].Value;
            team.DivisionCode = teamRegexMatch.Groups[2].Value;
        }
        else
        {
            var teamRegexMatch = SportaDivisionRegex.Match(frenoyTeam.DivisionName.Trim());
            team.DivisionNumber = teamRegexMatch.Groups[1].Value;
            team.DivisionCode = teamRegexMatch.Groups[2].Value;
        }

        team.FrenoyDivisionId = int.Parse(frenoyTeam.DivisionId);
        team.FrenoyTeamId = frenoyTeam.TeamId;
        team.TeamCode = frenoyTeam.Team;
        return team;
    }

    private async Task<TeamOpponentEntity> CreateTeamOpponent(TeamEntity teamEntity, RankingEntryType frenoyTeam)
    {
        var opponent = new TeamOpponentEntity
        {
            TeamId = teamEntity.Id,
            ClubId = await GetClubId(frenoyTeam.TeamClub),
            TeamCode = ExtractTeamCodeFromFrenoyName(frenoyTeam.Team) ?? ""
        };
        return opponent;
    }
    #endregion
}
