namespace Application.DTO.Contrato;

public class ContratoCreateUpdateDto
{
    public Guid FornecedorId { get; set; }
    public Guid? UnidadeDemandanteId { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string IdSei { get; set; } = string.Empty;
    public string? PrepostoNome { get; set; }
    public string? PrepostoNumeroContato { get; set; }
    public string? Obs { get; set; }
    public bool Inadimplencia { get; set; }
    public int QuantidadeAditivos { get; set; }
    public string Processo { get; set; } = string.Empty;
    public string Objeto { get; set; } = string.Empty;
    public string? ObservacoesComplementares { get; set; }
    public DateTime DataInicio { get; set; }
    public string Lei { get; set; } = string.Empty;
    public DateTime VigenciaInicial { get; set; }
    public DateTime? VigenciaMaxima { get; set; }
    public string ResponsavelGconv { get; set; } = string.Empty;
    public decimal ValorInicialContratual { get; set; }
    public List<ContratoProcuradorCreateUpdateDto> Procuradores { get; set; } = [];
}
