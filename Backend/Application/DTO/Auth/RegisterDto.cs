namespace Application.DTO.Auth;

public class RegisterDto
{
    public string Nome { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public List<string> Permissoes { get; set; } = new();
    public string Status { get; set; } = "Ativo";
}
