using Application.DTO.Unidade;

namespace Application.Contract;

public interface IUnidadeService
{
    Task<IEnumerable<UnidadeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<UnidadeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<UnidadeDto> CreateAsync(UnidadeCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<UnidadeDto?> UpdateAsync(Guid id, UnidadeCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
