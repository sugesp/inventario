using Application.DTO.Portaria;

namespace Application.Contract;

public interface IPortariaService
{
    Task<IEnumerable<PortariaDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PortariaDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PortariaDto> CreateAsync(PortariaCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<PortariaDto?> UpdateAsync(Guid id, PortariaCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
