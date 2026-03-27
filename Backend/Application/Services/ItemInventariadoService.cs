using Application.Contract;
using Application.DTO.ItemInventariado;
using Domain.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;
using System.Globalization;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

namespace Application.Services;

public class ItemInventariadoService : IItemInventariadoService
{
    private readonly AppDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly IHttpClientFactory _httpClientFactory;

    public ItemInventariadoService(
        AppDbContext context,
        IFileStorageService fileStorageService,
        IHttpClientFactory httpClientFactory
    )
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<IEnumerable<ItemInventariadoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await QueryBase()
            .OrderByDescending(x => x.DataInventario)
            .ThenBy(x => x.Descricao)
            .ToListAsync(cancellationToken);

        return items.Select(MapToDto);
    }

    public async Task<ItemInventariadoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await QueryBase()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<ConsultaPublicaBemDto?> ConsultarResumoPublicoAsync(string tombamento, CancellationToken cancellationToken = default)
    {
        var tombamentoNormalizado = NormalizeDigits(tombamento);
        if (string.IsNullOrWhiteSpace(tombamentoNormalizado))
        {
            throw new InvalidOperationException("Informe um tombamento válido para consulta.");
        }

        var client = _httpClientFactory.CreateClient("PatrimonioPublico");
        using var response = await client.GetAsync($"publico/bens/{tombamentoNormalizado}", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        response.EnsureSuccessStatusCode();

        var html = await response.Content.ReadAsStringAsync(cancellationToken);
        var tipo = ExtractTipo(html);
        var descricao = ExtractDescricao(html);
        var tombamentoAntigo = ExtractIdentificacaoColumn(html, 2);
        var tombamentoConsulta = ExtractIdentificacaoColumn(html, 1);

        return new ConsultaPublicaBemDto
        {
            Tombamento = NormalizeDigits(tombamentoConsulta) is { Length: > 0 } tombamentoExtraido ? tombamentoExtraido : tombamentoNormalizado,
            TombamentoAntigo = tombamentoAntigo,
            Tipo = tipo,
            Descricao = descricao,
            UrlConsulta = $"https://e-estado.ro.gov.br/publico/bens/{tombamentoNormalizado}"
        };
    }

    public async Task<ItemInventariadoDto> CreateAsync(
        ItemInventariadoFormDto dto,
        IEnumerable<IFormFile> fotos,
        Guid usuarioAutenticadoId,
        CancellationToken cancellationToken = default
    )
    {
        await ValidateAsync(dto, dto.UsuarioId ?? usuarioAutenticadoId, cancellationToken);

        var entity = new ItemInventariado
        {
            TombamentoNovo = dto.TombamentoNovo?.Trim() ?? string.Empty,
            TombamentoAntigo = dto.TombamentoAntigo?.Trim() ?? string.Empty,
            Descricao = dto.Descricao?.Trim() ?? string.Empty,
            LocalId = dto.LocalId,
            UsuarioId = dto.UsuarioId ?? usuarioAutenticadoId,
            Status = NormalizeClassificationStatus(dto.Status)!,
            EstadoConservacao = NormalizeConservationState(dto.EstadoConservacao)!,
            Observacao = dto.Observacao?.Trim() ?? string.Empty,
            DataInventario = dto.DataInventario ?? DateTime.UtcNow
        };

        foreach (var foto in fotos.Where(x => x.Length > 0))
        {
            entity.Fotos.Add(await SaveFotoAsync(foto, cancellationToken));
        }

        _context.ItensInventariados.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<ItemInventariadoDto?> UpdateAsync(
        Guid id,
        ItemInventariadoFormDto dto,
        IEnumerable<IFormFile> novasFotos,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await _context.ItensInventariados
            .Include(x => x.Fotos)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        await ValidateAsync(dto, dto.UsuarioId ?? entity.UsuarioId, cancellationToken);

        entity.TombamentoNovo = dto.TombamentoNovo?.Trim() ?? string.Empty;
        entity.TombamentoAntigo = dto.TombamentoAntigo?.Trim() ?? string.Empty;
        entity.Descricao = dto.Descricao?.Trim() ?? string.Empty;
        entity.LocalId = dto.LocalId;
        entity.UsuarioId = dto.UsuarioId ?? entity.UsuarioId;
        entity.Status = NormalizeClassificationStatus(dto.Status)!;
        entity.EstadoConservacao = NormalizeConservationState(dto.EstadoConservacao)!;
        entity.Observacao = dto.Observacao?.Trim() ?? string.Empty;
        entity.DataInventario = dto.DataInventario ?? entity.DataInventario;
        entity.UpdatedAt = DateTime.UtcNow;

        var fotoIdsRemovidas = dto.FotoIdsRemovidas.Distinct().ToHashSet();
        if (fotoIdsRemovidas.Count > 0)
        {
            var fotosParaRemover = entity.Fotos
                .Where(x => fotoIdsRemovidas.Contains(x.Id))
                .ToList();

            foreach (var foto in fotosParaRemover)
            {
                _fileStorageService.Delete(foto.CaminhoRelativo);
                _context.ItensInventariadosFotos.Remove(foto);
            }
        }

        foreach (var foto in novasFotos.Where(x => x.Length > 0))
        {
            entity.Fotos.Add(await SaveFotoAsync(foto, cancellationToken));
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.ItensInventariados
            .Include(x => x.Fotos)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return false;
        }

        entity.DeletedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        foreach (var foto in entity.Fotos)
        {
            _fileStorageService.Delete(foto.CaminhoRelativo);
        }

        return await _context.SaveChangesAsync(cancellationToken) > 0;
    }

    private IQueryable<ItemInventariado> QueryBase()
    {
        return _context.ItensInventariados
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.Local)
                .ThenInclude(x => x!.Equipe)
            .Include(x => x.Usuario)
            .Include(x => x.Fotos.Where(f => f.DeletedAt == null));
    }

    private async Task ValidateAsync(ItemInventariadoFormDto dto, Guid usuarioId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Descricao))
        {
            throw new InvalidOperationException("A descrição do item é obrigatória.");
        }

        if (string.IsNullOrWhiteSpace(dto.Status))
        {
            throw new InvalidOperationException("O status do item é obrigatório.");
        }

        if (NormalizeClassificationStatus(dto.Status) is null)
        {
            throw new InvalidOperationException("Selecione uma classificação válida para o item.");
        }

        if (string.IsNullOrWhiteSpace(dto.EstadoConservacao))
        {
            throw new InvalidOperationException("O estado de conservação do item é obrigatório.");
        }

        if (NormalizeConservationState(dto.EstadoConservacao) is null)
        {
            throw new InvalidOperationException("Selecione um estado de conservação válido para o item.");
        }

        var localExiste = await _context.Locais.AnyAsync(
            x => x.Id == dto.LocalId && x.DeletedAt == null,
            cancellationToken
        );
        if (!localExiste)
        {
            throw new InvalidOperationException("Local informado não encontrado.");
        }

        var usuarioExiste = await _context.Usuarios.AnyAsync(
            x => x.Id == usuarioId && x.DeletedAt == null,
            cancellationToken
        );
        if (!usuarioExiste)
        {
            throw new InvalidOperationException("Usuário responsável não encontrado.");
        }
    }

    private async Task<ItemInventarioFoto> SaveFotoAsync(IFormFile file, CancellationToken cancellationToken)
    {
        var saved = await _fileStorageService.SaveAsync(file, "inventario", cancellationToken);

        return new ItemInventarioFoto
        {
            NomeArquivo = saved.NomeArquivo,
            NomeOriginal = file.FileName,
            CaminhoRelativo = saved.CaminhoRelativo,
            Url = saved.Url
        };
    }

    private static string? NormalizeClassificationStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        var normalized = RemoveDiacritics(status).Trim().ToUpperInvariant();

        return normalized switch
        {
            "SERVIVEL" => "SERVÍVEL",
            "INSERVIVEL" => "INSERVÍVEL",
            "OBSOLETO" => "OBSOLETO",
            _ => null
        };
    }

    private static string? NormalizeConservationState(string? state)
    {
        if (string.IsNullOrWhiteSpace(state))
        {
            return null;
        }

        var normalized = RemoveDiacritics(state).Trim().ToUpperInvariant();

        return normalized switch
        {
            "BOM" => "BOM",
            "EXCELENTE" => "EXCELENTE",
            "REGULAR" => "REGULAR",
            "PESSIMO" => "PÉSSIMO",
            _ => null
        };
    }

    private static string RemoveDiacritics(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var buffer = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
        return new string(buffer.ToArray()).Normalize(NormalizationForm.FormC);
    }

    private static ItemInventariadoDto MapToDto(ItemInventariado entity)
    {
        return new ItemInventariadoDto
        {
            Id = entity.Id,
            TombamentoNovo = entity.TombamentoNovo,
            TombamentoAntigo = entity.TombamentoAntigo,
            Descricao = entity.Descricao,
            LocalId = entity.LocalId,
            LocalNome = entity.Local?.Nome ?? string.Empty,
            EquipeId = entity.Local?.EquipeId ?? Guid.Empty,
            EquipeDescricao = entity.Local?.Equipe?.Descricao ?? string.Empty,
            UsuarioId = entity.UsuarioId,
            UsuarioNome = entity.Usuario?.Nome ?? string.Empty,
            Status = entity.Status,
            EstadoConservacao = entity.EstadoConservacao,
            Observacao = entity.Observacao,
            DataInventario = entity.DataInventario,
            Fotos = entity.Fotos
                .Where(x => x.DeletedAt == null)
                .OrderBy(x => x.CreatedAt)
                .Select(x => new ItemInventarioFotoDto
                {
                    Id = x.Id,
                    NomeOriginal = x.NomeOriginal,
                    Url = x.Url,
                    CaminhoRelativo = x.CaminhoRelativo
                })
                .ToArray()
        };
    }

    private static string ExtractTipo(string html)
    {
        var lines = ExtractDetalhesLines(html);
        return lines.FirstOrDefault() ?? string.Empty;
    }

    private static string ExtractDescricao(string html)
    {
        var lines = ExtractDetalhesLines(html);
        return lines.Skip(1).FirstOrDefault() ?? string.Empty;
    }

    private static List<string> ExtractDetalhesLines(string html)
    {
        var match = Regex.Match(
            html,
            @"Detalhes do Bem(?<content>[\s\S]*?)Identifica(?:ç|c)(?:ã|a)o",
            RegexOptions.IgnoreCase
        );

        if (!match.Success)
        {
            return new List<string>();
        }

        var text = HtmlToText(match.Groups["content"].Value);
        return text
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(line =>
                !line.StartsWith("Data de Entrada", StringComparison.OrdinalIgnoreCase)
                && !line.StartsWith("Unidade:", StringComparison.OrdinalIgnoreCase)
                && !line.StartsWith("Departamento:", StringComparison.OrdinalIgnoreCase)
                && !line.StartsWith("Responsável:", StringComparison.OrdinalIgnoreCase)
            )
            .ToList();
    }

    private static string ExtractIdentificacaoColumn(string html, int columnIndex)
    {
        var sectionMatch = Regex.Match(
            html,
            @"Identifica(?:ç|c)(?:ã|a)o(?<content>[\s\S]*?)Dados Gerais",
            RegexOptions.IgnoreCase
        );
        if (!sectionMatch.Success)
        {
            return string.Empty;
        }

        var rowMatch = Regex.Match(
            sectionMatch.Groups["content"].Value,
            @"<tr[^>]*>\s*<td[^>]*>(?<col1>[\s\S]*?)</td>\s*<td[^>]*>(?<col2>[\s\S]*?)</td>",
            RegexOptions.IgnoreCase
        );
        if (!rowMatch.Success)
        {
            return string.Empty;
        }

        return columnIndex switch
        {
            1 => HtmlToText(rowMatch.Groups["col1"].Value),
            2 => HtmlToText(rowMatch.Groups["col2"].Value),
            _ => string.Empty
        };
    }

    private static string HtmlToText(string html)
    {
        var withLineBreaks = Regex.Replace(html, @"<(br|/p|/div|/tr|/h1|/h2|/h3|/td|/th)\b[^>]*>", "\n", RegexOptions.IgnoreCase);
        var withoutTags = Regex.Replace(withLineBreaks, "<.*?>", " ");
        var decoded = WebUtility.HtmlDecode(withoutTags);
        var normalizedSpaces = Regex.Replace(decoded, @"[ \t\f\v]+", " ");
        var normalizedLines = Regex.Replace(normalizedSpaces, @"\n\s*\n+", "\n");
        return normalizedLines.Trim();
    }

    private static string NormalizeDigits(string value)
    {
        return string.Concat(value.Where(char.IsDigit));
    }
}
