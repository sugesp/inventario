using Application.DTO.UnidadeAdministrativa;

namespace Application.Contract;

public interface IUnidadeAdministrativaService
{
    Task<IEnumerable<UnidadeAdministrativaDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<UnidadeAdministrativaDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UnidadeAdministrativaDto> CreateAsync(UnidadeAdministrativaCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<UnidadeAdministrativaDto?> UpdateAsync(Guid id, UnidadeAdministrativaCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
