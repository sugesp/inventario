using Application.DTO.Fornecedor;
using Application.DTO.Common;

namespace Application.Contract;

public interface IFornecedorService
{
    Task<IEnumerable<FornecedorDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PagedResult<FornecedorDto>> GetPagedAsync(PageParams pageParams, CancellationToken cancellationToken = default);
    Task<FornecedorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<FornecedorDto> CreateAsync(FornecedorCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<FornecedorDto?> UpdateAsync(Guid id, FornecedorCreateUpdateDto dto, CancellationToken cancellationToken = default);
    Task<FornecedorConsultaCnpjDto?> ConsultarCnpjAsync(string cnpj, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
