using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddComissoesModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ComissaoId",
                table: "ItensInventariados",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "Comissoes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Ano = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PresidenteId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comissoes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comissoes_Usuarios_PresidenteId",
                        column: x => x.PresidenteId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ComissoesMembros",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ComissaoId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UsuarioId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComissoesMembros", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComissoesMembros_Comissoes_ComissaoId",
                        column: x => x.ComissaoId,
                        principalTable: "Comissoes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ComissoesMembros_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariados_ComissaoId",
                table: "ItensInventariados",
                column: "ComissaoId");

            migrationBuilder.CreateIndex(
                name: "IX_Comissoes_Ano",
                table: "Comissoes",
                column: "Ano",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comissoes_PresidenteId",
                table: "Comissoes",
                column: "PresidenteId");

            migrationBuilder.CreateIndex(
                name: "IX_ComissoesMembros_ComissaoId_UsuarioId",
                table: "ComissoesMembros",
                columns: new[] { "ComissaoId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ComissoesMembros_UsuarioId",
                table: "ComissoesMembros",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_ItensInventariados_Comissoes_ComissaoId",
                table: "ItensInventariados",
                column: "ComissaoId",
                principalTable: "Comissoes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ItensInventariados_Comissoes_ComissaoId",
                table: "ItensInventariados");

            migrationBuilder.DropTable(
                name: "ComissoesMembros");

            migrationBuilder.DropTable(
                name: "Comissoes");

            migrationBuilder.DropIndex(
                name: "IX_ItensInventariados_ComissaoId",
                table: "ItensInventariados");

            migrationBuilder.DropColumn(
                name: "ComissaoId",
                table: "ItensInventariados");
        }
    }
}
