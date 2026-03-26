using Application.DTO.Liquidacao;

namespace Application.Contract;

public interface ILiquidacaoService
{
    Task<IEnumerable<LiquidacaoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LiquidacaoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LiquidacaoDto> CreateAsync(LiquidacaoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<LiquidacaoDto?> UpdateAsync(Guid id, LiquidacaoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
