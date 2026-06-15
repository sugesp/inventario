using System.Diagnostics;
using System.Security.Claims;
using Persistence.Contract;

namespace API.Auditing;

public sealed class ApiAccessAuditMiddleware
{
    private static readonly PathString AuditPath = new("/api/auditoria");
    private readonly RequestDelegate _next;

    public ApiAccessAuditMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IAuditSink auditSink)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();

            if (!ShouldSkip(context))
            {
                var user = context.User;
                var payload = new
                {
                    timestampUtc = DateTime.UtcNow,
                    method = context.Request.Method,
                    path = context.Request.Path.Value,
                    queryString = SanitizeQueryString(context.Request.QueryString.Value),
                    routeTemplate = (context.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText,
                    statusCode = context.Response.StatusCode,
                    durationMs = stopwatch.Elapsed.TotalMilliseconds,
                    authenticated = user.Identity?.IsAuthenticated == true,
                    userId = GetUsuarioId(user),
                    login = GetLogin(user),
                    roles = user.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray(),
                    ip = context.Connection.RemoteIpAddress?.ToString(),
                    userAgent = context.Request.Headers.UserAgent.ToString(),
                    referrer = context.Request.Headers.Referer.ToString(),
                    traceId = context.TraceIdentifier
                };

                await auditSink.EnqueueAsync("api-access", payload, context.RequestAborted);
            }
        }
    }

    private static bool ShouldSkip(HttpContext context)
    {
        return context.Request.Path.StartsWithSegments(AuditPath)
            || context.Request.Path.StartsWithSegments("/swagger")
            || context.Request.Path.StartsWithSegments("/health");
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

    private static string? SanitizeQueryString(string? queryString)
    {
        if (string.IsNullOrWhiteSpace(queryString))
        {
            return queryString;
        }

        return queryString.Contains("token=", StringComparison.OrdinalIgnoreCase)
            || queryString.Contains("senha=", StringComparison.OrdinalIgnoreCase)
            ? "[redacted]"
            : queryString;
    }
}
