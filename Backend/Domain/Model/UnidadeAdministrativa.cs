namespace Domain.Model;

public class UnidadeAdministrativa : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
    public string Sigla { get; set; } = string.Empty;
    public Guid? UnidadeSuperiorId { get; set; }

    public UnidadeAdministrativa? UnidadeSuperior { get; set; }
    public ICollection<UnidadeAdministrativa> UnidadesFilhas { get; set; } = new List<UnidadeAdministrativa>();
    public ICollection<Transferencia> TransferenciasDestino { get; set; } = new List<Transferencia>();
}
