namespace Domain.Model;

public class Equipe : BaseEntity
{
    public string Descricao { get; set; } = string.Empty;

    public ICollection<Local> Locais { get; set; } = new List<Local>();
}
