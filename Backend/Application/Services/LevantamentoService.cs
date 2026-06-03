using System.Text.RegularExpressions;
using Application.Contract;
using Application.DTO.Levantamento;
using Domain.Model;
using Domain.Security;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;

namespace Application.Services;

public class LevantamentoService : ILevantamentoService
{
    private readonly AppDbContext _context;
    private readonly IItemInventariadoService _itemInventariadoService;

    public LevantamentoService(
        AppDbContext context,
        IItemInventariadoService itemInventariadoService
    )
    {
        _context = context;
        _itemInventariadoService = itemInventariadoService;
    }

    public async Task<IEnumerable<LevantamentoDto>> GetAllAsync(
        Guid usuarioAutenticadoId,
        bool usuarioAdministrador,
        CancellationToken cancellationToken = default
    )
    {
        var query = QueryBase();

        if (!usuarioAdministrador)
        {
            query = query.Where(x =>
                    x.CriadoPorUsuarioId == usuarioAutenticadoId
                    || x.Compartilhamentos.Any(compartilhamento =>
                        compartilhamento.UsuarioId == usuarioAutenticadoId
                        && compartilhamento.DeletedAt == null
                    )
                );
        }

        var entities = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return entities.Select(entity => MapToDto(entity, usuarioAutenticadoId));
    }

    public async Task<LevantamentoDto?> GetByIdAsync(
        Guid id,
        Guid usuarioAutenticadoId,
        bool usuarioAdministrador,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await QueryBase()
            .FirstOrDefaultAsync(x =>
                x.Id == id
                && (
                    usuarioAdministrador
                    ||
                    x.CriadoPorUsuarioId == usuarioAutenticadoId
                    || x.Compartilhamentos.Any(compartilhamento =>
                        compartilhamento.UsuarioId == usuarioAutenticadoId
                        && compartilhamento.DeletedAt == null
                    )
                ),
                cancellationToken
            );

        return entity is null ? null : MapToDto(entity, usuarioAutenticadoId);
    }

    public async Task<LevantamentoDto> CreateAsync(
        LevantamentoCreateDto dto,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(dto.Nome))
        {
            throw new InvalidOperationException("Informe o nome do levantamento.");
        }

        var usuarioExiste = await _context.Usuarios.AnyAsync(
            x => x.Id == usuarioAutenticadoId && x.DeletedAt == null,
            cancellationToken
        );

        if (!usuarioExiste)
        {
            throw new InvalidOperationException("Usuário autenticado não encontrado.");
        }

        var entity = new Levantamento
        {
            Nome = dto.Nome.Trim(),
            Descricao = dto.Descricao?.Trim() ?? string.Empty,
            CriadoPorUsuarioId = usuarioAutenticadoId,
        };

