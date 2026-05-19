using Application.DTO.Levantamento;

namespace Application.Contract;

public interface ILevantamentoService
{
    Task<IEnumerable<LevantamentoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LevantamentoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LevantamentoDto> CreateAsync(LevantamentoCreateDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<LevantamentoItemDto> ConfirmarItemAsync(Guid levantamentoId, LevantamentoConfirmItemDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
}
