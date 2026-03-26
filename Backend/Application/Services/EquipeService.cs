using Application.Contract;
using Application.DTO.Equipe;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class EquipeService : IEquipeService
{
    private readonly IGenericRepository<Equipe> _repository;

    public EquipeService(IGenericRepository<Equipe> repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<EquipeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return (await _repository.GetAllAsync(cancellationToken))
            .Select(MapToDto)
            .OrderBy(x => x.Descricao);
    }

    public async Task<EquipeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<EquipeDto> CreateAsync(EquipeCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        Validate(dto);

        var entity = new Equipe
        {
            Descricao = dto.Descricao.Trim()
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<EquipeDto?> UpdateAsync(Guid id, EquipeCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        Validate(dto);

        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.Descricao = dto.Descricao.Trim();
        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        _repository.Delete(entity);
        return await _repository.SaveChangesAsync(cancellationToken);
    }

    private static void Validate(EquipeCreateUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Descricao))
        {
            throw new InvalidOperationException("A descrição da equipe é obrigatória.");
        }
    }

    private static EquipeDto MapToDto(Equipe entity)
    {
        return new EquipeDto
        {
            Id = entity.Id,
            Descricao = entity.Descricao
        };
    }
}
