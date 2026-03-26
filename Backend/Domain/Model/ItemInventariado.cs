namespace Domain.Model;

public class ItemInventariado : BaseEntity
{
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid LocalId { get; set; }
    public Guid UsuarioId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public DateTime DataInventario { get; set; } = DateTime.UtcNow;

    public Local? Local { get; set; }
    public Usuario? Usuario { get; set; }
    public ICollection<ItemInventarioFoto> Fotos { get; set; } = new List<ItemInventarioFoto>();
}
