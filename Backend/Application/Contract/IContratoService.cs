using Application.DTO.Contrato;
using Application.DTO.Common;

namespace Application.Contract;

public interface IContratoService
{
    Task<IEnumerable<ContratoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PagedResult<ContratoDto>> GetPagedAsync(PageParams pageParams, CancellationToken cancellationToken = default);
    Task<ContratoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ContratoDto> CreateAsync(ContratoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<ContratoDto?> UpdateAsync(Guid id, ContratoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
