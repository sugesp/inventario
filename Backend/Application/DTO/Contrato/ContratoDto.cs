namespace Application.DTO.Contrato;

public class ContratoDto
{
    public Guid Id { get; set; }
    public Guid FornecedorId { get; set; }
    public string? FornecedorNome { get; set; }
    public string? FornecedorCnpj { get; set; }
    public Guid? UnidadeDemandanteId { get; set; }
    public string? UnidadeDemandanteSigla { get; set; }
    public string? UnidadeDemandanteNome { get; set; }
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
    public DateTime VigenciaAtual { get; set; }
    public DateTime? VigenciaMaxima { get; set; }
    public string ResponsavelGconv { get; set; } = string.Empty;
    public decimal ValorInicialContratual { get; set; }
    public decimal ValorAcrescimo { get; set; }
    public decimal ValorSupressao { get; set; }
    public decimal ValorAtualContrato { get; set; }
    public List<ContratoProcuradorDto> Procuradores { get; set; } = [];
}
