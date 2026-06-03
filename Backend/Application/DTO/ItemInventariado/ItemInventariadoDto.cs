namespace Application.DTO.ItemInventariado;

public class ItemInventariadoDto
{
    public Guid Id { get; set; }
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid LocalId { get; set; }
    public string LocalNome { get; set; } = string.Empty;
    public IReadOnlyCollection<string> LocalMembrosNomes { get; set; } = Array.Empty<string>();
    public Guid UsuarioId { get; set; }
    public string UsuarioNome { get; set; } = string.Empty;
    public Guid? ComissaoId { get; set; }
    public int? ComissaoAno { get; set; }
    public string? ComissaoStatus { get; set; }
    public string Status { get; set; } = string.Empty;
    public string EstadoConservacao { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public DateTime DataInventario { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal? PrecisaoLocalizacao { get; set; }
    public bool LancadoEEstado { get; set; }
    public Guid? LancadoEEstadoPorUsuarioId { get; set; }
    public string? LancadoEEstadoPorUsuarioNome { get; set; }
    public DateTime? LancadoEEstadoEm { get; set; }
    public IReadOnlyCollection<ItemInventarioFotoDto> Fotos { get; set; } = Array.Empty<ItemInventarioFotoDto>();
}
