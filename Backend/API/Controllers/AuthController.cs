using Application.Contract;
using Application.DTO.Auth;
using Application.DTO.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _service;

    public AuthController(IAuthService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    [HttpPost("pre-register")]
    public async Task<ActionResult<UsuarioDto>> PreRegister(
        [FromBody] PreRegisterDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return Ok(await _service.PreRegisterAsync(dto, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(
        [FromBody] RegisterDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return Ok(await _service.RegisterAsync(dto, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador")]
    [HttpPut("users/{id:guid}")]
    public async Task<ActionResult<UsuarioDto>> UpdateUser(
        Guid id,
        [FromBody] RegisterDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return Ok(await _service.UpdateUserAsync(id, dto, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(
        [FromBody] LoginDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return Ok(await _service.LoginAsync(dto, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador")]
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<UsuarioDto>>> GetUsers(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetAllUsersAsync(cancellationToken));
    }

    [Authorize(Roles = "Administrador")]
    [HttpGet("users/paged")]
    public async Task<ActionResult<PagedResult<UsuarioDto>>> GetPagedUsers(
        [FromQuery] PageParams pageParams,
        CancellationToken cancellationToken
    )
    {
        return Ok(await _service.GetPagedUsersAsync(pageParams, cancellationToken));
    }

    [Authorize]
    [HttpGet("users/inventario")]
    public async Task<ActionResult<IEnumerable<UsuarioResponsavelDto>>> GetInventarioUsers(CancellationToken cancellationToken)
    {
        return Ok(await _service.GetInventarioUsersAsync(cancellationToken));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult<AuthResponseDto>> ChangePassword(
        [FromBody] ChangePasswordDto dto,
        CancellationToken cancellationToken
    )
    {
        try
        {
            if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var usuarioId))
            {
                return Unauthorized();
            }

            return Ok(await _service.ChangePasswordAsync(usuarioId, dto, cancellationToken));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Administrador")]
    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            await _service.ResetPasswordAsync(id, cancellationToken);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
