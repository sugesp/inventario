namespace Domain.Model;

public class LaudoTecnico : BaseEntity
{
    public string ProcessoSei { get; set; } = string.Empty;
    public string IdDevolucaoSei { get; set; } = string.Empty;
    public string UnidadeGestora { get; set; } = string.Empty;
    public string Setor { get; set; } = string.Empty;
    public DateTime? DataAvaliacao { get; set; }

    public string TipoEquipamento { get; set; } = string.Empty;
    public string OutroTipoEquipamento { get; set; } = string.Empty;
    public string Patrimonio { get; set; } = string.Empty;
    public string NumeroSerie { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string AnoAquisicao { get; set; } = string.Empty;

    public string Processador { get; set; } = string.Empty;
    public string Memoria { get; set; } = string.Empty;
    public string Armazenamento { get; set; } = string.Empty;
    public string SistemaOperacional { get; set; } = string.Empty;
    public string Outros { get; set; } = string.Empty;

    public string CondicaoFuncionamento { get; set; } = string.Empty;
    public string DescricaoFuncionamento { get; set; } = string.Empty;
    public string EstadoConservacao { get; set; } = string.Empty;
    public string ProblemasIdentificadosJson { get; set; } = "[]";
    public string OutroProblema { get; set; } = string.Empty;
    public string DescricaoTecnicaDetalhada { get; set; } = string.Empty;

    public bool? PossuiReparo { get; set; }
    public string DescricaoReparo { get; set; } = string.Empty;
    public decimal? ValorEstimadoMercado { get; set; }
    public decimal? CustoEstimadoManutencao { get; set; }
    public decimal? PercentualEstimado { get; set; }

    public string ClassificacaoTecnica { get; set; } = string.Empty;
    public string JustificativaTecnica { get; set; } = string.Empty;
    public string RecomendacoesJson { get; set; } = "[]";
    public string SugestoesDestinacaoJson { get; set; } = "[]";
    public string RegistroFotograficoJson { get; set; } = "[]";
    public int? QuantidadeFotos { get; set; }

    public string ConclusaoCondicao { get; set; } = string.Empty;
    public string ClassificacaoFinal { get; set; } = string.Empty;

    public Guid ResponsavelTecnicoUsuarioId { get; set; }
    public string ResponsavelTecnicoNome { get; set; } = string.Empty;
    public string ResponsavelTecnicoCargo { get; set; } = string.Empty;

    public Usuario? ResponsavelTecnicoUsuario { get; set; }
}
