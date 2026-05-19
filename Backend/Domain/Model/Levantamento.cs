namespace Domain.Model;

public class Levantamento : BaseEntity
{
    public string Nome { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid CriadoPorUsuarioId { get; set; }

    public Usuario? CriadoPorUsuario { get; set; }
    public ICollection<LevantamentoItem> Itens { get; set; } = new List<LevantamentoItem>();
}
