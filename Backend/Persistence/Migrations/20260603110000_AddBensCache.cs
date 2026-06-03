using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Persistence.Context;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260603110000_AddBensCache")]
    public partial class AddBensCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Bens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Tombamento = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TombamentoFormatado = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TombamentoAntigo = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Tipo = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Descricao = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UrlConsulta = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UltimaConsultaEEstadoEm = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bens", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Bens_Tombamento",
                table: "Bens",
                column: "Tombamento",
                unique: true);

            migrationBuilder.Sql(
                """
                INSERT IGNORE INTO Bens
                    (Id, Tombamento, TombamentoFormatado, TombamentoAntigo, Tipo, Descricao, UrlConsulta, UltimaConsultaEEstadoEm, CreatedAt, UpdatedAt, DeletedAt)
                SELECT
                    UUID(),
                    REPLACE(REPLACE(REPLACE(li.Tombamento, '.', ''), '-', ''), ' ', ''),
                    li.Tombamento,
                    COALESCE(li.TombamentoAntigo, ''),
                    COALESCE(NULLIF(li.Tipo, ''), ''),
                    COALESCE(NULLIF(li.Descricao, ''), 'Descrição não informada'),
                    COALESCE(NULLIF(li.UrlConsulta, ''), CONCAT('https://e-estado.ro.gov.br/publico/bens/', REPLACE(REPLACE(REPLACE(li.Tombamento, '.', ''), '-', ''), ' ', ''))),
                    li.CreatedAt,
                    UTC_TIMESTAMP(6),
                    NULL,
                    NULL
                FROM LevantamentosItens li
                WHERE li.DeletedAt IS NULL
                    AND li.Tombamento IS NOT NULL
                    AND li.Tombamento NOT LIKE 'ANTIGO:%'
                    AND REPLACE(REPLACE(REPLACE(li.Tombamento, '.', ''), '-', ''), ' ', '') REGEXP '^[0-9]+$';
                """
            );

            migrationBuilder.Sql(
                """
                INSERT IGNORE INTO Bens
                    (Id, Tombamento, TombamentoFormatado, TombamentoAntigo, Tipo, Descricao, UrlConsulta, UltimaConsultaEEstadoEm, CreatedAt, UpdatedAt, DeletedAt)
                SELECT
                    UUID(),
                    REPLACE(REPLACE(REPLACE(ii.TombamentoNovo, '.', ''), '-', ''), ' ', ''),
                    ii.TombamentoNovo,
                    COALESCE(ii.TombamentoAntigo, ''),
                    '',
                    COALESCE(NULLIF(ii.Descricao, ''), 'Descrição não informada'),
                    CONCAT('https://e-estado.ro.gov.br/publico/bens/', REPLACE(REPLACE(REPLACE(ii.TombamentoNovo, '.', ''), '-', ''), ' ', '')),
                    ii.CreatedAt,
                    UTC_TIMESTAMP(6),
                    NULL,
                    NULL
                FROM ItensInventariados ii
                WHERE ii.DeletedAt IS NULL
                    AND ii.TombamentoNovo IS NOT NULL
                    AND REPLACE(REPLACE(REPLACE(ii.TombamentoNovo, '.', ''), '-', ''), ' ', '') REGEXP '^[0-9]+$';
                """
            );

            migrationBuilder.Sql(
                """
                INSERT IGNORE INTO Bens
                    (Id, Tombamento, TombamentoFormatado, TombamentoAntigo, Tipo, Descricao, UrlConsulta, UltimaConsultaEEstadoEm, CreatedAt, UpdatedAt, DeletedAt)
                SELECT
                    UUID(),
                    REPLACE(REPLACE(REPLACE(ti.TombamentoNovo, '.', ''), '-', ''), ' ', ''),
                    ti.TombamentoNovo,
                    COALESCE(ti.TombamentoAntigo, ''),
                    '',
                    COALESCE(NULLIF(ti.Descricao, ''), 'Descrição não informada'),
                    CONCAT('https://e-estado.ro.gov.br/publico/bens/', REPLACE(REPLACE(REPLACE(ti.TombamentoNovo, '.', ''), '-', ''), ' ', '')),
                    ti.CreatedAt,
                    UTC_TIMESTAMP(6),
                    NULL,
                    NULL
                FROM TransferenciasItens ti
                WHERE ti.DeletedAt IS NULL
                    AND ti.TombamentoNovo IS NOT NULL
                    AND REPLACE(REPLACE(REPLACE(ti.TombamentoNovo, '.', ''), '-', ''), ' ', '') REGEXP '^[0-9]+$';
                """
            );

            migrationBuilder.Sql(
                """
                INSERT IGNORE INTO Bens
                    (Id, Tombamento, TombamentoFormatado, TombamentoAntigo, Tipo, Descricao, UrlConsulta, UltimaConsultaEEstadoEm, CreatedAt, UpdatedAt, DeletedAt)
                SELECT
                    UUID(),
                    REPLACE(REPLACE(REPLACE(lt.Patrimonio, '.', ''), '-', ''), ' ', ''),
                    lt.Patrimonio,
                    '',
                    COALESCE(NULLIF(lt.TipoEquipamento, ''), ''),
                    TRIM(CONCAT_WS(' ', NULLIF(lt.TipoEquipamento, ''), NULLIF(lt.Marca, ''), NULLIF(lt.Modelo, ''))),
                    CONCAT('https://e-estado.ro.gov.br/publico/bens/', REPLACE(REPLACE(REPLACE(lt.Patrimonio, '.', ''), '-', ''), ' ', '')),
                    lt.CreatedAt,
                    UTC_TIMESTAMP(6),
                    NULL,
                    NULL
                FROM LaudosTecnicos lt
                WHERE lt.DeletedAt IS NULL
                    AND lt.Patrimonio IS NOT NULL
                    AND REPLACE(REPLACE(REPLACE(lt.Patrimonio, '.', ''), '-', ''), ' ', '') REGEXP '^[0-9]+$';
                """
            );

            migrationBuilder.Sql(
                """
                UPDATE Bens
                SET Descricao = 'Descrição não informada'
                WHERE Descricao IS NULL OR Descricao = '';
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Bens");
        }
    }
}
