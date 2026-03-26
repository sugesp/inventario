namespace Application.DTO.GlosaNotaFiscal;

public class GlosaNotaFiscalDto
{
    public Guid Id { get; set; }
    public Guid NotaFiscalId { get; set; }
    public string IdSei { get; set; } = string.Empty;
    public decimal ValorGlosa { get; set; }
    public DateTime DataGlosa { get; set; }
    public string? Descricao { get; set; }
}
