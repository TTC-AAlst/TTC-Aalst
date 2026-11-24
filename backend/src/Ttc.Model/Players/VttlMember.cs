namespace Ttc.Model.Players;

/// <summary>
/// Resultaat van een zoekopdracht op naam in de VTTL ledenlijst
/// </summary>
/// <param name="Season">Frenoy seizoen, bv 27 voor 2026-2027</param>
public record VttlMember(
    int UniqueIndex,
    string FirstName,
    string LastName,
    string Ranking,
    string Club,
    string? Gender,
    DateTime? BirthDate,
    int Season);
