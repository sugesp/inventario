using Application.Contract;
using Application.DTO.Pagamento;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class PagamentoService : IPagamentoService
{
    private readonly IGenericRepository<Pagamento> _repository;
    private readonly IGenericRepository<Liquidacao> _liquidacaoRepository;
    private readonly IGenericRepository<NotaFiscal> _notaFiscalRepository;
    private readonly IGenericRepository<ProcessoPagamento> _processoRepository;
    private readonly IGenericRepository<ExercicioAnual> _exercicioRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public PagamentoService(
        IGenericRepository<Pagamento> repository,
        IGenericRepository<Liquidacao> liquidacaoRepository,
        IGenericRepository<NotaFiscal> notaFiscalRepository,
        IGenericRepository<ProcessoPagamento> processoRepository,
        IGenericRepository<ExercicioAnual> exercicioRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _liquidacaoRepository = liquidacaoRepository;
        _notaFiscalRepository = notaFiscalRepository;
        _processoRepository = processoRepository;
        _exercicioRepository = exercicioRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<PagamentoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var pagamentos = (await _repository.GetAllAsync(cancellationToken)).ToList();
        return await MapToDtosAsync(pagamentos, cancellationToken);
    }

    public async Task<PagamentoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        return (await MapToDtosAsync([entity], cancellationToken)).FirstOrDefault();
    }

    public async Task<PagamentoDto> CreateAsync(PagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var contexto = await EnsureLiquidacaoDisponivelAsync(dto.LiquidacaoId, null, cancellationToken);
        NormalizePreparacaoPagamento(dto);
        ValidateDto(dto, contexto.Liquidacao);
        await _contratoAccessService.EnsureCanAccessContratoAsync(contexto.Exercicio.ContratoId, cancellationToken);

        var entity = new Pagamento
        {
            LiquidacaoId = dto.LiquidacaoId,
            NumeroOrdemBancaria = dto.NumeroOrdemBancaria.Trim(),
            IdSeiOrdemBancaria = dto.IdSeiOrdemBancaria.Trim(),
            ValorOrdemBancaria = dto.ValorOrdemBancaria,
            DataOrdemBancaria = dto.DataOrdemBancaria,
            NumeroPreparacaoPagamento = dto.NumeroPreparacaoPagamento.Trim(),
            IdSeiPreparacaoPagamento = dto.IdSeiPreparacaoPagamento.Trim(),
            ValorPreparacaoPagamento = dto.ValorPreparacaoPagamento,
            DataPreparacaoPagamento = dto.DataPreparacaoPagamento
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, contexto.Liquidacao, contexto.NotaFiscal, contexto.Exercicio);
    }

    public async Task<PagamentoDto?> UpdateAsync(Guid id, PagamentoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var contextoAtual = await BuildContextAsync(entity.LiquidacaoId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(contextoAtual.Exercicio.ContratoId, cancellationToken);
        var contexto = await EnsureLiquidacaoDisponivelAsync(dto.LiquidacaoId, id, cancellationToken);
        NormalizePreparacaoPagamento(dto);
        ValidateDto(dto, contexto.Liquidacao);
        await _contratoAccessService.EnsureCanAccessContratoAsync(contexto.Exercicio.ContratoId, cancellationToken);

        entity.LiquidacaoId = dto.LiquidacaoId;
        entity.NumeroOrdemBancaria = dto.NumeroOrdemBancaria.Trim();
        entity.IdSeiOrdemBancaria = dto.IdSeiOrdemBancaria.Trim();
        entity.ValorOrdemBancaria = dto.ValorOrdemBancaria;
        entity.DataOrdemBancaria = dto.DataOrdemBancaria;
        entity.NumeroPreparacaoPagamento = dto.NumeroPreparacaoPagamento.Trim();
        entity.IdSeiPreparacaoPagamento = dto.IdSeiPreparacaoPagamento.Trim();
        entity.ValorPreparacaoPagamento = dto.ValorPreparacaoPagamento;
        entity.DataPreparacaoPagamento = dto.DataPreparacaoPagamento;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, contexto.Liquidacao, contexto.NotaFiscal, contexto.Exercicio);
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

    private static void NormalizePreparacaoPagamento(PagamentoCreateUpdateDto dto)
    {
        dto.NumeroOrdemBancaria = dto.NumeroOrdemBancaria?.Trim() ?? string.Empty;
        dto.IdSeiOrdemBancaria = dto.IdSeiOrdemBancaria?.Trim() ?? string.Empty;
        dto.NumeroPreparacaoPagamento = dto.NumeroPreparacaoPagamento?.Trim() ?? string.Empty;
        dto.IdSeiPreparacaoPagamento = dto.IdSeiPreparacaoPagamento?.Trim() ?? string.Empty;

        var possuiPreparacaoPagamento = dto.ValorPreparacaoPagamento > 0
            || !string.IsNullOrWhiteSpace(dto.NumeroPreparacaoPagamento)
            || !string.IsNullOrWhiteSpace(dto.IdSeiPreparacaoPagamento)
            || dto.DataPreparacaoPagamento.HasValue;

        if (!possuiPreparacaoPagamento)
        {
            dto.NumeroPreparacaoPagamento = string.Empty;
            dto.IdSeiPreparacaoPagamento = string.Empty;
            dto.ValorPreparacaoPagamento = 0;
            dto.DataPreparacaoPagamento = null;
        }
    }

    private static void ValidateDto(PagamentoCreateUpdateDto dto, Liquidacao liquidacao)
    {
        if (dto.LiquidacaoId == Guid.Empty)
        {
            throw new InvalidOperationException("A liquidação do pagamento é obrigatória.");
        }

        if (string.IsNullOrWhiteSpace(dto.NumeroOrdemBancaria))
        {
            throw new InvalidOperationException("O numero da ordem bancaria é obrigatório.");
        }

        if (string.IsNullOrWhiteSpace(dto.IdSeiOrdemBancaria))
        {
            throw new InvalidOperationException("O ID Sei da ordem bancaria é obrigatório.");
        }

        if (dto.ValorOrdemBancaria <= 0)
        {
            throw new InvalidOperationException("O valor da ordem bancaria deve ser maior que zero.");
        }

        var possuiPreparacaoPagamento = dto.ValorPreparacaoPagamento > 0
            || !string.IsNullOrWhiteSpace(dto.NumeroPreparacaoPagamento)
            || !string.IsNullOrWhiteSpace(dto.IdSeiPreparacaoPagamento)
            || dto.DataPreparacaoPagamento.HasValue;

        if (possuiPreparacaoPagamento && string.IsNullOrWhiteSpace(dto.NumeroPreparacaoPagamento))
        {
            throw new InvalidOperationException("O numero da preparação de pagamento é obrigatório quando houver preparação de pagamento.");
        }

        if (possuiPreparacaoPagamento && string.IsNullOrWhiteSpace(dto.IdSeiPreparacaoPagamento))
        {
            throw new InvalidOperationException("O ID Sei da preparação de pagamento é obrigatório quando houver preparação de pagamento.");
        }

        if (dto.ValorPreparacaoPagamento < 0)
        {
            throw new InvalidOperationException("O valor da preparação de pagamento não pode ser negativo.");
        }

        if (possuiPreparacaoPagamento && dto.ValorPreparacaoPagamento <= 0)
        {
            throw new InvalidOperationException("O valor da preparação de pagamento deve ser maior que zero quando houver preparação de pagamento.");
        }

        if (possuiPreparacaoPagamento && !dto.DataPreparacaoPagamento.HasValue)
        {
            throw new InvalidOperationException("A data da preparação de pagamento é obrigatória quando houver preparação de pagamento.");
        }

        if (dto.ValorOrdemBancaria + dto.ValorPreparacaoPagamento != liquidacao.ValorLiquidado)
        {
            throw new InvalidOperationException("A soma da ordem bancária com a preparação de pagamento deve ser igual ao valor liquidado.");
        }
    }

    private async Task<PagamentoContext> EnsureLiquidacaoDisponivelAsync(
        Guid liquidacaoId,
        Guid? pagamentoAtualId,
        CancellationToken cancellationToken
    )
    {
        var contexto = await BuildContextAsync(liquidacaoId, cancellationToken);
        var pagamentoExistente = (await _repository.FindAsync(
            x => x.LiquidacaoId == liquidacaoId && (pagamentoAtualId == null || x.Id != pagamentoAtualId.Value),
            cancellationToken
        )).FirstOrDefault();

        if (pagamentoExistente is not null)
        {
            throw new InvalidOperationException("A liquidação selecionada já possui pagamento vinculado.");
        }

        return contexto;
    }

    private async Task<PagamentoContext> BuildContextAsync(Guid liquidacaoId, CancellationToken cancellationToken)
    {
        var liquidacao = await _liquidacaoRepository.GetByIdAsync(liquidacaoId, cancellationToken)
            ?? throw new InvalidOperationException("Liquidação não encontrada.");
        var notaFiscal = await _notaFiscalRepository.GetByIdAsync(liquidacao.NotaFiscalId, cancellationToken)
            ?? throw new InvalidOperationException("Nota fiscal da liquidação não encontrada.");
        var processo = await _processoRepository.GetByIdAsync(notaFiscal.ProcessoPagamentoId, cancellationToken)
            ?? throw new InvalidOperationException("Processo de pagamento não encontrado.");
        var exercicio = await _exercicioRepository.GetByIdAsync(processo.ExercicioAnualId, cancellationToken)
            ?? throw new InvalidOperationException("Exercício anual não encontrado.");

        return new PagamentoContext
        {
            Liquidacao = liquidacao,
            NotaFiscal = notaFiscal,
            Exercicio = exercicio
        };
    }

    private async Task<IEnumerable<PagamentoDto>> MapToDtosAsync(
        IReadOnlyCollection<Pagamento> pagamentos,
        CancellationToken cancellationToken
    )
    {
        var liquidacoes = (await _liquidacaoRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);
        var notas = (await _notaFiscalRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);
        var processos = (await _processoRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);
        var exercicios = (await _exercicioRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id);

        return pagamentos
            .Select(pagamento =>
            {
                var liquidacao = liquidacoes.GetValueOrDefault(pagamento.LiquidacaoId);
                var nota = liquidacao is null ? null : notas.GetValueOrDefault(liquidacao.NotaFiscalId);
                var processo = nota is null ? null : processos.GetValueOrDefault(nota.ProcessoPagamentoId);
                var exercicio = processo is null ? null : exercicios.GetValueOrDefault(processo.ExercicioAnualId);
                return MapToDto(pagamento, liquidacao, nota, exercicio);
            })
            .OrderByDescending(x => x.DataOrdemBancaria);
    }

    private static PagamentoDto MapToDto(
        Pagamento entity,
        Liquidacao? liquidacao,
        NotaFiscal? notaFiscal,
        ExercicioAnual? exercicio
    )
    {
        return new PagamentoDto
        {
            Id = entity.Id,
            LiquidacaoId = entity.LiquidacaoId,
            NotaFiscalId = liquidacao?.NotaFiscalId ?? Guid.Empty,
            ExercicioAnualId = exercicio?.Id ?? Guid.Empty,
            ContratoId = exercicio?.ContratoId ?? Guid.Empty,
            ExercicioAno = exercicio?.Ano ?? 0,
            NumeroLiquidacao = liquidacao?.NumeroLiquidacao ?? string.Empty,
            NumeroNotaFiscal = notaFiscal?.Numero ?? string.Empty,
            NumeroOrdemBancaria = entity.NumeroOrdemBancaria,
            IdSeiOrdemBancaria = entity.IdSeiOrdemBancaria,
            ValorOrdemBancaria = entity.ValorOrdemBancaria,
            DataOrdemBancaria = entity.DataOrdemBancaria,
            NumeroPreparacaoPagamento = entity.NumeroPreparacaoPagamento,
            IdSeiPreparacaoPagamento = entity.IdSeiPreparacaoPagamento,
            ValorPreparacaoPagamento = entity.ValorPreparacaoPagamento,
            DataPreparacaoPagamento = entity.DataPreparacaoPagamento
        };
    }

    private sealed class PagamentoContext
    {
        public required Liquidacao Liquidacao { get; init; }
        public required NotaFiscal NotaFiscal { get; init; }
        public required ExercicioAnual Exercicio { get; init; }
    }
}
