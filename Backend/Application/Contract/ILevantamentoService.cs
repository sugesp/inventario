using Application.DTO.Levantamento;

namespace Application.Contract;

public interface ILevantamentoService
{
    Task<IEnumerable<LevantamentoDto>> GetAllAsync(Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<LevantamentoDto?> GetByIdAsync(Guid id, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<LevantamentoDto> CreateAsync(LevantamentoCreateDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<LevantamentoDto?> CompartilharAsync(Guid id, LevantamentoCompartilharDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<LevantamentoItemDto> ConfirmarItemAsync(Guid levantamentoId, LevantamentoConfirmItemDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<bool> DeleteItemAsync(Guid levantamentoId, Guid itemId, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
}
