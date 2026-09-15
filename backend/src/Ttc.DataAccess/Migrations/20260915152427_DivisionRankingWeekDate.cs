using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ttc.DataAccess.Migrations;

/// <inheritdoc />
public partial class DivisionRankingWeekDate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Stored rows predate the week date and include weeks derived from undated matches.
        // The table is rebuilt from Frenoy on the next sync, so emptying it is cheaper than backfilling.
        migrationBuilder.Sql("DELETE FROM DivisionRankingWeek");

        migrationBuilder.AddColumn<DateTime>(
            name: "WeekDate",
            table: "DivisionRankingWeek",
            type: "datetime(6)",
            nullable: false,
            defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "WeekDate",
            table: "DivisionRankingWeek");
    }
}
