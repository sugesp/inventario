namespace Domain.Model;

public class LaudoTecnicoFoto : BaseEntity
{
    public Guid LaudoTecnicoId { get; set; }
    public string Categoria { get; set; } = string.Empty;
    public string NomeArquivo { get; set; } = string.Empty;
    public string NomeOriginal { get; set; } = string.Empty;
    public string CaminhoRelativo { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;

    public LaudoTecnico? LaudoTecnico { get; set; }
}
