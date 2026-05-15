using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveUsuarioEquipeToComissaoMembro : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EquipeId",
                table: "ComissoesMembros",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.Sql(
                """
                UPDATE ComissoesMembros cm
                INNER JOIN Usuarios u ON u.Id = cm.UsuarioId
                INNER JOIN Equipes e ON e.Id = u.EquipeId AND e.ComissaoId = cm.ComissaoId
                SET cm.EquipeId = u.EquipeId
                WHERE u.EquipeId IS NOT NULL;
                """
            );

            migrationBuilder.DropForeignKey(
                name: "FK_Usuarios_Equipes_EquipeId",
                table: "Usuarios");

            migrationBuilder.DropIndex(
                name: "IX_Usuarios_EquipeId",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "EquipeId",
                table: "Usuarios");

            migrationBuilder.CreateIndex(
                name: "IX_ComissoesMembros_EquipeId",
                table: "ComissoesMembros",
                column: "EquipeId");

            migrationBuilder.AddForeignKey(
                name: "FK_ComissoesMembros_Equipes_EquipeId",
                table: "ComissoesMembros",
                column: "EquipeId",
                principalTable: "Equipes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ComissoesMembros_Equipes_EquipeId",
                table: "ComissoesMembros");

            migrationBuilder.DropIndex(
                name: "IX_ComissoesMembros_EquipeId",
                table: "ComissoesMembros");

            migrationBuilder.DropColumn(
                name: "EquipeId",
                table: "ComissoesMembros");

            migrationBuilder.AddColumn<Guid>(
                name: "EquipeId",
                table: "Usuarios",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_EquipeId",
                table: "Usuarios",
                column: "EquipeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Usuarios_Equipes_EquipeId",
                table: "Usuarios",
                column: "EquipeId",
                principalTable: "Equipes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
