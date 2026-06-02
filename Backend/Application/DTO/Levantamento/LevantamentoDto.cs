namespace Application.DTO.Levantamento;

public class LevantamentoDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid CriadoPorUsuarioId { get; set; }
    public string CriadoPorUsuarioNome { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool UsuarioPodeCompartilhar { get; set; }
    public LevantamentoCompartilhamentoDto[] Compartilhamentos { get; set; } = [];
    public LevantamentoItemDto[] Itens { get; set; } = [];
}
