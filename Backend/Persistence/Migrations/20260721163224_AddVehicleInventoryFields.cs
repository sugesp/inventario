using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleInventoryFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Chassi",
                table: "ItensInventariados",
                type: "varchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsVeiculo",
                table: "ItensInventariados",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Marca",
                table: "ItensInventariados",
                type: "varchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Modelo",
                table: "ItensInventariados",
                type: "varchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "Odometro",
                table: "ItensInventariados",
                type: "decimal(12,1)",
                precision: 12,
                scale: 1,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Placa",
                table: "ItensInventariados",
                type: "varchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "PlacaSeguranca",
                table: "ItensInventariados",
                type: "varchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Chassi",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "IsVeiculo",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "Marca",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "Modelo",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "Odometro",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "Placa",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "PlacaSeguranca",
                table: "ItensInventariados");
        }
    }
}
