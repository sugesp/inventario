using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class ExercicioAnualSyncService
{
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly IGenericRepository<ProcessoPagamento> _processoPagamentoRepository;
    private readonly IGenericRepository<Empenho> _empenhoRepository;

    public ExercicioAnualSyncService(
        IGenericRepository<Contrato> contratoRepository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        IGenericRepository<ProcessoPagamento> processoPagamentoRepository,
        IGenericRepository<Empenho> empenhoRepository
    )
    {
        _contratoRepository = contratoRepository;
        _exercicioRepository = exercicioRepository;
        _processoPagamentoRepository = processoPagamentoRepository;
        _empenhoRepository = empenhoRepository;
    }

    public async Task SyncAllAsync(CancellationToken cancellationToken = default)
    {
        var contratos = await _contratoRepository.GetAllAsync(cancellationToken);
        foreach (var contrato in contratos)
        {
            await SyncForContratoAsync(contrato, cancellationToken);
        }
    }

    public async Task SyncForContratoAsync(Guid contratoId, CancellationToken cancellationToken = default)
    {
        var contrato = await _contratoRepository.GetByIdAsync(contratoId, cancellationToken);
        if (contrato is null)
        {
            return;
        }

        await SyncForContratoAsync(contrato, cancellationToken);
    }

    public async Task SyncForContratoAsync(Contrato contrato, CancellationToken cancellationToken = default)
    {
        var exerciciosExistentes = (await _exercicioRepository.FindAsync(
            x => x.ContratoId == contrato.Id,
            cancellationToken
        )).ToList();

        var anosEsperados = BuildExpectedYears(contrato).ToHashSet();
        var exerciciosPorAno = exerciciosExistentes.ToDictionary(x => x.Ano, x => x);
        var houveMudanca = false;

        foreach (var ano in anosEsperados)
        {
            if (exerciciosPorAno.ContainsKey(ano))
            {
                continue;
            }

            await _exercicioRepository.AddAsync(new ExercicioAnual
            {
                ContratoId = contrato.Id,
                Ano = ano
            }, cancellationToken);
            houveMudanca = true;
        }

        var exerciciosRemoviveis = exerciciosExistentes
            .Where(x => !anosEsperados.Contains(x.Ano))
            .ToList();

        if (exerciciosRemoviveis.Count > 0)
        {
            var exercicioIds = exerciciosRemoviveis.Select(x => x.Id).ToHashSet();
            var exerciciosComDependencias = (await _processoPagamentoRepository.FindAsync(
                x => exercicioIds.Contains(x.ExercicioAnualId),
                cancellationToken
            )).Select(x => x.ExercicioAnualId)
            .ToHashSet();

            exerciciosComDependencias.UnionWith((await _empenhoRepository.FindAsync(
                x => exercicioIds.Contains(x.ExercicioAnualId),
                cancellationToken
            )).Select(x => x.ExercicioAnualId));

            foreach (var exercicio in exerciciosRemoviveis.Where(x => !exerciciosComDependencias.Contains(x.Id)))
            {
                _exercicioRepository.Delete(exercicio);
                houveMudanca = true;
            }
        }

        if (houveMudanca)
        {
            await _exercicioRepository.SaveChangesAsync(cancellationToken);
        }
    }

    private static IEnumerable<int> BuildExpectedYears(Contrato contrato)
    {
        var anoAtual = DateTime.Today.Year;
        var anoInicial = contrato.DataInicio.Year;
        var anoFinal = Math.Min(contrato.VigenciaAtual.Year, anoAtual);

        if (anoInicial > anoFinal)
        {
            return [];
        }

        return Enumerable.Range(anoInicial, anoFinal - anoInicial + 1);
    }
}
