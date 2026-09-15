namespace Ttc.Model.Teams;

public class TeamPositionWeek
{
    public int TeamId { get; set; }
    public int Week { get; set; }
    public DateTime WeekDate { get; set; }
    public int Position { get; set; }
    public int TeamsInDivision { get; set; }
    public int GamesWon { get; set; }
    public int GamesLost { get; set; }
    public int GamesDraw { get; set; }
}
