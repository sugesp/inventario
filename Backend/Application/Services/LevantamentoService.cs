using System.Text.RegularExpressions;
using Application.Contract;
using Application.DTO.Levantamento;
using Domain.Model;
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

    public async Task<IEnumerable<LevantamentoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await QueryBase()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return entities.Select(MapToDto);
    }

    public async Task<LevantamentoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await QueryBase()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToDto(entity);
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

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<LevantamentoItemDto> ConfirmarItemAsync(
        Guid levantamentoId,
        LevantamentoConfirmItemDto dto,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    )
    {
        var levantamento = await _context.Levantamentos
            .FirstOrDefaultAsync(x => x.Id == levantamentoId && x.DeletedAt == null, cancellationToken);

        if (levantamento is null)
        {
            throw new InvalidOperationException("Levantamento não encontrado.");
        }

        var tombamentoNormalizado = NormalizeDigits(dto.Tombamento);
        if (string.IsNullOrWhiteSpace(tombamentoNormalizado))
        {
            throw new InvalidOperationException("Informe um tombamento válido para confirmação.");
        }

        var tombamentoFormatado = FormatTombamento(tombamentoNormalizado);
        var jaExiste = await _context.LevantamentosItens.AnyAsync(
            x => x.LevantamentoId == levantamentoId && x.DeletedAt == null && x.Tombamento == tombamentoFormatado,
            cancellationToken
        );

        if (jaExiste)
        {
            throw new InvalidOperationException("Esse tombamento já foi confirmado neste levantamento.");
        }

        var resumo = await _itemInventariadoService.ConsultarResumoPublicoAsync(tombamentoNormalizado, cancellationToken);
        var item = new LevantamentoItem
        {
            LevantamentoId = levantamentoId,
            Tombamento = FormatTombamento(resumo?.Tombamento ?? tombamentoNormalizado),
            TombamentoAntigo = NormalizeOptionalTombamentoAntigo(resumo?.TombamentoAntigo),
            Descricao = (resumo?.Descricao ?? resumo?.Tipo ?? string.Empty).Trim(),
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

    private IQueryable<Levantamento> QueryBase()
    {
        return _context.Levantamentos
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.CriadoPorUsuario)
            .Include(x => x.Itens.Where(item => item.DeletedAt == null))
                .ThenInclude(x => x.ConfirmadoPorUsuario);
    }

    private static LevantamentoDto MapToDto(Levantamento entity)
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
            Tombamento = entity.Tombamento,
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
        return $"https://e-estado.ro.gov.br/publico/bens/{NormalizeDigits(tombamento)}";
    }
}
