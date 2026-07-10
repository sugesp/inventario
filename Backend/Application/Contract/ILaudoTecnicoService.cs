using Application.DTO.LaudoTecnico;
using Microsoft.AspNetCore.Http;

namespace Application.Contract;

public interface ILaudoTecnicoService
{
    Task<IEnumerable<LaudoTecnicoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<LaudoTecnicoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<LaudoTecnicoDto> CreateAsync(LaudoTecnicoSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default);
    Task<LaudoTecnicoDto?> UpdateIdentificacaoAsync(Guid id, LaudoTecnicoIdentificacaoDto dto, CancellationToken cancellationToken = default);
    Task<LaudoTecnicoDto?> AddFotosAsync(Guid id, IReadOnlyList<IFormFile> fotos, IReadOnlyList<string> categorias, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType, string FileName)?> GetFotoAsync(Guid id, Guid fotoId, CancellationToken cancellationToken = default);
}
