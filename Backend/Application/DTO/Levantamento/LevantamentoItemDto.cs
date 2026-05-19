namespace Application.DTO.Levantamento;

public class LevantamentoItemDto
{
    public Guid Id { get; set; }
    public string Tombamento { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string UrlConsulta { get; set; } = string.Empty;
    public Guid ConfirmadoPorUsuarioId { get; set; }
    public string ConfirmadoPorUsuarioNome { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
