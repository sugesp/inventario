namespace Application.DTO.ItemInventariado;

public class ItemInventariadoFormDto
{
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid LocalId { get; set; }
    public Guid? UsuarioId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public DateTime? DataInventario { get; set; }
    public List<Guid> FotoIdsRemovidas { get; set; } = new();
}
