namespace Domain.Model;

public class Fornecedor : BaseEntity
{
    public string RazaoSocial { get; set; } = string.Empty;
    public string NomeFantasia { get; set; } = string.Empty;
    public string Cnpj { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string TelefoneContato { get; set; } = string.Empty;
    public string? Endereco { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }

    public ICollection<Contrato> Contratos { get; set; } = new List<Contrato>();
}
