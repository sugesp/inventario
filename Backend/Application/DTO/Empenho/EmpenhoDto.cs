namespace Application.DTO.Empenho;

public class EmpenhoDto
{
    public Guid Id { get; set; }
    public Guid ExercicioAnualId { get; set; }
    public Guid ContratoId { get; set; }
    public int ExercicioAno { get; set; }
    public string NumeroEmpenho { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataEmpenho { get; set; }
    public decimal ValorEmpenhado { get; set; }
    public decimal ValorLiquidado { get; set; }
    public string Fonte { get; set; } = string.Empty;
    public string? Observacao { get; set; }
}
