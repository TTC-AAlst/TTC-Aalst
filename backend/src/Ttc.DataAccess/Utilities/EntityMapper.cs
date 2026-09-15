using System.Collections.ObjectModel;
using Ttc.DataEntities;
using Ttc.Model;
using Ttc.Model.Clubs;
using Ttc.Model.Matches;
using Ttc.Model.Players;
using Ttc.Model.Teams;

namespace Ttc.DataAccess.Utilities;

internal static class EntityMapper
{
    // === Club mappings ===

    public static Club ToClub(ClubEntity src)
    {
        return new Club
        {
            Id = src.Id,
            Name = src.Name,
            CodeVttl = src.CodeVttl,
            CodeSporta = src.CodeSporta,
            Active = src.Active,
            Shower = src.Shower,
            Website = src.Website ?? "",
            MainLocation = CreateMainClubLocation(src.Locations),
            AlternativeLocations = CreateSecondaryClubLocations(src.Locations),
        };
    }

    public static IList<Club> ToClubs(IList<ClubEntity> src) => src.Select(ToClub).ToList();

    private static ICollection<ClubLocation> CreateSecondaryClubLocations(ICollection<ClubLocationEntity> allLocations)
    {
        var locations = allLocations.Where(x => !x.MainLocation).ToArray();
        if (!locations.Any())
        {
            return new Collection<ClubLocation>();
        }
        return locations.Select(CreateClubLocation).ToArray();
    }

    private static ClubLocation CreateMainClubLocation(ICollection<ClubLocationEntity> locations)
    {
        var mainLocation = locations.FirstOrDefault(x => x.MainLocation);
        if (mainLocation == null)
        {
            return new ClubLocation();
        }
        return CreateClubLocation(mainLocation);
    }

    private static ClubLocation CreateClubLocation(ClubLocationEntity location)
    {
        return new ClubLocation
        {
            Id = location.Id,
            Description = location.Description,
            Address = location.Address,
            PostalCode = location.PostalCode.ToString(),
            City = location.City,
            Mobile = location.Mobile,
            Comment = location.Comment ?? "",
        };
    }

    // === Player mappings ===

    public static Player ToPlayer(PlayerEntity src)
    {
        return new Player
        {
            Id = src.Id,
            FirstName = src.FirstName ?? "",
            LastName = src.LastName ?? "",
            Alias = src.Alias ?? "",
            Active = src.Active,
            QuitYear = src.QuitYear,
            Security = src.Security.ToString(),
            HasKey = src.HasKey,
            ImageVersion = src.ImageVersion,
            Style = new PlayerStyle(src.Id, src.Style ?? "", src.BestStroke ?? ""),
            Contact = new PlayerContact(src.Id, src.Email ?? "", src.Mobile ?? "", src.Address ?? "", src.City ?? ""),
            Vttl = src.ClubIdVttl.HasValue
                ? new PlayerCompetition(Competition.Vttl, src.ClubIdVttl.Value, src.ComputerNummerVttl ?? 0, src.FrenoyLinkVttl ?? "", src.RankingVttl ?? "", src.VolgnummerVttl ?? 0, src.IndexVttl ?? 0, KlassementValueConverter.Vttl(src.RankingVttl ?? ""), src.NextRankingVttl ?? "")
                : null,
            Sporta = src.ClubIdSporta.HasValue
                ? new PlayerCompetition(Competition.Sporta, src.ClubIdSporta.Value, src.LidNummerSporta ?? 0, src.FrenoyLinkSporta ?? "", src.RankingSporta ?? "", src.VolgnummerSporta ?? 0, src.IndexSporta ?? 0, KlassementValueConverter.Sporta(src.RankingSporta ?? ""), src.NextRankingSporta ?? "")
                : null,
        };
    }

    public static IList<Player> ToPlayers(IList<PlayerEntity> src) => src.Select(ToPlayer).ToList();

