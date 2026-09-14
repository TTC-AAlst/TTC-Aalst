using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Ttc.DataEntities;

[Table("Toog")]
[Index(nameof(Date), nameof(PlayerId), IsUnique = true)]
public class ToogEntity
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// Clubthuisdag, altijd om middernacht: een toogbeurt geldt voor de hele dag,
    /// ook als er die avond meerdere ploegen thuis spelen.
    /// </summary>
    [Column(TypeName = "date")]
    public DateTime Date { get; set; }

    [ForeignKey("PlayerId")]
    public PlayerEntity? Player { get; set; }
    public int PlayerId { get; set; }

    public bool Assigned { get; set; }

    /// <summary>
    /// False wanneer het bestuur deze rij aanmaakte voor iemand die zich niet opgaf:
    /// zo'n rij verdwijnt weer zodra de aanduiding naar iemand anders gaat, terwijl de rij van
    /// een vrijwilliger blijft staan.
    /// </summary>
    public bool Volunteered { get; set; }

    public override string ToString() => $"Date={Date:d}, PlayerId={PlayerId}, Assigned={Assigned}";
}
