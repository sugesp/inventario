namespace Domain.Model;

public class Pagamento : BaseEntity
{
    public Guid LiquidacaoId { get; set; }
    public string NumeroOrdemBancaria { get; set; } = string.Empty;
    public string IdSeiOrdemBancaria { get; set; } = string.Empty;
    public decimal ValorOrdemBancaria { get; set; }
    public DateTime DataOrdemBancaria { get; set; }
    public string NumeroPreparacaoPagamento { get; set; } = string.Empty;
    public string IdSeiPreparacaoPagamento { get; set; } = string.Empty;
    public decimal ValorPreparacaoPagamento { get; set; }
    public DateTime? DataPreparacaoPagamento { get; set; }

    public Liquidacao? Liquidacao { get; set; }
}
