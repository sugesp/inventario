namespace Domain.Model;

public class ItemInventariado : BaseEntity
{
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid LocalId { get; set; }
    public Guid UsuarioId { get; set; }
    public Guid? ComissaoId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string EstadoConservacao { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public DateTime DataInventario { get; set; } = DateTime.UtcNow;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal? PrecisaoLocalizacao { get; set; }
    public bool LancadoEEstado { get; set; }
    public Guid? LancadoEEstadoPorUsuarioId { get; set; }
    public DateTime? LancadoEEstadoEm { get; set; }

    public Local? Local { get; set; }
    public Usuario? Usuario { get; set; }
    public Comissao? Comissao { get; set; }
    public Usuario? LancadoEEstadoPorUsuario { get; set; }
    public ICollection<ItemInventarioFoto> Fotos { get; set; } = new List<ItemInventarioFoto>();
}
