namespace Domain.Model;

public class ProcessoPagamento : BaseEntity
{
    public Guid ExercicioAnualId { get; set; }
    public string NumeroProcesso { get; set; } = string.Empty;
    public string? Observacoes { get; set; }

    public ExercicioAnual? ExercicioAnual { get; set; }
    public ICollection<NotaFiscal> NotasFiscais { get; set; } = new List<NotaFiscal>();
}
