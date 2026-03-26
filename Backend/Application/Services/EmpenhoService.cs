using Application.Contract;
using Application.DTO.Empenho;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class EmpenhoService : IEmpenhoService
{
    private readonly IGenericRepository<Empenho> _repository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public EmpenhoService(
        IGenericRepository<Empenho> repository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _exercicioRepository = exercicioRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<EmpenhoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var empenhos = (await _repository.GetAllAsync(cancellationToken)).ToList();
        var exercicios = (await _exercicioRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);

        return empenhos
            .Select(x => MapToDto(x, exercicios.GetValueOrDefault(x.ExercicioAnualId)))
            .OrderByDescending(x => x.DataEmpenho);
    }

    public async Task<EmpenhoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var exercicio = await _exercicioRepository.GetByIdAsync(entity.ExercicioAnualId, cancellationToken);
        return MapToDto(entity, exercicio);
    }

    public async Task<EmpenhoDto> CreateAsync(EmpenhoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.IdSei))
        {
            throw new InvalidOperationException("O ID Sei do empenho é obrigatório.");
        }

        var exercicio = await EnsureExercicioExists(dto.ExercicioAnualId, cancellationToken);

        var entity = new Empenho
        {
            ExercicioAnualId = dto.ExercicioAnualId,
            NumeroEmpenho = dto.NumeroEmpenho,
            IdSei = dto.IdSei,
            DataEmpenho = dto.DataEmpenho,
            ValorEmpenhado = dto.ValorEmpenhado,
            ValorLiquidado = 0,
            Fonte = dto.Fonte,
            Observacao = dto.Observacao
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, exercicio);
    }

    public async Task<EmpenhoDto?> UpdateAsync(Guid id, EmpenhoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(dto.IdSei))
        {
            throw new InvalidOperationException("O ID Sei do empenho é obrigatório.");
        }

        var exercicioAtual = await EnsureExercicioExists(entity.ExercicioAnualId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(exercicioAtual.ContratoId, cancellationToken);
        var exercicio = await EnsureExercicioExists(dto.ExercicioAnualId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(exercicio.ContratoId, cancellationToken);

        entity.ExercicioAnualId = dto.ExercicioAnualId;
        entity.NumeroEmpenho = dto.NumeroEmpenho;
        entity.IdSei = dto.IdSei;
        entity.DataEmpenho = dto.DataEmpenho;
        entity.ValorEmpenhado = dto.ValorEmpenhado;
        entity.Fonte = dto.Fonte;
        entity.Observacao = dto.Observacao;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, exercicio);
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

    private async Task<ExercicioAnual> EnsureExercicioExists(Guid exercicioAnualId, CancellationToken cancellationToken)
    {
        var exercicio = await _exercicioRepository.GetByIdAsync(exercicioAnualId, cancellationToken);
        if (exercicio is null)
        {
            throw new InvalidOperationException("Exercicio anual nao encontrado.");
        }

        return exercicio;
    }

    private static EmpenhoDto MapToDto(Empenho entity, ExercicioAnual? exercicio)
    {
        return new EmpenhoDto
        {
            Id = entity.Id,
            ExercicioAnualId = entity.ExercicioAnualId,
            ContratoId = exercicio?.ContratoId ?? Guid.Empty,
            ExercicioAno = exercicio?.Ano ?? 0,
            NumeroEmpenho = entity.NumeroEmpenho,
            IdSei = entity.IdSei,
            DataEmpenho = entity.DataEmpenho,
            ValorEmpenhado = entity.ValorEmpenhado,
            ValorLiquidado = entity.ValorLiquidado,
            Fonte = entity.Fonte,
            Observacao = entity.Observacao
        };
    }
}
