namespace Application.DTO.RestoPagar;

public class RestoPagarDto
{
    public Guid Id { get; set; }
    public Guid EmpenhoId { get; set; }
    public Guid ExercicioAnualId { get; set; }
    public Guid ContratoId { get; set; }
    public int ExercicioAno { get; set; }
    public string NumeroEmpenho { get; set; } = string.Empty;
    public string NumeroNotaLancamento { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public DateTime Data { get; set; }
    public decimal Valor { get; set; }
}
