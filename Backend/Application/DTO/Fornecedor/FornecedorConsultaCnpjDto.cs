namespace Application.DTO.Fornecedor;

public class FornecedorConsultaCnpjDto
{
    public string Cnpj { get; set; } = string.Empty;
    public string? RazaoSocial { get; set; }
    public string? NomeFantasia { get; set; }
    public string? TelefoneContato { get; set; }
    public string? Email { get; set; }
    public string? Endereco { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
}
