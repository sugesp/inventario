using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddComissoesEUnidadesAdministrativas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                SET @fk_name := (
                    SELECT CONSTRAINT_NAME
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE CONSTRAINT_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND CONSTRAINT_NAME = 'FK_Transferencias_Locais_LocalDestinoId'
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                    LIMIT 1
                );
                SET @drop_fk_sql := IF(
                    @fk_name IS NOT NULL,
                    'ALTER TABLE `Transferencias` DROP FOREIGN KEY `FK_Transferencias_Locais_LocalDestinoId`;',
                    'SELECT 1;'
                );
                PREPARE drop_fk_stmt FROM @drop_fk_sql;
                EXECUTE drop_fk_stmt;
                DEALLOCATE PREPARE drop_fk_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @old_column_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND COLUMN_NAME = 'LocalDestinoId'
                );
                SET @new_column_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND COLUMN_NAME = 'UnidadeAdministrativaDestinoId'
                );
                SET @rename_column_sql := IF(
                    @old_column_exists > 0 AND @new_column_exists = 0,
                    'ALTER TABLE `Transferencias` RENAME COLUMN `LocalDestinoId` TO `UnidadeAdministrativaDestinoId`;',
                    'SELECT 1;'
                );
                PREPARE rename_column_stmt FROM @rename_column_sql;
                EXECUTE rename_column_stmt;
                DEALLOCATE PREPARE rename_column_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @old_index_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND INDEX_NAME = 'IX_Transferencias_LocalDestinoId'
                );
                SET @new_index_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND INDEX_NAME = 'IX_Transferencias_UnidadeAdministrativaDestinoId'
                );
                SET @rename_index_sql := IF(
                    @old_index_exists > 0 AND @new_index_exists = 0,
                    'ALTER TABLE `Transferencias` RENAME INDEX `IX_Transferencias_LocalDestinoId` TO `IX_Transferencias_UnidadeAdministrativaDestinoId`;',
                    'SELECT 1;'
                );
                PREPARE rename_index_stmt FROM @rename_index_sql;
                EXECUTE rename_index_stmt;
                DEALLOCATE PREPARE rename_index_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @transferencias_local_id_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND COLUMN_NAME = 'LocalId'
                );
                SET @add_transferencias_local_id_sql := IF(
                    @transferencias_local_id_exists = 0,
                    'ALTER TABLE `Transferencias` ADD `LocalId` char(36) COLLATE ascii_general_ci NULL;',
                    'SELECT 1;'
                );
                PREPARE add_transferencias_local_id_stmt FROM @add_transferencias_local_id_sql;
                EXECUTE add_transferencias_local_id_stmt;
                DEALLOCATE PREPARE add_transferencias_local_id_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @equipes_comissao_id_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Equipes'
                      AND COLUMN_NAME = 'ComissaoId'
                );
                SET @add_equipes_comissao_id_sql := IF(
                    @equipes_comissao_id_exists = 0,
                    'ALTER TABLE `Equipes` ADD `ComissaoId` char(36) COLLATE ascii_general_ci NULL;',
                    'SELECT 1;'
                );
                PREPARE add_equipes_comissao_id_stmt FROM @add_equipes_comissao_id_sql;
                EXECUTE add_equipes_comissao_id_stmt;
                DEALLOCATE PREPARE add_equipes_comissao_id_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS `UnidadesAdministrativas` (
                    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
                    `Nome` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
                    `Sigla` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
                    `UnidadeSuperiorId` char(36) COLLATE ascii_general_ci NULL,
                    `CreatedAt` datetime(6) NOT NULL,
                    `UpdatedAt` datetime(6) NULL,
                    `DeletedAt` datetime(6) NULL,
                    CONSTRAINT `PK_UnidadesAdministrativas` PRIMARY KEY (`Id`),
                    CONSTRAINT `FK_UnidadesAdministrativas_UnidadeSuperiorId`
                        FOREIGN KEY (`UnidadeSuperiorId`) REFERENCES `UnidadesAdministrativas` (`Id`) ON DELETE RESTRICT
                ) CHARACTER SET=utf8mb4;
                """
            );

            migrationBuilder.Sql(
                """
                SET @transferencias_local_id_index_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND INDEX_NAME = 'IX_Transferencias_LocalId'
                );
                SET @create_transferencias_local_id_index_sql := IF(
                    @transferencias_local_id_index_exists = 0,
                    'CREATE INDEX `IX_Transferencias_LocalId` ON `Transferencias` (`LocalId`);',
                    'SELECT 1;'
                );
                PREPARE create_transferencias_local_id_index_stmt FROM @create_transferencias_local_id_index_sql;
                EXECUTE create_transferencias_local_id_index_stmt;
                DEALLOCATE PREPARE create_transferencias_local_id_index_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @equipes_comissao_id_index_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Equipes'
                      AND INDEX_NAME = 'IX_Equipes_ComissaoId'
                );
                SET @create_equipes_comissao_id_index_sql := IF(
                    @equipes_comissao_id_index_exists = 0,
                    'CREATE INDEX `IX_Equipes_ComissaoId` ON `Equipes` (`ComissaoId`);',
                    'SELECT 1;'
                );
                PREPARE create_equipes_comissao_id_index_stmt FROM @create_equipes_comissao_id_index_sql;
                EXECUTE create_equipes_comissao_id_index_stmt;
                DEALLOCATE PREPARE create_equipes_comissao_id_index_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @unidades_superior_index_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'UnidadesAdministrativas'
                      AND INDEX_NAME = 'IX_UnidadesAdministrativas_UnidadeSuperiorId'
                );
                SET @create_unidades_superior_index_sql := IF(
                    @unidades_superior_index_exists = 0,
                    'CREATE INDEX `IX_UnidadesAdministrativas_UnidadeSuperiorId` ON `UnidadesAdministrativas` (`UnidadeSuperiorId`);',
                    'SELECT 1;'
                );
                PREPARE create_unidades_superior_index_stmt FROM @create_unidades_superior_index_sql;
                EXECUTE create_unidades_superior_index_stmt;
                DEALLOCATE PREPARE create_unidades_superior_index_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @equipes_comissoes_fk_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE CONSTRAINT_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Equipes'
                      AND CONSTRAINT_NAME = 'FK_Equipes_Comissoes_ComissaoId'
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                );
                SET @add_equipes_comissoes_fk_sql := IF(
                    @equipes_comissoes_fk_exists = 0,
                    'ALTER TABLE `Equipes` ADD CONSTRAINT `FK_Equipes_Comissoes_ComissaoId` FOREIGN KEY (`ComissaoId`) REFERENCES `Comissoes` (`Id`) ON DELETE RESTRICT;',
                    'SELECT 1;'
                );
                PREPARE add_equipes_comissoes_fk_stmt FROM @add_equipes_comissoes_fk_sql;
                EXECUTE add_equipes_comissoes_fk_stmt;
                DEALLOCATE PREPARE add_equipes_comissoes_fk_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @transferencias_locais_fk_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE CONSTRAINT_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND CONSTRAINT_NAME = 'FK_Transferencias_Locais_LocalId'
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                );
                SET @add_transferencias_locais_fk_sql := IF(
                    @transferencias_locais_fk_exists = 0,
                    'ALTER TABLE `Transferencias` ADD CONSTRAINT `FK_Transferencias_Locais_LocalId` FOREIGN KEY (`LocalId`) REFERENCES `Locais` (`Id`);',
                    'SELECT 1;'
                );
                PREPARE add_transferencias_locais_fk_stmt FROM @add_transferencias_locais_fk_sql;
                EXECUTE add_transferencias_locais_fk_stmt;
                DEALLOCATE PREPARE add_transferencias_locais_fk_stmt;
                """
            );

            migrationBuilder.Sql(
                """
                SET @transferencias_unidades_fk_exists := (
                    SELECT COUNT(*)
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE CONSTRAINT_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'Transferencias'
                      AND CONSTRAINT_NAME = 'FK_Transferencias_UnidadesAdministrativas_UnidadeAdministrativa~'
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                );
                SET @add_transferencias_unidades_fk_sql := IF(
                    @transferencias_unidades_fk_exists = 0,
                    'ALTER TABLE `Transferencias` ADD CONSTRAINT `FK_Transferencias_UnidadesAdministrativas_UnidadeAdministrativa~` FOREIGN KEY (`UnidadeAdministrativaDestinoId`) REFERENCES `UnidadesAdministrativas` (`Id`) ON DELETE RESTRICT;',
                    'SELECT 1;'
                );
                PREPARE add_transferencias_unidades_fk_stmt FROM @add_transferencias_unidades_fk_sql;
                EXECUTE add_transferencias_unidades_fk_stmt;
                DEALLOCATE PREPARE add_transferencias_unidades_fk_stmt;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Equipes_Comissoes_ComissaoId",
                table: "Equipes");

            migrationBuilder.DropForeignKey(
                name: "FK_Transferencias_Locais_LocalId",
                table: "Transferencias");

            migrationBuilder.DropForeignKey(
                name: "FK_Transferencias_UnidadesAdministrativas_UnidadeAdministrativa~",
                table: "Transferencias");

            migrationBuilder.DropTable(
                name: "UnidadesAdministrativas");

            migrationBuilder.DropIndex(
                name: "IX_Transferencias_LocalId",
                table: "Transferencias");

            migrationBuilder.DropIndex(
                name: "IX_Equipes_ComissaoId",
                table: "Equipes");

            migrationBuilder.DropColumn(
                name: "LocalId",
                table: "Transferencias");

            migrationBuilder.DropColumn(
                name: "ComissaoId",
                table: "Equipes");

            migrationBuilder.RenameColumn(
                name: "UnidadeAdministrativaDestinoId",
                table: "Transferencias",
                newName: "LocalDestinoId");

            migrationBuilder.RenameIndex(
                name: "IX_Transferencias_UnidadeAdministrativaDestinoId",
                table: "Transferencias",
                newName: "IX_Transferencias_LocalDestinoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transferencias_Locais_LocalDestinoId",
                table: "Transferencias",
                column: "LocalDestinoId",
                principalTable: "Locais",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
