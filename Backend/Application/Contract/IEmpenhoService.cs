using Application.DTO.Empenho;

namespace Application.Contract;

public interface IEmpenhoService
{
    Task<IEnumerable<EmpenhoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<EmpenhoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EmpenhoDto> CreateAsync(EmpenhoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<EmpenhoDto?> UpdateAsync(Guid id, EmpenhoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
