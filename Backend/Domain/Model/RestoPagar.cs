namespace Domain.Model;

public class RestoPagar : BaseEntity
{
    public Guid EmpenhoId { get; set; }
    public string NumeroNotaLancamento { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime Data { get; set; }
    public decimal Valor { get; set; }

    public Empenho? Empenho { get; set; }
}
