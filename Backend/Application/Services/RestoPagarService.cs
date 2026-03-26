using Application.Contract;
using Application.DTO.RestoPagar;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class RestoPagarService : IRestoPagarService
{
    private readonly IGenericRepository<RestoPagar> _repository;
    private readonly IGenericRepository<Empenho> _empenhoRepository;
    private readonly IGenericRepository<Liquidacao> _liquidacaoRepository;
    private readonly IGenericRepository<NotaFiscal> _notaFiscalRepository;
    private readonly IGenericRepository<ProcessoPagamento> _processoRepository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public RestoPagarService(
        IGenericRepository<RestoPagar> repository,
        IGenericRepository<Empenho> empenhoRepository,
        IGenericRepository<Liquidacao> liquidacaoRepository,
        IGenericRepository<NotaFiscal> notaFiscalRepository,
        IGenericRepository<ProcessoPagamento> processoRepository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _empenhoRepository = empenhoRepository;
        _liquidacaoRepository = liquidacaoRepository;
        _notaFiscalRepository = notaFiscalRepository;
        _processoRepository = processoRepository;
        _exercicioRepository = exercicioRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<RestoPagarDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var restos = (await _repository.GetAllAsync(cancellationToken)).ToList();
        return await MapToDtosAsync(restos, cancellationToken);
    }

    public async Task<RestoPagarDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        return (await MapToDtosAsync([entity], cancellationToken)).FirstOrDefault();
    }

    public async Task<RestoPagarDto> CreateAsync(RestoPagarCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateDto(dto);

        var context = await EnsureValidEmpenhoAsync(dto.EmpenhoId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(context.Exercicio.ContratoId, cancellationToken);
        await EnsureWithinLimitsAsync(context.Empenho, dto.Valor, null, cancellationToken);

        var entity = new RestoPagar
        {
            EmpenhoId = dto.EmpenhoId,
            NumeroNotaLancamento = dto.NumeroNotaLancamento.Trim(),
            IdSei = dto.IdSei.Trim(),
            Data = dto.Data,
            Valor = dto.Valor
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, context.Empenho, context.Exercicio);
    }

    public async Task<RestoPagarDto?> UpdateAsync(Guid id, RestoPagarCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ValidateDto(dto);

        if (dto.EmpenhoId != entity.EmpenhoId)
        {
            throw new InvalidOperationException("O empenho vinculado ao resto a pagar não pode ser alterado.");
        }

        var context = await EnsureValidEmpenhoAsync(entity.EmpenhoId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(context.Exercicio.ContratoId, cancellationToken);
        await EnsureWithinLimitsAsync(context.Empenho, dto.Valor, entity.Id, cancellationToken);

        entity.NumeroNotaLancamento = dto.NumeroNotaLancamento.Trim();
        entity.IdSei = dto.IdSei.Trim();
        entity.Data = dto.Data;
        entity.Valor = dto.Valor;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, context.Empenho, context.Exercicio);
    }

    private static void ValidateDto(RestoPagarCreateUpdateDto dto)
    {
        if (dto.EmpenhoId == Guid.Empty)
        {
            throw new InvalidOperationException("O empenho do resto a pagar é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.NumeroNotaLancamento))
        {
            throw new InvalidOperationException("O número da nota de lançamento é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.IdSei))
        {
            throw new InvalidOperationException("O ID Sei do resto a pagar é obrigatório.");
        }

        if (dto.Valor <= 0)
        {
            throw new InvalidOperationException("O valor do resto a pagar deve ser maior que zero.");
        }
    }

    private async Task<EmpenhoContext> EnsureValidEmpenhoAsync(Guid empenhoId, CancellationToken cancellationToken)
    {
        var empenho = await _empenhoRepository.GetByIdAsync(empenhoId, cancellationToken)
            ?? throw new InvalidOperationException("Empenho não encontrado.");
        var exercicio = await _exercicioRepository.GetByIdAsync(empenho.ExercicioAnualId, cancellationToken)
            ?? throw new InvalidOperationException("Exercício anual não encontrado.");

        return new EmpenhoContext
        {
            Empenho = empenho,
            Exercicio = exercicio
        };
    }

    private async Task EnsureWithinLimitsAsync(
        Empenho empenho,
        decimal valorInformado,
        Guid? currentRestoPagarId,
        CancellationToken cancellationToken
    )
    {
        var empenhosExercicio = (await _empenhoRepository.FindAsync(
            x => x.ExercicioAnualId == empenho.ExercicioAnualId,
            cancellationToken
        ))
        .OrderBy(x => x.DataEmpenho)
        .ThenBy(x => x.CreatedAt)
        .ThenBy(x => x.NumeroEmpenho, StringComparer.OrdinalIgnoreCase)
        .ToList();

        var empenhoIds = empenhosExercicio.Select(x => x.Id).ToHashSet();
        var restosExistentes = (await _repository.FindAsync(
            x => empenhoIds.Contains(x.EmpenhoId) && (currentRestoPagarId == null || x.Id != currentRestoPagarId.Value),
            cancellationToken
        ))
        .ToList();

        var processoIds = (await _processoRepository.FindAsync(
            x => x.ExercicioAnualId == empenho.ExercicioAnualId,
            cancellationToken
        ))
        .Select(x => x.Id)
        .ToHashSet();

        var notaIds = (await _notaFiscalRepository.FindAsync(
            x => processoIds.Contains(x.ProcessoPagamentoId),
            cancellationToken
        ))
        .Select(x => x.Id)
        .ToHashSet();

        var totalLiquidadoExercicio = (await _liquidacaoRepository.FindAsync(
            x => notaIds.Contains(x.NotaFiscalId),
            cancellationToken
        ))
        .Sum(x => x.ValorLiquidado);

        var totalRestosExercicio = restosExistentes.Sum(x => x.Valor);
        var totalComprometidoExercicio = totalLiquidadoExercicio + totalRestosExercicio;

        var saldosPorEmpenho = CalculateAvailableBalances(empenhosExercicio, totalComprometidoExercicio);
        var ultimoEmpenhoComSaldo = empenhosExercicio.LastOrDefault(x => saldosPorEmpenho.GetValueOrDefault(x.Id) > 0);

        if (ultimoEmpenhoComSaldo is null)
        {
            throw new InvalidOperationException("Não há saldo disponível em empenho para inscrever resto a pagar.");
        }

        if (ultimoEmpenhoComSaldo.Id != empenho.Id)
        {
            throw new InvalidOperationException("O resto a pagar deve ser vinculado ao último empenho com saldo disponível.");
        }

        var saldoDisponivelEmpenho = saldosPorEmpenho.GetValueOrDefault(empenho.Id);
        if (valorInformado > saldoDisponivelEmpenho)
        {
            throw new InvalidOperationException("O valor do resto a pagar não pode exceder o saldo disponível do empenho.");
        }
    }

    private static Dictionary<Guid, decimal> CalculateAvailableBalances(
        IReadOnlyCollection<Empenho> empenhosOrdenados,
        decimal totalComprometido
    )
    {
        var saldos = new Dictionary<Guid, decimal>();
        var restanteComprometido = totalComprometido;

        foreach (var item in empenhosOrdenados)
        {
            var consumido = Math.Min(item.ValorEmpenhado, Math.Max(restanteComprometido, 0));
            saldos[item.Id] = item.ValorEmpenhado - consumido;
            restanteComprometido = Math.Max(restanteComprometido - item.ValorEmpenhado, 0);
        }

        return saldos;
    }

    private async Task<IEnumerable<RestoPagarDto>> MapToDtosAsync(
        IReadOnlyCollection<RestoPagar> restos,
        CancellationToken cancellationToken
    )
    {
        var empenhos = (await _empenhoRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);
        var exercicios = (await _exercicioRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);

        return restos
            .Select(item =>
            {
                var empenho = empenhos.GetValueOrDefault(item.EmpenhoId);
                var exercicio = empenho is null ? null : exercicios.GetValueOrDefault(empenho.ExercicioAnualId);
                return MapToDto(item, empenho, exercicio);
            })
            .OrderByDescending(x => x.Data);
    }

    private static RestoPagarDto MapToDto(RestoPagar entity, Empenho? empenho, ExercicioAnual? exercicio)
    {
        return new RestoPagarDto
        {
            Id = entity.Id,
            EmpenhoId = entity.EmpenhoId,
            ExercicioAnualId = empenho?.ExercicioAnualId ?? Guid.Empty,
            ContratoId = exercicio?.ContratoId ?? Guid.Empty,
            ExercicioAno = exercicio?.Ano ?? 0,
            NumeroEmpenho = empenho?.NumeroEmpenho ?? string.Empty,
            NumeroNotaLancamento = entity.NumeroNotaLancamento,
            IdSei = entity.IdSei,
            Data = entity.Data,
            Valor = entity.Valor
        };
    }

    private sealed class EmpenhoContext
    {
        public required Empenho Empenho { get; init; }
        public required ExercicioAnual Exercicio { get; init; }
    }
}
