namespace Persistence.Contract;

public interface IAuditSink
{
    ValueTask EnqueueAsync(string category, object payload, CancellationToken cancellationToken = default);
}
