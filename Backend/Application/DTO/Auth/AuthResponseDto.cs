namespace Application.DTO.Auth;

public class AuthResponseDto
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public IReadOnlyCollection<string> Permissoes { get; set; } = Array.Empty<string>();
    public string Status { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; }
}
