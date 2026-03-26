namespace Application.DTO.ItemInventariado;

public class ItemInventarioFotoDto
{
    public Guid Id { get; set; }
    public string NomeOriginal { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string CaminhoRelativo { get; set; } = string.Empty;
}
