using Application.DTO.Transferencia;

namespace Application.Contract;

public interface ITransferenciaService
{
    Task<IEnumerable<TransferenciaDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TransferenciaDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TransferenciaDto> CreateAsync(TransferenciaSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<TransferenciaDto?> UpdateAsync(Guid id, TransferenciaSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
