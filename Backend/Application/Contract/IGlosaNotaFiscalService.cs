using Application.DTO.GlosaNotaFiscal;

namespace Application.Contract;

public interface IGlosaNotaFiscalService
{
    Task<IEnumerable<GlosaNotaFiscalDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<GlosaNotaFiscalDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<GlosaNotaFiscalDto> CreateAsync(GlosaNotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<GlosaNotaFiscalDto?> UpdateAsync(Guid id, GlosaNotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default);
}
