using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Persistence.Context;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260617120000_NormalizeExistingUsuarioNames")]
    public partial class NormalizeExistingUsuarioNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS NormalizePessoaNome;");

            migrationBuilder.Sql(
                """
                CREATE FUNCTION NormalizePessoaNome(nome_value VARCHAR(200))
                RETURNS VARCHAR(200)
                DETERMINISTIC
                NO SQL
                BEGIN
                    DECLARE input_text VARCHAR(200) DEFAULT '';
                    DECLARE result_text VARCHAR(200) DEFAULT '';
                    DECLARE current_word VARCHAR(200) DEFAULT '';
                    DECLARE normalized_word VARCHAR(200) DEFAULT '';
                    DECLARE apostrophe_rest VARCHAR(200) DEFAULT '';
                    DECLARE current_part VARCHAR(200) DEFAULT '';
                    DECLARE normalized_part VARCHAR(200) DEFAULT '';
                    DECLARE space_pos INT DEFAULT 0;
                    DECLARE apostrophe_pos INT DEFAULT 0;
                    DECLARE is_first_word BOOLEAN DEFAULT TRUE;

                    IF nome_value IS NULL OR TRIM(nome_value) = '' THEN
                        RETURN '';
                    END IF;

                    SET input_text = LOWER(TRIM(REGEXP_REPLACE(nome_value, '[[:space:]]+', ' ')));

                    WHILE CHAR_LENGTH(input_text) > 0 DO
                        SET space_pos = LOCATE(' ', input_text);

                        IF space_pos = 0 THEN
                            SET current_word = input_text;
                            SET input_text = '';
                        ELSE
                            SET current_word = SUBSTRING(input_text, 1, space_pos - 1);
                            SET input_text = SUBSTRING(input_text, space_pos + 1);
                        END IF;

                        IF NOT is_first_word AND current_word IN ('da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du', 'van', 'von') THEN
                            SET normalized_word = current_word;
                        ELSE
                            SET apostrophe_rest = current_word;
                            SET normalized_word = '';

                            WHILE CHAR_LENGTH(apostrophe_rest) > 0 DO
                                SET apostrophe_pos = LOCATE('''', apostrophe_rest);

                                IF apostrophe_pos = 0 THEN
                                    SET current_part = apostrophe_rest;
                                    SET apostrophe_rest = '';
                                ELSE
                                    SET current_part = SUBSTRING(apostrophe_rest, 1, apostrophe_pos - 1);
                                    SET apostrophe_rest = SUBSTRING(apostrophe_rest, apostrophe_pos + 1);
                                END IF;

                                IF current_part = '' THEN
                                    SET normalized_part = '';
                                ELSEIF LEFT(current_part, 2) = 'mc' AND CHAR_LENGTH(current_part) > 2 THEN
                                    SET normalized_part = CONCAT('Mc', UPPER(SUBSTRING(current_part, 3, 1)), SUBSTRING(current_part, 4));
                                ELSE
                                    SET normalized_part = CONCAT(UPPER(LEFT(current_part, 1)), SUBSTRING(current_part, 2));
                                END IF;

                                IF normalized_word = '' THEN
                                    SET normalized_word = normalized_part;
                                ELSE
                                    SET normalized_word = CONCAT(normalized_word, '''', normalized_part);
                                END IF;
                            END WHILE;
                        END IF;

                        IF result_text = '' THEN
                            SET result_text = normalized_word;
                        ELSE
                            SET result_text = CONCAT(result_text, ' ', normalized_word);
                        END IF;

                        SET is_first_word = FALSE;
                    END WHILE;

                    RETURN result_text;
                END;
                """
            );

            migrationBuilder.Sql(
                """
                UPDATE Usuarios
                SET Nome = NormalizePessoaNome(Nome)
                WHERE Nome IS NOT NULL
                    AND Nome <> NormalizePessoaNome(Nome);
                """
            );

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS NormalizePessoaNome;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
