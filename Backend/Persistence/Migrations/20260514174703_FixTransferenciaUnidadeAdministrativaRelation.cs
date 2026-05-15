using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FixTransferenciaUnidadeAdministrativaRelation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transferencias_Locais_LocalId",
                table: "Transferencias");

            migrationBuilder.DropIndex(
                name: "IX_Transferencias_LocalId",
                table: "Transferencias");

            migrationBuilder.DropColumn(
                name: "LocalId",
                table: "Transferencias");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LocalId",
                table: "Transferencias",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_Transferencias_LocalId",
                table: "Transferencias",
                column: "LocalId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transferencias_Locais_LocalId",
                table: "Transferencias",
                column: "LocalId",
                principalTable: "Locais",
                principalColumn: "Id");
        }
    }
}
