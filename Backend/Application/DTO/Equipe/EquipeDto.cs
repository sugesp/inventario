namespace Application.DTO.Equipe;

public class EquipeDto
{
    public Guid Id { get; set; }
    public string Descricao { get; set; } = string.Empty;
    public Guid? ComissaoId { get; set; }
    public int ComissaoAno { get; set; }
}
