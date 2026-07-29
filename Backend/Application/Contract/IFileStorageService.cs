using Microsoft.AspNetCore.Http;

namespace Application.Contract;

public interface IFileStorageService
{
    Task<(string NomeArquivo, string CaminhoRelativo, string Url)> SaveAsync(
        IFormFile file,
        string folder,
        CancellationToken cancellationToken = default
    );
    Task<(Stream Stream, string ContentType, string FileName)?> OpenReadAsync(
        string relativePath,
        string? downloadFileName = null,
        CancellationToken cancellationToken = default
    );
    bool Exists(string relativePath);
    void Delete(string relativePath);
}
