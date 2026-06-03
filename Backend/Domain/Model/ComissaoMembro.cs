namespace Domain.Model;

public class ComissaoMembro : BaseEntity
{
    public Guid ComissaoId { get; set; }
    public Guid UsuarioId { get; set; }

    public Comissao? Comissao { get; set; }
    public Usuario? Usuario { get; set; }
}
