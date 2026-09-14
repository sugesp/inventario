using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Persistence.Context;

namespace Persistence.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260914120000_AddLaudosComissao")]
public class AddLaudosComissao : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "PodeEmitirLaudo", table: "ComissoesMembros",
            type: "tinyint(1)", nullable: false, defaultValue: false);

        migrationBuilder.AddColumn<Guid>(
            name: "ComissaoId", table: "LaudosTecnicos",
            type: "char(36)", nullable: true, collation: "ascii_general_ci");

        migrationBuilder.CreateIndex(
            name: "IX_LaudosTecnicos_ComissaoId", table: "LaudosTecnicos", column: "ComissaoId");

        migrationBuilder.AddForeignKey(
            name: "FK_LaudosTecnicos_Comissoes_ComissaoId", table: "LaudosTecnicos",
            column: "ComissaoId", principalTable: "Comissoes", principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        throw new NotSupportedException("O vínculo permanente dos laudos com as comissões não pode ser removido.");
    }
}
