namespace Application.DTO.LaudoTecnico;

public class LaudoTecnicoIdentificacaoDto
{
    public string ProcessoSei { get; set; } = string.Empty;
    public string IdDevolucaoSei { get; set; } = string.Empty;
    public string UnidadeGestora { get; set; } = string.Empty;
    public string Setor { get; set; } = string.Empty;
    public DateTime? DataAvaliacao { get; set; }
}
