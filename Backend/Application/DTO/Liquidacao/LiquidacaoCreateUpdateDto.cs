namespace Application.DTO.Liquidacao;

public class LiquidacaoCreateUpdateDto
{
    public Guid NotaFiscalId { get; set; }
    public string NumeroLiquidacao { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataLiquidacao { get; set; }
    public decimal ValorLiquidado { get; set; }
    public string? Observacao { get; set; }
}
