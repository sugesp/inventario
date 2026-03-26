using Application.Contract;
using Application.DTO.ProcessoPagamento;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class ProcessoPagamentoService : IProcessoPagamentoService
{
    private readonly IGenericRepository<ProcessoPagamento> _repository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public ProcessoPagamentoService(
        IGenericRepository<ProcessoPagamento> repository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _exercicioRepository = exercicioRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<ProcessoPagamentoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var processos = (await _repository.GetAllAsync(cancellationToken)).ToList();
        var exercicios = (await _exercicioRepository.GetAllAsync(cancellationToken))
            .ToDictionary(x => x.Id);

        return processos
            .Select(x => MapToDto(x, exercicios.GetValueOrDefault(x.ExercicioAnualId)))
            .OrderBy(x => x.ExercicioAno)
            .ThenBy(x => x.NumeroProcesso);
    }

    public async Task<ProcessoPagamentoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var exercicio = await _exercicioRepository.GetByIdAsync(entity.ExercicioAnualId, cancellationToken);
        return MapToDto(entity, exercicio);
    }

    public async Task<ProcessoPagamentoDto> CreateAsync(ProcessoPagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var exercicio = await EnsureExercicioExists(dto.ExercicioAnualId, cancellationToken);

        var entity = new ProcessoPagamento
        {
            ExercicioAnualId = dto.ExercicioAnualId,
            NumeroProcesso = dto.NumeroProcesso,
            Observacoes = dto.Observacoes
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, exercicio);
    }

    public async Task<ProcessoPagamentoDto?> UpdateAsync(Guid id, ProcessoPagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var exercicioAtual = await EnsureExercicioExists(entity.ExercicioAnualId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(exercicioAtual.ContratoId, cancellationToken);
        var exercicio = await EnsureExercicioExists(dto.ExercicioAnualId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(exercicio.ContratoId, cancellationToken);

        entity.ExercicioAnualId = dto.ExercicioAnualId;
        entity.NumeroProcesso = dto.NumeroProcesso;
        entity.Observacoes = dto.Observacoes;

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

    private static ProcessoPagamentoDto MapToDto(ProcessoPagamento entity, ExercicioAnual? exercicio)
    {
        return new ProcessoPagamentoDto
        {
            Id = entity.Id,
            ExercicioAnualId = entity.ExercicioAnualId,
            ContratoId = exercicio?.ContratoId ?? Guid.Empty,
            ExercicioAno = exercicio?.Ano ?? 0,
            NumeroProcesso = entity.NumeroProcesso,
            Observacoes = entity.Observacoes
        };
    }
}
