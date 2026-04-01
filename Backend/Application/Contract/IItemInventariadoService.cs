using Application.DTO.ItemInventariado;
using Microsoft.AspNetCore.Http;

namespace Application.Contract;

public interface IItemInventariadoService
{
    Task<IEnumerable<ItemInventariadoDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ItemInventariadoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ConsultaPublicaBemDto?> ConsultarResumoPublicoAsync(string tombamento, CancellationToken cancellationToken = default);
    Task<(Stream Stream, string ContentType, string FileName)?> GetFotoAsync(
        Guid itemId,
        Guid fotoId,
        CancellationToken cancellationToken = default
    );
    Task<ItemInventariadoDto> CreateAsync(
        ItemInventariadoFormDto dto,
        IEnumerable<IFormFile> fotos,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    );
    Task<ItemInventariadoDto?> UpdateAsync(
        Guid id,
        ItemInventariadoFormDto dto,
        IEnumerable<IFormFile> novasFotos,
        CancellationToken cancellationToken = default
    );
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
