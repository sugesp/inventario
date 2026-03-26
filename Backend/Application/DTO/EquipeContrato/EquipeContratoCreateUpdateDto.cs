using Domain.Enum;

namespace Application.DTO.EquipeContrato;

public class EquipeContratoCreateUpdateDto
{
    public Guid ContratoId { get; set; }
    public Guid UsuarioId { get; set; }
    public Guid? PortariaId { get; set; }
    public FuncaoEquipeContrato Funcao { get; set; }
    public bool EhSubstituto { get; set; }
    public DateTime? DataInclusao { get; set; }
    public DateTime? DataExclusao { get; set; }
    public string? MotivoExclusao { get; set; }
}
