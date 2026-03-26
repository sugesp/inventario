using Application.DTO.EquipeContrato;

namespace Application.Contract;

public interface IEquipeContratoService
{
    Task<IEnumerable<EquipeContratoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<EquipeContratoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<EquipeContratoDto> CreateAsync(EquipeContratoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<EquipeContratoDto?> UpdateAsync(Guid id, EquipeContratoCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
