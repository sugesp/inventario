using Application.Contract;
using Application.DTO.Portaria;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class PortariaService : IPortariaService
{
    private readonly IGenericRepository<Portaria> _repository;
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public PortariaService(
        IGenericRepository<Portaria> repository,
        IGenericRepository<Contrato> contratoRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _contratoRepository = contratoRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<PortariaDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.Select(MapToDto).OrderByDescending(x => x.DataPublicacao);
    }

    public async Task<PortariaDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<PortariaDto> CreateAsync(
        PortariaCreateUpdateDto dto,
        CancellationToken cancellationToken = default
    )
    {
        await EnsureContratoExists(dto.ContratoId, cancellationToken);

        var entity = new Portaria
        {
            ContratoId = dto.ContratoId,
            NumeroPortaria = dto.NumeroPortaria,
            IdSei = dto.IdSei,
            Descricao = dto.Descricao,
            DataPublicacao = dto.DataPublicacao
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<PortariaDto?> UpdateAsync(
        Guid id,
        PortariaCreateUpdateDto dto,
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
        entity.NumeroPortaria = dto.NumeroPortaria;
        entity.IdSei = dto.IdSei;
        entity.Descricao = dto.Descricao;
        entity.DataPublicacao = dto.DataPublicacao;

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

    private static PortariaDto MapToDto(Portaria entity)
    {
        return new PortariaDto
        {
            Id = entity.Id,
            ContratoId = entity.ContratoId,
            NumeroPortaria = entity.NumeroPortaria,
            IdSei = entity.IdSei,
            Descricao = entity.Descricao,
            DataPublicacao = entity.DataPublicacao
        };
    }
}
