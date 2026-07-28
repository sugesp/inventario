using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddItemInventoryRemovalAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ExcluidoPorUsuarioId",
                table: "ItensInventariados",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "MotivoExclusao",
                table: "ItensInventariados",
                type: "varchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "MotivoUltimaReversaoEEstado",
                table: "ItensInventariados",
                type: "varchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "RevertidoEEstadoEm",
                table: "ItensInventariados",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RevertidoEEstadoPorUsuarioId",
                table: "ItensInventariados",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariados_ExcluidoPorUsuarioId",
                table: "ItensInventariados",
                column: "ExcluidoPorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariados_RevertidoEEstadoPorUsuarioId",
                table: "ItensInventariados",
                column: "RevertidoEEstadoPorUsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_ItensInventariados_Usuarios_ExcluidoPorUsuarioId",
                table: "ItensInventariados",
                column: "ExcluidoPorUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ItensInventariados_Usuarios_RevertidoEEstadoPorUsuarioId",
                table: "ItensInventariados",
                column: "RevertidoEEstadoPorUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItensInventariados_Usuarios_ExcluidoPorUsuarioId",
                table: "ItensInventariados");

            migrationBuilder.DropForeignKey(
                name: "FK_ItensInventariados_Usuarios_RevertidoEEstadoPorUsuarioId",
                table: "ItensInventariados");

            migrationBuilder.DropIndex(
                name: "IX_ItensInventariados_ExcluidoPorUsuarioId",
                table: "ItensInventariados");

            migrationBuilder.DropIndex(
                name: "IX_ItensInventariados_RevertidoEEstadoPorUsuarioId",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "ExcluidoPorUsuarioId",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "MotivoExclusao",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "MotivoUltimaReversaoEEstado",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "RevertidoEEstadoEm",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "RevertidoEEstadoPorUsuarioId",
                table: "ItensInventariados");
        }
    }
}
