namespace Application.DTO.Empenho;

public class EmpenhoCreateUpdateDto
{
    public Guid ExercicioAnualId { get; set; }
    public string NumeroEmpenho { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime DataEmpenho { get; set; }
    public decimal ValorEmpenhado { get; set; }
    public string Fonte { get; set; } = string.Empty;
    public string? Observacao { get; set; }
}
