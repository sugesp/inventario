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
            .Include(x => x.Membros.Where(m => m.DeletedAt == null))
                .ThenInclude(x => x.Usuario)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<LocalDto> CreateAsync(LocalCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var membroIds = await ValidateAsync(dto, cancellationToken);

        var entity = new Local
        {
            Nome = dto.Nome.Trim(),
            ComissaoId = dto.ComissaoId,
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
        var membroIds = await ValidateAsync(dto, cancellationToken);

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

    private async Task<List<Guid>> ValidateAsync(LocalCreateUpdateDto dto, CancellationToken cancellationToken)
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

        var membroIds = (dto.MembroUsuarioIds ?? new List<Guid>())
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToList();

        if (membroIds.Count == 0)
        {
            throw new InvalidOperationException("Informe ao menos um membro responsável pelo local.");
        }

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

    private static LocalDto MapToDto(Local entity)
    {
        return new LocalDto
        {
            Id = entity.Id,
            Nome = entity.Nome,
            ComissaoId = entity.ComissaoId,
            ComissaoAno = entity.Comissao?.Ano ?? 0,
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
