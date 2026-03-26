using Application.Contract;
using Application.DTO.Aditivo;
using Domain.Enum;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class AditivoService : IAditivoService
{
    private readonly IGenericRepository<Aditivo> _repository;
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly ExercicioAnualSyncService _exercicioAnualSyncService;

    public AditivoService(
        IGenericRepository<Aditivo> repository,
        IGenericRepository<Contrato> contratoRepository,
        ExercicioAnualSyncService exercicioAnualSyncService
    )
    {
        _repository = repository;
        _contratoRepository = contratoRepository;
        _exercicioAnualSyncService = exercicioAnualSyncService;
    }

    public async Task<IEnumerable<AditivoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.Select(MapToDto).OrderBy(x => x.Numero);
    }

    public async Task<AditivoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<AditivoDto> CreateAsync(AditivoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var contrato = await EnsureContratoExists(dto.ContratoId, cancellationToken);
        await ValidateAditivoAsync(dto, null, contrato, cancellationToken);

        var entity = MapToEntity(dto);
        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        await RecalculateContrato(contrato, cancellationToken);
        return MapToDto(entity);
    }

    public async Task<AditivoDto?> UpdateAsync(Guid id, AditivoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var contrato = await EnsureContratoExists(dto.ContratoId, cancellationToken);
        var contratoAntigoId = entity.ContratoId;
        var contratoAntigo = contratoAntigoId == dto.ContratoId
            ? contrato
            : await EnsureContratoExists(contratoAntigoId, cancellationToken);

        await ValidateAditivoAsync(dto, entity.Id, contrato, cancellationToken);

        entity.ContratoId = dto.ContratoId;
        entity.Numero = dto.Numero;
        entity.IdSei = dto.IdSei;
        entity.Tipo = dto.Tipo;
        entity.Observacao = dto.Observacao;
        entity.DataInicio = dto.DataInicio;
        entity.NovaVigencia = dto.NovaVigencia;
        entity.Valor = dto.Valor;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        await RecalculateContrato(contrato, cancellationToken);
        if (contratoAntigoId != dto.ContratoId)
        {
            await RecalculateContrato(contratoAntigo, cancellationToken);
        }

        return MapToDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        var contrato = await EnsureContratoExists(entity.ContratoId, cancellationToken);
        _repository.Delete(entity);
        var deleted = await _repository.SaveChangesAsync(cancellationToken);

        if (deleted)
        {
            await RecalculateContrato(contrato, cancellationToken);
        }

        return deleted;
    }

    private async Task<Contrato> EnsureContratoExists(Guid contratoId, CancellationToken cancellationToken)
    {
        var contrato = await _contratoRepository.GetByIdAsync(contratoId, cancellationToken);
        if (contrato is null)
        {
            throw new InvalidOperationException("Contrato nao encontrado.");
        }

        return contrato;
    }

    private async Task ValidateAditivoAsync(
        AditivoCreateUpdateDto dto,
        Guid? aditivoAtualId,
        Contrato contrato,
        CancellationToken cancellationToken
    )
    {
        if (string.IsNullOrWhiteSpace(dto.IdSei))
        {
            throw new InvalidOperationException("O ID Sei do aditivo é obrigatório.");
        }

        if (dto.DataInicio == default)
        {
            throw new InvalidOperationException("A data inicial do aditivo é obrigatoria.");
        }

        var aditivosContrato = (await _repository.FindAsync(
            x => x.ContratoId == dto.ContratoId && (!aditivoAtualId.HasValue || x.Id != aditivoAtualId.Value),
            cancellationToken
        )).ToList();

        switch (dto.Tipo)
        {
            case TipoAditivo.Renovacao:
                if (!dto.NovaVigencia.HasValue)
                {
                    throw new InvalidOperationException("A renovacao exige nova vigencia.");
                }

                if (dto.Valor != 0)
                {
                    throw new InvalidOperationException("A renovacao nao deve informar valor.");
                }

                if (dto.NovaVigencia.Value <= dto.DataInicio)
                {
                    throw new InvalidOperationException("A nova vigencia deve ser posterior a data inicial do aditivo.");
                }

                var ultimaBaseRenovacao = aditivosContrato
                    .Where(x => x.Tipo == TipoAditivo.Renovacao)
                    .OrderByDescending(x => x.DataInicio)
                    .Select(x => x.DataInicio)
                    .FirstOrDefault();

                var dataMinimaRenovacao = ultimaBaseRenovacao == default ? contrato.VigenciaInicial : ultimaBaseRenovacao;
                if (dto.DataInicio <= dataMinimaRenovacao)
                {
                    throw new InvalidOperationException("A data inicial da renovacao deve ser posterior a vigencia ou renovacao anterior.");
                }

                break;
            case TipoAditivo.Acrescimo:
            case TipoAditivo.Supressao:
            case TipoAditivo.Apostilamento:
                if (dto.Valor <= 0)
                {
                    throw new InvalidOperationException("Aditivos financeiros exigem valor maior que zero.");
                }

                if (dto.NovaVigencia.HasValue)
                {
                    throw new InvalidOperationException("Aditivos financeiros nao devem informar nova vigencia.");
                }

                break;
            default:
                throw new InvalidOperationException("Tipo de aditivo invalido.");
        }
    }

    private async Task RecalculateContrato(Contrato contrato, CancellationToken cancellationToken)
    {
        var aditivos = (await _repository.FindAsync(x => x.ContratoId == contrato.Id, cancellationToken)).ToList();

        contrato.QuantidadeAditivos = aditivos.Count;
        contrato.ValorAcrescimo = aditivos
            .Where(x => x.Tipo == TipoAditivo.Acrescimo || x.Tipo == TipoAditivo.Apostilamento)
            .Sum(x => x.Valor);
        contrato.ValorSupressao = aditivos
            .Where(x => x.Tipo == TipoAditivo.Supressao)
            .Sum(x => x.Valor);
        contrato.ValorAtualContrato = contrato.ValorInicialContratual + contrato.ValorAcrescimo - contrato.ValorSupressao;
        contrato.VigenciaAtual = aditivos
            .Where(x => x.Tipo == TipoAditivo.Renovacao && x.NovaVigencia.HasValue)
            .OrderByDescending(x => x.DataInicio)
            .Select(x => x.NovaVigencia!.Value)
            .FirstOrDefault(contrato.VigenciaInicial);

        _contratoRepository.Update(contrato);
        await _contratoRepository.SaveChangesAsync(cancellationToken);
        await _exercicioAnualSyncService.SyncForContratoAsync(contrato, cancellationToken);
    }

    private static Aditivo MapToEntity(AditivoCreateUpdateDto dto)
    {
        return new Aditivo
        {
            ContratoId = dto.ContratoId,
            Numero = dto.Numero,
            IdSei = dto.IdSei,
            Tipo = dto.Tipo,
            Observacao = dto.Observacao,
            DataInicio = dto.DataInicio,
            NovaVigencia = dto.NovaVigencia,
            Valor = dto.Valor
        };
    }

    private static AditivoDto MapToDto(Aditivo entity)
    {
        return new AditivoDto
        {
            Id = entity.Id,
            ContratoId = entity.ContratoId,
            Numero = entity.Numero,
            IdSei = entity.IdSei,
            Tipo = entity.Tipo,
            Observacao = entity.Observacao,
            DataInicio = entity.DataInicio,
            NovaVigencia = entity.NovaVigencia,
            Valor = entity.Valor
        };
    }
}
