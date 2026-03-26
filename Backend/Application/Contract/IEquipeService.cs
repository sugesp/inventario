using Application.DTO.Equipe;

namespace Application.Contract;

public interface IEquipeService
{
    Task<IEnumerable<EquipeDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<EquipeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EquipeDto> CreateAsync(EquipeCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<EquipeDto?> UpdateAsync(Guid id, EquipeCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
