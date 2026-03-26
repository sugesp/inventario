namespace Application.DTO.Unidade;

public class UnidadeCreateUpdateDto
{
    public string Nome { get; set; } = string.Empty;
    public string Sigla { get; set; } = string.Empty;
    public Guid? UnidadeSuperiorId { get; set; }
}
