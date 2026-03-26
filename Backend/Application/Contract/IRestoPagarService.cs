using Application.DTO.RestoPagar;

namespace Application.Contract;

public interface IRestoPagarService
{
    Task<IEnumerable<RestoPagarDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<RestoPagarDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<RestoPagarDto> CreateAsync(RestoPagarCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<RestoPagarDto?> UpdateAsync(Guid id, RestoPagarCreateUpdateDto dto, CancellationToken cancellationToken = default);
}
