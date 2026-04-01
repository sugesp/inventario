using Application.Contract;
using Application.DTO.Transferencia;
using Domain.Model;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;
using System.Globalization;
using System.Text;

namespace Application.Services;

public class TransferenciaService : ITransferenciaService
{
    private static readonly string[] StatusValidos = ["RASCUNHO", "EM SEPARACAO", "AGUARDANDO CONCLUSAO", "CONCLUIDA", "CANCELADA"];
    private static readonly string[] CondicoesValidas = ["SERVIVEL", "INSERVIVEL", "OBSOLETO"];

    private readonly AppDbContext _context;

    public TransferenciaService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TransferenciaDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await QueryBase()
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.DataEntrega)
            .ToListAsync(cancellationToken);

        return entities.Select(MapToDto);
    }

    public async Task<TransferenciaDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await QueryBase()
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<TransferenciaDto> CreateAsync(TransferenciaSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, cancellationToken);

        var entity = new Transferencia
        {
            LocalDestinoId = dto.LocalDestinoId,
            CriadoPorUsuarioId = usuarioAutenticadoId,
            ResponsavelDestino = dto.ResponsavelDestino.Trim(),
            IdSeiTermo = dto.IdSeiTermo.Trim(),
            DataEntrega = dto.DataEntrega,
            Status = NormalizeStatus(dto.Status)!,
            Observacao = dto.Observacao.Trim(),
            Itens = dto.Itens.Select(MapToEntity).ToList()
        };

        if (entity.Status == "CONCLUÍDA")
        {
            entity.FinalizadoPorUsuarioId = usuarioAutenticadoId;
        }

        _context.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (await GetByIdAsync(entity.Id, cancellationToken))!;
    }

    public async Task<TransferenciaDto?> UpdateAsync(Guid id, TransferenciaSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, cancellationToken);

        var entity = await _context.Set<Transferencia>()
            .Include(x => x.Itens.Where(item => item.DeletedAt == null))
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        entity.LocalDestinoId = dto.LocalDestinoId;
        entity.ResponsavelDestino = dto.ResponsavelDestino.Trim();
        entity.IdSeiTermo = dto.IdSeiTermo.Trim();
        entity.DataEntrega = dto.DataEntrega;
        entity.Status = NormalizeStatus(dto.Status)!;
        entity.Observacao = dto.Observacao.Trim();

        foreach (var item in entity.Itens)
        {
            item.DeletedAt = DateTime.UtcNow;
        }

        entity.Itens = dto.Itens.Select(MapToEntity).ToList();

        if (entity.Status == "CONCLUÍDA")
        {
            entity.FinalizadoPorUsuarioId = usuarioAutenticadoId;
        }
        else
        {
            entity.FinalizadoPorUsuarioId = null;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.Set<Transferencia>()
            .Include(x => x.Itens)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return false;
        }

        entity.DeletedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        foreach (var item in entity.Itens.Where(x => x.DeletedAt == null))
        {
            item.DeletedAt = DateTime.UtcNow;
        }

        return await _context.SaveChangesAsync(cancellationToken) > 0;
    }

    private IQueryable<Transferencia> QueryBase()
    {
        return _context.Set<Transferencia>()
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.LocalDestino)
            .Include(x => x.CriadoPorUsuario)
            .Include(x => x.FinalizadoPorUsuario)
            .Include(x => x.Itens.Where(item => item.DeletedAt == null));
    }

    private async Task ValidateAsync(TransferenciaSaveDto dto, CancellationToken cancellationToken)
    {
        if (dto.LocalDestinoId == Guid.Empty)
        {
            throw new InvalidOperationException("Selecione o local de destino.");
        }

        var localExiste = await _context.Locais.AnyAsync(x => x.Id == dto.LocalDestinoId && x.DeletedAt == null, cancellationToken);
        if (!localExiste)
        {
            throw new InvalidOperationException("Local de destino não encontrado.");
        }

        if (string.IsNullOrWhiteSpace(dto.ResponsavelDestino))
        {
            throw new InvalidOperationException("Informe o responsável de destino.");
        }

        if (string.IsNullOrWhiteSpace(dto.Status) || NormalizeStatus(dto.Status) is null)
        {
            throw new InvalidOperationException("Selecione um status válido para a transferência.");
        }

        if (dto.Itens.Count == 0)
        {
            throw new InvalidOperationException("Adicione ao menos um item à transferência.");
        }

        var tombamentos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in dto.Itens)
        {
            if (string.IsNullOrWhiteSpace(item.Descricao))
            {
                throw new InvalidOperationException("Todos os itens da transferência precisam ter descrição.");
            }

            if (string.IsNullOrWhiteSpace(item.Condicao) || NormalizeCondicao(item.Condicao) is null)
            {
                throw new InvalidOperationException("Todos os itens precisam ter uma condição válida.");
            }

            var chave = $"{NormalizeDigits(item.TombamentoNovo)}|{item.Descricao.Trim().ToUpperInvariant()}";
            if (!tombamentos.Add(chave))
            {
                throw new InvalidOperationException("Há itens duplicados na transferência.");
            }
        }
    }

    private TransferenciaItem MapToEntity(TransferenciaItemSaveDto dto)
    {
        return new TransferenciaItem
        {
            TombamentoNovo = FormatTombamento(dto.TombamentoNovo),
            TombamentoAntigo = dto.TombamentoAntigo.Trim(),
            Descricao = dto.Descricao.Trim(),
            StatusItem = string.IsNullOrWhiteSpace(dto.StatusItem) ? "CEDIDO" : dto.StatusItem.Trim().ToUpperInvariant(),
            Condicao = NormalizeCondicao(dto.Condicao)!,
            Observacao = dto.Observacao.Trim()
        };
    }

    private static TransferenciaDto MapToDto(Transferencia entity)
    {
        return new TransferenciaDto
        {
            Id = entity.Id,
            LocalDestinoId = entity.LocalDestinoId,
            LocalDestinoNome = entity.LocalDestino?.Nome ?? string.Empty,
            CriadoPorUsuarioId = entity.CriadoPorUsuarioId,
            CriadoPorUsuarioNome = entity.CriadoPorUsuario?.Nome ?? string.Empty,
            FinalizadoPorUsuarioId = entity.FinalizadoPorUsuarioId,
            FinalizadoPorUsuarioNome = entity.FinalizadoPorUsuario?.Nome ?? string.Empty,
            ResponsavelDestino = entity.ResponsavelDestino,
            IdSeiTermo = entity.IdSeiTermo,
            DataEntrega = entity.DataEntrega,
            Status = entity.Status,
            Observacao = entity.Observacao,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
            Itens = entity.Itens
                .Where(x => x.DeletedAt == null)
                .OrderBy(x => x.CreatedAt)
                .Select(x => new TransferenciaItemDto
                {
                    Id = x.Id,
                    TombamentoNovo = x.TombamentoNovo,
                    TombamentoAntigo = x.TombamentoAntigo,
                    Descricao = x.Descricao,
                    StatusItem = x.StatusItem,
                    Condicao = x.Condicao,
                    Observacao = x.Observacao
                })
                .ToArray()
        };
    }

    private static string? NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        var normalized = RemoveDiacritics(status).Trim().ToUpperInvariant();
        return normalized switch
        {
            "RASCUNHO" => "RASCUNHO",
            "EM SEPARACAO" => "EM SEPARAÇÃO",
            "AGUARDANDO CONCLUSAO" => "AGUARDANDO CONCLUSÃO",
            "CONCLUIDA" => "CONCLUÍDA",
            "CANCELADA" => "CANCELADA",
            _ => null
        };
    }

    private static string? NormalizeCondicao(string? condicao)
    {
        if (string.IsNullOrWhiteSpace(condicao))
        {
            return null;
        }

        var normalized = RemoveDiacritics(condicao).Trim().ToUpperInvariant();
        return normalized switch
        {
            "SERVIVEL" => "SERVÍVEL",
            "INSERVIVEL" => "INSERVÍVEL",
            "OBSOLETO" => "OBSOLETO",
            _ => null
        };
    }

    private static string NormalizeDigits(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return new string(value.Where(char.IsDigit).ToArray());
    }

    private static string FormatTombamento(string? value)
    {
        var digits = NormalizeDigits(value);
        if (digits.Length <= 3)
        {
            return digits;
        }

        if (digits.Length <= 6)
        {
            return $"{digits[..3]}.{digits[3..]}";
        }

        digits = digits[..Math.Min(9, digits.Length)];
        return $"{digits[..3]}.{digits.Substring(3, 3)}.{digits[6..]}";
    }

    private static string RemoveDiacritics(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var buffer = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
        return new string(buffer.ToArray()).Normalize(NormalizationForm.FormC);
    }
}
