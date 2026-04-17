namespace Application.DTO.LaudoTecnico;

public class LaudoTecnicoSaveDto
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
    public List<string> ProblemasIdentificados { get; set; } = new();
    public string OutroProblema { get; set; } = string.Empty;
    public string DescricaoTecnicaDetalhada { get; set; } = string.Empty;

    public bool? PossuiReparo { get; set; }
    public string DescricaoReparo { get; set; } = string.Empty;
    public decimal? ValorEstimadoMercado { get; set; }
    public decimal? CustoEstimadoManutencao { get; set; }
    public decimal? PercentualEstimado { get; set; }

    public string ClassificacaoTecnica { get; set; } = string.Empty;
    public string JustificativaTecnica { get; set; } = string.Empty;
    public List<string> Recomendacoes { get; set; } = new();
    public List<string> SugestoesDestinacao { get; set; } = new();
    public List<string> RegistroFotografico { get; set; } = new();
    public int? QuantidadeFotos { get; set; }

    public string ConclusaoCondicao { get; set; } = string.Empty;
    public string ClassificacaoFinal { get; set; } = string.Empty;
}
