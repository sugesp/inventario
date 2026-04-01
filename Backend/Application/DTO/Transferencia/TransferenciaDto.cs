namespace Application.DTO.Transferencia;

public class TransferenciaDto
{
    public Guid Id { get; set; }
    public Guid LocalDestinoId { get; set; }
    public string LocalDestinoNome { get; set; } = string.Empty;
    public Guid CriadoPorUsuarioId { get; set; }
    public string CriadoPorUsuarioNome { get; set; } = string.Empty;
    public Guid? FinalizadoPorUsuarioId { get; set; }
    public string FinalizadoPorUsuarioNome { get; set; } = string.Empty;
    public string ResponsavelDestino { get; set; } = string.Empty;
    public string IdSeiTermo { get; set; } = string.Empty;
    public DateTime? DataEntrega { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public IReadOnlyCollection<TransferenciaItemDto> Itens { get; set; } = Array.Empty<TransferenciaItemDto>();
}
