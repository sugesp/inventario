using Application.Contract;
using Application.DTO.Liquidacao;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class LiquidacaoService : ILiquidacaoService
{
    private readonly IGenericRepository<Liquidacao> _repository;
    private readonly IGenericRepository<Empenho> _empenhoRepository;
    private readonly IGenericRepository<NotaFiscal> _notaFiscalRepository;
    private readonly IGenericRepository<GlosaNotaFiscal> _glosaRepository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly IGenericRepository<ProcessoPagamento> _processoRepository;
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public LiquidacaoService(
        IGenericRepository<Liquidacao> repository,
        IGenericRepository<Empenho> empenhoRepository,
        IGenericRepository<NotaFiscal> notaFiscalRepository,
        IGenericRepository<GlosaNotaFiscal> glosaRepository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        IGenericRepository<ProcessoPagamento> processoRepository,
        IGenericRepository<Contrato> contratoRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _empenhoRepository = empenhoRepository;
        _notaFiscalRepository = notaFiscalRepository;
        _glosaRepository = glosaRepository;
        _exercicioRepository = exercicioRepository;
        _processoRepository = processoRepository;
        _contratoRepository = contratoRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<LiquidacaoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.Select(MapToDto).OrderByDescending(x => x.DataLiquidacao);
    }

    public async Task<LiquidacaoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<LiquidacaoDto> CreateAsync(LiquidacaoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.NumeroLiquidacao))
        {
            throw new InvalidOperationException("O numero da liquidação é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.IdSei))
        {
            throw new InvalidOperationException("O ID Sei da liquidação é obrigatório.");
        }

        var validation = await EnsureRelacionamentosValidos(dto.NotaFiscalId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(validation.Contrato.Id, cancellationToken);
        await EnsureLiquidacaoWithinLimits(dto, validation, null, cancellationToken);

        var entity = new Liquidacao
        {
            EmpenhoId = null,
            NotaFiscalId = dto.NotaFiscalId,
            NumeroLiquidacao = dto.NumeroLiquidacao.Trim(),
            IdSei = dto.IdSei,
            DataLiquidacao = dto.DataLiquidacao,
            ValorLiquidado = dto.ValorLiquidado,
            Observacao = dto.Observacao
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<LiquidacaoDto?> UpdateAsync(Guid id, LiquidacaoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(dto.IdSei))
        {
            throw new InvalidOperationException("O ID Sei da liquidação é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.NumeroLiquidacao))
        {
            throw new InvalidOperationException("O numero da liquidação é obrigatório.");
        }

        var validacaoAtual = await EnsureRelacionamentosValidos(entity.NotaFiscalId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(validacaoAtual.Contrato.Id, cancellationToken);
        var validation = await EnsureRelacionamentosValidos(dto.NotaFiscalId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(validation.Contrato.Id, cancellationToken);
        await EnsureLiquidacaoWithinLimits(dto, validation, entity.Id, cancellationToken);

        entity.EmpenhoId = null;
        entity.NotaFiscalId = dto.NotaFiscalId;
        entity.NumeroLiquidacao = dto.NumeroLiquidacao.Trim();
        entity.IdSei = dto.IdSei;
        entity.DataLiquidacao = dto.DataLiquidacao;
        entity.ValorLiquidado = dto.ValorLiquidado;
        entity.Observacao = dto.Observacao;

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

    private async Task<ValidationContext> EnsureRelacionamentosValidos(
        Guid notaFiscalId,
        CancellationToken cancellationToken
    )
    {
        var notaFiscal = await _notaFiscalRepository.GetByIdAsync(notaFiscalId, cancellationToken)
            ?? throw new InvalidOperationException("Nota fiscal nao encontrada.");
        var processoPagamento = await _processoRepository.GetByIdAsync(notaFiscal.ProcessoPagamentoId, cancellationToken)
            ?? throw new InvalidOperationException("Processo de pagamento nao encontrado.");
        var exercicioNota = await _exercicioRepository.GetByIdAsync(processoPagamento.ExercicioAnualId, cancellationToken)
            ?? throw new InvalidOperationException("Exercicio da nota fiscal nao encontrado.");
        var empenhosExercicio = (await _empenhoRepository.FindAsync(
            x => x.ExercicioAnualId == exercicioNota.Id,
            cancellationToken
        )).ToList();
        var contrato = await _contratoRepository.GetByIdAsync(exercicioNota.ContratoId, cancellationToken)
            ?? throw new InvalidOperationException("Contrato nao encontrado.");

        return new ValidationContext
        {
            NotaFiscal = notaFiscal,
            Exercicio = exercicioNota,
            EmpenhosExercicio = empenhosExercicio,
            Contrato = contrato
        };
    }

    private async Task EnsureLiquidacaoWithinLimits(
        LiquidacaoCreateUpdateDto dto,
        ValidationContext context,
        Guid? liquidacaoIdAtual,
        CancellationToken cancellationToken
    )
    {
        var liquidacoesExistentes = (await _repository.FindAsync(
            x => liquidacaoIdAtual == null || x.Id != liquidacaoIdAtual.Value,
            cancellationToken
        )).ToList();

        var processosExercicioIds = (await _processoRepository.FindAsync(
            x => x.ExercicioAnualId == context.Exercicio.Id,
            cancellationToken
        )).Select(x => x.Id).ToHashSet();
        var notasExercicioIds = (await _notaFiscalRepository.FindAsync(
            x => processosExercicioIds.Contains(x.ProcessoPagamentoId),
            cancellationToken
        )).Select(x => x.Id).ToHashSet();
        var totalEmpenhadoExercicio = context.EmpenhosExercicio.Sum(x => x.ValorEmpenhado);
        var totalLiquidadoExercicio = liquidacoesExistentes
            .Where(x => notasExercicioIds.Contains(x.NotaFiscalId))
            .Sum(x => x.ValorLiquidado) + dto.ValorLiquidado;
        if (totalLiquidadoExercicio > totalEmpenhadoExercicio)
        {
            throw new InvalidOperationException("A soma das liquidações não pode exceder o saldo total dos empenhos do exercício.");
        }

        var totalNotaFiscal = liquidacoesExistentes
            .Where(x => x.NotaFiscalId == dto.NotaFiscalId)
            .Sum(x => x.ValorLiquidado) + dto.ValorLiquidado;
        var totalGlosado = (await _glosaRepository.FindAsync(x => x.NotaFiscalId == dto.NotaFiscalId, cancellationToken))
            .Sum(x => x.ValorGlosa);
        if (totalNotaFiscal + totalGlosado > context.NotaFiscal.Valor)
        {
            throw new InvalidOperationException("A soma das liquidações e glosas da nota fiscal não pode exceder o valor da nota fiscal.");
        }

        var totalContratoExercicio = liquidacoesExistentes
            .Where(x => notasExercicioIds.Contains(x.NotaFiscalId))
            .Sum(x => x.ValorLiquidado) + dto.ValorLiquidado;
        if (totalContratoExercicio > context.Contrato.ValorAtualContrato)
        {
            throw new InvalidOperationException("A soma das liquidações do exercício não pode exceder o valor atual do contrato.");
        }
    }

    private static LiquidacaoDto MapToDto(Liquidacao entity)
    {
        return new LiquidacaoDto
        {
            Id = entity.Id,
            EmpenhoId = entity.EmpenhoId,
            NotaFiscalId = entity.NotaFiscalId,
            NumeroLiquidacao = entity.NumeroLiquidacao,
            IdSei = entity.IdSei,
            DataLiquidacao = entity.DataLiquidacao,
            ValorLiquidado = entity.ValorLiquidado,
            Observacao = entity.Observacao
        };
    }

    private sealed class ValidationContext
    {
        public required NotaFiscal NotaFiscal { get; init; }
        public required ExercicioAnual Exercicio { get; init; }
        public required IReadOnlyCollection<Empenho> EmpenhosExercicio { get; init; }
        public required Contrato Contrato { get; init; }
    }
}
