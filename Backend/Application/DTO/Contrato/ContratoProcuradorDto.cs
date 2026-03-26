namespace Application.DTO.Contrato;

public class ContratoProcuradorDto
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string NumeroContato { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}
