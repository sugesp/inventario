using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddItemInventoryLocationMovementHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ItensInventariadosMovimentacoesLocal",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    ItemInventariadoId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LocalOrigemId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    LocalDestinoId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    MovidoPorUsuarioId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Justificativa = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItensInventariadosMovimentacoesLocal", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItensInventariadosMovimentacoesLocal_ItensInventariados_Item~",
                        column: x => x.ItemInventariadoId,
                        principalTable: "ItensInventariados",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItensInventariadosMovimentacoesLocal_Locais_LocalDestinoId",
                        column: x => x.LocalDestinoId,
                        principalTable: "Locais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItensInventariadosMovimentacoesLocal_Locais_LocalOrigemId",
                        column: x => x.LocalOrigemId,
                        principalTable: "Locais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ItensInventariadosMovimentacoesLocal_Usuarios_MovidoPorUsuar~",
                        column: x => x.MovidoPorUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariadosMovimentacoesLocal_ItemInventariadoId",
                table: "ItensInventariadosMovimentacoesLocal",
                column: "ItemInventariadoId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariadosMovimentacoesLocal_LocalDestinoId",
                table: "ItensInventariadosMovimentacoesLocal",
                column: "LocalDestinoId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariadosMovimentacoesLocal_LocalOrigemId",
                table: "ItensInventariadosMovimentacoesLocal",
                column: "LocalOrigemId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensInventariadosMovimentacoesLocal_MovidoPorUsuarioId",
                table: "ItensInventariadosMovimentacoesLocal",
                column: "MovidoPorUsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItensInventariadosMovimentacoesLocal");
        }
    }
}
