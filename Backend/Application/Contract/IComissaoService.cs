using Application.DTO.Comissao;

namespace Application.Contract;

public interface IComissaoService
{
    Task<IEnumerable<ComissaoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ComissaoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ComissaoDto?> GetActiveAsync(CancellationToken cancellationToken = default);
    Task<bool> IsPresidentAsync(Guid comissaoId, Guid usuarioId, CancellationToken cancellationToken = default);
    Task<ComissaoDto> CreateAsync(ComissaoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<ComissaoDto?> UpdateAsync(Guid id, ComissaoCreateUpdateDto dto, bool usuarioAdministrador, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