    public static Player ClonePlayer(Player src)
    {
        return new Player
        {
            Id = src.Id,
            FirstName = src.FirstName,
            LastName = src.LastName,
            Alias = src.Alias,
            Active = src.Active,
            QuitYear = src.QuitYear,
            Security = src.Security,
            HasKey = src.HasKey,
            Style = src.Style,
            Contact = src.Contact,
            Vttl = src.Vttl,
            Sporta = src.Sporta,
            ImageVersion = src.ImageVersion,
        };
    }

    public static EventModel ToEventModel(EventEntity src)
    {
        return new EventModel
        {
            Id = src.Id,
            Type = src.Type,
            Data = src.Data,
            TeamId = src.TeamId,
            MatchId = src.MatchId,
            PlayerId = src.PlayerId,
            CreatedOn = src.Audit.CreatedOn,
            CreatedBy = src.Audit.CreatedBy,
        };
    }

    public static IList<EventModel> ToEventModels(IList<EventEntity> src) => src.Select(ToEventModel).ToList();

    // === Team mappings ===

    public static Team ToTeam(TeamEntity src)
    {
        return new Team
        {
            Id = src.Id,
            ClubId = Constants.OwnClubId,
            Competition = src.Competition,
            TeamCode = src.TeamCode,
            Year = src.Year,
            DivisionName = src.DivisionNumber + src.DivisionCode,
            Frenoy = new FrenoyTeamLinks
            {
                DivisionId = src.FrenoyDivisionId,
                LinkId = src.LinkId,
                TeamId = src.FrenoyTeamId,
            },
            Players = src.Players.Select(p => new TeamPlayer
            {
                PlayerId = p.PlayerId,
                Type = p.PlayerType,
            }).ToList(),
            Opponents = src.Opponents.Select(o => new OpposingTeam
            {
                ClubId = o.ClubId,
                TeamCode = o.TeamCode,
            }).ToArray(),
        };
    }

    public static IList<Team> ToTeams(IList<TeamEntity> src) => src.Select(ToTeam).ToList();

    // === Match mappings ===

    public static Match ToMatch(MatchEntity src)
    {
        var scoreType = GetScoreType(src);
        var match = new Match
        {
            Id = src.Id,
            Date = src.Date,
            ShouldBePlayed = src.ShouldBePlayed,
            FrenoyMatchId = src.FrenoyMatchId,
            IsSyncedWithFrenoy = src.IsSyncedWithFrenoy,
            Week = src.Week,
            Competition = src.Competition.ToString(),
            FrenoyDivisionId = src.FrenoyDivisionId,
            Block = src.Block,
            TeamId = src.HomeTeamId ?? src.AwayTeamId ?? 0,
            OpponentTeamId = src.HomeTeamId.HasValue ? src.AwayTeamId : null,
            IsHomeMatch = src.IsHomeMatch,
            Opponent = new OpposingTeam
            {
                ClubId = src.HomeTeamId.HasValue ? src.AwayClubId : src.HomeClubId,
                TeamCode = src.HomeTeamId.HasValue ? src.AwayTeamCode : src.HomeTeamCode,
            },
            ReportPlayerId = src.ReportPlayerId,
            Description = src.Description,
            FormationComment = src.FormationComment,
            IsPlayed = scoreType != MatchOutcome.NotYetPlayed && scoreType != MatchOutcome.BeingPlayed,
            ScoreType = scoreType,
            Score = !src.WalkOver && src.HomeScore.HasValue && src.AwayScore.HasValue
                ? new MatchScore(src.HomeScore.Value, src.AwayScore.Value) : null,
            Players = src.Players.Select(ToMatchPlayer).ToList(),
            Games = src.Games.Select(ToMatchGame).ToList(),
            Comments = src.Comments.Select(ToMatchComment).ToList(),
        };

        SetMatchPlayerAliases(match.Players);
        ChangeMeaningOfHomePlayer(match);
        SetIndividualMatchesOutcome(match.Games, match.IsHomeMatch);
        return match;
    }

