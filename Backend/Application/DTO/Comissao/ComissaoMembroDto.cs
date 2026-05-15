namespace Application.DTO.Comissao;

public class ComissaoMembroDto
{
    public Guid UsuarioId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public Guid? EquipeId { get; set; }
    public string? EquipeDescricao { get; set; }
}
