namespace Application.DTO.Liquidacao;

public class LiquidacaoDto
{
    public Guid Id { get; set; }
    public Guid? EmpenhoId { get; set; }
    public Guid NotaFiscalId { get; set; }
    public string NumeroLiquidacao { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataLiquidacao { get; set; }
    public decimal ValorLiquidado { get; set; }
    public string? Observacao { get; set; }
}
