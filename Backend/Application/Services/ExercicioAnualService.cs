using Application.Contract;
using Application.DTO.ExercicioAnual;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class ExercicioAnualService : IExercicioAnualService
{
    private readonly IGenericRepository<ExercicioAnual> _repository;
    private readonly ExercicioAnualSyncService _syncService;

    public ExercicioAnualService(
        IGenericRepository<ExercicioAnual> repository,
        ExercicioAnualSyncService syncService
    )
    {
        _repository = repository;
        _syncService = syncService;
    }

    public async Task<IEnumerable<ExercicioAnualDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await _syncService.SyncAllAsync(cancellationToken);
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.Select(MapToDto).OrderBy(x => x.Ano);
    }

    public async Task<ExercicioAnualDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : MapToDto(entity);
    }

    private static ExercicioAnualDto MapToDto(ExercicioAnual entity)
    {
        return new ExercicioAnualDto
        {
            Id = entity.Id,
            ContratoId = entity.ContratoId,
            Ano = entity.Ano
        };
    }
}
