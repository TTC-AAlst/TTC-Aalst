using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Ttc.DataEntities;

/// <summary>
/// Een clubtornooi (clubkampioenschap, dubbeltornooi, ...) gespeeld met Tournooike
/// en doorgestuurd vanuit tournooike.ttc-aalst.be.
/// </summary>
[Table("ClubTournament")]
[Index(nameof(Slug), IsUnique = true)]
public class ClubTournamentEntity
{
    [Key]
    public int Id { get; set; }

    [StringLength(100)]
    public string Slug { get; set; } = "";

    [StringLength(255)]
    public string Name { get; set; } = "";

    [StringLength(100)]
    public string EventType { get; set; } = "";

    [StringLength(20)]
    public string Type { get; set; } = "";

    [Column(TypeName = "date")]
    public DateTime Date { get; set; }

    [StringLength(255)]
    public string? Winner { get; set; }

    [StringLength(500)]
    public string Url { get; set; } = "";

    /// <summary>De volledige payload van Tournooike: fasen, uitslagen, eindstand en opvallende overwinningen.</summary>
    [Column(TypeName = "LONGTEXT")]
    public string Payload { get; set; } = "";

    public DateTime ReceivedAt { get; set; }

    public override string ToString() => $"{Name} ({Slug}) on {Date:d}";
}
