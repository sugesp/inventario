namespace Application.DTO.Comissao;

public class ComissaoDto
{
    public Guid Id { get; set; }
    public int Ano { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid PresidenteId { get; set; }
    public string PresidenteNome { get; set; } = string.Empty;
    public IReadOnlyCollection<ComissaoMembroDto> Membros { get; set; } = Array.Empty<ComissaoMembroDto>();
}