    public static IList<Match> ToMatches(IList<MatchEntity> src) => src.Select(ToMatch).ToList();

    public static OtherMatch ToOtherMatch(MatchEntity src)
    {
        var scoreType = GetScoreType(src);
        var match = new OtherMatch
        {
            Id = src.Id,
            Date = src.Date,
            ShouldBePlayed = src.ShouldBePlayed,
            FrenoyMatchId = src.FrenoyMatchId,
            IsSyncedWithFrenoy = src.IsSyncedWithFrenoy,
            Week = src.Week,
            Competition = src.Competition.ToString(),
            FrenoyDivisionId = src.FrenoyDivisionId,
            Home = new OpposingTeam
            {
                ClubId = src.HomeClubId,
                TeamCode = src.HomeTeamCode,
            },
            Away = new OpposingTeam
            {
                ClubId = src.AwayClubId,
                TeamCode = src.AwayTeamCode,
            },
            IsPlayed = scoreType != MatchOutcome.NotYetPlayed && scoreType != MatchOutcome.BeingPlayed,
            ScoreType = scoreType,
            Score = !src.WalkOver && src.HomeScore.HasValue && src.AwayScore.HasValue
                ? new MatchScore(src.HomeScore.Value, src.AwayScore.Value) : null,
            Players = src.Players.Select(ToMatchPlayer).ToList(),
            Games = src.Games.Select(ToMatchGame).ToList(),
        };

        SetMatchPlayerAliases(match.Players);
        SetIndividualMatchesOutcome(match.Games, null);
        return match;
    }

    public static IList<OtherMatch> ToOtherMatches(IList<MatchEntity> src) => src.Select(ToOtherMatch).ToList();

    // === Match sub-type mappings ===

    public static MatchPlayer ToMatchPlayer(MatchPlayerEntity src)
    {
        return new MatchPlayer
        {
            Id = src.Id,
            MatchId = src.MatchId,
            Status = src.Status,
            StatusNote = src.StatusNote,
            Position = src.Position,
            Name = src.Name,
            Ranking = src.Ranking,
            UniqueIndex = src.UniqueIndex,
            Won = src.Won ?? 0,
            Home = src.Home,
            PlayerId = src.PlayerId,
        };
    }

    public static MatchPlayerEntity ToMatchPlayerEntity(MatchPlayer src)
    {
        return new MatchPlayerEntity
        {
            Id = src.Id,
            MatchId = src.MatchId,
            Status = src.Status,
            StatusNote = src.StatusNote,
            Position = src.Position,
            Name = src.Name ?? "",
            Ranking = src.Ranking ?? "",
            UniqueIndex = src.UniqueIndex,
            Won = src.Won,
            Home = src.Home,
            PlayerId = src.PlayerId,
        };
    }

    public static MatchComment ToMatchComment(MatchCommentEntity src)
    {
        return new MatchComment
        {
            Id = src.Id,
            MatchId = src.MatchId,
            Text = src.Text,
            PlayerId = src.PlayerId,
            PostedOn = src.PostedOn,
            Hidden = src.Hidden,
            ImageUrl = src.ImageUrl,
        };
    }

    public static MatchCommentEntity ToMatchCommentEntity(MatchComment src)
    {
        return new MatchCommentEntity
        {
            Id = src.Id,
            MatchId = src.MatchId,
            Text = src.Text,
            PlayerId = src.PlayerId,
            PostedOn = src.PostedOn ?? DateTime.MinValue,
            Hidden = src.Hidden,
            ImageUrl = src.ImageUrl,
        };
    }

