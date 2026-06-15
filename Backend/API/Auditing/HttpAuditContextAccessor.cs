using System.Security.Claims;
using Persistence.Contract;

namespace API.Auditing;

public sealed class HttpAuditContextAccessor : IAuditContextAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpAuditContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public AuditContext Current
    {
        get
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext is null)
            {
                return new AuditContext();
            }

            return new AuditContext
            {
                UsuarioId = GetUsuarioId(httpContext.User),
                Login = GetLogin(httpContext.User),
                Perfis = httpContext.User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray(),
                Path = httpContext.Request.Path.Value,
                MetodoHttp = httpContext.Request.Method,
                TraceId = httpContext.TraceIdentifier
            };
        }
    }

    private static Guid? GetUsuarioId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(raw, out var usuarioId) ? usuarioId : null;
    }

    private static string? GetLogin(ClaimsPrincipal user)
    {
        return user.FindFirstValue("login")
            ?? user.FindFirstValue("cpf")
            ?? user.FindFirstValue(ClaimTypes.Email)
            ?? user.FindFirstValue("email");
    }
}
