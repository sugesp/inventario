namespace Domain.Model;

public class ItemInventariadoMovimentacaoLocal : BaseEntity
{
    public Guid ItemInventariadoId { get; set; }
    public Guid LocalOrigemId { get; set; }
    public Guid LocalDestinoId { get; set; }
    public Guid MovidoPorUsuarioId { get; set; }
    public string Justificativa { get; set; } = string.Empty;

    public ItemInventariado? ItemInventariado { get; set; }
    public Local? LocalOrigem { get; set; }
    public Local? LocalDestino { get; set; }
    public Usuario? MovidoPorUsuario { get; set; }
}
