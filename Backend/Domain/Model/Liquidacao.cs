namespace Domain.Model;

public class Liquidacao : BaseEntity
{
    public Guid? EmpenhoId { get; set; }
    public Guid NotaFiscalId { get; set; }
    public string NumeroLiquidacao { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataLiquidacao { get; set; }
    public decimal ValorLiquidado { get; set; }
    public string? Observacao { get; set; }

    public Empenho? Empenho { get; set; }
    public NotaFiscal? NotaFiscal { get; set; }
    public Pagamento? Pagamento { get; set; }
}
