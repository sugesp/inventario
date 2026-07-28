using System.ComponentModel.DataAnnotations;

namespace Application.DTO.ItemInventariado;

public class ItemInventariadoJustificativaDto
{
    [Required]
    [StringLength(2000, MinimumLength = 3)]
    public string Justificativa { get; set; } = string.Empty;
}