        _context.Levantamentos.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, usuarioAutenticadoId, false, cancellationToken))!;
    }

    public async Task<LevantamentoDto?> CompartilharAsync(
        Guid id,
        LevantamentoCompartilharDto dto,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    )
    {
        var levantamento = await _context.Levantamentos
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (levantamento is null)
        {
            return null;
        }

        if (levantamento.CriadoPorUsuarioId != usuarioAutenticadoId)
        {
            throw new InvalidOperationException("Somente o criador pode compartilhar este levantamento.");
        }

        var usuarioIds = dto.UsuarioIds
            .Where(usuarioId => usuarioId != Guid.Empty && usuarioId != levantamento.CriadoPorUsuarioId)
            .Distinct()
            .ToHashSet();

        if (usuarioIds.Count > 0)
        {
            var usuariosValidos = await _context.Usuarios
                .AsNoTracking()
                .Where(x =>
                    usuarioIds.Contains(x.Id)
                    && x.DeletedAt == null
                    && x.Status == "Ativo"
                )
                .ToListAsync(cancellationToken);

            var usuariosInvalidos = usuariosValidos
                .Where(x =>
                    !UsuarioPermissoes.HasPermission(x.PermissoesJson, UsuarioPermissoes.Levantamento)
                    && !UsuarioPermissoes.HasPermission(x.PermissoesJson, UsuarioPermissoes.Administrador)
                )
                .Select(x => x.Id)
                .ToHashSet();

            if (usuariosValidos.Count != usuarioIds.Count || usuariosInvalidos.Count > 0)
            {
                throw new InvalidOperationException("Compartilhe apenas com usuários ativos que tenham acesso a levantamentos.");
            }
        }

        var compartilhamentos = await _context.LevantamentosCompartilhamentos
            .Where(x => x.LevantamentoId == levantamento.Id)
            .ToListAsync(cancellationToken);

        foreach (var compartilhamento in compartilhamentos)
        {
            if (!usuarioIds.Contains(compartilhamento.UsuarioId))
            {
                compartilhamento.DeletedAt = DateTime.UtcNow;
            }
        }

        var compartilhamentosAtuais = compartilhamentos
            .Where(x => x.DeletedAt == null)
            .Select(x => x.UsuarioId)
            .ToHashSet();

        foreach (var usuarioId in usuarioIds.Where(usuarioId => !compartilhamentosAtuais.Contains(usuarioId)))
        {
            var compartilhamentoExistente = compartilhamentos
                .FirstOrDefault(x => x.UsuarioId == usuarioId);

            if (compartilhamentoExistente is not null)
            {
                compartilhamentoExistente.DeletedAt = null;
                compartilhamentoExistente.CompartilhadoPorUsuarioId = usuarioAutenticadoId;
                continue;
            }

            _context.LevantamentosCompartilhamentos.Add(new LevantamentoCompartilhamento
            {
                LevantamentoId = levantamento.Id,
                UsuarioId = usuarioId,
                CompartilhadoPorUsuarioId = usuarioAutenticadoId,
            });
        }

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            throw new InvalidOperationException(
                "Não foi possível salvar o compartilhamento. Atualize a página e tente novamente.",
                ex
            );
        }

        return await GetByIdAsync(id, usuarioAutenticadoId, false, cancellationToken);
    }

    public async Task<LevantamentoItemDto> ConfirmarItemAsync(
        Guid levantamentoId,
        LevantamentoConfirmItemDto dto,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    )
    {
        var levantamento = await _context.Levantamentos
            .Include(x => x.Compartilhamentos.Where(compartilhamento => compartilhamento.DeletedAt == null))
            .FirstOrDefaultAsync(x =>
                x.Id == levantamentoId
                && x.DeletedAt == null
                && (
                    x.CriadoPorUsuarioId == usuarioAutenticadoId
                    || x.Compartilhamentos.Any(compartilhamento =>
                        compartilhamento.UsuarioId == usuarioAutenticadoId
                        && compartilhamento.DeletedAt == null
                    )
                ),
                cancellationToken
            );

        if (levantamento is null)
        {
            throw new InvalidOperationException("Levantamento não encontrado.");
        }

        var tombamentoNormalizado = NormalizeDigits(dto.Tombamento);
        var tombamentoAntigoInformado = NormalizeOptionalTombamentoAntigo(dto.TombamentoAntigo);
        var descricaoInformada = dto.Descricao?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(tombamentoNormalizado) && string.IsNullOrWhiteSpace(tombamentoAntigoInformado))
        {
            throw new InvalidOperationException("Informe o tombamento do E-Estado ou o tombamento antigo para confirmação.");
        }

        if (string.IsNullOrWhiteSpace(tombamentoNormalizado) && string.IsNullOrWhiteSpace(descricaoInformada))
        {
            throw new InvalidOperationException("Informe a descrição do item quando houver apenas tombamento antigo.");
        }

        var tombamentoFormatado = BuildStoredTombamentoKey(tombamentoNormalizado, tombamentoAntigoInformado);
        var jaExiste = await _context.LevantamentosItens.AnyAsync(
            x => x.LevantamentoId == levantamentoId && x.DeletedAt == null && x.Tombamento == tombamentoFormatado,
            cancellationToken
        );

        if (jaExiste)
        {
            throw new InvalidOperationException("Esse tombamento já foi confirmado neste levantamento.");
        }

        var resumo = string.IsNullOrWhiteSpace(tombamentoNormalizado)
            ? null
            : await _itemInventariadoService.ConsultarResumoPublicoAsync(tombamentoNormalizado, cancellationToken);
        var item = new LevantamentoItem
        {
            LevantamentoId = levantamentoId,
            Tombamento = !string.IsNullOrWhiteSpace(tombamentoNormalizado)
                ? FormatTombamento(resumo?.Tombamento ?? tombamentoNormalizado)
                : BuildStoredTombamentoKey(string.Empty, tombamentoAntigoInformado),
            TombamentoAntigo = !string.IsNullOrWhiteSpace(tombamentoAntigoInformado)
                ? tombamentoAntigoInformado
                : NormalizeOptionalTombamentoAntigo(resumo?.TombamentoAntigo),
            Descricao = (resumo?.Descricao ?? resumo?.Tipo ?? descricaoInformada).Trim(),
            Tipo = resumo?.Tipo?.Trim() ?? string.Empty,
            UrlConsulta = resumo?.UrlConsulta?.Trim() ?? BuildConsultaUrl(tombamentoNormalizado),
            ConfirmadoPorUsuarioId = usuarioAutenticadoId,
        };

        _context.LevantamentosItens.Add(item);
        await _context.SaveChangesAsync(cancellationToken);

        var created = await _context.LevantamentosItens
            .AsNoTracking()
            .Include(x => x.ConfirmadoPorUsuario)
            .FirstAsync(x => x.Id == item.Id, cancellationToken);

        return MapItemToDto(created);
    }

    public async Task<bool> DeleteItemAsync(
        Guid levantamentoId,
        Guid itemId,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    )
    {
        var levantamento = await _context.Levantamentos
            .FirstOrDefaultAsync(x => x.Id == levantamentoId && x.DeletedAt == null, cancellationToken);

        if (levantamento is null)
        {
            return false;
        }

        if (levantamento.CriadoPorUsuarioId != usuarioAutenticadoId)
        {
            throw new InvalidOperationException("Somente o criador pode excluir itens deste levantamento.");
        }

        var item = await _context.LevantamentosItens
            .FirstOrDefaultAsync(x =>
                x.Id == itemId
                && x.LevantamentoId == levantamentoId
                && x.DeletedAt == null,
                cancellationToken
            );

        if (item is null)
        {
            return false;
        }

        _context.LevantamentosItens.Remove(item);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteAsync(
        Guid id,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    )
    {
        var levantamento = await _context.Levantamentos
            .Include(x => x.Compartilhamentos.Where(compartilhamento => compartilhamento.DeletedAt == null))
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (levantamento is null)
        {
            return false;
        }

        if (levantamento.CriadoPorUsuarioId != usuarioAutenticadoId)
        {
            throw new InvalidOperationException("Somente o criador pode excluir este levantamento.");
        }

        var possuiItens = await _context.LevantamentosItens.AnyAsync(
            x => x.LevantamentoId == id && x.DeletedAt == null,
            cancellationToken
        );

        if (possuiItens)
        {
            throw new InvalidOperationException("Somente levantamentos sem itens podem ser excluídos.");
        }

        levantamento.DeletedAt = DateTime.UtcNow;
        foreach (var compartilhamento in levantamento.Compartilhamentos)
        {
            compartilhamento.DeletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<Levantamento> QueryBase()
    {
        return _context.Levantamentos
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.CriadoPorUsuario)
            .Include(x => x.Compartilhamentos.Where(compartilhamento => compartilhamento.DeletedAt == null))
                .ThenInclude(x => x.Usuario)
            .Include(x => x.Compartilhamentos.Where(compartilhamento => compartilhamento.DeletedAt == null))
                .ThenInclude(x => x.CompartilhadoPorUsuario)
            .Include(x => x.Itens.Where(item => item.DeletedAt == null))
                .ThenInclude(x => x.ConfirmadoPorUsuario);
    }

    private static LevantamentoDto MapToDto(Levantamento entity, Guid usuarioAutenticadoId)
    {
        return new LevantamentoDto
        {
            Id = entity.Id,
            Nome = entity.Nome,
            Descricao = entity.Descricao,
            CriadoPorUsuarioId = entity.CriadoPorUsuarioId,
            CriadoPorUsuarioNome = entity.CriadoPorUsuario?.Nome ?? string.Empty,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
            UsuarioPodeGerenciar = entity.CriadoPorUsuarioId == usuarioAutenticadoId,
            UsuarioPodeCompartilhar = entity.CriadoPorUsuarioId == usuarioAutenticadoId,
            Compartilhamentos = entity.Compartilhamentos
                .Where(x => x.DeletedAt == null)
                .OrderBy(x => x.Usuario?.Nome)
                .Select(x => new LevantamentoCompartilhamentoDto
                {
                    UsuarioId = x.UsuarioId,
                    UsuarioNome = x.Usuario?.Nome ?? string.Empty,
                    CompartilhadoPorUsuarioId = x.CompartilhadoPorUsuarioId,
                    CompartilhadoPorUsuarioNome = x.CompartilhadoPorUsuario?.Nome ?? string.Empty,
                    CreatedAt = x.CreatedAt,
                })
                .ToArray(),
            Itens = entity.Itens
                .Where(x => x.DeletedAt == null)
                .OrderByDescending(x => x.CreatedAt)
                .Select(MapItemToDto)
                .ToArray(),
        };
    }

    private static LevantamentoItemDto MapItemToDto(LevantamentoItem entity)
    {
        return new LevantamentoItemDto
        {
            Id = entity.Id,
            Tombamento = ParseDisplayTombamento(entity.Tombamento),
            TombamentoAntigo = entity.TombamentoAntigo,
            Descricao = entity.Descricao,
            Tipo = entity.Tipo,
            UrlConsulta = entity.UrlConsulta,
            ConfirmadoPorUsuarioId = entity.ConfirmadoPorUsuarioId,
            ConfirmadoPorUsuarioNome = entity.ConfirmadoPorUsuario?.Nome ?? string.Empty,
            CreatedAt = entity.CreatedAt,
        };
    }

    private static string NormalizeDigits(string? value)
    {
        return Regex.Replace(value ?? string.Empty, @"\D", string.Empty);
    }

    private static string FormatTombamento(string? value)
    {
        var digits = NormalizeDigits(value).Trim();
        if (digits.Length > 9)
        {
            digits = digits[..9];
        }

        if (digits.Length <= 3)
        {
            return digits;
        }

        if (digits.Length <= 6)
        {
            return $"{digits[..3]}.{digits[3..]}";
        }

        return $"{digits[..3]}.{digits[3..6]}.{digits[6..]}";
    }

    private static string NormalizeOptionalTombamentoAntigo(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Replace(".", string.Empty).Trim();
        var meaningfulValue = Regex.Replace(normalized, @"[-\s]", string.Empty);

        return meaningfulValue.Any(char.IsLetterOrDigit) ? normalized : string.Empty;
    }

    private static string BuildConsultaUrl(string tombamento)
    {
        if (string.IsNullOrWhiteSpace(tombamento))
        {
            return string.Empty;
        }

        return $"https://e-estado.ro.gov.br/publico/bens/{NormalizeDigits(tombamento)}";
    }

    private static string BuildStoredTombamentoKey(string? tombamentoNovo, string? tombamentoAntigo)
    {
        var tombamentoNormalizado = NormalizeDigits(tombamentoNovo);
        if (!string.IsNullOrWhiteSpace(tombamentoNormalizado))
        {
            return FormatTombamento(tombamentoNormalizado);
        }

        var tombamentoAntigoNormalizado = NormalizeOptionalTombamentoAntigo(tombamentoAntigo);
        return $"ANTIGO:{tombamentoAntigoNormalizado}";
    }

    private static string ParseDisplayTombamento(string value)
    {
        return value.StartsWith("ANTIGO:", StringComparison.OrdinalIgnoreCase) ? string.Empty : value;
    }
}
