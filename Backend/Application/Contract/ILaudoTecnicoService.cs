using Application.DTO.LaudoTecnico;

namespace Application.Contract;

public interface ILaudoTecnicoService
{
    Task<LaudoTecnicoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LaudoTecnicoDto> CreateAsync(LaudoTecnicoSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
}
