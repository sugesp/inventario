namespace Application.DTO.Pagamento;

public class PagamentoDto
{
    public Guid Id { get; set; }
    public Guid LiquidacaoId { get; set; }
    public Guid NotaFiscalId { get; set; }
    public Guid ExercicioAnualId { get; set; }
    public Guid ContratoId { get; set; }
    public int ExercicioAno { get; set; }
    public string NumeroLiquidacao { get; set; } = string.Empty;
    public string NumeroNotaFiscal { get; set; } = string.Empty;
    public string NumeroOrdemBancaria { get; set; } = string.Empty;
    public string IdSeiOrdemBancaria { get; set; } = string.Empty;
    public decimal ValorOrdemBancaria { get; set; }
    public DateTime DataOrdemBancaria { get; set; }
    public string NumeroPreparacaoPagamento { get; set; } = string.Empty;
    public string IdSeiPreparacaoPagamento { get; set; } = string.Empty;
    public decimal ValorPreparacaoPagamento { get; set; }
    public DateTime? DataPreparacaoPagamento { get; set; }
}
