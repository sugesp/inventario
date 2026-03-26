namespace Domain.Model;

public class ProcuradorContrato : BaseEntity
{
    public Guid ContratoId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string NumeroContato { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public Contrato? Contrato { get; set; }
}
