namespace Application.DTO.Levantamento;

public class LevantamentoCompartilharDto
{
    public IReadOnlyCollection<Guid> UsuarioIds { get; set; } = Array.Empty<Guid>();
}
