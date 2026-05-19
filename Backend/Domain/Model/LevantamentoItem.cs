namespace Domain.Model;

public class LevantamentoItem : BaseEntity
{
    public Guid LevantamentoId { get; set; }
    public string Tombamento { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string UrlConsulta { get; set; } = string.Empty;
    public Guid ConfirmadoPorUsuarioId { get; set; }

    public Levantamento? Levantamento { get; set; }
    public Usuario? ConfirmadoPorUsuario { get; set; }
}
