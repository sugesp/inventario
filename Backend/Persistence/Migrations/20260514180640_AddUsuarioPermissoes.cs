using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioPermissoes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PermissoesJson",
                table: "Usuarios",
                type: "longtext",
                nullable: false,
                defaultValue: "[]")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(
                """
                UPDATE Usuarios
                SET PermissoesJson = CASE
                    WHEN Perfil = 'Administrador' THEN '[""Administrador""]'
                    WHEN Perfil = 'Inventario' THEN '[""Inventario""]'
                    WHEN Perfil = 'Financeiro' THEN '[""GTI.Gestor""]'
                    WHEN Perfil = 'Controle Interno' THEN '[""GTI.Gestor""]'
                    ELSE '[]'
                END;
                """
            );

            migrationBuilder.DropColumn(
                name: "Perfil",
                table: "Usuarios");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Perfil",
                table: "Usuarios",
                type: "varchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Operador")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.Sql(
                """
                UPDATE Usuarios
                SET Perfil = CASE
                    WHEN PermissoesJson LIKE '%Administrador%' THEN 'Administrador'
                    WHEN PermissoesJson LIKE '%Inventario%' THEN 'Inventario'
                    WHEN PermissoesJson LIKE '%GTI.Gestor%' THEN 'Financeiro'
                    ELSE 'Operador'
                END;
                """
            );

            migrationBuilder.DropColumn(
                name: "PermissoesJson",
                table: "Usuarios");
        }
    }
}
