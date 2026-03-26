using Domain.Model;
using Microsoft.AspNetCore.Http;
using Persistence.Contract;
using System.Security.Claims;

namespace Application.Services;

public class ContratoAccessService
{
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly IGenericRepository<Unidade> _unidadeRepository;
    private readonly IGenericRepository<EquipeContrato> _equipeRepository;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ContratoAccessService(
        IGenericRepository<Contrato> contratoRepository,
        IGenericRepository<Unidade> unidadeRepository,
        IGenericRepository<EquipeContrato> equipeRepository,
        IHttpContextAccessor httpContextAccessor
    )
    {
        _contratoRepository = contratoRepository;
        _unidadeRepository = unidadeRepository;
        _equipeRepository = equipeRepository;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task EnsureCanAccessContratoAsync(Guid contratoId, CancellationToken cancellationToken = default)
    {
        if (await CanAccessContratoAsync(contratoId, cancellationToken))
        {
            return;
        }

        throw new UnauthorizedAccessException("Usuário sem acesso a este contrato.");
    }

    public async Task<bool> CanAccessContratoAsync(Guid contratoId, CancellationToken cancellationToken = default)
    {
        var contrato = await _contratoRepository.GetByIdAsync(contratoId, cancellationToken);
        if (contrato is null)
        {
            return false;
        }

        var currentUser = GetCurrentUserContext();
        if (currentUser is null
            || currentUser.IsAdministrador
            || currentUser.IsPerfilContratos
            || currentUser.IsFinanceiro
            || currentUser.IsControleInterno)
        {
            return true;
        }

        var contratoIdsEquipe = (await _equipeRepository.FindAsync(
            x => x.UsuarioId == currentUser.UsuarioId && x.DataExclusao == null,
            cancellationToken
        ))
        .Select(x => x.ContratoId)
        .ToHashSet();

        if (contratoIdsEquipe.Contains(contrato.Id))
        {
            return true;
        }

        if (!contrato.UnidadeDemandanteId.HasValue)
        {
            return false;
        }

        var unidadeIdsAcessiveis = await GetAccessibleUnidadeIdsAsync(currentUser.UnidadeId, cancellationToken);
        return unidadeIdsAcessiveis.Contains(contrato.UnidadeDemandanteId.Value);
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
