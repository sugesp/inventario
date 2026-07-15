using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Persistence.Context;

#nullable disable

namespace Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260715170000_MoveSituacaoToTransferencias")]
    public partial class MoveSituacaoToTransferencias : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Situacao",
                table: "Transferencias",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "CEDIDO")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(
                """
                UPDATE Transferencias transferencia
                LEFT JOIN (
                    SELECT
                        TransferenciaId,
                        SUM(CASE WHEN UPPER(TRIM(StatusItem)) = 'DEVOLVIDO' THEN 1 ELSE 0 END) AS Devolvidos,
                        SUM(CASE WHEN UPPER(TRIM(StatusItem)) = 'CEDIDO' THEN 1 ELSE 0 END) AS Cedidos
                    FROM TransferenciasItens
                    WHERE DeletedAt IS NULL
                    GROUP BY TransferenciaId
                ) contagem ON contagem.TransferenciaId = transferencia.Id
                SET transferencia.Situacao = CASE
                    WHEN COALESCE(contagem.Devolvidos, 0) > COALESCE(contagem.Cedidos, 0) THEN 'DEVOLVIDO'
                    ELSE 'CEDIDO'
                END
                """
            );

            migrationBuilder.DropColumn(
                name: "StatusItem",
                table: "TransferenciasItens");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StatusItem",
                table: "TransferenciasItens",
                type: "varchar(80)",
                maxLength: 80,
                nullable: false,
                defaultValue: "CEDIDO")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(
                """
                UPDATE TransferenciasItens item
                INNER JOIN Transferencias transferencia ON transferencia.Id = item.TransferenciaId
                SET item.StatusItem = transferencia.Situacao
                """
            );

            migrationBuilder.DropColumn(
                name: "Situacao",
                table: "Transferencias");
        }
    }
}
