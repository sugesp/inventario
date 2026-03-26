namespace Domain.Model;

public class Portaria : BaseEntity
{
    public Guid ContratoId { get; set; }
    public string NumeroPortaria { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public DateTime DataPublicacao { get; set; }

    public Contrato? Contrato { get; set; }
    public ICollection<EquipeContrato> EquipesContrato { get; set; } = new List<EquipeContrato>();
}
