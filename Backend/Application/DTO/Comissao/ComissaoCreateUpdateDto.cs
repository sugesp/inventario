namespace Application.DTO.Comissao;

public class ComissaoCreateUpdateDto
{
    public int Ano { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid PresidenteId { get; set; }
    public List<ComissaoMembroSaveDto> Membros { get; set; } = new();
}
