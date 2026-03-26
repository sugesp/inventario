using Application.Contract;
using Application.DTO.NotaFiscal;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class NotaFiscalService : INotaFiscalService
{
    private readonly IGenericRepository<NotaFiscal> _repository;
    private readonly IGenericRepository<GlosaNotaFiscal> _glosaRepository;
    private readonly IGenericRepository<Liquidacao> _liquidacaoRepository;
    private readonly IGenericRepository<ProcessoPagamento> _processoRepository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public NotaFiscalService(
        IGenericRepository<NotaFiscal> repository,
        IGenericRepository<GlosaNotaFiscal> glosaRepository,
        IGenericRepository<Liquidacao> liquidacaoRepository,
        IGenericRepository<ProcessoPagamento> processoRepository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _glosaRepository = glosaRepository;
        _liquidacaoRepository = liquidacaoRepository;
        _processoRepository = processoRepository;
        _exercicioRepository = exercicioRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<NotaFiscalDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var notas = (await _repository.GetAllAsync(cancellationToken)).ToList();
        var processos = (await _processoRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);
        var exercicios = (await _exercicioRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);

        return notas
            .Select(x =>
            {
                var processo = processos.GetValueOrDefault(x.ProcessoPagamentoId);
                var exercicio = processo is null ? null : exercicios.GetValueOrDefault(processo.ExercicioAnualId);
                return MapToDto(x, processo, exercicio);
            })
            .OrderByDescending(x => x.DataEmissao);
    }

    public async Task<NotaFiscalDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var processo = await _processoRepository.GetByIdAsync(entity.ProcessoPagamentoId, cancellationToken);
        var exercicio = processo is null ? null : await _exercicioRepository.GetByIdAsync(processo.ExercicioAnualId, cancellationToken);
        return MapToDto(entity, processo, exercicio);
    }

    public async Task<NotaFiscalDto> CreateAsync(NotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var processo = await EnsureProcessoExists(dto.ProcessoPagamentoId, cancellationToken);
        var exercicio = await EnsureExercicioExists(processo.ExercicioAnualId, cancellationToken);

        var entity = new NotaFiscal
        {
            ProcessoPagamentoId = dto.ProcessoPagamentoId,
            Numero = dto.Numero,
            Serie = dto.Serie,
            Referencia = dto.Referencia,
            IdSei = dto.IdSei,
            DataEmissao = dto.DataEmissao,
            Valor = dto.Valor,
            BaseCalculo = dto.BaseCalculo,
            Inss = dto.Inss,
            Iss = dto.Iss,
            Irrf = dto.Irrf
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, processo, exercicio);
    }

    public async Task<NotaFiscalDto?> UpdateAsync(Guid id, NotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var processoAtual = await EnsureProcessoExists(entity.ProcessoPagamentoId, cancellationToken);
        var exercicioAtual = await EnsureExercicioExists(processoAtual.ExercicioAnualId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(exercicioAtual.ContratoId, cancellationToken);
        var processo = await EnsureProcessoExists(dto.ProcessoPagamentoId, cancellationToken);
        var exercicio = await EnsureExercicioExists(processo.ExercicioAnualId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(exercicio.ContratoId, cancellationToken);

        entity.ProcessoPagamentoId = dto.ProcessoPagamentoId;
        entity.Numero = dto.Numero;
        entity.Serie = dto.Serie;
        entity.Referencia = dto.Referencia;
        entity.IdSei = dto.IdSei;
        entity.DataEmissao = dto.DataEmissao;
        entity.Valor = dto.Valor;
        entity.BaseCalculo = dto.BaseCalculo;
        entity.Inss = dto.Inss;
        entity.Iss = dto.Iss;
        entity.Irrf = dto.Irrf;

        await EnsureNotaFiscalCanSupportValue(entity, cancellationToken);

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, processo, exercicio);
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

    private async Task<ProcessoPagamento> EnsureProcessoExists(Guid processoPagamentoId, CancellationToken cancellationToken)
    {
        var processo = await _processoRepository.GetByIdAsync(processoPagamentoId, cancellationToken);
        if (processo is null)
        {
            throw new InvalidOperationException("Processo de pagamento nao encontrado.");
        }

        return processo;
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

    private async Task EnsureNotaFiscalCanSupportValue(NotaFiscal notaFiscal, CancellationToken cancellationToken)
    {
        var totalGlosado = (await _glosaRepository.FindAsync(x => x.NotaFiscalId == notaFiscal.Id, cancellationToken))
            .Sum(x => x.ValorGlosa);
        var totalLiquidado = (await _liquidacaoRepository.FindAsync(x => x.NotaFiscalId == notaFiscal.Id, cancellationToken))
            .Sum(x => x.ValorLiquidado);

        if (totalGlosado > notaFiscal.Valor)
        {
            throw new InvalidOperationException("O valor da nota fiscal não pode ser menor que o total glosado.");
        }

        if (totalGlosado + totalLiquidado > notaFiscal.Valor)
        {
            throw new InvalidOperationException("O valor da nota fiscal não pode ser menor que a soma de glosas e liquidações.");
        }
    }

    private static NotaFiscalDto MapToDto(NotaFiscal entity, ProcessoPagamento? processo, ExercicioAnual? exercicio)
    {
        return new NotaFiscalDto
        {
            Id = entity.Id,
            ProcessoPagamentoId = entity.ProcessoPagamentoId,
            ExercicioAnualId = processo?.ExercicioAnualId ?? Guid.Empty,
            ContratoId = exercicio?.ContratoId ?? Guid.Empty,
            ExercicioAno = exercicio?.Ano ?? 0,
            ProcessoPagamentoNumero = processo?.NumeroProcesso ?? string.Empty,
            Numero = entity.Numero,
            Serie = entity.Serie,
            Referencia = entity.Referencia,
            IdSei = entity.IdSei,
            DataEmissao = entity.DataEmissao,
            Valor = entity.Valor,
            BaseCalculo = entity.BaseCalculo,
            Inss = entity.Inss,
            Iss = entity.Iss,
            Irrf = entity.Irrf
        };
    }
}
