using Application.Contract;
using Application.DTO.Equipe;
using Domain.Model;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;
using Persistence.Contract;

namespace Application.Services;

public class EquipeService : IEquipeService
{
    private readonly IGenericRepository<Equipe> _repository;
    private readonly AppDbContext _context;

    public EquipeService(IGenericRepository<Equipe> repository, AppDbContext context)
    {
        _repository = repository;
        _context = context;
    }

    public async Task<IEnumerable<EquipeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var equipes = await _context.Equipes
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.Comissao)
            .OrderByDescending(x => x.Comissao!.Ano)
            .ThenBy(x => x.Descricao)
            .ToListAsync(cancellationToken);

        return equipes.Select(MapToDto);
    }

    public async Task<EquipeDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Equipes
            .AsNoTracking()
            .Include(x => x.Comissao)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<EquipeDto> CreateAsync(EquipeCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, cancellationToken);

        var entity = new Equipe
        {
            Descricao = dto.Descricao.Trim(),
            ComissaoId = dto.ComissaoId
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<EquipeDto?> UpdateAsync(Guid id, EquipeCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.Descricao = dto.Descricao.Trim();
        entity.ComissaoId = dto.ComissaoId;
        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(entity.Id, cancellationToken);
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

    private async Task ValidateAsync(EquipeCreateUpdateDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Descricao))
        {
            throw new InvalidOperationException("A descrição da equipe é obrigatória.");
        }

        if (dto.ComissaoId == Guid.Empty)
        {
            throw new InvalidOperationException("Comissão não encontrada para vincular a equipe.");
        }

        var comissaoExiste = await _context.Comissoes.AnyAsync(
            x => x.Id == dto.ComissaoId && x.DeletedAt == null,
            cancellationToken
        );
        if (!comissaoExiste)
        {
            throw new InvalidOperationException("Comissão não encontrada para vincular a equipe.");
        }
    }

    private static EquipeDto MapToDto(Equipe entity)
    {
        return new EquipeDto
        {
            Id = entity.Id,
            Descricao = entity.Descricao,
            ComissaoId = entity.ComissaoId,
            ComissaoAno = entity.Comissao?.Ano ?? 0
        };
    }
}
