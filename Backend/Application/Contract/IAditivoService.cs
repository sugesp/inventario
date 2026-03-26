using Application.DTO.Aditivo;

namespace Application.Contract;

public interface IAditivoService
{
    Task<IEnumerable<AditivoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<AditivoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AditivoDto> CreateAsync(AditivoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<AditivoDto?> UpdateAsync(Guid id, AditivoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
