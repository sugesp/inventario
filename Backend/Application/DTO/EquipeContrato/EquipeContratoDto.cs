using Domain.Enum;

namespace Application.DTO.EquipeContrato;

public class EquipeContratoDto
{
    public Guid Id { get; set; }
    public Guid ContratoId { get; set; }
    public Guid UsuarioId { get; set; }
    public string? UsuarioNome { get; set; }
    public string? UsuarioCpf { get; set; }
    public Guid? PortariaId { get; set; }
    public string? PortariaNumero { get; set; }
    public FuncaoEquipeContrato Funcao { get; set; }
    public bool EhSubstituto { get; set; }
    public DateTime DataInclusao { get; set; }
    public DateTime? DataExclusao { get; set; }
    public string? MotivoExclusao { get; set; }
}
