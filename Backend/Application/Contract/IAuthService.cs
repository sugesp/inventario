using Application.DTO.Auth;
using Application.DTO.Common;

namespace Application.Contract;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<UsuarioDto> PreRegisterAsync(PreRegisterDto dto, CancellationToken cancellationToken = default);
    Task<UsuarioDto> UpdateUserAsync(Guid usuarioId, RegisterDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<IEnumerable<UsuarioDto>> GetAllUsersAsync(CancellationToken cancellationToken = default);
    Task<PagedResult<UsuarioDto>> GetPagedUsersAsync(PageParams pageParams, CancellationToken cancellationToken = default);
    Task<IEnumerable<UsuarioResponsavelDto>> GetInventarioUsersAsync(CancellationToken cancellationToken = default);
    Task<AuthResponseDto> ChangePasswordAsync(Guid usuarioId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(Guid usuarioId, CancellationToken cancellationToken = default);
}
