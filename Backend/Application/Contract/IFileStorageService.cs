using Microsoft.AspNetCore.Http;

namespace Application.Contract;

public interface IFileStorageService
{
    Task<(string NomeArquivo, string CaminhoRelativo, string Url)> SaveAsync(
        IFormFile file,
        string folder,
        CancellationToken cancellationToken = default
    );
    void Delete(string relativePath);
}
