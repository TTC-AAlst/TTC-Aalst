using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Ttc.DataAccess.Migrations;

/// <inheritdoc />
public partial class Toog : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Toog",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                Date = table.Column<DateTime>(type: "date", nullable: false),
                PlayerId = table.Column<int>(type: "int", nullable: false),
                Assigned = table.Column<bool>(type: "tinyint(1)", nullable: false),
                Volunteered = table.Column<bool>(type: "tinyint(1)", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Toog", x => x.Id);
                table.ForeignKey(
                    name: "FK_Toog_Player_PlayerId",
                    column: x => x.PlayerId,
                    principalTable: "Player",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySQL:Charset", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_Toog_Date_PlayerId",
            table: "Toog",
            columns: new[] { "Date", "PlayerId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Toog_PlayerId",
            table: "Toog",
            column: "PlayerId");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "Toog");
    }
}
