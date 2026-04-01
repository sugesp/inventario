namespace Application.DTO.Transferencia;

public class TransferenciaSaveDto
{
    public Guid LocalDestinoId { get; set; }
    public string ResponsavelDestino { get; set; } = string.Empty;
    public string IdSeiTermo { get; set; } = string.Empty;
    public DateTime? DataEntrega { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public List<TransferenciaItemSaveDto> Itens { get; set; } = new();
}
