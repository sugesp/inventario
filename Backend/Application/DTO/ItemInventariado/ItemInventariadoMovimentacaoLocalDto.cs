namespace Application.DTO.ItemInventariado;

public class ItemInventariadoMovimentacaoLocalDto
{
    public Guid Id { get; set; }
    public Guid ItemInventariadoId { get; set; }
    public Guid? ComissaoId { get; set; }
    public int? ComissaoAno { get; set; }
    public string Tombamento { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid LocalOrigemId { get; set; }
    public string LocalOrigemNome { get; set; } = string.Empty;
    public Guid LocalDestinoId { get; set; }
    public string LocalDestinoNome { get; set; } = string.Empty;
    public Guid MovidoPorUsuarioId { get; set; }
    public string MovidoPorUsuarioNome { get; set; } = string.Empty;
    public string Justificativa { get; set; } = string.Empty;
    public DateTime MovidoEm { get; set; }
}
