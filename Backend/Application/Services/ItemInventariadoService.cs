using Application.Contract;
using Application.DTO.ItemInventariado;
using Domain.Model;
using Domain.Security;
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

    public async Task<IEnumerable<ItemInventariadoDto>> GetAllAsync(
        Guid usuarioAutenticadoId,
        bool usuarioAdministrador,
        CancellationToken cancellationToken = default
    )
    {
        var query = QueryBase();

        if (!usuarioAdministrador)
        {
            query = query.Where(x =>
                x.Comissao != null
                && x.Comissao.DeletedAt == null
                && x.Comissao.Status == "Ativa"
                && (
                    x.Comissao.PresidenteId == usuarioAutenticadoId
                    || (
                        x.Local != null
                        && x.Local.Membros.Any(m =>
                            m.UsuarioId == usuarioAutenticadoId
                            && m.DeletedAt == null)
                    )
                )
            );
        }

        var items = await query
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

    public async Task<IEnumerable<InconsistenciaInventarioDto>> GetInconsistenciasAsync(
        Guid usuarioAutenticadoId,
        bool usuarioAdministradorOuControleInterno,
        CancellationToken cancellationToken = default
    )
    {
        var query = QueryBase()
            .Where(x => x.ComissaoId != null && !string.IsNullOrWhiteSpace(x.TombamentoNovo));

        if (!usuarioAdministradorOuControleInterno)
        {
            query = query.Where(x =>
                x.Comissao != null
                && x.Comissao.DeletedAt == null
                && x.Comissao.Status == "Ativa"
                && x.Comissao.PresidenteId == usuarioAutenticadoId
            );
        }

        var items = await query.ToListAsync(cancellationToken);

        return items
            .Select(x => new
            {
                Item = x,
                TombamentoNormalizado = NormalizeDigits(x.TombamentoNovo)
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.TombamentoNormalizado))
            .GroupBy(x => new { x.Item.ComissaoId, x.Item.Comissao?.Ano, x.TombamentoNormalizado })
            .Select(group => new
            {
                group.Key.ComissaoId,
                group.Key.Ano,
                group.Key.TombamentoNormalizado,
                Items = group.Select(x => x.Item).ToList(),
                LocalCount = group.Select(x => x.Item.LocalId).Distinct().Count()
            })
            .Where(group => group.LocalCount > 1)
            .OrderByDescending(group => group.Ano)
            .ThenBy(group => group.TombamentoNormalizado)
            .Select(group => new InconsistenciaInventarioDto
            {
                Tombamento = group.TombamentoNormalizado,
                Descricao = group.Items
                    .OrderByDescending(x => x.DataInventario)
                    .Select(x => x.Descricao)
                    .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? string.Empty,
                ComissaoId = group.ComissaoId,
                ComissaoAno = group.Ano,
                QuantidadeOcorrencias = group.Items.Count,
                QuantidadeLocais = group.LocalCount,
                Ocorrencias = group.Items
                    .OrderByDescending(x => x.DataInventario)
                    .ThenBy(x => x.Local?.Nome)
                    .Select(x => new InconsistenciaInventarioOcorrenciaDto
                    {
                        ItemInventariadoId = x.Id,
                        TombamentoNovo = x.TombamentoNovo,
                        TombamentoAntigo = x.TombamentoAntigo,
                        Descricao = x.Descricao,
                        LocalId = x.LocalId,
                        LocalNome = x.Local?.Nome ?? string.Empty,
                        LocalMembrosNomes = x.Local?.Membros
                            .Where(m => m.DeletedAt == null && m.Usuario != null)
                            .OrderBy(m => m.Usuario!.Nome)
                            .Select(m => m.Usuario!.Nome)
                            .ToArray() ?? Array.Empty<string>(),
                        UsuarioId = x.UsuarioId,
                        UsuarioNome = x.Usuario?.Nome ?? string.Empty,
                        Status = x.Status,
                        EstadoConservacao = x.EstadoConservacao,
                        DataInventario = x.DataInventario,
                        Observacao = x.Observacao
                    })
                    .ToArray()
            })
            .ToList();
    }

    public async Task<ConsultaPublicaBemDto?> ConsultarResumoPublicoAsync(string tombamento, CancellationToken cancellationToken = default)
    {
        var tombamentoNormalizado = NormalizeDigits(tombamento);
        if (string.IsNullOrWhiteSpace(tombamentoNormalizado))
        {
            throw new InvalidOperationException("Informe um tombamento válido para consulta.");
        }

        try
        {
            var client = _httpClientFactory.CreateClient("PatrimonioPublico");
            using var response = await client.GetAsync($"publico/bens/{tombamentoNormalizado}", cancellationToken);
            if (response.StatusCode == HttpStatusCode.NotFound)
            {
                return await GetBemLocalAsync(tombamentoNormalizado, cancellationToken);
            }

            response.EnsureSuccessStatusCode();

            var html = await response.Content.ReadAsStringAsync(cancellationToken);
            var tipo = ExtractTipo(html);
            var descricao = ExtractDescricao(html);
            var tombamentoAntigo = ExtractIdentificacaoColumn(html, 2);
            var tombamentoConsulta = ExtractIdentificacaoColumn(html, 1);

            var resumo = new ConsultaPublicaBemDto
            {
                Tombamento = NormalizeDigits(tombamentoConsulta) is { Length: > 0 } tombamentoExtraido ? tombamentoExtraido : tombamentoNormalizado,
                TombamentoAntigo = NormalizeOptionalTombamentoAntigo(tombamentoAntigo),
                Tipo = tipo,
                Descricao = descricao,
                UrlConsulta = $"https://e-estado.ro.gov.br/publico/bens/{tombamentoNormalizado}"
            };

            await PersistirBemConsultadoAsync(resumo, cancellationToken);
            return resumo;
        }
        catch (HttpRequestException)
        {
            var bemLocal = await GetBemLocalAsync(tombamentoNormalizado, cancellationToken);
            if (bemLocal is not null)
            {
                return bemLocal;
            }

            throw;
        }
    }

    public async Task<ConsultaTombamentoDto> ConsultarTombamentoAsync(string tombamento, CancellationToken cancellationToken = default)
    {
        var tombamentoNormalizado = NormalizeDigits(tombamento);
        if (string.IsNullOrWhiteSpace(tombamentoNormalizado))
        {
            throw new InvalidOperationException("Informe um tombamento válido para consulta.");
        }

        ConsultaPublicaBemDto? consultaPublica = null;
        try
        {
            consultaPublica = await ConsultarResumoPublicoAsync(tombamentoNormalizado, cancellationToken);
        }
        catch (HttpRequestException)
        {
            consultaPublica = null;
        }

        var transferencias = await _context.TransferenciasItens
            .AsNoTracking()
            .Where(x =>
                x.DeletedAt == null
                && x.Transferencia != null
                && x.Transferencia.DeletedAt == null
            )
            .Include(x => x.Transferencia)
                .ThenInclude(x => x!.UnidadeAdministrativaDestino)
            .ToListAsync(cancellationToken);

        var transferenciasEncontradas = transferencias
            .Where(x => IsSameTombamento(x.TombamentoNovo, tombamentoNormalizado))
            .OrderByDescending(x => x.Transferencia!.CreatedAt)
            .ThenBy(x => x.Descricao)
            .Select(x => new ConsultaTombamentoTransferenciaDto
            {
                TransferenciaId = x.TransferenciaId,
                ItemId = x.Id,
                TombamentoNovo = x.TombamentoNovo,
                TombamentoAntigo = x.TombamentoAntigo,
                Descricao = x.Descricao,
                StatusTransferencia = x.Transferencia!.Status,
                StatusItem = x.StatusItem,
                Condicao = x.Condicao,
                UnidadeAdministrativaDestinoNome = x.Transferencia.UnidadeAdministrativaDestino != null
                    ? x.Transferencia.UnidadeAdministrativaDestino.Nome
                    : string.Empty,
                UnidadeAdministrativaDestinoSigla = x.Transferencia.UnidadeAdministrativaDestino != null
                    ? x.Transferencia.UnidadeAdministrativaDestino.Sigla
                    : string.Empty,
                ResponsavelDestino = x.Transferencia.ResponsavelDestino,
                IdSeiTermo = x.Transferencia.IdSeiTermo,
                DataEntrega = x.Transferencia.DataEntrega,
                CreatedAt = x.Transferencia.CreatedAt,
            })
            .ToList();

        var itensLevantamento = await _context.LevantamentosItens
            .AsNoTracking()
            .Where(x =>
                x.DeletedAt == null
                && x.Levantamento != null
                && x.Levantamento.DeletedAt == null
            )
            .Include(x => x.Levantamento)
            .Include(x => x.ConfirmadoPorUsuario)
            .ToListAsync(cancellationToken);

        var itensLevantamentoEncontrados = itensLevantamento
            .Where(x => IsSameTombamento(x.Tombamento, tombamentoNormalizado))
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new ConsultaTombamentoLevantamentoItemDto
            {
                LevantamentoId = x.LevantamentoId,
                ItemId = x.Id,
                LevantamentoNome = x.Levantamento != null ? x.Levantamento.Nome : string.Empty,
                Tombamento = x.Tombamento,
                TombamentoAntigo = x.TombamentoAntigo,
                Descricao = x.Descricao,
                Tipo = x.Tipo,
                ConfirmadoPorUsuarioNome = x.ConfirmadoPorUsuario != null ? x.ConfirmadoPorUsuario.Nome : string.Empty,
                CreatedAt = x.CreatedAt,
            })
            .ToList();

        var laudos = await _context.LaudosTecnicos
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .ToListAsync(cancellationToken);

        var laudosEncontrados = laudos
            .Where(x => IsSameTombamento(x.Patrimonio, tombamentoNormalizado))
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new ConsultaTombamentoLaudoDto
            {
                Id = x.Id,
                Patrimonio = x.Patrimonio,
                ProcessoSei = x.ProcessoSei,
                IdDevolucaoSei = x.IdDevolucaoSei,
                TipoEquipamento = x.TipoEquipamento,
                Marca = x.Marca,
                Modelo = x.Modelo,
                NumeroSerie = x.NumeroSerie,
                ClassificacaoFinal = x.ClassificacaoFinal,
                ResponsavelTecnicoNome = x.ResponsavelTecnicoNome,
                DataAvaliacao = x.DataAvaliacao,
                CreatedAt = x.CreatedAt,
            })
            .ToList();

        var itensInventariadosEntities = await _context.ItensInventariados
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.Local)
                .ThenInclude(x => x!.Membros)
                    .ThenInclude(x => x.Usuario)
            .Include(x => x.Usuario)
            .ToListAsync(cancellationToken);

        var itensInventariados = itensInventariadosEntities
            .Where(x => IsSameTombamento(x.TombamentoNovo, tombamentoNormalizado))
            .OrderByDescending(x => x.DataInventario)
            .Select(x => new ConsultaTombamentoItemInventariadoDto
            {
                Id = x.Id,
                TombamentoNovo = x.TombamentoNovo,
                TombamentoAntigo = x.TombamentoAntigo,
                Descricao = x.Descricao,
                LocalNome = x.Local != null ? x.Local.Nome : string.Empty,
                LocalMembrosNomes = x.Local != null
                    ? string.Join(", ", x.Local.Membros.Where(m => m.DeletedAt == null && m.Usuario != null).Select(m => m.Usuario!.Nome))
                    : string.Empty,
                UsuarioNome = x.Usuario != null ? x.Usuario.Nome : string.Empty,
                Status = x.Status,
                EstadoConservacao = x.EstadoConservacao,
                LancadoEEstado = x.LancadoEEstado,
                DataInventario = x.DataInventario,
            })
            .ToList();

        return new ConsultaTombamentoDto
        {
            TombamentoPesquisado = tombamentoNormalizado,
            ConsultaPublica = consultaPublica,
            Ocorrencias = new ConsultaTombamentoOcorrenciasDto
            {
                Transferencias = transferenciasEncontradas,
                ItensLevantamento = itensLevantamentoEncontrados,
                Laudos = laudosEncontrados,
                ItensInventariados = itensInventariados,
            }
        };
    }

    public async Task<bool> ExisteTombamentoNoLocalAsync(
        string tombamento,
        Guid localId,
        CancellationToken cancellationToken = default
    )
    {
        var tombamentoNormalizado = NormalizeDigits(tombamento);
        if (string.IsNullOrWhiteSpace(tombamentoNormalizado) || localId == Guid.Empty)
        {
            return false;
        }

        return await _context.ItensInventariados
            .AsNoTracking()
            .AnyAsync(x =>
                x.DeletedAt == null
                && x.LocalId == localId
                && x.TombamentoNovo.Replace(".", string.Empty).Replace("-", string.Empty).Replace(" ", string.Empty) == tombamentoNormalizado,
                cancellationToken
            );
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetFotoAsync(
        Guid itemId,
        Guid fotoId,
        CancellationToken cancellationToken = default
    )
    {
        var foto = await _context.ItensInventariadosFotos
            .AsNoTracking()
            .Where(x => x.Id == fotoId && x.ItemInventariadoId == itemId && x.DeletedAt == null)
            .Select(x => new
            {
                x.NomeOriginal,
                x.CaminhoRelativo,
                ItemDeletedAt = x.ItemInventariado!.DeletedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (foto is null || foto.ItemDeletedAt != null)
        {
            return null;
        }

        return await _fileStorageService.OpenReadAsync(foto.CaminhoRelativo, foto.NomeOriginal, cancellationToken);
    }

    public async Task<ItemInventariadoDto> CreateAsync(
        ItemInventariadoFormDto dto,
        IEnumerable<IFormFile> fotos,
        Guid usuarioAutenticadoId,
        bool usuarioAdministrador,
        CancellationToken cancellationToken = default
    )
    {
        await ValidateAsync(dto, dto.UsuarioId ?? usuarioAutenticadoId, true, usuarioAdministrador, null, cancellationToken);

        var entity = new ItemInventariado
        {
            TombamentoNovo = dto.TombamentoNovo?.Trim() ?? string.Empty,
            TombamentoAntigo = NormalizeOptionalTombamentoAntigo(dto.TombamentoAntigo),
            Descricao = dto.Descricao?.Trim() ?? string.Empty,
            LocalId = dto.LocalId,
            UsuarioId = dto.UsuarioId ?? usuarioAutenticadoId,
            ComissaoId = dto.ComissaoId,
            Status = NormalizeClassificationStatus(dto.Status)!,
            EstadoConservacao = NormalizeConservationState(dto.EstadoConservacao)!,
            Observacao = dto.Observacao?.Trim() ?? string.Empty,
            DataInventario = dto.DataInventario ?? DateTime.UtcNow,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            PrecisaoLocalizacao = dto.PrecisaoLocalizacao
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
        bool usuarioAdministrador,
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

        await ValidateAsync(dto, dto.UsuarioId ?? entity.UsuarioId, false, usuarioAdministrador, entity.Id, cancellationToken);

        entity.TombamentoNovo = dto.TombamentoNovo?.Trim() ?? string.Empty;
        entity.TombamentoAntigo = NormalizeOptionalTombamentoAntigo(dto.TombamentoAntigo);
        entity.Descricao = dto.Descricao?.Trim() ?? string.Empty;
        entity.LocalId = dto.LocalId;
        entity.UsuarioId = dto.UsuarioId ?? entity.UsuarioId;
        entity.ComissaoId = dto.ComissaoId ?? entity.ComissaoId;
        entity.Status = NormalizeClassificationStatus(dto.Status)!;
        entity.EstadoConservacao = NormalizeConservationState(dto.EstadoConservacao)!;
        entity.Observacao = dto.Observacao?.Trim() ?? string.Empty;
        entity.DataInventario = dto.DataInventario ?? entity.DataInventario;
        entity.Latitude = dto.Latitude;
        entity.Longitude = dto.Longitude;
        entity.PrecisaoLocalizacao = dto.PrecisaoLocalizacao;
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

    public async Task<ItemInventariadoDto?> MarcarLancamentoEEstadoAsync(
        Guid id,
        bool lancado,
        Guid usuarioId,
        CancellationToken cancellationToken = default
    )
    {
        var entity = await _context.ItensInventariados
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        entity.LancadoEEstado = lancado;
        entity.LancadoEEstadoPorUsuarioId = lancado ? usuarioId : null;
        entity.LancadoEEstadoEm = lancado ? DateTime.UtcNow : null;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return await GetByIdAsync(entity.Id, cancellationToken);
    }

    private IQueryable<ItemInventariado> QueryBase()
    {
        return _context.ItensInventariados
            .AsNoTracking()
            .Where(x => x.DeletedAt == null)
            .Include(x => x.Local)
                .ThenInclude(x => x!.Membros.Where(m => m.DeletedAt == null))
                    .ThenInclude(x => x.Usuario)
            .Include(x => x.Usuario)
            .Include(x => x.LancadoEEstadoPorUsuario)
            .Include(x => x.Comissao)
            .Include(x => x.Fotos.Where(f => f.DeletedAt == null));
    }

    private async Task ValidateAsync(
        ItemInventariadoFormDto dto,
        Guid usuarioId,
        bool requireActiveComissao,
        bool usuarioAdministrador,
        Guid? ignoredItemId,
        CancellationToken cancellationToken
    )
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

        if (dto.Latitude.HasValue && (dto.Latitude.Value < -90 || dto.Latitude.Value > 90))
        {
            throw new InvalidOperationException("A latitude informada é inválida.");
        }

        if (dto.Longitude.HasValue && (dto.Longitude.Value < -180 || dto.Longitude.Value > 180))
        {
            throw new InvalidOperationException("A longitude informada é inválida.");
        }

        if ((dto.Latitude.HasValue && !dto.Longitude.HasValue) || (!dto.Latitude.HasValue && dto.Longitude.HasValue))
        {
            throw new InvalidOperationException("Informe latitude e longitude para salvar a localização.");
        }

        if (dto.PrecisaoLocalizacao.HasValue && dto.PrecisaoLocalizacao.Value < 0)
        {
            throw new InvalidOperationException("A precisão da localização não pode ser negativa.");
        }

        var local = await _context.Locais
            .AsNoTracking()
            .Include(x => x.Membros.Where(m => m.DeletedAt == null))
            .FirstOrDefaultAsync(
                x => x.Id == dto.LocalId && x.DeletedAt == null,
                cancellationToken
            );
        if (local is null)
        {
            throw new InvalidOperationException("Local informado não encontrado.");
        }

        await EnsureTombamentoDisponivelNoLocalAsync(dto.TombamentoNovo, dto.LocalId, ignoredItemId, cancellationToken);

        var usuarioExiste = await _context.Usuarios.AnyAsync(
            x => x.Id == usuarioId && x.DeletedAt == null,
            cancellationToken
        );
        if (!usuarioExiste)
        {
            throw new InvalidOperationException("Usuário responsável não encontrado.");
        }

        if (!dto.ComissaoId.HasValue || dto.ComissaoId == Guid.Empty)
        {
            if (requireActiveComissao)
            {
                throw new InvalidOperationException("Não existe comissão ativa disponível para vincular o inventário.");
            }

            return;
        }

        var comissaoAtivaExiste = await _context.Comissoes.AnyAsync(
            x =>
                x.Id == dto.ComissaoId.Value
                && x.DeletedAt == null
                && x.Status == "Ativa",
            cancellationToken
        );
        if (!comissaoAtivaExiste)
        {
            throw new InvalidOperationException("A comissão informada não está ativa para receber novos inventários.");
        }

        if (local.ComissaoId != dto.ComissaoId.Value)
        {
            throw new InvalidOperationException("O local informado não pertence à comissão ativa.");
        }

        if (usuarioAdministrador)
        {
            return;
        }

        var usuarioPodeInventariar = local.Membros.Any(x => x.UsuarioId == usuarioId && x.DeletedAt == null);

        if (!usuarioPodeInventariar)
        {
            throw new InvalidOperationException("Somente membros responsáveis pelo local podem realizar inventários neste local.");
        }
    }

    private async Task EnsureTombamentoDisponivelNoLocalAsync(
        string? tombamentoNovo,
        Guid localId,
        Guid? ignoredItemId,
        CancellationToken cancellationToken
    )
    {
        var tombamentoNormalizado = NormalizeDigits(tombamentoNovo ?? string.Empty);
        if (string.IsNullOrWhiteSpace(tombamentoNormalizado))
        {
            return;
        }

        var jaInventariadoNoLocal = await _context.ItensInventariados
            .AsNoTracking()
            .AnyAsync(x =>
                x.DeletedAt == null
                && x.LocalId == localId
                && (!ignoredItemId.HasValue || x.Id != ignoredItemId.Value)
                && x.TombamentoNovo.Replace(".", string.Empty).Replace("-", string.Empty).Replace(" ", string.Empty) == tombamentoNormalizado,
                cancellationToken
            );

        if (jaInventariadoNoLocal)
        {
            throw new InvalidOperationException("Este tombamento já foi inventariado neste local.");
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

    private static string RemoveDiacritics(string value)
    {
        var normalized = value.Normalize(NormalizationForm.FormD);
        var buffer = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
        return new string(buffer.ToArray()).Normalize(NormalizationForm.FormC);
    }

    private async Task<ConsultaPublicaBemDto?> GetBemLocalAsync(string tombamentoNormalizado, CancellationToken cancellationToken)
    {
        var bem = await _context.Bens
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.DeletedAt == null && x.Tombamento == tombamentoNormalizado, cancellationToken);

        return bem is null
            ? null
            : new ConsultaPublicaBemDto
            {
                Tombamento = bem.Tombamento,
                TombamentoAntigo = bem.TombamentoAntigo,
                Tipo = bem.Tipo,
                Descricao = bem.Descricao,
                UrlConsulta = bem.UrlConsulta,
            };
    }

    private async Task PersistirBemConsultadoAsync(ConsultaPublicaBemDto resumo, CancellationToken cancellationToken)
    {
        var tombamentoNormalizado = NormalizeDigits(resumo.Tombamento);
        if (string.IsNullOrWhiteSpace(tombamentoNormalizado))
        {
            return;
        }

        var exists = await _context.Bens.AnyAsync(
            x => x.DeletedAt == null && x.Tombamento == tombamentoNormalizado,
            cancellationToken
        );
        if (exists)
        {
            return;
        }

        var bem = new Bem
        {
            Tombamento = tombamentoNormalizado,
            TombamentoFormatado = FormatTombamento(tombamentoNormalizado),
            TombamentoAntigo = NormalizeOptionalTombamentoAntigo(resumo.TombamentoAntigo),
            Tipo = resumo.Tipo.Trim(),
            Descricao = string.IsNullOrWhiteSpace(resumo.Descricao) ? "Descrição não informada" : resumo.Descricao.Trim(),
            UrlConsulta = resumo.UrlConsulta.Trim(),
            UltimaConsultaEEstadoEm = DateTime.UtcNow,
        };

        _context.Bens.Add(bem);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            _context.Entry(bem).State = EntityState.Detached;
        }
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
            LocalMembrosNomes = entity.Local?.Membros
                .Where(x => x.DeletedAt == null && x.Usuario != null)
                .OrderBy(x => x.Usuario!.Nome)
                .Select(x => x.Usuario!.Nome)
                .ToArray() ?? Array.Empty<string>(),
            LocalLatitude = entity.Local?.Latitude,
            LocalLongitude = entity.Local?.Longitude,
            UsuarioId = entity.UsuarioId,
            UsuarioNome = entity.Usuario?.Nome ?? string.Empty,
            ComissaoId = entity.ComissaoId,
            ComissaoAno = entity.Comissao?.Ano,
            ComissaoStatus = entity.Comissao?.Status,
            Status = entity.Status,
            EstadoConservacao = entity.EstadoConservacao,
            Observacao = entity.Observacao,
            DataInventario = entity.DataInventario,
            Latitude = entity.Latitude,
            Longitude = entity.Longitude,
            PrecisaoLocalizacao = entity.PrecisaoLocalizacao,
            LancadoEEstado = entity.LancadoEEstado,
            LancadoEEstadoPorUsuarioId = entity.LancadoEEstadoPorUsuarioId,
            LancadoEEstadoPorUsuarioNome = entity.LancadoEEstadoPorUsuario?.Nome,
            LancadoEEstadoEm = entity.LancadoEEstadoEm,
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

    private static bool IsSameTombamento(string value, string tombamentoNormalizado)
    {
        return NormalizeDigits(value) == tombamentoNormalizado;
    }

    private static string NormalizeDigits(string value)
    {
        var digits = string.Concat(value.Where(char.IsDigit));
        if (string.IsNullOrWhiteSpace(digits))
        {
            return string.Empty;
        }

        if (digits.Length > 9)
        {
            digits = digits[..9];
        }

        return digits.PadLeft(9, '0');
    }

    private static string FormatTombamento(string value)
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
}
