using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLancamentoEEstadoItensInventariados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "LancadoEEstado",
                table: "ItensInventariados",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LancadoEEstadoEm",
                table: "ItensInventariados",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LancadoEEstadoPorUsuarioId",
                table: "ItensInventariados",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariados_LancadoEEstadoPorUsuarioId",
                table: "ItensInventariados",
                column: "LancadoEEstadoPorUsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_ItensInventariados_Usuarios_LancadoEEstadoPorUsuarioId",
                table: "ItensInventariados",
                column: "LancadoEEstadoPorUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItensInventariados_Usuarios_LancadoEEstadoPorUsuarioId",
                table: "ItensInventariados");

            migrationBuilder.DropIndex(
                name: "IX_ItensInventariados_LancadoEEstadoPorUsuarioId",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "LancadoEEstado",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "LancadoEEstadoEm",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "LancadoEEstadoPorUsuarioId",
                table: "ItensInventariados");
        }
    }
}
