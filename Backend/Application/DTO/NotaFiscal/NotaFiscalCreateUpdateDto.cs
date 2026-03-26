namespace Application.DTO.NotaFiscal;

public class NotaFiscalCreateUpdateDto
{
    public Guid ProcessoPagamentoId { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string Serie { get; set; } = string.Empty;
    public string Referencia { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataEmissao { get; set; }
    public decimal Valor { get; set; }
    public decimal BaseCalculo { get; set; }
    public decimal Inss { get; set; }
    public decimal Iss { get; set; }
    public decimal Irrf { get; set; }
}
