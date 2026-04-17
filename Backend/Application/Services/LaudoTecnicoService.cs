using System.Text.Json;
using Application.Contract;
using Application.DTO.LaudoTecnico;
using Domain.Model;
using Microsoft.EntityFrameworkCore;
using Persistence.Context;

namespace Application.Services;

public class LaudoTecnicoService : ILaudoTecnicoService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly AppDbContext _context;

    public LaudoTecnicoService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<LaudoTecnicoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await _context.LaudosTecnicos
            .AsNoTracking()
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
            ResponsavelTecnicoCargo = usuario.Perfil.Trim()
        };

        _context.LaudosTecnicos.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    private Task ValidateAsync(LaudoTecnicoSaveDto dto, CancellationToken cancellationToken)
    {
        _ = cancellationToken;

        if (dto.DataAvaliacao is null)
        {
            throw new InvalidOperationException("Informe a data da avaliação.");
        }

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
            UpdatedAt = entity.UpdatedAt
        };
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
