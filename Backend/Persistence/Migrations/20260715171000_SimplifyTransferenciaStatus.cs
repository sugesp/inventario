using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Persistence.Context;

#nullable disable

namespace Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260715171000_SimplifyTransferenciaStatus")]
    public partial class SimplifyTransferenciaStatus : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE Transferencias
                SET Status = 'PENDENTE'
                WHERE UPPER(Status) IN (
                    'RASCUNHO',
                    'EM SEPARACAO',
                    'AGUARDANDO CONCLUSAO',
                    'AGUARDANDO CONCLUSÃO',
                    'AGUARDANDO ASSINATURA'
                )
                """
            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE Transferencias
                SET Status = 'RASCUNHO'
                WHERE UPPER(Status) = 'PENDENTE'
                """
            );
        }
    }
}
