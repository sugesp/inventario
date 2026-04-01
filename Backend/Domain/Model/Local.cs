namespace Domain.Model;

public class Local : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
    public Guid EquipeId { get; set; }

    public Equipe? Equipe { get; set; }
    public ICollection<ItemInventariado> ItensInventariados { get; set; } = new List<ItemInventariado>();
    public ICollection<Transferencia> TransferenciasDestino { get; set; } = new List<Transferencia>();
}
