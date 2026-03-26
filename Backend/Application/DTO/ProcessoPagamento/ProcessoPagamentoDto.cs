namespace Application.DTO.ProcessoPagamento;

public class ProcessoPagamentoDto
{
    public Guid Id { get; set; }
    public Guid ExercicioAnualId { get; set; }
    public Guid ContratoId { get; set; }
    public int ExercicioAno { get; set; }
    public string NumeroProcesso { get; set; } = string.Empty;
    public string? Observacoes { get; set; }
}
