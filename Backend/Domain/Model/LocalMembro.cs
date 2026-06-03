namespace Domain.Model;

public class LocalMembro : BaseEntity
{
    public Guid LocalId { get; set; }
    public Guid UsuarioId { get; set; }

    public Local? Local { get; set; }
    public Usuario? Usuario { get; set; }
}
