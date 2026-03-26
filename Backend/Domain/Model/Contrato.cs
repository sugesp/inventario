namespace Domain.Model;

public class Contrato : BaseEntity
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
    public DateTime VigenciaAtual { get; set; }
    public DateTime? VigenciaMaxima { get; set; }
    public string ResponsavelGconv { get; set; } = string.Empty;
    public decimal ValorInicialContratual { get; set; }
    public decimal ValorAcrescimo { get; set; }
    public decimal ValorSupressao { get; set; }
    public decimal ValorAtualContrato { get; set; }

    public Fornecedor? Fornecedor { get; set; }
    public Unidade? UnidadeDemandante { get; set; }
    public ICollection<Aditivo> Aditivos { get; set; } = new List<Aditivo>();
    public ICollection<EquipeContrato> Equipe { get; set; } = new List<EquipeContrato>();
    public ICollection<ExercicioAnual> ExerciciosAnuais { get; set; } = new List<ExercicioAnual>();
    public ICollection<Notificacao> Notificacoes { get; set; } = new List<Notificacao>();
    public ICollection<Portaria> Portarias { get; set; } = new List<Portaria>();
    public ICollection<ProcuradorContrato> Procuradores { get; set; } = new List<ProcuradorContrato>();
}
