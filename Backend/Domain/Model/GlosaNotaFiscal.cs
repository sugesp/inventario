namespace Domain.Model;

public class GlosaNotaFiscal : BaseEntity
{
    public Guid NotaFiscalId { get; set; }
    public string IdSei { get; set; } = string.Empty;
    public decimal ValorGlosa { get; set; }
    public DateTime DataGlosa { get; set; }
    public string? Descricao { get; set; }

    public NotaFiscal? NotaFiscal { get; set; }
}
