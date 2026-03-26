using Application.Contract;
using Application.DTO.Unidade;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class UnidadeService : IUnidadeService
{
    private readonly IGenericRepository<Unidade> _repository;

    public UnidadeService(IGenericRepository<Unidade> repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<UnidadeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var unidades = (await _repository.GetAllAsync(cancellationToken)).ToList();
        var lookup = unidades.ToDictionary(x => x.Id, x => x.Nome);

        return unidades
            .Select(x => MapToDto(x, x.UnidadeSuperiorId.HasValue ? lookup.GetValueOrDefault(x.UnidadeSuperiorId.Value) : null))
            .OrderBy(x => x.Nome);
    }

    public async Task<UnidadeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var unidade = await _repository.GetByIdAsync(id, cancellationToken);
        if (unidade is null)
        {
            return null;
        }

        string? unidadeSuperiorNome = null;
        if (unidade.UnidadeSuperiorId.HasValue)
        {
            var superior = await _repository.GetByIdAsync(unidade.UnidadeSuperiorId.Value, cancellationToken);
            unidadeSuperiorNome = superior?.Nome;
        }

        return MapToDto(unidade, unidadeSuperiorNome);
    }

    public async Task<UnidadeDto> CreateAsync(UnidadeCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        await EnsureParentIsValid(dto.UnidadeSuperiorId, null, cancellationToken);

        var unidade = new Unidade
        {
            Nome = dto.Nome.Trim(),
            Sigla = dto.Sigla.Trim().ToUpperInvariant(),
            UnidadeSuperiorId = dto.UnidadeSuperiorId
        };

        await _repository.AddAsync(unidade, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(unidade);
    }

    public async Task<UnidadeDto?> UpdateAsync(Guid id, UnidadeCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var unidade = await _repository.GetByIdAsync(id, cancellationToken);
        if (unidade is null)
        {
            return null;
        }

        await EnsureParentIsValid(dto.UnidadeSuperiorId, id, cancellationToken);

        unidade.Nome = dto.Nome.Trim();
        unidade.Sigla = dto.Sigla.Trim().ToUpperInvariant();
        unidade.UnidadeSuperiorId = dto.UnidadeSuperiorId;

        _repository.Update(unidade);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(unidade);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var unidade = await _repository.GetByIdAsync(id, cancellationToken);
        if (unidade is null)
        {
            return false;
        }

        var possuiFilhas = (await _repository.FindAsync(x => x.UnidadeSuperiorId == id, cancellationToken)).Any();
        if (possuiFilhas)
        {
            throw new InvalidOperationException("Não é possível excluir uma unidade que possui unidades filhas.");
        }

        _repository.Delete(unidade);
        return await _repository.SaveChangesAsync(cancellationToken);
    }

    private async Task EnsureParentIsValid(Guid? unidadeSuperiorId, Guid? unidadeId, CancellationToken cancellationToken)
    {
        if (!unidadeSuperiorId.HasValue)
        {
            return;
        }

        if (unidadeId.HasValue && unidadeSuperiorId == unidadeId)
        {
            throw new InvalidOperationException("A unidade superior não pode ser a própria unidade.");
        }

        var superior = await _repository.GetByIdAsync(unidadeSuperiorId.Value, cancellationToken);
        if (superior is null)
        {
            throw new InvalidOperationException("Unidade superior não encontrada.");
        }
    }

    private static UnidadeDto MapToDto(Unidade unidade, string? unidadeSuperiorNome = null)
    {
        return new UnidadeDto
        {
            Id = unidade.Id,
            Nome = unidade.Nome,
            Sigla = unidade.Sigla,
            UnidadeSuperiorId = unidade.UnidadeSuperiorId,
            UnidadeSuperiorNome = unidadeSuperiorNome
        };
    }
}
