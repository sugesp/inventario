using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    [Migration("20260603120000_AddGeolocalizacaoItensInventariados")]
    public partial class AddGeolocalizacaoItensInventariados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "ItensInventariados",
                type: "decimal(10,8)",
                precision: 10,
                scale: 8,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "ItensInventariados",
                type: "decimal(11,8)",
                precision: 11,
                scale: 8,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PrecisaoLocalizacao",
                table: "ItensInventariados",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "PrecisaoLocalizacao",
                table: "ItensInventariados");
        }
    }
}
