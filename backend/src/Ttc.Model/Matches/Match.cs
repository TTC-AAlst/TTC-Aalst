using Ttc.Model.Core;
using Ttc.Model.Teams;

namespace Ttc.Model.Matches;

/// <summary>
/// Non-TTC Aalst match
/// </summary>
public class OtherMatch : ITtcConfidential
{
    #region Properties
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public bool ShouldBePlayed { get; set; }
    public string? FrenoyMatchId { get; set; }
    public bool IsSyncedWithFrenoy { get; set; }
    public int Week { get; set; }
    public string? Competition { get; set; }
    public int FrenoyDivisionId { get; set; }

    public OpposingTeam? Home { get; set; }
    public OpposingTeam? Away { get; set; }

    public MatchScore? Score { get; set; }
    public MatchOutcome ScoreType { get; set; }
    public bool IsPlayed { get; set; }
    public ICollection<MatchPlayer> Players { get; set; } = [];
    public ICollection<MatchGame> Games { get; set; } = [];
    #endregion

    public void Hide()
    {
        // Duplicated below
        // ATTN: I'd expect this to be filled in only after the Frenoy sync?
        if (!(IsPlayed || IsSyncedWithFrenoy || Helpers.HasMatchStarted(Date)))
        {
            Players = [];
        }
    }

    // Matches aren't cached, so no need to deep-clone
    public ITtcConfidential Clone() => this;

    public override string ToString() => $"Id: {Id}, Date: {Date}, FrenoyMatchId: {FrenoyMatchId}, IsSyncedWithFrenoy: {IsSyncedWithFrenoy}, Home: {Home}, Away: {Away}, Score: {Score}";
}

public class Match : ITtcConfidential
{
    #region Kalender Properties
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public bool ShouldBePlayed { get; set; }
    public string? FrenoyMatchId { get; set; }
    public bool IsSyncedWithFrenoy { get; set; }
    public int Week { get; set; }
    public string? Competition { get; set; }
    public int FrenoyDivisionId { get; set; }
    public string? Block { get; set; }

    public int TeamId { get; set; }
    /// <summary>
    /// The other TTC Aalst team in a derby: two of our teams sharing a division.
    /// Null for every other match.
    /// </summary>
    public int? OpponentTeamId { get; set; }
    /// <summary>
    /// Null when TTC Aalst did not play (~ ReadonlyMatch)
    /// True/False: Was TTC Aalst, True=Was in Aalst
    /// </summary>
    public bool? IsHomeMatch { get; set; }
    public OpposingTeam? Opponent { get; set; }
    #endregion

    #region Verslag Properties
    public int ReportPlayerId { get; set; }
    public MatchScore? Score { get; set; }
    public MatchOutcome ScoreType { get; set; }
    public string? Description { get; set; }
    public bool IsPlayed { get; set; }

    public ICollection<MatchPlayer> Players { get; set; }
    public string? FormationComment { get; set; }
    public ICollection<MatchGame> Games { get; set; }
    public ICollection<MatchComment> Comments { get; set; }
    #endregion

    #region Constructors
    public Match()
    {
        Players = new List<MatchPlayer>();
        Games = new List<MatchGame>();
        Comments = new List<MatchComment>();
        ScoreType = MatchOutcome.NotYetPlayed;
        Score = new MatchScore();
    }

    public Match(int playerId) : this()
    {
        ReportPlayerId = playerId;
    }
    #endregion

    public void Hide()
    {
        FormationComment = "";

        // Duplicated above
        if (!(IsPlayed || IsSyncedWithFrenoy || Helpers.HasMatchStarted(Date)))
        {
            Players = [];
            Block = "";
        }

        var toRemove = Comments.Where(c => c.Hidden).ToArray();
        foreach (var rm in toRemove)
        {
            Comments.Remove(rm);
        }
    }

    // Matches aren't cached, so no need to deep-clone
    public ITtcConfidential Clone() => this;

    public override string ToString() => $"Id={Id} on {Date:g}, Home={IsHomeMatch}, TeamId={TeamId}, Opponent=({Opponent})";
}
