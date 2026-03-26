using Application.Contract;
using Application.DTO.Common;
using Application.DTO.Contrato;
using Domain.Enum;
using Domain.Model;
using Microsoft.AspNetCore.Http;
using Persistence.Contract;
using System.Security.Claims;

namespace Application.Services;

public class ContratoService : IContratoService
{
    private static readonly string[] LeisPermitidas = ["14.133/2021", "8.666/93"];
    private readonly IGenericRepository<Contrato> _repository;
    private readonly IGenericRepository<Aditivo> _aditivoRepository;
    private readonly IGenericRepository<Fornecedor> _fornecedorRepository;
    private readonly IGenericRepository<Unidade> _unidadeRepository;
    private readonly IGenericRepository<EquipeContrato> _equipeRepository;
    private readonly IGenericRepository<ProcuradorContrato> _procuradorRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ExercicioAnualSyncService _exercicioAnualSyncService;

    public ContratoService(
        IGenericRepository<Contrato> repository,
        IGenericRepository<Aditivo> aditivoRepository,
        IGenericRepository<Fornecedor> fornecedorRepository,
        IGenericRepository<Unidade> unidadeRepository,
        IGenericRepository<EquipeContrato> equipeRepository,
        IGenericRepository<ProcuradorContrato> procuradorRepository,
        IHttpContextAccessor httpContextAccessor,
        ExercicioAnualSyncService exercicioAnualSyncService
    )
    {
        _repository = repository;
        _aditivoRepository = aditivoRepository;
        _fornecedorRepository = fornecedorRepository;
        _unidadeRepository = unidadeRepository;
        _equipeRepository = equipeRepository;
        _procuradorRepository = procuradorRepository;
        _httpContextAccessor = httpContextAccessor;
        _exercicioAnualSyncService = exercicioAnualSyncService;
    }

    public async Task<IEnumerable<ContratoDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = (await GetAccessibleContratosAsync(cancellationToken)).ToList();
        var fornecedores = (await _fornecedorRepository.GetAllAsync(cancellationToken))
            .ToDictionary(x => x.Id);
        var unidades = (await _unidadeRepository.GetAllAsync(cancellationToken))
            .ToDictionary(x => x.Id);
        var procuradoresByContrato = await GetProcuradoresByContratoAsync(cancellationToken);

