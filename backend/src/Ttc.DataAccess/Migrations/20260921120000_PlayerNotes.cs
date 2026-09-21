using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Ttc.DataAccess.Migrations;

/// <inheritdoc />
public partial class PlayerNotes : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PlayerNote",
            columns: table => new
            {
                Id = table.Column<int>(type: "int", nullable: false)
                    .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn),
                PlayerId = table.Column<int>(type: "int", nullable: false),
                Competition = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                OpponentUniqueIndex = table.Column<int>(type: "int", nullable: false),
                OpponentName = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                Note = table.Column<string>(type: "TEXT", maxLength: 65000, nullable: false),
                CreatedOn = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                CreatedBy = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                ModifiedOn = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                ModifiedBy = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PlayerNote", x => x.Id);
                table.ForeignKey(
                    name: "FK_PlayerNote_Player_PlayerId",
                    column: x => x.PlayerId,
                    principalTable: "Player",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySQL:Charset", "utf8mb4");

        migrationBuilder.CreateIndex(
            name: "IX_PlayerNote_PlayerId_Competition_OpponentUniqueIndex",
            table: "PlayerNote",
            columns: new[] { "PlayerId", "Competition", "OpponentUniqueIndex" },
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "PlayerNote");
    }
}
