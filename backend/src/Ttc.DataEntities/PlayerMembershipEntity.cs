using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Ttc.DataEntities.Core;
using Ttc.Model.Players;

namespace Ttc.DataEntities;

/// <summary>
/// Persoonsgegevens voor de VTTL aansluitingsformulieren.
/// Apart van <see cref="PlayerEntity"/> zodat deze nooit mee
/// naar de spelerslijst gaan.
/// </summary>
[Table("PlayerMembership")]
public class PlayerMembershipEntity : IAudit
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.None)]
    public int PlayerId { get; set; }
    [ForeignKey(nameof(PlayerId))]
    public PlayerEntity? Player { get; set; }

    /// <summary>
    /// Aangesloten bij VTTL en/of Sporta. Geen van beide: recreant, enkel lid van de club.
    /// </summary>
    public bool Vttl { get; set; }
    public bool Sporta { get; set; }
    public MembershipStatus Status { get; set; }
    public DateTime? BirthDate { get; set; }
    [StringLength(1)]
    public string? Gender { get; set; }
    [StringLength(50)]
    public string? Nationality { get; set; }
    [StringLength(50)]
    public string? ResidentInBelgiumSince { get; set; }

    [StringLength(150)]
    public string? Street { get; set; }
    [StringLength(10)]
    public string? HouseNumber { get; set; }
    [StringLength(10)]
    public string? Bus { get; set; }
    [StringLength(10)]
    public string? PostalCode { get; set; }
    [StringLength(100)]
    public string? Town { get; set; }
    [StringLength(20)]
    public string? Phone { get; set; }

    public bool GSporter { get; set; }
    [StringLength(250)]
    public string? ParentEmail1 { get; set; }
    [StringLength(250)]
    public string? ParentEmail2 { get; set; }

    [StringLength(20)]
    public string? OtherFederationRanking { get; set; }
    [StringLength(50)]
    public string? OtherFederation { get; set; }
    [StringLength(20)]
    public string? LastVttlSeason { get; set; }

    public Audit Audit { get; } = new();

    public override string ToString() => $"PlayerId={PlayerId}, Status={Status}";
}
