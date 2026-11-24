using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Ttc.DataAccess.Migrations;

/// <inheritdoc />
public partial class ClubTournaments : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "ClubTournament",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                Slug = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                Name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false),
                EventType = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false),
                Type = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                Date = table.Column<DateTime>(type: "date", nullable: false),
                Winner = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                Url = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false),
                Payload = table.Column<string>(type: "LONGTEXT", nullable: false),
                ReceivedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_ClubTournament", x => x.Id);
            })
            .Annotation("MySQL:Charset", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_ClubTournament_Slug",
            table: "ClubTournament",
            column: "Slug",
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "ClubTournament");
    }
}
