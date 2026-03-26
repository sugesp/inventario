using Application.Contract;
using Application.DTO.GlosaNotaFiscal;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class GlosaNotaFiscalService : IGlosaNotaFiscalService
{
    private readonly IGenericRepository<GlosaNotaFiscal> _repository;
    private readonly IGenericRepository<NotaFiscal> _notaFiscalRepository;
    private readonly IGenericRepository<Liquidacao> _liquidacaoRepository;
    private readonly IGenericRepository<ProcessoPagamento> _processoRepository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public GlosaNotaFiscalService(
        IGenericRepository<GlosaNotaFiscal> repository,
        IGenericRepository<NotaFiscal> notaFiscalRepository,
        IGenericRepository<Liquidacao> liquidacaoRepository,
        IGenericRepository<ProcessoPagamento> processoRepository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _notaFiscalRepository = notaFiscalRepository;
        _liquidacaoRepository = liquidacaoRepository;
        _processoRepository = processoRepository;
        _exercicioRepository = exercicioRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<GlosaNotaFiscalDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.Select(MapToDto).OrderByDescending(x => x.DataGlosa);
    }

    public async Task<GlosaNotaFiscalDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<GlosaNotaFiscalDto> CreateAsync(GlosaNotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        ValidateDto(dto);

        var notaFiscal = await EnsureNotaFiscalValida(dto.NotaFiscalId, cancellationToken);
        await EnsureWithinLimits(dto, notaFiscal, null, cancellationToken);

        var entity = new GlosaNotaFiscal
        {
            NotaFiscalId = dto.NotaFiscalId,
            IdSei = dto.IdSei.Trim(),
            ValorGlosa = dto.ValorGlosa,
            DataGlosa = dto.DataGlosa,
            Descricao = string.IsNullOrWhiteSpace(dto.Descricao) ? null : dto.Descricao.Trim()
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<GlosaNotaFiscalDto?> UpdateAsync(Guid id, GlosaNotaFiscalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ValidateDto(dto);

        var notaFiscalAtual = await EnsureNotaFiscalValida(entity.NotaFiscalId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(await GetContratoIdFromNotaFiscal(notaFiscalAtual, cancellationToken), cancellationToken);
        var notaFiscal = await EnsureNotaFiscalValida(dto.NotaFiscalId, cancellationToken);
        await EnsureWithinLimits(dto, notaFiscal, entity.Id, cancellationToken);

        entity.NotaFiscalId = dto.NotaFiscalId;
        entity.IdSei = dto.IdSei.Trim();
        entity.ValorGlosa = dto.ValorGlosa;
        entity.DataGlosa = dto.DataGlosa;
        entity.Descricao = string.IsNullOrWhiteSpace(dto.Descricao) ? null : dto.Descricao.Trim();

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    private static void ValidateDto(GlosaNotaFiscalCreateUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IdSei))
        {
            throw new InvalidOperationException("O ID Sei da glosa é obrigatório.");
        }

        if (dto.ValorGlosa <= 0)
        {
            throw new InvalidOperationException("O valor da glosa deve ser maior que zero.");
        }
    }

    private async Task<NotaFiscal> EnsureNotaFiscalValida(Guid notaFiscalId, CancellationToken cancellationToken)
    {
        var notaFiscal = await _notaFiscalRepository.GetByIdAsync(notaFiscalId, cancellationToken)
            ?? throw new InvalidOperationException("Nota fiscal não encontrada.");
        await _contratoAccessService.EnsureCanAccessContratoAsync(await GetContratoIdFromNotaFiscal(notaFiscal, cancellationToken), cancellationToken);
        return notaFiscal;
    }

    private async Task<Guid> GetContratoIdFromNotaFiscal(NotaFiscal notaFiscal, CancellationToken cancellationToken)
    {
        var processo = await _processoRepository.GetByIdAsync(notaFiscal.ProcessoPagamentoId, cancellationToken)
            ?? throw new InvalidOperationException("Processo de pagamento não encontrado.");
        var exercicio = await _exercicioRepository.GetByIdAsync(processo.ExercicioAnualId, cancellationToken)
            ?? throw new InvalidOperationException("Exercício anual não encontrado.");
        return exercicio.ContratoId;
    }

    private async Task EnsureWithinLimits(
        GlosaNotaFiscalCreateUpdateDto dto,
        NotaFiscal notaFiscal,
        Guid? currentGlosaId,
        CancellationToken cancellationToken
    )
    {
        var glosasExistentes = (await _repository.FindAsync(
            x => x.NotaFiscalId == dto.NotaFiscalId && (currentGlosaId == null || x.Id != currentGlosaId.Value),
            cancellationToken
        )).ToList();

        var totalGlosado = glosasExistentes.Sum(x => x.ValorGlosa) + dto.ValorGlosa;
        if (totalGlosado > notaFiscal.Valor)
        {
            throw new InvalidOperationException("A soma das glosas da nota fiscal não pode exceder o valor da nota fiscal.");
        }

        var totalLiquidado = (await _liquidacaoRepository.FindAsync(x => x.NotaFiscalId == dto.NotaFiscalId, cancellationToken))
            .Sum(x => x.ValorLiquidado);
        if (totalLiquidado + totalGlosado > notaFiscal.Valor)
        {
            throw new InvalidOperationException("A soma das glosas e liquidações da nota fiscal não pode exceder o valor da nota fiscal.");
        }
    }

    private static GlosaNotaFiscalDto MapToDto(GlosaNotaFiscal entity)
    {
        return new GlosaNotaFiscalDto
        {
            Id = entity.Id,
            NotaFiscalId = entity.NotaFiscalId,
            IdSei = entity.IdSei,
            ValorGlosa = entity.ValorGlosa,
            DataGlosa = entity.DataGlosa,
            Descricao = entity.Descricao
        };
    }
}
