using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    [Migration("20260602144806_AddLevantamentosCompartilhamentos")]
    public partial class AddLevantamentosCompartilhamentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LevantamentosCompartilhamentos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LevantamentoId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UsuarioId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CompartilhadoPorUsuarioId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LevantamentosCompartilhamentos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LevantamentosCompartilhamentos_Levantamentos_LevantamentoId",
                        column: x => x.LevantamentoId,
                        principalTable: "Levantamentos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LevantamentosCompartilhamentos_Usuarios_CompartilhadoPorUsuarioId",
                        column: x => x.CompartilhadoPorUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LevantamentosCompartilhamentos_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_LevantamentosCompartilhamentos_CompartilhadoPorUsuarioId",
                table: "LevantamentosCompartilhamentos",
                column: "CompartilhadoPorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_LevantamentosCompartilhamentos_UsuarioId",
                table: "LevantamentosCompartilhamentos",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_LevantamentosCompartilhamentos_LevantamentoId_UsuarioId",
                table: "LevantamentosCompartilhamentos",
                columns: new[] { "LevantamentoId", "UsuarioId" },
                unique: true);

            migrationBuilder.Sql(
                """
                INSERT INTO LevantamentosCompartilhamentos
                    (Id, LevantamentoId, UsuarioId, CompartilhadoPorUsuarioId, CreatedAt, UpdatedAt, DeletedAt)
                SELECT
                    UUID(),
                    ItensConfirmados.LevantamentoId,
                    ItensConfirmados.ConfirmadoPorUsuarioId,
                    Levantamentos.CriadoPorUsuarioId,
                    UTC_TIMESTAMP(6),
                    NULL,
                    NULL
                FROM (
                    SELECT DISTINCT LevantamentoId, ConfirmadoPorUsuarioId
                    FROM LevantamentosItens
                    WHERE DeletedAt IS NULL
                ) AS ItensConfirmados
                INNER JOIN Levantamentos
                    ON Levantamentos.Id = ItensConfirmados.LevantamentoId
                    AND Levantamentos.DeletedAt IS NULL
                WHERE ItensConfirmados.ConfirmadoPorUsuarioId <> Levantamentos.CriadoPorUsuarioId
                    AND NOT EXISTS (
                        SELECT 1
                        FROM LevantamentosCompartilhamentos Compartilhamentos
                        WHERE Compartilhamentos.LevantamentoId = ItensConfirmados.LevantamentoId
                            AND Compartilhamentos.UsuarioId = ItensConfirmados.ConfirmadoPorUsuarioId
                    );
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LevantamentosCompartilhamentos");
        }
    }
}
