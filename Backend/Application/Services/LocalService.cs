using Application.Contract;
using Application.DTO.Local;
using Domain.Model;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;

namespace Application.Services;

public class LocalService : ILocalService
{
    private readonly AppDbContext _context;

    public LocalService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<LocalDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await _context.Locais
            .AsNoTracking()
            .Where(x => x.DeletedAt == null && x.Comissao != null && x.Comissao.DeletedAt == null)
            .Include(x => x.Comissao)
            .Include(x => x.LocalSuperior)
            .Include(x => x.Membros.Where(m => m.DeletedAt == null))
                .ThenInclude(x => x.Usuario)
            .OrderBy(x => x.Nome)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto);
    }

    public async Task<LocalDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Locais
            .AsNoTracking()
            .Include(x => x.Comissao)
            .Include(x => x.LocalSuperior)
            .Include(x => x.Membros.Where(m => m.DeletedAt == null))
                .ThenInclude(x => x.Usuario)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<LocalDto> CreateAsync(LocalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var membroIds = await ValidateAsync(dto, null, cancellationToken);

        var entity = new Local
        {
            Nome = dto.Nome.Trim(),
            ComissaoId = dto.ComissaoId,
            LocalSuperiorId = dto.LocalSuperiorId,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            Membros = membroIds
                .Select(usuarioId => new LocalMembro { UsuarioId = usuarioId })
                .ToList()
        };

        _context.Locais.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<LocalDto?> UpdateAsync(Guid id, LocalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var membroIds = await ValidateAsync(dto, id, cancellationToken);

        var entity = await _context.Locais
            .Include(x => x.Membros)
            .FirstOrDefaultAsync(
                x => x.Id == id && x.DeletedAt == null,
                cancellationToken
            );
        if (entity is null)
        {
            return null;
        }

        entity.Nome = dto.Nome.Trim();
        entity.ComissaoId = dto.ComissaoId;
        entity.LocalSuperiorId = dto.LocalSuperiorId;
        entity.Latitude = dto.Latitude;
        entity.Longitude = dto.Longitude;

        _context.LocaisMembros.RemoveRange(entity.Membros);
        await _context.SaveChangesAsync(cancellationToken);

        _context.LocaisMembros.AddRange(membroIds.Select(usuarioId => new LocalMembro
        {
            LocalId = entity.Id,
            UsuarioId = usuarioId
        }));
        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Locais.FirstOrDefaultAsync(
            x => x.Id == id && x.DeletedAt == null,
            cancellationToken
        );
        if (entity is null)
        {
            return false;
        }

        entity.DeletedAt = DateTime.UtcNow;
        return await _context.SaveChangesAsync(cancellationToken) > 0;
    }

    public async Task<LocalDto?> SetBloqueioAsync(
        Guid id,
        bool bloqueado,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.Locais.FirstOrDefaultAsync(
            x => x.Id == id && x.DeletedAt == null,
            cancellationToken
        );
        if (entity is null)
        {
            return null;
        }

        entity.Bloqueado = bloqueado;
        await _context.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task<List<Guid>> ValidateAsync(LocalCreateUpdateDto dto, Guid? currentLocalId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Nome))
        {
            throw new InvalidOperationException("O nome do local é obrigatório.");
        }

        if (dto.ComissaoId == Guid.Empty)
        {
            throw new InvalidOperationException("Informe a comissão responsável pelo local.");
        }

        var comissaoExiste = await _context.Comissoes.AnyAsync(
            x => x.Id == dto.ComissaoId && x.DeletedAt == null,
            cancellationToken
        );
        if (!comissaoExiste)
        {
            throw new InvalidOperationException("Comissão responsável não encontrada.");
        }

        await ValidateLocalSuperiorAsync(dto, currentLocalId, cancellationToken);

        if (dto.Latitude.HasValue && (dto.Latitude.Value < -90 || dto.Latitude.Value > 90))
        {
            throw new InvalidOperationException("A latitude informada para o local é inválida.");
        }

        if (dto.Longitude.HasValue && (dto.Longitude.Value < -180 || dto.Longitude.Value > 180))
        {
            throw new InvalidOperationException("A longitude informada para o local é inválida.");
        }

        if ((dto.Latitude.HasValue && !dto.Longitude.HasValue) || (!dto.Latitude.HasValue && dto.Longitude.HasValue))
        {
            throw new InvalidOperationException("Informe latitude e longitude para salvar a localização do local.");
        }

        var membroIds = (dto.MembroUsuarioIds ?? new List<Guid>())
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToList();

        var membrosValidos = await _context.ComissoesMembros
            .AsNoTracking()
            .Where(x =>
                x.ComissaoId == dto.ComissaoId
                && x.DeletedAt == null
                && membroIds.Contains(x.UsuarioId)
                && x.Usuario != null
                && x.Usuario.DeletedAt == null
                && x.Usuario.Status == "Ativo")
            .Select(x => x.UsuarioId)
            .ToListAsync(cancellationToken);

        if (membrosValidos.Count != membroIds.Count)
        {
            throw new InvalidOperationException("Todos os responsáveis do local precisam ser membros ativos da comissão.");
        }

        return membroIds;
    }

    private async Task ValidateLocalSuperiorAsync(
        LocalCreateUpdateDto dto,
        Guid? currentLocalId,
        CancellationToken cancellationToken)
    {
        if (currentLocalId.HasValue
            && dto.LocalSuperiorId.HasValue
            && dto.LocalSuperiorId.Value == currentLocalId.Value)
        {
            throw new InvalidOperationException("Um local não pode ser superior a ele próprio.");
        }

        var locais = await _context.Locais
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Select(x => new { x.Id, x.ComissaoId, x.LocalSuperiorId })
            .ToListAsync(cancellationToken);

        if (currentLocalId.HasValue
            && locais.Any(x => x.LocalSuperiorId == currentLocalId.Value && x.ComissaoId != dto.ComissaoId))
        {
            throw new InvalidOperationException("O local e seus subordinados devem pertencer à mesma comissão.");
        }

        if (!dto.LocalSuperiorId.HasValue)
        {
            return;
        }

        var localSuperior = locais.FirstOrDefault(x => x.Id == dto.LocalSuperiorId.Value);

        if (localSuperior is null)
        {
            throw new InvalidOperationException("Local superior não encontrado.");
        }

        if (localSuperior.ComissaoId != dto.ComissaoId)
        {
            throw new InvalidOperationException("O local superior deve pertencer à mesma comissão.");
        }

        if (!currentLocalId.HasValue)
        {
            return;
        }

        var superioresPorLocal = locais.ToDictionary(x => x.Id, x => x.LocalSuperiorId);
        var localVisitadoId = dto.LocalSuperiorId;
        var locaisVisitados = new HashSet<Guid>();
        while (localVisitadoId.HasValue)
        {
            if (localVisitadoId.Value == currentLocalId.Value || !locaisVisitados.Add(localVisitadoId.Value))
            {
                throw new InvalidOperationException("A hierarquia informada cria uma referência circular entre locais.");
            }

            localVisitadoId = superioresPorLocal.GetValueOrDefault(localVisitadoId.Value);
        }
    }

    private static LocalDto MapToDto(Local entity)
    {
        return new LocalDto
        {
            Id = entity.Id,
            Nome = entity.Nome,
            ComissaoId = entity.ComissaoId,
            ComissaoAno = entity.Comissao?.Ano ?? 0,
            LocalSuperiorId = entity.LocalSuperiorId,
            LocalSuperiorNome = entity.LocalSuperior?.Nome,
            Latitude = entity.Latitude,
            Longitude = entity.Longitude,
            Bloqueado = entity.Bloqueado,
            Membros = entity.Membros
                .Where(x => x.DeletedAt == null)
                .OrderBy(x => x.Usuario!.Nome)
                .Select(x => new LocalMembroDto
                {
                    UsuarioId = x.UsuarioId,
                    Nome = x.Usuario?.Nome ?? string.Empty,
                    Cpf = x.Usuario?.Cpf ?? string.Empty
                })
                .ToArray()
        };
    }
}
