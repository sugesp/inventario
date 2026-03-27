namespace Application.DTO.ItemInventariado;

public class ItemInventariadoDto
{
    public Guid Id { get; set; }
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid LocalId { get; set; }
    public string LocalNome { get; set; } = string.Empty;
    public Guid EquipeId { get; set; }
    public string EquipeDescricao { get; set; } = string.Empty;
    public Guid UsuarioId { get; set; }
    public string UsuarioNome { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string EstadoConservacao { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public DateTime DataInventario { get; set; }
    public IReadOnlyCollection<ItemInventarioFotoDto> Fotos { get; set; } = Array.Empty<ItemInventarioFotoDto>();
}
