namespace Domain.Model;

public class Local : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
    public Guid ComissaoId { get; set; }
    public Guid? LocalSuperiorId { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }

    public Comissao? Comissao { get; set; }
    public Local? LocalSuperior { get; set; }
    public ICollection<Local> LocaisSubordinados { get; set; } = new List<Local>();
    public ICollection<LocalMembro> Membros { get; set; } = new List<LocalMembro>();
    public ICollection<ItemInventariado> ItensInventariados { get; set; } = new List<ItemInventariado>();
}
