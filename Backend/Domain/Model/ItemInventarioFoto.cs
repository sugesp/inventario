namespace Domain.Model;

public class ItemInventarioFoto : BaseEntity
{
    public Guid ItemInventariadoId { get; set; }
    public string NomeArquivo { get; set; } = string.Empty;
    public string NomeOriginal { get; set; } = string.Empty;
    public string CaminhoRelativo { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;

    public ItemInventariado? ItemInventariado { get; set; }
}
