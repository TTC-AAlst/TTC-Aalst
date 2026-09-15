using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Ttc.DataAccess.Migrations;

/// <inheritdoc />
public partial class DivisionRankingWeek : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "DivisionRankingWeek",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                Year = table.Column<int>(type: "int", nullable: false),
                Competition = table.Column<int>(type: "int", nullable: false),
                FrenoyDivisionId = table.Column<int>(type: "int", nullable: false),
                Week = table.Column<int>(type: "int", nullable: false),
                Position = table.Column<int>(type: "int", nullable: false),
                Points = table.Column<int>(type: "int", nullable: false),
                GamesPlayed = table.Column<int>(type: "int", nullable: false),
                GamesWon = table.Column<int>(type: "int", nullable: false),
                GamesLost = table.Column<int>(type: "int", nullable: false),
                GamesDraw = table.Column<int>(type: "int", nullable: false),
                ClubId = table.Column<int>(type: "int", nullable: false),
                TeamCode = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false),
                TeamName = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DivisionRankingWeek", x => x.Id);
            })
            .Annotation("MySQL:Charset", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_DivisionRankingWeek_Year_Competition_FrenoyDivisionId_Week",
            table: "DivisionRankingWeek",
            columns: new[] { "Year", "Competition", "FrenoyDivisionId", "Week" });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "DivisionRankingWeek");
    }
}
