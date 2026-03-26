namespace Application.DTO.ProcessoPagamento;

public class ProcessoPagamentoCreateUpdateDto
{
    public Guid ExercicioAnualId { get; set; }
    public string NumeroProcesso { get; set; } = string.Empty;
    public string? Observacoes { get; set; }
}
