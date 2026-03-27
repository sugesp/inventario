namespace Application.DTO.ItemInventariado;

public class ItemInventariadoFormDto
{
    public string? TombamentoNovo { get; set; }
    public string? TombamentoAntigo { get; set; }
    public string? Descricao { get; set; }
    public Guid LocalId { get; set; }
    public Guid? UsuarioId { get; set; }
    public string? Status { get; set; }
    public string? EstadoConservacao { get; set; }
    public string? Observacao { get; set; }
    public DateTime? DataInventario { get; set; }
    public List<Guid> FotoIdsRemovidas { get; set; } = new();
}
