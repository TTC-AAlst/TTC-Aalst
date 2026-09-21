namespace Ttc.Model.Players;

/// <summary>
/// Notitie over een tegenstander, van de ingelogde speler.
/// </summary>
public class PlayerNote
{
    public int Id { get; set; }
    public Competition Competition { get; set; }
    public int OpponentUniqueIndex { get; set; }
    public string OpponentName { get; set; } = "";
    public string Note { get; set; } = "";
    public DateTime? ModifiedOn { get; set; }

    public override string ToString() => $"{Competition} Opponent={OpponentUniqueIndex} ({OpponentName})";
}

public class PlayerNoteRequest
{
    public Competition Competition { get; set; }
    public int OpponentUniqueIndex { get; set; }
    public string OpponentName { get; set; } = "";
    public string Note { get; set; } = "";

    public override string ToString() => $"{Competition} Opponent={OpponentUniqueIndex} ({OpponentName})";
}
