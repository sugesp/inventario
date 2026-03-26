namespace Application.DTO.Local;

public class LocalCreateUpdateDto
{
    public string Nome { get; set; } = string.Empty;
    public Guid EquipeId { get; set; }
}
