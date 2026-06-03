using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Persistence.Context;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260603100000_VinculaLocaisAMembrosComissao")]
    public partial class VinculaLocaisAMembrosComissao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ComissaoId",
                table: "Locais",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.Sql(
                """
                UPDATE Locais l
                INNER JOIN Equipes e ON e.Id = l.EquipeId
                SET l.ComissaoId = e.ComissaoId
                WHERE l.ComissaoId IS NULL
                    AND e.ComissaoId IS NOT NULL;
                """
            );

            migrationBuilder.Sql(
                """
                UPDATE Locais l
                SET l.ComissaoId = (
                    SELECT c.Id
                    FROM Comissoes c
                    WHERE c.DeletedAt IS NULL
                    ORDER BY
                        CASE WHEN c.Status = 'Ativa' THEN 0 ELSE 1 END,
                        c.Ano DESC
                    LIMIT 1
                )
                WHERE l.ComissaoId IS NULL;
                """
            );

            migrationBuilder.AlterColumn<Guid>(
                name: "ComissaoId",
                table: "Locais",
                type: "char(36)",
                nullable: false,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.DropForeignKey(
                name: "FK_Locais_Equipes_EquipeId",
                table: "Locais");

            migrationBuilder.AlterColumn<Guid>(
                name: "EquipeId",
                table: "Locais",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "LocaisMembros",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LocalId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UsuarioId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LocaisMembros", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LocaisMembros_Locais_LocalId",
                        column: x => x.LocalId,
                        principalTable: "Locais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LocaisMembros_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Locais_ComissaoId",
                table: "Locais",
                column: "ComissaoId");

            migrationBuilder.CreateIndex(
                name: "IX_LocaisMembros_UsuarioId",
                table: "LocaisMembros",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_LocaisMembros_LocalId_UsuarioId",
                table: "LocaisMembros",
                columns: new[] { "LocalId", "UsuarioId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Locais_Comissoes_ComissaoId",
                table: "Locais",
                column: "ComissaoId",
                principalTable: "Comissoes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Locais_Equipes_EquipeId",
                table: "Locais",
                column: "EquipeId",
                principalTable: "Equipes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql(
                """
                INSERT INTO LocaisMembros
                    (Id, LocalId, UsuarioId, CreatedAt, UpdatedAt, DeletedAt)
                SELECT
                    UUID(),
                    l.Id,
                    cm.UsuarioId,
                    UTC_TIMESTAMP(6),
                    NULL,
                    NULL
                FROM Locais l
                INNER JOIN ComissoesMembros cm
                    ON cm.ComissaoId = l.ComissaoId
                    AND cm.EquipeId = l.EquipeId
                    AND cm.DeletedAt IS NULL
                WHERE l.DeletedAt IS NULL
                    AND NOT EXISTS (
                        SELECT 1
                        FROM LocaisMembros lm
                        WHERE lm.LocalId = l.Id
                            AND lm.UsuarioId = cm.UsuarioId
                    );
                """
            );

            migrationBuilder.Sql(
                """
                INSERT INTO LocaisMembros
                    (Id, LocalId, UsuarioId, CreatedAt, UpdatedAt, DeletedAt)
                SELECT
                    UUID(),
                    l.Id,
                    cm.UsuarioId,
                    UTC_TIMESTAMP(6),
                    NULL,
                    NULL
                FROM Locais l
                INNER JOIN ComissoesMembros cm
                    ON cm.ComissaoId = l.ComissaoId
                    AND cm.DeletedAt IS NULL
                WHERE l.DeletedAt IS NULL
                    AND NOT EXISTS (
                        SELECT 1
                        FROM LocaisMembros lm
                        WHERE lm.LocalId = l.Id
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM LocaisMembros lm
                        WHERE lm.LocalId = l.Id
                            AND lm.UsuarioId = cm.UsuarioId
                    );
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Locais_Comissoes_ComissaoId",
                table: "Locais");

            migrationBuilder.DropForeignKey(
                name: "FK_Locais_Equipes_EquipeId",
                table: "Locais");

            migrationBuilder.DropTable(
                name: "LocaisMembros");

            migrationBuilder.DropIndex(
                name: "IX_Locais_ComissaoId",
                table: "Locais");

            migrationBuilder.DropColumn(
                name: "ComissaoId",
                table: "Locais");

            migrationBuilder.AlterColumn<Guid>(
                name: "EquipeId",
                table: "Locais",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddForeignKey(
                name: "FK_Locais_Equipes_EquipeId",
                table: "Locais",
                column: "EquipeId",
                principalTable: "Equipes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
