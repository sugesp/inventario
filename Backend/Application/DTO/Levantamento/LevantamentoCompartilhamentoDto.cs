namespace Application.DTO.Levantamento;

public class LevantamentoCompartilhamentoDto
{
    public Guid UsuarioId { get; set; }
    public string UsuarioNome { get; set; } = string.Empty;
    public Guid CompartilhadoPorUsuarioId { get; set; }
    public string CompartilhadoPorUsuarioNome { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
