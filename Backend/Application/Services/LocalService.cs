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
            .Where(x => x.DeletedAt == null && x.Equipe != null && x.Equipe.DeletedAt == null)
            .Include(x => x.Equipe)
            .OrderBy(x => x.Nome)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto);
    }

    public async Task<LocalDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Locais
            .AsNoTracking()
            .Include(x => x.Equipe)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<LocalDto> CreateAsync(LocalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, cancellationToken);

        var entity = new Local
        {
            Nome = dto.Nome.Trim(),
            EquipeId = dto.EquipeId
        };

        _context.Locais.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        entity.Equipe = await _context.Equipes.AsNoTracking()
            .FirstAsync(x => x.Id == entity.EquipeId, cancellationToken);

        return MapToDto(entity);
    }

    public async Task<LocalDto?> UpdateAsync(Guid id, LocalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, cancellationToken);

        var entity = await _context.Locais.FirstOrDefaultAsync(
            x => x.Id == id && x.DeletedAt == null,
            cancellationToken
        );
        if (entity is null)
        {
            return null;
        }

        entity.Nome = dto.Nome.Trim();
        entity.EquipeId = dto.EquipeId;
        await _context.SaveChangesAsync(cancellationToken);

        entity.Equipe = await _context.Equipes.AsNoTracking()
            .FirstAsync(x => x.Id == entity.EquipeId, cancellationToken);

        return MapToDto(entity);
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

    private async Task ValidateAsync(LocalCreateUpdateDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Nome))
        {
            throw new InvalidOperationException("O nome do local é obrigatório.");
        }

        var equipeExiste = await _context.Equipes.AnyAsync(
            x => x.Id == dto.EquipeId && x.DeletedAt == null,
            cancellationToken
        );
        if (!equipeExiste)
        {
            throw new InvalidOperationException("Equipe responsável não encontrada.");
        }
    }

    private static LocalDto MapToDto(Local entity)
    {
        return new LocalDto
        {
            Id = entity.Id,
            Nome = entity.Nome,
            EquipeId = entity.EquipeId,
            EquipeDescricao = entity.Equipe?.Descricao ?? string.Empty
        };
    }
}
