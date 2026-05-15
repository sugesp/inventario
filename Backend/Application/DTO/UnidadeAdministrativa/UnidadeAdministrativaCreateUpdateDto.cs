namespace Application.DTO.UnidadeAdministrativa;

public class UnidadeAdministrativaCreateUpdateDto
{
    public string Nome { get; set; } = string.Empty;
    public string Sigla { get; set; } = string.Empty;
    public Guid? UnidadeSuperiorId { get; set; }
}
