using System.Text.Json;

namespace Ttc.Model.ClubTournaments;

/// <summary>Een clubtornooi zoals doorgestuurd door Tournooike.</summary>
public class ClubTournament
{
    public int Id { get; set; }
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string EventType { get; set; } = "";
    public string Type { get; set; } = "";
    public DateTime Date { get; set; }
    public string? Winner { get; set; }
    public string Url { get; set; } = "";
    public DateTime ReceivedAt { get; set; }

    /// <summary>De ruwe Tournooike-payload (versie 1).</summary>
    public JsonElement Results { get; set; }
}