        return items
            .Select(x => MapToDto(
                x,
                fornecedores.GetValueOrDefault(x.FornecedorId),
                x.UnidadeDemandanteId.HasValue ? unidades.GetValueOrDefault(x.UnidadeDemandanteId.Value) : null,
                procuradoresByContrato.GetValueOrDefault(x.Id)
            ))
            .OrderByDescending(x => x.DataInicio);
    }

    public async Task<PagedResult<ContratoDto>> GetPagedAsync(
        PageParams pageParams,
        CancellationToken cancellationToken = default
    )
    {
        var items = (await GetAccessibleContratosAsync(cancellationToken)).ToList();
        var fornecedores = (await _fornecedorRepository.GetAllAsync(cancellationToken))
            .ToDictionary(x => x.Id);
        var unidades = (await _unidadeRepository.GetAllAsync(cancellationToken))
            .ToDictionary(x => x.Id);
        var procuradoresByContrato = await GetProcuradoresByContratoAsync(cancellationToken);

        var data = items
            .Select(x => MapToDto(
                x,
                fornecedores.GetValueOrDefault(x.FornecedorId),
                x.UnidadeDemandanteId.HasValue ? unidades.GetValueOrDefault(x.UnidadeDemandanteId.Value) : null,
                procuradoresByContrato.GetValueOrDefault(x.Id)
            ))
            .AsEnumerable();

        if (!string.IsNullOrWhiteSpace(pageParams.Term))
        {
            var term = pageParams.Term.Trim();
            var termDigits = OnlyDigits(term);
            data = data.Where(x =>
                ContainsTerm(x.Numero, term)
                || ContainsTerm(x.Processo, term)
                || ContainsTerm(x.Objeto, term)
                || ContainsTerm(x.FornecedorNome, term)
                || ContainsTerm(x.ResponsavelGconv, term)
                || ContainsTerm(x.PrepostoNome, term)
                || x.Procuradores.Any(p =>
                    ContainsTerm(p.Nome, term)
                    || ContainsTerm(p.Email, term)
                    || ContainsTerm(p.NumeroContato, term))
                || ContainsTerm(x.IdSei, term)
                || ContainsTerm(x.UnidadeDemandanteNome, term)
                || ContainsTerm(x.UnidadeDemandanteSigla, term)
                || (!string.IsNullOrWhiteSpace(termDigits) && ContainsTerm(OnlyDigits(x.FornecedorCnpj), termDigits))
            );
        }

        data = data.OrderByDescending(x => x.DataInicio);
        return PagedResult<ContratoDto>.Create(data, pageParams);
    }

    public async Task<ContratoDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = (await GetAccessibleContratosAsync(cancellationToken))
            .FirstOrDefault(x => x.Id == id);
        if (entity is null)
        {
            return null;
        }

        var fornecedor = await _fornecedorRepository.GetByIdAsync(entity.FornecedorId, cancellationToken);
        var unidade = entity.UnidadeDemandanteId.HasValue
            ? await _unidadeRepository.GetByIdAsync(entity.UnidadeDemandanteId.Value, cancellationToken)
            : null;
        var procuradores = await _procuradorRepository.FindAsync(x => x.ContratoId == entity.Id, cancellationToken);
        return MapToDto(entity, fornecedor, unidade, procuradores);
    }

    public async Task<ContratoDto> CreateAsync(ContratoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        dto.Lei = NormalizeLei(dto.Lei);
        var fornecedor = await _fornecedorRepository.GetByIdAsync(dto.FornecedorId, cancellationToken);
        if (fornecedor is null)
        {
            throw new InvalidOperationException("Fornecedor não encontrado.");
        }

        if (!dto.UnidadeDemandanteId.HasValue)
        {
            throw new InvalidOperationException("Unidade demandante é obrigatória.");
        }

        var unidade = await _unidadeRepository.GetByIdAsync(dto.UnidadeDemandanteId.Value, cancellationToken);
        if (unidade is null)
        {
            throw new InvalidOperationException("Unidade demandante não encontrada.");
        }

        ValidateContratoDto(dto);

        var entity = MapToEntity(dto);
        entity.QuantidadeAditivos = 0;
        entity.ValorAcrescimo = 0;
        entity.ValorSupressao = 0;
        entity.ValorAtualContrato = dto.ValorInicialContratual;
        entity.VigenciaAtual = dto.VigenciaInicial;

        await _repository.AddAsync(entity, cancellationToken);
        await SyncProcuradoresAsync(entity.Id, dto.Procuradores, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        await _exercicioAnualSyncService.SyncForContratoAsync(entity, cancellationToken);

        var procuradores = await _procuradorRepository.FindAsync(x => x.ContratoId == entity.Id, cancellationToken);
        return MapToDto(entity, fornecedor, unidade, procuradores);
    }

    public async Task<ContratoDto?> UpdateAsync(Guid id, ContratoCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        dto.Lei = NormalizeLei(dto.Lei);
        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var fornecedor = await _fornecedorRepository.GetByIdAsync(dto.FornecedorId, cancellationToken);
        if (fornecedor is null)
        {
            throw new InvalidOperationException("Fornecedor não encontrado.");
        }

        if (!dto.UnidadeDemandanteId.HasValue)
        {
            throw new InvalidOperationException("Unidade demandante é obrigatória.");
        }

        var unidade = await _unidadeRepository.GetByIdAsync(dto.UnidadeDemandanteId.Value, cancellationToken);
        if (unidade is null)
        {
            throw new InvalidOperationException("Unidade demandante não encontrada.");
        }

        ValidateContratoDto(dto);

        entity.FornecedorId = dto.FornecedorId;
        entity.UnidadeDemandanteId = dto.UnidadeDemandanteId;
        entity.Numero = dto.Numero;
        entity.IdSei = dto.IdSei;
        entity.PrepostoNome = NormalizeNullable(dto.PrepostoNome);
        entity.PrepostoNumeroContato = NormalizeNullable(dto.PrepostoNumeroContato);
        entity.Obs = dto.Obs;
        entity.Inadimplencia = false;
        entity.Processo = dto.Processo;
        entity.Objeto = dto.Objeto;
        entity.ObservacoesComplementares = dto.ObservacoesComplementares;
        entity.DataInicio = dto.DataInicio;
        entity.Lei = dto.Lei;
        entity.VigenciaInicial = dto.VigenciaInicial;
        entity.VigenciaMaxima = dto.VigenciaMaxima;
        entity.ResponsavelGconv = dto.ResponsavelGconv;
        entity.ValorInicialContratual = dto.ValorInicialContratual;
        entity.ValorAtualContrato = entity.ValorInicialContratual + entity.ValorAcrescimo - entity.ValorSupressao;

        entity.VigenciaAtual = await CalculateCurrentVigenciaAsync(entity, cancellationToken);

        await SyncProcuradoresAsync(entity.Id, dto.Procuradores, cancellationToken);
        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);
        await _exercicioAnualSyncService.SyncForContratoAsync(entity, cancellationToken);

        var procuradores = await _procuradorRepository.FindAsync(x => x.ContratoId == entity.Id, cancellationToken);
        return MapToDto(entity, fornecedor, unidade, procuradores);
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

    private async Task<IEnumerable<Contrato>> GetAccessibleContratosAsync(CancellationToken cancellationToken)
    {
        var contratos = (await _repository.GetAllAsync(cancellationToken)).ToList();
        var currentUser = GetCurrentUserContext();

        if (currentUser is null
            || currentUser.IsAdministrador
            || currentUser.IsPerfilContratos
            || currentUser.IsFinanceiro
            || currentUser.IsControleInterno)
        {
            return contratos;
        }

        var contratoIdsEquipe = (await _equipeRepository.FindAsync(
            x => x.UsuarioId == currentUser.UsuarioId && x.DataExclusao == null,
            cancellationToken
        ))
        .Select(x => x.ContratoId)
        .ToHashSet();
        var unidadeIdsAcessiveis = await GetAccessibleUnidadeIdsAsync(currentUser.UnidadeId, cancellationToken);

        return contratos.Where(contrato =>
            (contrato.UnidadeDemandanteId.HasValue && unidadeIdsAcessiveis.Contains(contrato.UnidadeDemandanteId.Value))
            || contratoIdsEquipe.Contains(contrato.Id)
        );
    }

    private async Task<HashSet<Guid>> GetAccessibleUnidadeIdsAsync(Guid? unidadeRaizId, CancellationToken cancellationToken)
    {
        var unidadeIds = new HashSet<Guid>();
        if (!unidadeRaizId.HasValue)
        {
            return unidadeIds;
        }

        var unidades = (await _unidadeRepository.GetAllAsync(cancellationToken)).ToList();
        var unidadesPorSuperior = unidades
            .Where(x => x.UnidadeSuperiorId.HasValue)
            .GroupBy(x => x.UnidadeSuperiorId!.Value)
            .ToDictionary(x => x.Key, x => x.Select(y => y.Id).ToList());

        var pendentes = new Queue<Guid>();
        pendentes.Enqueue(unidadeRaizId.Value);

        while (pendentes.Count > 0)
        {
            var unidadeId = pendentes.Dequeue();
            if (!unidadeIds.Add(unidadeId))
            {
                continue;
            }

            if (!unidadesPorSuperior.TryGetValue(unidadeId, out var unidadesFilhas))
            {
                continue;
            }

            foreach (var unidadeFilhaId in unidadesFilhas)
            {
                pendentes.Enqueue(unidadeFilhaId);
            }
        }

        return unidadeIds;
    }

    private CurrentUserContext? GetCurrentUserContext()
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var usuarioIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst(ClaimTypes.Name)?.Value
            ?? user.FindFirst("sub")?.Value;
        if (!Guid.TryParse(usuarioIdClaim, out var usuarioId))
        {
            return null;
        }

        var perfil = user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
        var unidadeIdClaim = user.FindFirst("unidadeId")?.Value;

        return new CurrentUserContext
        {
            UsuarioId = usuarioId,
            UnidadeId = Guid.TryParse(unidadeIdClaim, out var unidadeId) ? unidadeId : null,
            IsAdministrador = string.Equals(perfil, "Administrador", StringComparison.OrdinalIgnoreCase),
            IsPerfilContratos = string.Equals(perfil, "Contratos", StringComparison.OrdinalIgnoreCase),
            IsFinanceiro = string.Equals(perfil, "Financeiro", StringComparison.OrdinalIgnoreCase),
            IsControleInterno = string.Equals(perfil, "Controle Interno", StringComparison.OrdinalIgnoreCase)
        };
    }

    private static bool ContainsTerm(string? source, string term)
    {
        return !string.IsNullOrWhiteSpace(source)
            && source.Contains(term, StringComparison.OrdinalIgnoreCase);
    }

    private static string OnlyDigits(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : new string(value.Where(char.IsDigit).ToArray());
    }

    private static string NormalizeLei(string lei)
    {
        var leiNormalizada = lei.Trim();
        if (!LeisPermitidas.Contains(leiNormalizada, StringComparer.Ordinal))
        {
            throw new InvalidOperationException("Lei inválida. Utilize 14.133/2021 ou 8.666/93.");
        }

        return leiNormalizada;
    }

    private static Contrato MapToEntity(ContratoCreateUpdateDto dto)
    {
        return new Contrato
        {
            FornecedorId = dto.FornecedorId,
            UnidadeDemandanteId = dto.UnidadeDemandanteId,
            Numero = dto.Numero,
            IdSei = dto.IdSei,
            PrepostoNome = NormalizeNullable(dto.PrepostoNome),
            PrepostoNumeroContato = NormalizeNullable(dto.PrepostoNumeroContato),
            Obs = dto.Obs,
            Inadimplencia = false,
            QuantidadeAditivos = 0,
            Processo = dto.Processo,
            Objeto = dto.Objeto,
            ObservacoesComplementares = dto.ObservacoesComplementares,
            DataInicio = dto.DataInicio,
            Lei = dto.Lei,
            VigenciaInicial = dto.VigenciaInicial,
            VigenciaAtual = dto.VigenciaInicial,
            VigenciaMaxima = dto.VigenciaMaxima,
            ResponsavelGconv = dto.ResponsavelGconv,
            ValorInicialContratual = dto.ValorInicialContratual
        };
    }

    private static ContratoDto MapToDto(
        Contrato entity,
        Fornecedor? fornecedor = null,
        Unidade? unidadeDemandante = null,
        IEnumerable<ProcuradorContrato>? procuradores = null
    )
    {
        return new ContratoDto
        {
            Id = entity.Id,
            FornecedorId = entity.FornecedorId,
            FornecedorNome = fornecedor is null
                ? null
                : string.IsNullOrWhiteSpace(fornecedor.NomeFantasia)
                    ? fornecedor.RazaoSocial
                    : fornecedor.NomeFantasia,
            FornecedorCnpj = fornecedor?.Cnpj,
            UnidadeDemandanteId = entity.UnidadeDemandanteId,
            UnidadeDemandanteSigla = unidadeDemandante?.Sigla,
            UnidadeDemandanteNome = unidadeDemandante?.Nome,
            Numero = entity.Numero,
            IdSei = entity.IdSei,
            PrepostoNome = entity.PrepostoNome,
            PrepostoNumeroContato = entity.PrepostoNumeroContato,
            Obs = entity.Obs,
            Inadimplencia = entity.Inadimplencia,
            QuantidadeAditivos = entity.QuantidadeAditivos,
            Processo = entity.Processo,
            Objeto = entity.Objeto,
            ObservacoesComplementares = entity.ObservacoesComplementares,
            DataInicio = entity.DataInicio,
            Lei = entity.Lei,
            VigenciaInicial = entity.VigenciaInicial,
            VigenciaAtual = entity.VigenciaAtual,
            VigenciaMaxima = entity.VigenciaMaxima,
            ResponsavelGconv = entity.ResponsavelGconv,
            ValorInicialContratual = entity.ValorInicialContratual,
            ValorAcrescimo = entity.ValorAcrescimo,
            ValorSupressao = entity.ValorSupressao,
            ValorAtualContrato = entity.ValorAtualContrato,
            Procuradores = (procuradores ?? [])
                .OrderBy(x => x.Nome)
                .Select(x => new ContratoProcuradorDto
                {
                    Id = x.Id,
                    Nome = x.Nome,
                    NumeroContato = x.NumeroContato,
                    Email = x.Email
                })
                .ToList()
        };
    }

    private static void ValidateContratoDto(ContratoCreateUpdateDto dto)
    {
        if (dto.ValorInicialContratual <= 0)
        {
            throw new InvalidOperationException("O valor inicial do contrato deve ser maior que zero.");
        }

        if (dto.VigenciaInicial < dto.DataInicio)
        {
            throw new InvalidOperationException("A vigencia inicial deve ser igual ou posterior a data de inicio.");
        }

        if (dto.VigenciaMaxima.HasValue && dto.VigenciaMaxima.Value < dto.VigenciaInicial)
        {
            throw new InvalidOperationException("A vigencia maxima deve ser igual ou posterior a vigencia inicial.");
        }

        foreach (var procurador in dto.Procuradores)
        {
            if (string.IsNullOrWhiteSpace(procurador.Nome))
            {
                throw new InvalidOperationException("Informe o nome de todos os procuradores.");
            }

            if (string.IsNullOrWhiteSpace(procurador.NumeroContato))
            {
                throw new InvalidOperationException("Informe o numero de contato de todos os procuradores.");
            }

            if (string.IsNullOrWhiteSpace(procurador.Email))
            {
                throw new InvalidOperationException("Informe o email de todos os procuradores.");
            }
        }
    }

    private async Task<Dictionary<Guid, List<ProcuradorContrato>>> GetProcuradoresByContratoAsync(CancellationToken cancellationToken)
    {
        return (await _procuradorRepository.GetAllAsync(cancellationToken))
            .GroupBy(x => x.ContratoId)
            .ToDictionary(x => x.Key, x => x.OrderBy(y => y.Nome).ToList());
    }

    private async Task SyncProcuradoresAsync(
        Guid contratoId,
        IEnumerable<ContratoProcuradorCreateUpdateDto> procuradores,
        CancellationToken cancellationToken
    )
    {
        var procuradoresNormalizados = (procuradores ?? [])
            .Where(x =>
                !string.IsNullOrWhiteSpace(x.Nome)
                || !string.IsNullOrWhiteSpace(x.NumeroContato)
                || !string.IsNullOrWhiteSpace(x.Email))
            .Select(x => new ContratoProcuradorCreateUpdateDto
            {
                Nome = x.Nome.Trim(),
                NumeroContato = x.NumeroContato.Trim(),
                Email = x.Email.Trim()
            })
            .ToList();

        var existentes = await _procuradorRepository.FindAsync(x => x.ContratoId == contratoId, cancellationToken);
        foreach (var existente in existentes)
        {
            _procuradorRepository.Delete(existente);
        }

        foreach (var procurador in procuradoresNormalizados)
        {
            await _procuradorRepository.AddAsync(new ProcuradorContrato
            {
                ContratoId = contratoId,
                Nome = procurador.Nome,
                NumeroContato = procurador.NumeroContato,
                Email = procurador.Email
            }, cancellationToken);
        }
    }

    private static string? NormalizeNullable(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private async Task<DateTime> CalculateCurrentVigenciaAsync(Contrato contrato, CancellationToken cancellationToken)
    {
        var renovacoes = await _aditivoRepository.FindAsync(
            x => x.ContratoId == contrato.Id && x.Tipo == TipoAditivo.Renovacao && x.NovaVigencia.HasValue,
            cancellationToken
        );

        return renovacoes
            .OrderByDescending(x => x.DataInicio)
            .Select(x => x.NovaVigencia!.Value)
            .FirstOrDefault(contrato.VigenciaInicial);
    }

    private sealed class CurrentUserContext
    {
        public Guid UsuarioId { get; set; }
        public Guid? UnidadeId { get; set; }
        public bool IsAdministrador { get; set; }
        public bool IsPerfilContratos { get; set; }
        public bool IsFinanceiro { get; set; }
        public bool IsControleInterno { get; set; }
    }
}
