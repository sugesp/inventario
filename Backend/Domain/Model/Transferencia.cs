namespace Domain.Model;

public class Transferencia : BaseEntity
{
    public Guid LocalDestinoId { get; set; }
    public Guid CriadoPorUsuarioId { get; set; }
    public Guid? FinalizadoPorUsuarioId { get; set; }
    public string ResponsavelDestino { get; set; } = string.Empty;
    public string IdSeiTermo { get; set; } = string.Empty;
    public DateTime? DataEntrega { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;

    public Local? LocalDestino { get; set; }
    public Usuario? CriadoPorUsuario { get; set; }
    public Usuario? FinalizadoPorUsuario { get; set; }
    public ICollection<TransferenciaItem> Itens { get; set; } = new List<TransferenciaItem>();
}
