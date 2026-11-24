namespace Ttc.Model.Players;

/// <summary>
/// Persoonsgegevens voor de VTTL aansluitingsformulieren.
/// Enkel zichtbaar voor het bestuur.
/// </summary>
public class PlayerMembership
{
    public int PlayerId { get; set; }
    /// <summary>
    /// Aangesloten bij VTTL en/of Sporta. Geen van beide: recreant, enkel lid van de club.
    /// </summary>
    public bool Vttl { get; set; }
    public bool Sporta { get; set; }
    /// <summary>
    /// VTTL statuut
    /// </summary>
    public MembershipStatus Status { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }
    public string? Nationality { get; set; }
    public string? ResidentInBelgiumSince { get; set; }
    public string? Street { get; set; }
    public string? HouseNumber { get; set; }
    public string? Bus { get; set; }
    public string? PostalCode { get; set; }
    public string? Town { get; set; }
    public string? Phone { get; set; }
    public bool GSporter { get; set; }
    public string? ParentEmail1 { get; set; }
    public string? ParentEmail2 { get; set; }
    public string? OtherFederationRanking { get; set; }
    public string? OtherFederation { get; set; }
    public string? LastVttlSeason { get; set; }

    public override string ToString() => $"PlayerId={PlayerId}, Status={Status}";
}
