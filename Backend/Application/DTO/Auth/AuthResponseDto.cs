namespace Application.DTO.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Perfil { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? EquipeId { get; set; }
    public string? EquipeDescricao { get; set; }
    public bool MustChangePassword { get; set; }
}
