namespace Domain.Model;

public class ExercicioAnual : BaseEntity
{
    public Guid ContratoId { get; set; }
    public int Ano { get; set; }

    public Contrato? Contrato { get; set; }
    public ICollection<Empenho> Empenhos { get; set; } = new List<Empenho>();
    public ICollection<ProcessoPagamento> ProcessosPagamento { get; set; } = new List<ProcessoPagamento>();
}
