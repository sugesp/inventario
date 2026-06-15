using System.Security.Claims;
using API.DTO.Auditoria;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Persistence.Contract;

namespace API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AuditoriaController : ControllerBase
{
    private readonly IAuditSink _auditSink;

    public AuditoriaController(IAuditSink auditSink)
    {
        _auditSink = auditSink;
    }

    [HttpPost("page-view")]
    public async Task<IActionResult> PageView([FromBody] PageViewAuditDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Path))
        {
            return BadRequest(new { message = "Path é obrigatório." });
        }

        var payload = new
        {
            timestampUtc = DateTime.UtcNow,
            path = dto.Path.Trim(),
            title = dto.Title?.Trim(),
            previousPath = dto.PreviousPath?.Trim(),
            authenticated = User.Identity?.IsAuthenticated == true,
            userId = GetUsuarioId(),
            login = GetLogin(),
            roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray(),
            ip = HttpContext.Connection.RemoteIpAddress?.ToString(),
            userAgent = Request.Headers.UserAgent.ToString(),
            referrer = Request.Headers.Referer.ToString(),
            traceId = HttpContext.TraceIdentifier
        };

        await _auditSink.EnqueueAsync("frontend-navigation", payload, cancellationToken);
        return Accepted();
    }

    private Guid? GetUsuarioId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(raw, out var usuarioId) ? usuarioId : null;
    }

    private string? GetLogin()
    {
        return User.FindFirstValue("login")
            ?? User.FindFirstValue("cpf")
            ?? User.FindFirstValue(ClaimTypes.Email)
            ?? User.FindFirstValue("email");
    }
}
