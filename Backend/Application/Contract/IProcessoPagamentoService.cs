using Application.DTO.ProcessoPagamento;

namespace Application.Contract;

public interface IProcessoPagamentoService
{
    Task<IEnumerable<ProcessoPagamentoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ProcessoPagamentoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ProcessoPagamentoDto> CreateAsync(ProcessoPagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<ProcessoPagamentoDto?> UpdateAsync(Guid id, ProcessoPagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
