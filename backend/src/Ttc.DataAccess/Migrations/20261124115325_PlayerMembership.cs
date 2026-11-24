using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ttc.DataAccess.Migrations;

/// <inheritdoc />
public partial class PlayerMembership : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PlayerMembership",
            columns: table => new
            {
                PlayerId = table.Column<int>(type: "int", nullable: false),
                Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false),
                BirthDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                Gender = table.Column<string>(type: "varchar(1)", maxLength: 1, nullable: true),
                Nationality = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true),
                ResidentInBelgiumSince = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true),
                Street = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true),
                HouseNumber = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: true),
                Bus = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: true),
                PostalCode = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: true),
                Town = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true),
                Phone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true),
                GSporter = table.Column<bool>(type: "tinyint(1)", nullable: false),
                ParentEmail1 = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true),
                ParentEmail2 = table.Column<string>(type: "varchar(250)", maxLength: 250, nullable: true),
                OtherFederationRanking = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true),
                OtherFederation = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true),
                LastVttlSeason = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true),
                CreatedOn = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                CreatedBy = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                ModifiedOn = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                ModifiedBy = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PlayerMembership", x => x.PlayerId);
                table.ForeignKey(
                    name: "FK_PlayerMembership_Player_PlayerId",
                    column: x => x.PlayerId,
                    principalTable: "Player",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            })
            .Annotation("MySQL:Charset", "utf8mb4");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "PlayerMembership");
    }
}
