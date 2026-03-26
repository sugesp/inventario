using Application.Contract;
using Application.DTO.Notificacao;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class NotificacaoService : INotificacaoService
{
    private readonly IGenericRepository<Notificacao> _repository;
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public NotificacaoService(
        IGenericRepository<Notificacao> repository,
        IGenericRepository<Contrato> contratoRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _contratoRepository = contratoRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<NotificacaoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.Select(MapToDto).OrderByDescending(x => x.DataNotificacao);
    }

    public async Task<NotificacaoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<NotificacaoDto> CreateAsync(
        NotificacaoCreateUpdateDto dto,
        CancellationToken cancellationToken = default
    )
    {
        await EnsureContratoExists(dto.ContratoId, cancellationToken);

        var entity = new Notificacao
        {
            ContratoId = dto.ContratoId,
            Titulo = dto.Titulo,
            Descricao = dto.Descricao,
            IdSei = dto.IdSei,
            DataNotificacao = dto.DataNotificacao,
            IdSeiResposta = NormalizeNullable(dto.IdSeiResposta),
            DataResposta = NormalizeNullable(dto.IdSeiResposta) is null ? null : dto.DataResposta
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<NotificacaoDto?> UpdateAsync(
        Guid id,
        NotificacaoCreateUpdateDto dto,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        await _contratoAccessService.EnsureCanAccessContratoAsync(entity.ContratoId, cancellationToken);
        await _contratoAccessService.EnsureCanAccessContratoAsync(dto.ContratoId, cancellationToken);
        await EnsureContratoExists(dto.ContratoId, cancellationToken);

        entity.ContratoId = dto.ContratoId;
        entity.Titulo = dto.Titulo;
        entity.Descricao = dto.Descricao;
        entity.IdSei = dto.IdSei;
        entity.DataNotificacao = dto.DataNotificacao;
        entity.IdSeiResposta = NormalizeNullable(dto.IdSeiResposta);
        entity.DataResposta = entity.IdSeiResposta is null ? null : dto.DataResposta;

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

    private async Task EnsureContratoExists(Guid contratoId, CancellationToken cancellationToken)
    {
        var contrato = await _contratoRepository.GetByIdAsync(contratoId, cancellationToken);
        if (contrato is null)
        {
            throw new InvalidOperationException("Contrato nao encontrado.");
        }
    }

    private static NotificacaoDto MapToDto(Notificacao entity)
    {
        return new NotificacaoDto
        {
            Id = entity.Id,
            ContratoId = entity.ContratoId,
            Titulo = entity.Titulo,
            Descricao = entity.Descricao,
            IdSei = entity.IdSei,
            DataNotificacao = entity.DataNotificacao,
            IdSeiResposta = entity.IdSeiResposta,
            DataResposta = entity.DataResposta,
            PendenteResposta = string.IsNullOrWhiteSpace(entity.IdSeiResposta)
        };
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