    public static MatchGame ToMatchGame(MatchGameEntity src)
    {
        return new MatchGame
        {
            Id = src.Id,
            MatchId = src.MatchId,
            MatchNumber = src.MatchNumber,
            HomePlayerUniqueIndex = src.HomePlayerUniqueIndex2 == 0 ? src.HomePlayerUniqueIndex : 0,
            OutPlayerUniqueIndex = src.AwayPlayerUniqueIndex2 == 0 ? src.AwayPlayerUniqueIndex : 0,
            HomePlayerSets = src.HomePlayerSets,
            OutPlayerSets = src.AwayPlayerSets,
            Outcome = src.WalkOver == WalkOver.None ? MatchOutcome.NotYetPlayed : MatchOutcome.WalkOver,
            Scores = src.Scores,
        };
    }

    // === Match helper methods ===

    private static void SetIndividualMatchesOutcome(IEnumerable<MatchGame> games, bool? isHomeMatch)
    {
        foreach (var game in games.Where(g => g.Outcome != MatchOutcome.WalkOver))
        {
            game.Outcome = game.HomePlayerSets > game.OutPlayerSets ? MatchOutcome.Won : MatchOutcome.Lost;
            if (isHomeMatch.HasValue && !isHomeMatch.Value)
            {
                game.Outcome = game.Outcome == MatchOutcome.Won ? MatchOutcome.Lost : MatchOutcome.Won;
            }
        }
    }

    private static string GetFirstName(string? fullName)
    {
        if (string.IsNullOrEmpty(fullName) || fullName.IndexOf(" ", StringComparison.InvariantCulture) == -1)
        {
            return fullName ?? "";
        }
        return fullName.Substring(0, fullName.IndexOf(" ", StringComparison.InvariantCulture));
    }

    private static void SetMatchPlayerAliases(ICollection<MatchPlayer> players)
    {
        foreach (var ply in players)
        {
            ply.Alias = GetFirstName(ply.Name);
        }

        foreach (var ply in players)
        {
            var otherPlayers = players.Where(otherPly => ply.Position != otherPly.Position);
            if (otherPlayers.Any(otherPly => GetFirstName(otherPly.Alias) == ply.Alias))
            {
                if (ply.Name != null && ply.Name.IndexOf(" ", StringComparison.InvariantCulture) != -1)
                {
                    ply.Alias += ply.Name.Substring(ply.Name.IndexOf(" ", StringComparison.InvariantCulture));
                }
            }
        }
    }

    private static bool IsOwnClubPlayer(bool isHomeMatch, bool isHomePlayer)
    {
        return (isHomeMatch && isHomePlayer) || (!isHomeMatch && !isHomePlayer);
    }

    private static void ChangeMeaningOfHomePlayer(Match match)
    {
        if (match.IsHomeMatch.HasValue)
        {
            foreach (var ply in match.Players)
            {
                ply.Home = IsOwnClubPlayer(match.IsHomeMatch.Value, ply.Home);
            }
        }
    }

    private static MatchOutcome GetScoreType(MatchEntity match)
    {
        var now = DateTime.Now;
        var yesterday = now.Subtract(TimeSpan.FromDays(1));
        if ((match.Date.Date == now.Date && now.Hour >= match.Date.Hour - 10) || (match.Date.Date == yesterday.Date && now.Hour < match.Date.Hour - 10))
        {
            return MatchOutcome.BeingPlayed;
        }
        if (match.Date.Date >= DateTime.Now.Date)
        {
            return MatchOutcome.NotYetPlayed;
        }

        if (match.WalkOver)
        {
            return MatchOutcome.WalkOver;
        }
        if (!match.HomeScore.HasValue || !match.AwayScore.HasValue)
        {
            return MatchOutcome.NotYetPlayed;
        }
        if (match.HomeScore.Value == match.AwayScore.Value)
        {
            return MatchOutcome.Draw;
        }

        if (match.IsHomeMatch.HasValue && match.IsHomeMatch.Value)
        {
            return match.HomeScore.Value < match.AwayScore.Value ? MatchOutcome.Lost : MatchOutcome.Won;
        }
        else
        {
            return match.HomeScore.Value < match.AwayScore.Value ? MatchOutcome.Won : MatchOutcome.Lost;
        }
    }
}
