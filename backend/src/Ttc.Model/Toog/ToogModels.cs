namespace Ttc.Model.Toog;

/// <summary>Eén clubthuisdag, gezien door de ingelogde speler.</summary>
public class ToogDay
{
    public DateTime Date { get; set; }
    public int[] HomeTeamIds { get; set; } = [];
    public bool Available { get; set; }
    public bool Assigned { get; set; }
}

/// <summary>Eén clubthuisdag, gezien door het bestuur.</summary>
public class ToogAdminDay
{
    public DateTime Date { get; set; }
    public int[] HomeTeamIds { get; set; } = [];
    public int[] AvailablePlayerIds { get; set; } = [];
    public int? AssignedPlayerId { get; set; }
}

/// <summary>Wie er op een clubthuisdag aan de toog staat.</summary>
public class ToogAssignment
{
    public DateTime Date { get; set; }
    public int PlayerId { get; set; }
}

public class ToogAvailabilityRequest
{
    public DateTime Date { get; set; }
    public bool Available { get; set; }
}

public class ToogAssignRequest
{
    public DateTime Date { get; set; }
    public int? PlayerId { get; set; }
}
