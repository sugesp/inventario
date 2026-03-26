namespace Domain.Model;

public class Empenho : BaseEntity
{
    public Guid ExercicioAnualId { get; set; }
    public string NumeroEmpenho { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataEmpenho { get; set; }
    public decimal ValorEmpenhado { get; set; }
    public decimal ValorLiquidado { get; set; }
    public string Fonte { get; set; } = string.Empty;
    public string? Observacao { get; set; }

    public ExercicioAnual? ExercicioAnual { get; set; }
    public ICollection<Liquidacao> Liquidacoes { get; set; } = new List<Liquidacao>();
    public ICollection<RestoPagar> RestosPagar { get; set; } = new List<RestoPagar>();
}
