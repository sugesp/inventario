namespace Domain.Model;

public class Equipe : BaseEntity
{
    public string Descricao { get; set; } = string.Empty;
    public Guid? ComissaoId { get; set; }

    public Comissao? Comissao { get; set; }
    public ICollection<Local> Locais { get; set; } = new List<Local>();
}
