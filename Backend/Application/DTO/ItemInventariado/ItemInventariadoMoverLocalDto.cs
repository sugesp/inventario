using System.ComponentModel.DataAnnotations;

namespace Application.DTO.ItemInventariado;

public class ItemInventariadoMoverLocalDto
{
    [Required]
    public Guid LocalDestinoId { get; set; }

    [Required]
    [StringLength(2000, MinimumLength = 3)]
    public string Justificativa { get; set; } = string.Empty;
}
