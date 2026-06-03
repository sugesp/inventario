namespace Domain.Model;

public class Bem : BaseEntity
{
    public string Tombamento { get; set; } = string.Empty;
    public string TombamentoFormatado { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string UrlConsulta { get; set; } = string.Empty;
    public DateTime? UltimaConsultaEEstadoEm { get; set; }
}
