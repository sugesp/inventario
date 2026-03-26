namespace Application.DTO.Portaria;

public class PortariaCreateUpdateDto
{
    public Guid ContratoId { get; set; }
    public string NumeroPortaria { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public DateTime DataPublicacao { get; set; }
}
