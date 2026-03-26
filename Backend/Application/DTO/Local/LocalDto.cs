namespace Application.DTO.Local;

public class LocalDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public Guid EquipeId { get; set; }
    public string EquipeDescricao { get; set; } = string.Empty;
}
