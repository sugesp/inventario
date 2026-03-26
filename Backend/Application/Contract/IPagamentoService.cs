using Application.DTO.Pagamento;

namespace Application.Contract;

public interface IPagamentoService
{
    Task<IEnumerable<PagamentoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PagamentoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagamentoDto> CreateAsync(PagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<PagamentoDto?> UpdateAsync(Guid id, PagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
