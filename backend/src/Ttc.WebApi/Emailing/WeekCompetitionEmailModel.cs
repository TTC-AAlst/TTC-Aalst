namespace Ttc.WebApi.Emailing;

public class WeekCompetitionEmailModel
{
    /// <summary>
    /// If true send the email to just the current user
    /// </summary>
    public bool JustMe { get; set; }
    public string Title { get; set; } = "";
    public string Email { get; set; } = "";
    /// <summary>
    /// PlayerId to Team dictionary
    /// </summary>
    public Dictionary<int, string> Players { get; set; } = [];
    /// <summary>
    /// PlayerId to the day(s) they are at the toog
    /// </summary>
    public Dictionary<int, string> Toog { get; set; } = [];

    public override string ToString() => $"{Title}: {Email}";
}
