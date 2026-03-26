namespace Domain.Model;

public class Notificacao : BaseEntity
{
    public Guid ContratoId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataNotificacao { get; set; }
    public string? IdSeiResposta { get; set; }
    public DateTime? DataResposta { get; set; }

    public Contrato? Contrato { get; set; }
}
