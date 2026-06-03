namespace Application.DTO.Local;

public class LocalDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public Guid ComissaoId { get; set; }
    public int ComissaoAno { get; set; }
    public IReadOnlyCollection<LocalMembroDto> Membros { get; set; } = Array.Empty<LocalMembroDto>();
}

public class LocalMembroDto
{
    public Guid UsuarioId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
}
