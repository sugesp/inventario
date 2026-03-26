namespace Application.DTO.Auth;

public class ChangePasswordDto
{
    public string? SenhaAtual { get; set; }
    public string NovaSenha { get; set; } = string.Empty;
}
