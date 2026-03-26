using Domain.Enum;

namespace Domain.Model;

public class Aditivo : BaseEntity
{
    public Guid ContratoId { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public TipoAditivo Tipo { get; set; }
    public string? Observacao { get; set; }
    public DateTime DataInicio { get; set; }
    public DateTime? NovaVigencia { get; set; }
    public decimal Valor { get; set; }

    public Contrato? Contrato { get; set; }
}
