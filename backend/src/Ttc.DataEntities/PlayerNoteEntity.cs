using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Ttc.DataEntities.Core;
using Ttc.Model.Players;

namespace Ttc.DataEntities;

/// <summary>
/// Persoonlijke notitie van één van onze spelers over een tegenstander.
/// Enkel de auteur ziet zijn eigen notities.
/// </summary>
[Table("PlayerNote")]
[Index(nameof(PlayerId), nameof(Competition), nameof(OpponentUniqueIndex), IsUnique = true)]
public class PlayerNoteEntity : IAudit
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// De eigenaar van de notitie: onze speler die de notitie schreef.
    /// </summary>
    [ForeignKey("PlayerId")]
    public PlayerEntity? Player { get; set; }
    public int PlayerId { get; set; }

    public Competition Competition { get; set; }

    /// <summary>
    /// ComputerNummer (VTTL) of LidNummer (Sporta) van de tegenstander.
    /// </summary>
    public int OpponentUniqueIndex { get; set; }

    /// <summary>
    /// Naam van de tegenstander op het moment van schrijven: enkel om de notitie
    /// leesbaar te houden buiten de context van een wedstrijd.
    /// </summary>
    [MaxLength(50)]
    public string OpponentName { get; set; } = "";

    [Column(TypeName = "TEXT")]
    [StringLength(65000)]
    public string Note { get; set; } = "";

    public Audit Audit { get; } = new();

    public override string ToString() => $"PlayerId={PlayerId}, {Competition} Opponent={OpponentUniqueIndex} ({OpponentName})";
}
