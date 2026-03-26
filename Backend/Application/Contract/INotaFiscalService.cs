using Application.DTO.NotaFiscal;

namespace Application.Contract;

public interface INotaFiscalService
{
    Task<IEnumerable<NotaFiscalDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<NotaFiscalDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<NotaFiscalDto> CreateAsync(NotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<NotaFiscalDto?> UpdateAsync(Guid id, NotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
