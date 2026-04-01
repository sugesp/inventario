namespace Application.DTO.Transferencia;

public class TransferenciaItemSaveDto
{
    public string TombamentoNovo { get; set; } = string.Empty;
    public string TombamentoAntigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public string StatusItem { get; set; } = string.Empty;
    public string Condicao { get; set; } = string.Empty;
    public string Observacao { get; set; } = string.Empty;
}
