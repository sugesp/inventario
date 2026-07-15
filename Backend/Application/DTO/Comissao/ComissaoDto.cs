namespace Application.DTO.Comissao;

public class ComissaoDto
{
    public Guid Id { get; set; }
    public int Ano { get; set; }
    public int QuantidadeItensEsperados { get; set; }
    public int QuantidadeItensLocalizados { get; set; }
    public int QuantidadeItensRestantes { get; set; }
    public decimal PercentualProgresso { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid PresidenteId { get; set; }
    public string PresidenteNome { get; set; } = string.Empty;
    public IReadOnlyCollection<ComissaoMembroDto> Membros { get; set; } = Array.Empty<ComissaoMembroDto>();
}
