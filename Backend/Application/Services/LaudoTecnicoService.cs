using System.Text.Json;
using Application.Contract;
using Application.DTO.LaudoTecnico;
using Domain.Model;
using Domain.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;

namespace Application.Services;

public class LaudoTecnicoService : ILaudoTecnicoService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _context;
    private readonly IFileStorageService _fileStorageService;

    public LaudoTecnicoService(AppDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
    }

    public async Task<IEnumerable<LaudoTecnicoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _context.LaudosTecnicos
            .AsNoTracking()
            .Include(x => x.Fotos.Where(f => f.DeletedAt == null))
            .Where(x => x.DeletedAt == null)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return entities.Select(MapToDto);
    }

    public async Task<LaudoTecnicoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.LaudosTecnicos
            .AsNoTracking()
            .Include(x => x.Fotos.Where(f => f.DeletedAt == null))
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        return entity is null ? null : MapToDto(entity);
    }

    public async Task<LaudoTecnicoDto> CreateAsync(LaudoTecnicoSaveDto dto, Guid usuarioAutenticadoId, CancellationToken cancellationToken = default)
    {
        await ValidateAsync(dto, cancellationToken);

        var usuario = await _context.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == usuarioAutenticadoId && x.DeletedAt == null, cancellationToken);

        if (usuario is null)
        {
            throw new InvalidOperationException("Usuário autenticado não encontrado.");
        }

        var entity = new LaudoTecnico
        {
            ProcessoSei = dto.ProcessoSei.Trim(),
            IdDevolucaoSei = dto.IdDevolucaoSei.Trim(),
            UnidadeGestora = dto.UnidadeGestora.Trim(),
            Setor = dto.Setor.Trim(),
            DataAvaliacao = dto.DataAvaliacao,
            TipoEquipamento = dto.TipoEquipamento.Trim(),
            OutroTipoEquipamento = dto.OutroTipoEquipamento.Trim(),
            Patrimonio = dto.Patrimonio.Trim(),
            TombamentoAntigo = dto.TombamentoAntigo.Trim(),
            NumeroSerie = dto.NumeroSerie.Trim(),
            Marca = dto.Marca.Trim(),
            Modelo = dto.Modelo.Trim(),
            AnoAquisicao = dto.AnoAquisicao.Trim(),
            Processador = dto.Processador.Trim(),
            Memoria = dto.Memoria.Trim(),
            Armazenamento = dto.Armazenamento.Trim(),
            SistemaOperacional = dto.SistemaOperacional.Trim(),
            Outros = dto.Outros.Trim(),
            CondicaoFuncionamento = dto.CondicaoFuncionamento.Trim(),
            DescricaoFuncionamento = dto.DescricaoFuncionamento.Trim(),
            EstadoConservacao = dto.EstadoConservacao.Trim(),
            ProblemasIdentificadosJson = SerializeList(dto.ProblemasIdentificados),
            OutroProblema = dto.OutroProblema.Trim(),
            DescricaoTecnicaDetalhada = dto.DescricaoTecnicaDetalhada.Trim(),
            PossuiReparo = dto.PossuiReparo,
            DescricaoReparo = dto.DescricaoReparo.Trim(),
            ValorEstimadoMercado = dto.ValorEstimadoMercado,
            CustoEstimadoManutencao = dto.CustoEstimadoManutencao,
            PercentualEstimado = dto.PercentualEstimado,
            ClassificacaoTecnica = dto.ClassificacaoTecnica.Trim(),
            JustificativaTecnica = dto.JustificativaTecnica.Trim(),
            RecomendacoesJson = SerializeList(dto.Recomendacoes),
            SugestoesDestinacaoJson = SerializeList(dto.SugestoesDestinacao),
            RegistroFotograficoJson = SerializeList(dto.RegistroFotografico),
            QuantidadeFotos = dto.QuantidadeFotos,
            ConclusaoCondicao = dto.ConclusaoCondicao.Trim(),
            ClassificacaoFinal = dto.ClassificacaoFinal.Trim(),
            ResponsavelTecnicoUsuarioId = usuario.Id,
            ResponsavelTecnicoNome = usuario.Nome.Trim(),
            ResponsavelTecnicoCargo = BuildResponsavelTecnicoCargo(usuario)
        };

        _context.LaudosTecnicos.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<LaudoTecnicoDto?> AddFotosAsync(
        Guid id,
        IReadOnlyList<IFormFile> fotos,
        IReadOnlyList<string> categorias,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.LaudosTecnicos
            .Include(x => x.Fotos)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        if (fotos.Count != categorias.Count)
        {
            throw new InvalidOperationException("Cada foto deve possuir uma categoria.");
        }

        var categoriasPermitidas = new[] { "Equipamento completo", "Etiqueta patrimonial", "Defeitos identificados" };
        for (var index = 0; index < fotos.Count; index++)
        {
            var categoria = categorias[index].Trim();
            if (!categoriasPermitidas.Contains(categoria))
            {
                throw new InvalidOperationException("Categoria de foto inválida.");
            }

            var foto = fotos[index];
            if (foto.Length <= 0)
            {
                continue;
            }

            if (foto.Length > 10_000_000 || !foto.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Envie somente imagens de até 10 MB por foto.");
            }

            var saved = await _fileStorageService.SaveAsync(foto, "laudos", cancellationToken);
            var fotoEntity = new LaudoTecnicoFoto
            {
                Categoria = categoria,
                NomeArquivo = saved.NomeArquivo,
                NomeOriginal = foto.FileName,
                CaminhoRelativo = saved.CaminhoRelativo,
                Url = saved.Url
            };
            entity.Fotos.Add(fotoEntity);
            _context.Entry(fotoEntity).State = EntityState.Added;
        }

        entity.RegistroFotograficoJson = SerializeList(entity.Fotos.Select(x => x.Categoria).Distinct());
        entity.QuantidadeFotos = entity.Fotos.Count;
        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(entity);
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetFotoAsync(
        Guid id,
        Guid fotoId,
        CancellationToken cancellationToken = default)
    {
        var foto = await _context.LaudosTecnicosFotos
            .AsNoTracking()
            .Where(x => x.Id == fotoId && x.LaudoTecnicoId == id && x.DeletedAt == null)
            .Select(x => new { x.CaminhoRelativo, x.NomeOriginal, LaudoDeletedAt = x.LaudoTecnico!.DeletedAt })
            .FirstOrDefaultAsync(cancellationToken);

        return foto is null || foto.LaudoDeletedAt is not null
            ? null
            : await _fileStorageService.OpenReadAsync(foto.CaminhoRelativo, foto.NomeOriginal, cancellationToken);
    }

    public async Task<LaudoTecnicoDto?> UpdateIdentificacaoAsync(
        Guid id,
        LaudoTecnicoIdentificacaoDto dto,
        CancellationToken cancellationToken = default)
    {
        var entity = await _context.LaudosTecnicos
            .Include(x => x.Fotos.Where(f => f.DeletedAt == null))
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        entity.ProcessoSei = dto.ProcessoSei.Trim();
        entity.IdDevolucaoSei = dto.IdDevolucaoSei.Trim();
        entity.UnidadeGestora = dto.UnidadeGestora.Trim();
        entity.Setor = dto.Setor.Trim();
        entity.DataAvaliacao = dto.DataAvaliacao;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(entity);
    }

    private Task ValidateAsync(LaudoTecnicoSaveDto dto, CancellationToken cancellationToken)
    {
        _ = cancellationToken;

        if (string.IsNullOrWhiteSpace(dto.TipoEquipamento))
        {
            throw new InvalidOperationException("Selecione o tipo do equipamento.");
        }

        if (dto.TipoEquipamento == "Outro" && string.IsNullOrWhiteSpace(dto.OutroTipoEquipamento))
        {
            throw new InvalidOperationException("Informe o tipo do equipamento quando selecionar Outro.");
        }

        if (string.IsNullOrWhiteSpace(dto.Patrimonio)
            && string.IsNullOrWhiteSpace(dto.NumeroSerie)
            && string.IsNullOrWhiteSpace(dto.Marca)
            && string.IsNullOrWhiteSpace(dto.Modelo))
        {
            throw new InvalidOperationException("Informe pelo menos um identificador do equipamento.");
        }

        if (string.IsNullOrWhiteSpace(dto.CondicaoFuncionamento))
        {
            throw new InvalidOperationException("Selecione a condição de funcionamento.");
        }

        if (string.IsNullOrWhiteSpace(dto.EstadoConservacao))
        {
            throw new InvalidOperationException("Selecione o estado de conservação.");
        }

        if (string.IsNullOrWhiteSpace(dto.ClassificacaoTecnica))
        {
            throw new InvalidOperationException("Selecione a classificação técnica do bem.");
        }

        if (string.IsNullOrWhiteSpace(dto.JustificativaTecnica))
        {
            throw new InvalidOperationException("Preencha a justificativa técnica.");
        }

        if (string.IsNullOrWhiteSpace(dto.ConclusaoCondicao))
        {
            throw new InvalidOperationException("Selecione a conclusão do laudo.");
        }

        if (dto.QuantidadeFotos is not null && dto.QuantidadeFotos < 0)
        {
            throw new InvalidOperationException("A quantidade de fotos não pode ser negativa.");
        }

        if (dto.PercentualEstimado is not null && dto.PercentualEstimado < 0)
        {
            throw new InvalidOperationException("O percentual estimado não pode ser negativo.");
        }

        return Task.CompletedTask;
    }

    private static LaudoTecnicoDto MapToDto(LaudoTecnico entity)
    {
        return new LaudoTecnicoDto
        {
            Id = entity.Id,
            ProcessoSei = entity.ProcessoSei,
            IdDevolucaoSei = entity.IdDevolucaoSei,
            UnidadeGestora = entity.UnidadeGestora,
            Setor = entity.Setor,
            DataAvaliacao = entity.DataAvaliacao,
            TipoEquipamento = entity.TipoEquipamento,
            OutroTipoEquipamento = entity.OutroTipoEquipamento,
            Patrimonio = entity.Patrimonio,
            TombamentoAntigo = entity.TombamentoAntigo,
            NumeroSerie = entity.NumeroSerie,
            Marca = entity.Marca,
            Modelo = entity.Modelo,
            AnoAquisicao = entity.AnoAquisicao,
            Processador = entity.Processador,
            Memoria = entity.Memoria,
            Armazenamento = entity.Armazenamento,
            SistemaOperacional = entity.SistemaOperacional,
            Outros = entity.Outros,
            CondicaoFuncionamento = entity.CondicaoFuncionamento,
            DescricaoFuncionamento = entity.DescricaoFuncionamento,
            EstadoConservacao = entity.EstadoConservacao,
            ProblemasIdentificados = DeserializeList(entity.ProblemasIdentificadosJson),
            OutroProblema = entity.OutroProblema,
            DescricaoTecnicaDetalhada = entity.DescricaoTecnicaDetalhada,
            PossuiReparo = entity.PossuiReparo,
            DescricaoReparo = entity.DescricaoReparo,
            ValorEstimadoMercado = entity.ValorEstimadoMercado,
            CustoEstimadoManutencao = entity.CustoEstimadoManutencao,
            PercentualEstimado = entity.PercentualEstimado,
            ClassificacaoTecnica = entity.ClassificacaoTecnica,
            JustificativaTecnica = entity.JustificativaTecnica,
            Recomendacoes = DeserializeList(entity.RecomendacoesJson),
            SugestoesDestinacao = DeserializeList(entity.SugestoesDestinacaoJson),
            RegistroFotografico = DeserializeList(entity.RegistroFotograficoJson),
            QuantidadeFotos = entity.QuantidadeFotos,
            ConclusaoCondicao = entity.ConclusaoCondicao,
            ClassificacaoFinal = entity.ClassificacaoFinal,
            ResponsavelTecnicoUsuarioId = entity.ResponsavelTecnicoUsuarioId,
            ResponsavelTecnicoNome = entity.ResponsavelTecnicoNome,
            ResponsavelTecnicoCargo = entity.ResponsavelTecnicoCargo,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt,
            Fotos = entity.Fotos
                .Where(x => x.DeletedAt == null)
                .OrderBy(x => x.CreatedAt)
                .Select(x => new LaudoTecnicoFotoDto
                {
                    Id = x.Id,
                    Categoria = x.Categoria,
                    NomeOriginal = x.NomeOriginal,
                    Url = x.Url
                })
                .ToArray()
        };
    }

    private static string BuildResponsavelTecnicoCargo(Usuario usuario)
    {
        var permissoes = UsuarioPermissoes.Deserialize(usuario.PermissoesJson);

        if (permissoes.Contains(UsuarioPermissoes.Administrador))
        {
            return UsuarioPermissoes.Administrador;
        }

        if (permissoes.Contains(UsuarioPermissoes.GtiTecnico))
        {
            return "GTI - Técnico";
        }

        if (permissoes.Contains(UsuarioPermissoes.GtiGestor))
        {
            return "GTI - Gestor";
        }

        if (permissoes.Contains(UsuarioPermissoes.Inventario))
        {
            return UsuarioPermissoes.Inventario;
        }

        return "Usuário";
    }

    private static string SerializeList(IEnumerable<string> values)
    {
        var sanitized = values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return JsonSerializer.Serialize(sanitized, JsonOptions);
    }

    private static List<string> DeserializeList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<string>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }
}
