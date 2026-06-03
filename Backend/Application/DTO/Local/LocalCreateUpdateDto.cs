namespace Application.DTO.Local;

public class LocalCreateUpdateDto
{
    public string Nome { get; set; } = string.Empty;
    public Guid ComissaoId { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public List<Guid> MembroUsuarioIds { get; set; } = new();
}
