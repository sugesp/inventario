namespace Domain.Model;

public class Comissao : BaseEntity
{
    public int Ano { get; set; }
    public string Status { get; set; } = "Inativa";
    public Guid PresidenteId { get; set; }

    public Usuario? Presidente { get; set; }
    public ICollection<ComissaoMembro> Membros { get; set; } = new List<ComissaoMembro>();
    public ICollection<Equipe> Equipes { get; set; } = new List<Equipe>();
    public ICollection<Local> Locais { get; set; } = new List<Local>();
    public ICollection<ItemInventariado> ItensInventariados { get; set; } = new List<ItemInventariado>();
}
