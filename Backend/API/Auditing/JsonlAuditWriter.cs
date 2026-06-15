using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading.Channels;
using Persistence.Contract;

namespace API.Auditing;

public sealed class JsonlAuditWriter : BackgroundService, IAuditSink
{
    private readonly Channel<AuditEnvelope> _channel = Channel.CreateBounded<AuditEnvelope>(
        new BoundedChannelOptions(10_000)
        {
            FullMode = BoundedChannelFullMode.DropWrite,
            SingleReader = true,
            SingleWriter = false
        }
    );
    private readonly ILogger<JsonlAuditWriter> _logger;
    private readonly string _rootPath;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    public JsonlAuditWriter(IConfiguration configuration, IWebHostEnvironment environment, ILogger<JsonlAuditWriter> logger)
    {
        _logger = logger;
        var configuredPath = configuration["Audit:LogsPath"];
        _rootPath = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(environment.ContentRootPath, "logs", "audit")
            : Path.GetFullPath(configuredPath);
    }

    public ValueTask EnqueueAsync(string category, object payload, CancellationToken cancellationToken = default)
    {
        var envelope = new AuditEnvelope(category, DateTime.UtcNow, payload);
        _channel.Writer.TryWrite(envelope);
        return ValueTask.CompletedTask;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Directory.CreateDirectory(_rootPath);

        await foreach (var envelope in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await WriteAsync(envelope, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao gravar log de auditoria {Category}.", envelope.Category);
            }
        }
    }

    private async Task WriteAsync(AuditEnvelope envelope, CancellationToken cancellationToken)
    {
        var safeCategory = SanitizeCategory(envelope.Category);
        var filePath = Path.Combine(_rootPath, $"{safeCategory}-{envelope.TimestampUtc:yyyyMMdd}.jsonl");
        var json = JsonSerializer.Serialize(envelope.Payload, _jsonOptions);

        await File.AppendAllTextAsync(filePath, json + Environment.NewLine, cancellationToken);
    }

    private static string SanitizeCategory(string category)
    {
        var safeChars = category
            .Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_')
            .ToArray();

        return safeChars.Length == 0 ? "audit" : new string(safeChars);
    }

    private sealed record AuditEnvelope(string Category, DateTime TimestampUtc, object Payload);
}
