namespace Application.DTO.ItemInventariado;

public class ConsultaTombamentoDto
{
    public string TombamentoPesquisado { get; set; } = string.Empty;
    public ConsultaPublicaBemDto? ConsultaPublica { get; set; }
    public ConsultaTombamentoOcorrenciasDto Ocorrencias { get; set; } = new();
}

public class ConsultaTombamentoOcorrenciasDto
{
    public IReadOnlyCollection<ConsultaTombamentoTransferenciaDto> Transferencias { get; set; } = Array.Empty<ConsultaTombamentoTransferenciaDto>();
    public IReadOnlyCollection<ConsultaTombamentoLevantamentoItemDto> ItensLevantamento { get; set; } = Array.Empty<ConsultaTombamentoLevantamentoItemDto>();
    public IReadOnlyCollection<ConsultaTombamentoLaudoDto> Laudos { get; set; } = Array.Empty<ConsultaTombamentoLaudoDto>();
    public IReadOnlyCollection<ConsultaTombamentoItemInventariadoDto> ItensInventariados { get; set; } = Array.Empty<ConsultaTombamentoItemInventariadoDto>();
}

public class ConsultaTombamentoTransferenciaDto
{
    public Guid TransferenciaId { get; set; }
    public Guid ItemId { get; set; }
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string StatusTransferencia { get; set; } = string.Empty;
    public string StatusItem { get; set; } = string.Empty;
    public string Condicao { get; set; } = string.Empty;
    public string UnidadeAdministrativaDestinoNome { get; set; } = string.Empty;
    public string UnidadeAdministrativaDestinoSigla { get; set; } = string.Empty;
    public string ResponsavelDestino { get; set; } = string.Empty;
    public string IdSeiTermo { get; set; } = string.Empty;
    public DateTime? DataEntrega { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ConsultaTombamentoLevantamentoItemDto
{
    public Guid LevantamentoId { get; set; }
    public Guid ItemId { get; set; }
    public string LevantamentoNome { get; set; } = string.Empty;
    public string Tombamento { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string ConfirmadoPorUsuarioNome { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ConsultaTombamentoLaudoDto
{
    public Guid Id { get; set; }
    public string Patrimonio { get; set; } = string.Empty;
    public string ProcessoSei { get; set; } = string.Empty;
    public string IdDevolucaoSei { get; set; } = string.Empty;
    public string TipoEquipamento { get; set; } = string.Empty;
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string NumeroSerie { get; set; } = string.Empty;
    public string ClassificacaoFinal { get; set; } = string.Empty;
    public string ResponsavelTecnicoNome { get; set; } = string.Empty;
    public DateTime? DataAvaliacao { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ConsultaTombamentoItemInventariadoDto
{
    public Guid Id { get; set; }
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string LocalNome { get; set; } = string.Empty;
    public string EquipeDescricao { get; set; } = string.Empty;
    public string UsuarioNome { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string EstadoConservacao { get; set; } = string.Empty;
    public bool LancadoEEstado { get; set; }
    public DateTime DataInventario { get; set; }
}
