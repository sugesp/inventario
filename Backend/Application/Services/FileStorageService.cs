using Application.Contract;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Application.Services;

public class FileStorageService : IFileStorageService
{
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

        var extension = Path.GetExtension(Path.GetFileName(file.FileName));
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

    private string ResolveAbsolutePath(string relativePath)
    {
        var normalizedPath = SanitizeRelativePath(relativePath);
        var uploadsPrefix = $"uploads{Path.DirectorySeparatorChar}";
        var relativeToRoot = normalizedPath.StartsWith(uploadsPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalizedPath[uploadsPrefix.Length..]
            : normalizedPath;
        var absolutePath = Path.GetFullPath(Path.Combine(_rootPath, relativeToRoot));

        if (!absolutePath.StartsWith(_rootPath, StringComparison.OrdinalIgnoreCase))
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
}
