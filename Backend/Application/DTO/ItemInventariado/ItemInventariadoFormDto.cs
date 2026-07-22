namespace Application.DTO.ItemInventariado;

public class ItemInventariadoFormDto
{
    public string? TombamentoNovo { get; set; }
    public string? TombamentoAntigo { get; set; }
    public string? Descricao { get; set; }
    public Guid LocalId { get; set; }
    public Guid? UsuarioId { get; set; }
    public Guid? ComissaoId { get; set; }
    public string? Status { get; set; }
    public string? EstadoConservacao { get; set; }
    public string? JustificativaInservivel { get; set; }
    public string? Observacao { get; set; }
    public bool IsVeiculo { get; set; }
    public string? Placa { get; set; }
    public string? Chassi { get; set; }
    public string? PlacaSeguranca { get; set; }
    public string? Marca { get; set; }
    public string? Modelo { get; set; }
    public decimal? Odometro { get; set; }
    public DateTime? DataInventario { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal? PrecisaoLocalizacao { get; set; }
    public List<Guid> FotoIdsRemovidas { get; set; } = new();
}
