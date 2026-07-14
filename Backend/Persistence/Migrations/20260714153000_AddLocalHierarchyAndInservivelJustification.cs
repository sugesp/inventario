using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Persistence.Context;

#nullable disable

namespace Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260714153000_AddLocalHierarchyAndInservivelJustification")]
    public partial class AddLocalHierarchyAndInservivelJustification : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LocalSuperiorId",
                table: "Locais",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "JustificativaInservivel",
                table: "ItensInventariados",
                type: "varchar(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Locais_LocalSuperiorId",
                table: "Locais",
                column: "LocalSuperiorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Locais_Locais_LocalSuperiorId",
                table: "Locais",
                column: "LocalSuperiorId",
                principalTable: "Locais",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Locais_Locais_LocalSuperiorId",
                table: "Locais");

            migrationBuilder.DropIndex(
                name: "IX_Locais_LocalSuperiorId",
                table: "Locais");

            migrationBuilder.DropColumn(
                name: "LocalSuperiorId",
                table: "Locais");

            migrationBuilder.DropColumn(
                name: "JustificativaInservivel",
                table: "ItensInventariados");
        }
    }
}
