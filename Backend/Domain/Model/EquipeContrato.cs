using Domain.Enum;

namespace Domain.Model;

public class EquipeContrato : BaseEntity
{
    public Guid ContratoId { get; set; }
    public Guid UsuarioId { get; set; }
    public Guid? PortariaId { get; set; }
    public FuncaoEquipeContrato Funcao { get; set; }
    public bool EhSubstituto { get; set; }
    public DateTime DataInclusao { get; set; }
    public DateTime? DataExclusao { get; set; }
    public string? MotivoExclusao { get; set; }

    public Contrato? Contrato { get; set; }
    public Usuario? Usuario { get; set; }
    public Portaria? Portaria { get; set; }
}
