using Application.DTO.Local;

namespace Application.Contract;

public interface ILocalService
{
    Task<IEnumerable<LocalDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LocalDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LocalDto> CreateAsync(LocalCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<LocalDto?> UpdateAsync(Guid id, LocalCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
