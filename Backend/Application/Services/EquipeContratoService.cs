using Application.Contract;
using Application.DTO.EquipeContrato;
using Domain.Model;
using Persistence.Contract;

namespace Application.Services;

public class EquipeContratoService : IEquipeContratoService
{
    private readonly IGenericRepository<EquipeContrato> _repository;
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly IGenericRepository<Usuario> _usuarioRepository;
    private readonly IGenericRepository<Portaria> _portariaRepository;
    private readonly ContratoAccessService _contratoAccessService;

    public EquipeContratoService(
        IGenericRepository<EquipeContrato> repository,
        IGenericRepository<Contrato> contratoRepository,
        IGenericRepository<Usuario> usuarioRepository,
        IGenericRepository<Portaria> portariaRepository,
        ContratoAccessService contratoAccessService
    )
    {
        _repository = repository;
        _contratoRepository = contratoRepository;
        _usuarioRepository = usuarioRepository;
        _portariaRepository = portariaRepository;
        _contratoAccessService = contratoAccessService;
    }

    public async Task<IEnumerable<EquipeContratoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = (await _repository.GetAllAsync(cancellationToken)).ToList();
        var usuarios = (await _usuarioRepository.GetAllAsync(cancellationToken))
            .ToDictionary(x => x.Id);
        var portarias = (await _portariaRepository.GetAllAsync(cancellationToken))
            .ToDictionary(x => x.Id);

        return items
            .Select(x => MapToDto(
                x,
                usuarios.GetValueOrDefault(x.UsuarioId),
                x.PortariaId.HasValue ? portarias.GetValueOrDefault(x.PortariaId.Value) : null
            ))
            .OrderBy(x => x.DataExclusao.HasValue)
            .ThenByDescending(x => x.DataInclusao);
    }

    public async Task<EquipeContratoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var usuario = await _usuarioRepository.GetByIdAsync(entity.UsuarioId, cancellationToken);
        var portaria = entity.PortariaId.HasValue
            ? await _portariaRepository.GetByIdAsync(entity.PortariaId.Value, cancellationToken)
            : null;

        return MapToDto(entity, usuario, portaria);
    }

    public async Task<EquipeContratoDto> CreateAsync(
        EquipeContratoCreateUpdateDto dto,
        CancellationToken cancellationToken = default
    )
    {
        var (usuario, portaria, dataInclusao) = await ValidateReferences(dto, null, cancellationToken);

        var entity = new EquipeContrato
        {
            ContratoId = dto.ContratoId,
            UsuarioId = dto.UsuarioId,
            PortariaId = dto.PortariaId,
            Funcao = dto.Funcao,
            EhSubstituto = dto.EhSubstituto,
            DataInclusao = dataInclusao,
            DataExclusao = dto.DataExclusao,
            MotivoExclusao = dto.MotivoExclusao
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, usuario, portaria);
    }

    public async Task<EquipeContratoDto?> UpdateAsync(
        Guid id,
        EquipeContratoCreateUpdateDto dto,
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
        var (usuario, portaria, dataInclusao) = await ValidateReferences(dto, entity.DataInclusao, cancellationToken);

        entity.ContratoId = dto.ContratoId;
        entity.UsuarioId = dto.UsuarioId;
        entity.PortariaId = dto.PortariaId;
        entity.Funcao = dto.Funcao;
        entity.EhSubstituto = dto.EhSubstituto;
        entity.DataInclusao = dataInclusao;
        entity.DataExclusao = dto.DataExclusao;
        entity.MotivoExclusao = dto.MotivoExclusao;

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity, usuario, portaria);
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

    private async Task<(Usuario usuario, Portaria? portaria, DateTime dataInclusao)> ValidateReferences(
        EquipeContratoCreateUpdateDto dto,
        DateTime? dataInclusaoExistente,
        CancellationToken cancellationToken
    )
    {
        var contrato = await _contratoRepository.GetByIdAsync(dto.ContratoId, cancellationToken);
        if (contrato is null)
        {
            throw new InvalidOperationException("Contrato não encontrado.");
        }

        var usuario = await _usuarioRepository.GetByIdAsync(dto.UsuarioId, cancellationToken);
        if (usuario is null)
        {
            throw new InvalidOperationException("Usuário não encontrado.");
        }

        Portaria? portaria = null;
        if (dto.PortariaId.HasValue)
        {
            portaria = await _portariaRepository.GetByIdAsync(dto.PortariaId.Value, cancellationToken);
            if (portaria is null)
            {
                throw new InvalidOperationException("Portaria não encontrada.");
            }

            if (portaria.ContratoId != dto.ContratoId)
            {
                throw new InvalidOperationException("A portaria informada não pertence a este contrato.");
            }
        }

        var dataInclusao = dto.DataInclusao
            ?? dataInclusaoExistente
            ?? portaria?.DataPublicacao
            ?? DateTime.Today;

        if (dto.DataExclusao.HasValue && dto.DataExclusao.Value.Date < dataInclusao.Date)
        {
            throw new InvalidOperationException("A data de exclusão não pode ser anterior à data de inclusão.");
        }

        return (usuario, portaria, dataInclusao);
    }

    private static EquipeContratoDto MapToDto(
        EquipeContrato entity,
        Usuario? usuario = null,
        Portaria? portaria = null
    )
    {
        return new EquipeContratoDto
        {
            Id = entity.Id,
            ContratoId = entity.ContratoId,
            UsuarioId = entity.UsuarioId,
            UsuarioNome = usuario?.Nome,
            UsuarioCpf = usuario?.Cpf,
            PortariaId = entity.PortariaId,
            PortariaNumero = portaria?.NumeroPortaria,
            Funcao = entity.Funcao,
            EhSubstituto = entity.EhSubstituto,
            DataInclusao = entity.DataInclusao,
            DataExclusao = entity.DataExclusao,
            MotivoExclusao = entity.MotivoExclusao
        };
    }
}
