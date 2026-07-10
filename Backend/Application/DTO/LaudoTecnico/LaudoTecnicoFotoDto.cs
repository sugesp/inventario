namespace Application.DTO.LaudoTecnico;

public class LaudoTecnicoFotoDto
{
    public Guid Id { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string NomeOriginal { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}
