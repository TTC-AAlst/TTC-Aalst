namespace Ttc.Model.Teams;

public class DivisionRankingWeek
{
    public int Week { get; set; }
    public DateTime WeekDate { get; set; }
    public int Position { get; set; }
    public int Points { get; set; }
    public int GamesPlayed { get; set; }
    public int ClubId { get; set; }
    public string TeamCode { get; set; } = "";
    public string TeamName { get; set; } = "";
}
