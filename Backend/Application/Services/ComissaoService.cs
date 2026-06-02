using Application.Contract;
using Application.DTO.Comissao;
using Domain.Model;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;

namespace Application.Services;

public class ComissaoService : IComissaoService
{
    private const string StatusAtiva = "Ativa";
    private const string StatusInativa = "Inativa";
    private readonly AppDbContext _context;

    public ComissaoService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ComissaoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await QueryBase()
            .OrderByDescending(x => x.Ano)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto);
    }

    public async Task<ComissaoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await QueryBase()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<ComissaoDto?> GetActiveAsync(CancellationToken cancellationToken = default)
    {
        var entity = await QueryBase()
            .FirstOrDefaultAsync(x => x.Status == StatusAtiva, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public Task<bool> IsPresidentAsync(Guid comissaoId, Guid usuarioId, CancellationToken cancellationToken = default)
    {
        return _context.Comissoes.AnyAsync(
            x => x.Id == comissaoId && x.PresidenteId == usuarioId && x.DeletedAt == null,
            cancellationToken
        );
    }

    public async Task<ComissaoDto> CreateAsync(ComissaoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        var membros = await ValidateAsync(dto, null, cancellationToken);

        var entity = new Comissao
        {
            Ano = dto.Ano,
            Status = NormalizeStatus(dto.Status),
            PresidenteId = dto.PresidenteId,
            Membros = membros
                .Select(membro => new ComissaoMembro
                {
                    UsuarioId = membro.UsuarioId,
                    EquipeId = membro.EquipeId
                })
                .ToList()
        };

        _context.Comissoes.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<ComissaoDto?> UpdateAsync(Guid id, ComissaoCreateUpdateDto dto, bool usuarioAdministrador, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Comissoes
            .Include(x => x.Membros)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        var effectiveDto = usuarioAdministrador
            ? dto
            : new ComissaoCreateUpdateDto
            {
                Ano = entity.Ano,
                Status = entity.Status,
                PresidenteId = entity.PresidenteId,
                Membros = dto.Membros
            };

        var membros = await ValidateAsync(effectiveDto, id, cancellationToken);

        entity.Ano = effectiveDto.Ano;
        entity.Status = NormalizeStatus(effectiveDto.Status);
        entity.PresidenteId = effectiveDto.PresidenteId;

        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            _context.ComissoesMembros.RemoveRange(entity.Membros);
            await _context.SaveChangesAsync(cancellationToken);

            var novosMembros = membros
                .Select(membro => new ComissaoMembro
                {
                    ComissaoId = entity.Id,
                    UsuarioId = membro.UsuarioId,
                    EquipeId = membro.EquipeId
                })
                .ToList();

            _context.ComissoesMembros.AddRange(novosMembros);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            throw new InvalidOperationException(
                "Não foi possível salvar a comissão. Atualize a página e tente novamente.",
                ex
            );
        }

        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Comissoes
            .Include(x => x.Membros.Where(m => m.DeletedAt == null))
            .Include(x => x.ItensInventariados.Where(i => i.DeletedAt == null))
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return false;
        }

        if (entity.ItensInventariados.Any())
        {
            throw new InvalidOperationException("Esta comissão já possui itens inventariados vinculados e não pode ser excluída.");
        }

        _context.ComissoesMembros.RemoveRange(entity.Membros);
        _context.Comissoes.Remove(entity);

        return await _context.SaveChangesAsync(cancellationToken) > 0;
    }

    private IQueryable<Comissao> QueryBase()
    {
        return _context.Comissoes
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.Presidente)
            .Include(x => x.Membros.Where(m => m.DeletedAt == null))
                .ThenInclude(x => x.Usuario)
            .Include(x => x.Membros.Where(m => m.DeletedAt == null))
                .ThenInclude(x => x.Equipe);
    }

    private async Task<List<ComissaoMembroSaveDto>> ValidateAsync(
        ComissaoCreateUpdateDto dto,
        Guid? comissaoId,
        CancellationToken cancellationToken
    )
    {
        if (dto.Ano < 2000 || dto.Ano > 9999)
        {
            throw new InvalidOperationException("Informe um ano válido para a comissão.");
        }

        if (dto.PresidenteId == Guid.Empty)
        {
            throw new InvalidOperationException("Informe o presidente da comissão.");
        }

        if (string.IsNullOrWhiteSpace(dto.Status))
        {
            throw new InvalidOperationException("Informe o status da comissão.");
        }

        var status = NormalizeStatus(dto.Status);
        var anoEmUso = await _context.Comissoes.AnyAsync(
            x => x.DeletedAt == null && x.Ano == dto.Ano && x.Id != comissaoId,
            cancellationToken
        );
        if (anoEmUso)
        {
            throw new InvalidOperationException("Já existe uma comissão cadastrada para este ano.");
        }

        if (status == StatusAtiva)
        {
            var outraAtiva = await _context.Comissoes.AnyAsync(
                x => x.DeletedAt == null && x.Status == StatusAtiva && x.Id != comissaoId,
                cancellationToken
            );
            if (outraAtiva)
            {
                throw new InvalidOperationException("Já existe uma comissão ativa. Desative a atual antes de ativar outra.");
            }
        }

        var membros = (dto.Membros ?? new List<ComissaoMembroSaveDto>())
            .Where(x => x.UsuarioId != Guid.Empty)
            .GroupBy(x => x.UsuarioId)
            .Select(x => x.Last())
            .ToList();

        var membroIds = membros.Select(x => x.UsuarioId).ToHashSet();

        var usuariosValidos = await _context.Usuarios
            .AsNoTracking()
            .Where(x =>
                x.DeletedAt == null
                && x.Status == "Ativo"
                && (x.Id == dto.PresidenteId || membroIds.Contains(x.Id))
            )
            .Select(x => x.Id)
            .ToListAsync(cancellationToken);

        if (!usuariosValidos.Contains(dto.PresidenteId))
        {
            throw new InvalidOperationException("Presidente informado não encontrado ou inativo.");
        }

        if (membroIds.Except(usuariosValidos).Any())
        {
            throw new InvalidOperationException("Um ou mais membros informados não foram encontrados ou estão inativos.");
        }

        var equipeIds = membros
            .Where(x => x.EquipeId.HasValue && x.EquipeId.Value != Guid.Empty)
            .Select(x => x.EquipeId!.Value)
            .Distinct()
            .ToList();

        if (equipeIds.Count > 0)
        {
            var equipesValidas = await _context.Equipes
                .AsNoTracking()
                .Where(x =>
                    x.DeletedAt == null
                    && equipeIds.Contains(x.Id)
                    && (!comissaoId.HasValue || x.ComissaoId == comissaoId.Value))
                .Select(x => x.Id)
                .ToListAsync(cancellationToken);

            if (equipesValidas.Count != equipeIds.Count)
            {
                throw new InvalidOperationException("Uma ou mais equipes informadas para os membros não pertencem a esta comissão.");
            }
        }

        return membros;
    }

    private static string NormalizeStatus(string status)
    {
        var normalized = status.Trim();

        return normalized switch
        {
            "Ativa" => StatusAtiva,
            "Inativa" => StatusInativa,
            _ => throw new InvalidOperationException("Status da comissão inválido.")
        };
    }

    private static ComissaoDto MapToDto(Comissao entity)
    {
        return new ComissaoDto
        {
            Id = entity.Id,
            Ano = entity.Ano,
            Status = entity.Status,
            PresidenteId = entity.PresidenteId,
            PresidenteNome = entity.Presidente?.Nome ?? string.Empty,
            Membros = entity.Membros
                .Where(x => x.DeletedAt == null)
                .OrderBy(x => x.Usuario!.Nome)
                .Select(x => new ComissaoMembroDto
                {
                    UsuarioId = x.UsuarioId,
                    Nome = x.Usuario?.Nome ?? string.Empty,
                    Cpf = x.Usuario?.Cpf ?? string.Empty,
                    EquipeId = x.EquipeId,
                    EquipeDescricao = x.Equipe?.Descricao
                })
                .ToArray()
        };
    }
}
