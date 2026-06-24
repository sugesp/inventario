namespace Application.DTO.ItemInventariado;

public class InconsistenciaInventarioDto
{
    public string Tombamento { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid? ComissaoId { get; set; }
    public int? ComissaoAno { get; set; }
    public int QuantidadeOcorrencias { get; set; }
    public int QuantidadeLocais { get; set; }
    public IReadOnlyCollection<InconsistenciaInventarioOcorrenciaDto> Ocorrencias { get; set; } = Array.Empty<InconsistenciaInventarioOcorrenciaDto>();
}

public class InconsistenciaInventarioOcorrenciaDto
{
    public Guid ItemInventariadoId { get; set; }
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public Guid LocalId { get; set; }
    public string LocalNome { get; set; } = string.Empty;
    public IReadOnlyCollection<string> LocalMembrosNomes { get; set; } = Array.Empty<string>();
    public Guid UsuarioId { get; set; }
    public string UsuarioNome { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string EstadoConservacao { get; set; } = string.Empty;
    public DateTime DataInventario { get; set; }
    public string Observacao { get; set; } = string.Empty;
}
