using Application.DTO.ExercicioAnual;

namespace Application.Contract;

public interface IExercicioAnualService
{
    Task<IEnumerable<ExercicioAnualDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<ExercicioAnualDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
}
