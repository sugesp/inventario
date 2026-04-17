using Application.DTO.LaudoTecnico;

namespace Application.Contract;

public interface ILaudoTecnicoService
{
    Task<IEnumerable<LaudoTecnicoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LaudoTecnicoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LaudoTecnicoDto> CreateAsync(LaudoTecnicoSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
}
