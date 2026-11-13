using Application.Contract;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Application.Services;

public class FileStorageService : IFileStorageService
{
    private const long MaxFileSize = 10_000_000;
    private readonly string _rootPath;

    public FileStorageService(IConfiguration configuration)
    {
        var uploadsRoot = configuration["Storage:UploadsRoot"]?.Trim();
        _rootPath = Path.GetFullPath(string.IsNullOrWhiteSpace(uploadsRoot)
            ? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads")
            : uploadsRoot);
    }

    public async Task<(string NomeArquivo, string CaminhoRelativo, string Url)> SaveAsync(
        IFormFile file,
        string folder,
        CancellationToken cancellationToken = default
    )
    {
        if (file.Length <= 0)
        {
            throw new InvalidOperationException("Arquivo inválido.");
        }

        if (file.Length > MaxFileSize)
        {
            throw new InvalidOperationException("O arquivo deve ter no máximo 10 MB.");
        }

        var extension = await ValidateImageAsync(file, cancellationToken);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var safeFolder = SanitizeRelativePath(folder);
        var targetDirectory = Path.Combine(_rootPath, safeFolder);
        Directory.CreateDirectory(targetDirectory);

        var absolutePath = Path.Combine(targetDirectory, fileName);
        await using var stream = File.Create(absolutePath);
        await file.CopyToAsync(stream, cancellationToken);

        var relativePath = Path.Combine("uploads", safeFolder, fileName).Replace("\\", "/");
        return (fileName, relativePath, $"/{relativePath}");
    }

    public Task<(Stream Stream, string ContentType, string FileName)?> OpenReadAsync(
        string relativePath,
        string? downloadFileName = null,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        var absolutePath = ResolveAbsolutePath(relativePath);
        if (!File.Exists(absolutePath))
        {
            return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>(null);
        }

        var stream = File.OpenRead(absolutePath);
        var fileName = string.IsNullOrWhiteSpace(downloadFileName)
            ? Path.GetFileName(absolutePath)
            : Path.GetFileName(downloadFileName.Trim());
        var contentType = GetContentType(fileName);

        return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>((stream, contentType, fileName));
    }

    public void Delete(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return;
        }

        var absolutePath = ResolveAbsolutePath(relativePath);
        if (File.Exists(absolutePath))
        {
            File.Delete(absolutePath);
        }
    }

    public bool Exists(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return false;
        }

        try
        {
            return File.Exists(ResolveAbsolutePath(relativePath));
        }
        catch (InvalidOperationException)
        {
            return false;
        }
    }

    private string ResolveAbsolutePath(string relativePath)
    {
        var normalizedPath = SanitizeRelativePath(relativePath);
        var uploadsPrefix = $"uploads{Path.DirectorySeparatorChar}";
        var relativeToRoot = normalizedPath.StartsWith(uploadsPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalizedPath[uploadsPrefix.Length..]
            : normalizedPath;
        var absolutePath = Path.GetFullPath(Path.Combine(_rootPath, relativeToRoot));

        var rootPrefix = _rootPath.EndsWith(Path.DirectorySeparatorChar)
            ? _rootPath
            : _rootPath + Path.DirectorySeparatorChar;
        if (!absolutePath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Caminho de arquivo inválido.");
        }

        return absolutePath;
    }

    private static string SanitizeRelativePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return string.Empty;
        }

        var segments = path
            .Trim()
            .TrimStart('/', '\\')
            .Replace("\\", "/")
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Where(segment => segment is not "." and not "..")
            .Select(segment => Path.GetFileName(segment)!)
            .Where(segment => !string.IsNullOrWhiteSpace(segment));

        return Path.Combine(segments.ToArray());
    }

    private static string GetContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName).Trim().ToLowerInvariant();

        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }

    private static async Task<string> ValidateImageAsync(
        IFormFile file,
        CancellationToken cancellationToken
    )
    {
        var header = new byte[12];
        await using var stream = file.OpenReadStream();
        var bytesRead = await stream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);

        if (bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return ".jpg";
        }

        if (bytesRead >= 8
            && header.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return ".png";
        }

        if (bytesRead >= 6
            && (header.AsSpan(0, 6).SequenceEqual("GIF87a"u8)
                || header.AsSpan(0, 6).SequenceEqual("GIF89a"u8)))
        {
            return ".gif";
        }

        if (bytesRead >= 12
            && header.AsSpan(0, 4).SequenceEqual("RIFF"u8)
            && header.AsSpan(8, 4).SequenceEqual("WEBP"u8))
        {
            return ".webp";
        }

        if (bytesRead >= 2 && header[0] == 0x42 && header[1] == 0x4D)
        {
            return ".bmp";
        }

        throw new InvalidOperationException("Envie somente imagens JPG, PNG, GIF, WEBP ou BMP válidas.");
    }
}
