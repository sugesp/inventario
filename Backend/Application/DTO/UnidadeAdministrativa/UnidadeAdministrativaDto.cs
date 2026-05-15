namespace Application.DTO.UnidadeAdministrativa;

public class UnidadeAdministrativaDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Sigla { get; set; } = string.Empty;
    public Guid? UnidadeSuperiorId { get; set; }
    public string? UnidadeSuperiorNome { get; set; }
}
