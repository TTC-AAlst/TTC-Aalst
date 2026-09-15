using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Ttc.Model.Players;

namespace Ttc.DataEntities;

/// <summary>
/// A division's standings as they were after a given week.
/// Frenoy serves these per week, so past weeks are re-fetchable and this table
/// can always be rebuilt from scratch.
/// </summary>
[Table("DivisionRankingWeek")]
[Index(nameof(Year), nameof(Competition), nameof(FrenoyDivisionId), nameof(Week))]
public class DivisionRankingWeekEntity
{
    [Key]
    public int Id { get; set; }

    public int Year { get; set; }
    public Competition Competition { get; set; }
    public int FrenoyDivisionId { get; set; }
    public int Week { get; set; }

    public int Position { get; set; }
    public int Points { get; set; }
    public int GamesPlayed { get; set; }
    public int GamesWon { get; set; }
    public int GamesLost { get; set; }
    public int GamesDraw { get; set; }

    public int ClubId { get; set; }

    [StringLength(10)]
    public string TeamCode { get; set; } = "";

    [StringLength(100)]
    public string TeamName { get; set; } = "";
}
