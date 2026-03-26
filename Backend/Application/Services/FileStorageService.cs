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
        _rootPath = string.IsNullOrWhiteSpace(uploadsRoot)
            ? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads")
            : Path.GetFullPath(uploadsRoot);
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

        var extension = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var safeFolder = folder.Trim().Replace("\\", "/").Trim('/');
        var targetDirectory = Path.Combine(_rootPath, safeFolder);
        Directory.CreateDirectory(targetDirectory);

        var absolutePath = Path.Combine(targetDirectory, fileName);
        await using var stream = File.Create(absolutePath);
        await file.CopyToAsync(stream, cancellationToken);

        var relativePath = Path.Combine("uploads", safeFolder, fileName).Replace("\\", "/");
        return (fileName, relativePath, $"/{relativePath}");
    }

    public void Delete(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return;
        }

        var normalizedPath = relativePath.Trim().TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString());
        var absolutePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", normalizedPath);
        if (File.Exists(absolutePath))
        {
            File.Delete(absolutePath);
        }
    }
}
