namespace Domain.Model;

public class LevantamentoCompartilhamento : BaseEntity
{
    public Guid LevantamentoId { get; set; }
    public Guid UsuarioId { get; set; }
    public Guid CompartilhadoPorUsuarioId { get; set; }

    public Levantamento? Levantamento { get; set; }
    public Usuario? Usuario { get; set; }
    public Usuario? CompartilhadoPorUsuario { get; set; }
}
