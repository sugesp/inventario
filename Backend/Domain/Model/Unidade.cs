namespace Domain.Model;

public class Unidade : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
    public string Sigla { get; set; } = string.Empty;
    public Guid? UnidadeSuperiorId { get; set; }

    public Unidade? UnidadeSuperior { get; set; }
    public ICollection<Unidade> UnidadesFilhas { get; set; } = new List<Unidade>();
}
