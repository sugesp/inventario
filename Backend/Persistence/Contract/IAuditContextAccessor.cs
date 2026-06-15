namespace Persistence.Contract;

public sealed class AuditContext
{
    public Guid? UsuarioId { get; init; }
    public string? Login { get; init; }
    public IReadOnlyCollection<string> Perfis { get; init; } = Array.Empty<string>();
    public string? Path { get; init; }
    public string? MetodoHttp { get; init; }
    public string? TraceId { get; init; }
}

public interface IAuditContextAccessor
{
    AuditContext Current { get; }
}
