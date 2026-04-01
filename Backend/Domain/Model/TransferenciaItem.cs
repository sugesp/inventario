namespace Domain.Model;

public class TransferenciaItem : BaseEntity
{
    public Guid TransferenciaId { get; set; }
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string StatusItem { get; set; } = string.Empty;
    public string Condicao { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;

    public Transferencia? Transferencia { get; set; }
}
