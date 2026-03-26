using Application.Contract;
using Application.DTO.Common;
using Application.DTO.Fornecedor;
using Domain.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Http;
using Persistence.Contract;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json.Serialization;

namespace Application.Services;

public class FornecedorService : IFornecedorService
{
    private readonly IGenericRepository<Fornecedor> _repository;
    private readonly IGenericRepository<Contrato> _contratoRepository;
    private readonly IGenericRepository<Unidade> _unidadeRepository;
    private readonly IGenericRepository<EquipeContrato> _equipeRepository;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public FornecedorService(
        IGenericRepository<Fornecedor> repository,
        IGenericRepository<Contrato> contratoRepository,
        IGenericRepository<Unidade> unidadeRepository,
        IGenericRepository<EquipeContrato> equipeRepository,
        IHttpClientFactory httpClientFactory,
        IHttpContextAccessor httpContextAccessor
    )
    {
        _repository = repository;
        _contratoRepository = contratoRepository;
        _unidadeRepository = unidadeRepository;
        _equipeRepository = equipeRepository;
        _httpClientFactory = httpClientFactory;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<IEnumerable<FornecedorDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var items = await GetAccessibleFornecedoresAsync(cancellationToken);
        return items.Select(MapToDto).OrderBy(x => GetDisplayName(x));
    }

    public async Task<PagedResult<FornecedorDto>> GetPagedAsync(
        PageParams pageParams,
        CancellationToken cancellationToken = default
    )
    {
        var items = (await GetAccessibleFornecedoresAsync(cancellationToken))
            .Select(MapToDto)
            .OrderBy(x => GetDisplayName(x));

        if (!string.IsNullOrWhiteSpace(pageParams.Term))
        {
            var term = pageParams.Term.Trim();
            var termDigits = OnlyDigits(term);
            items = items.Where(x =>
                ContainsTerm(x.NomeFantasia, term)
                || ContainsTerm(x.RazaoSocial, term)
                || ContainsTerm(x.Email, term)
                || ContainsTerm(x.Cidade, term)
                || ContainsTerm(x.Estado, term)
                || (!string.IsNullOrWhiteSpace(termDigits) && ContainsTerm(OnlyDigits(x.Cnpj), termDigits))
            ).OrderBy(x => GetDisplayName(x));
        }

        return PagedResult<FornecedorDto>.Create(items, pageParams);
    }

    public async Task<FornecedorDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = (await GetAccessibleFornecedoresAsync(cancellationToken))
            .FirstOrDefault(x => x.Id == id);
        return entity is null ? null : MapToDto(entity);
    }

    public async Task<FornecedorDto> CreateAsync(FornecedorCreateUpdateDto dto, CancellationToken cancellationToken = default)
    {
        NormalizeAndValidate(dto);

        var entity = new Fornecedor
        {
            RazaoSocial = dto.RazaoSocial.Trim(),
            NomeFantasia = dto.NomeFantasia.Trim(),
            Cnpj = SanitizeCnpj(dto.Cnpj),
            Email = NormalizeOptional(dto.Email),
            TelefoneContato = dto.TelefoneContato.Trim(),
            Endereco = NormalizeOptional(dto.Endereco),
            Cidade = NormalizeOptional(dto.Cidade),
            Estado = NormalizeOptional(dto.Estado)?.ToUpperInvariant()
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<FornecedorDto?> UpdateAsync(
        Guid id,
        FornecedorCreateUpdateDto dto,
        CancellationToken cancellationToken = default
    )
    {
        NormalizeAndValidate(dto);

        var entity = await _repository.GetByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.RazaoSocial = dto.RazaoSocial.Trim();
        entity.NomeFantasia = dto.NomeFantasia.Trim();
        entity.Cnpj = SanitizeCnpj(dto.Cnpj);
        entity.Email = NormalizeOptional(dto.Email);
        entity.TelefoneContato = dto.TelefoneContato.Trim();
        entity.Endereco = NormalizeOptional(dto.Endereco);
        entity.Cidade = NormalizeOptional(dto.Cidade);
        entity.Estado = NormalizeOptional(dto.Estado)?.ToUpperInvariant();

        _repository.Update(entity);
        await _repository.SaveChangesAsync(cancellationToken);

        return MapToDto(entity);
    }

    public async Task<FornecedorConsultaCnpjDto?> ConsultarCnpjAsync(string cnpj, CancellationToken cancellationToken = default)
    {
        var cnpjSanitizado = SanitizeCnpj(cnpj);
        if (cnpjSanitizado.Length != 14)
        {
            return null;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("MapaCnpj");
            var response = await client.GetAsync(cnpjSanitizado, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var payload = await response.Content.ReadFromJsonAsync<MapaCnpjResponse>(cancellationToken: cancellationToken);
            if (payload is null)
            {
                return null;
            }

            return new FornecedorConsultaCnpjDto
            {
                Cnpj = cnpjSanitizado,
                RazaoSocial = payload.RazaoSocial,
                NomeFantasia = payload.Fantasia,
                TelefoneContato = FirstPhoneNumber(payload.Telefone, payload.Celular, payload.Contato),
                Email = payload.Email,
                Endereco = BuildEndereco(payload),
                Cidade = payload.Cidade,
                Estado = payload.Estado
            };
        }
        catch
        {
            return null;
        }
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

    private async Task<IEnumerable<Fornecedor>> GetAccessibleFornecedoresAsync(CancellationToken cancellationToken)
    {
        var fornecedores = (await _repository.GetAllAsync(cancellationToken)).ToList();
        var currentUser = GetCurrentUserContext();

        if (currentUser is null || currentUser.IsAdministrador || currentUser.IsPerfilContratos)
        {
            return fornecedores;
        }

        var contratos = (await _contratoRepository.GetAllAsync(cancellationToken)).ToList();
        var contratoIdsEquipe = (await _equipeRepository.FindAsync(
            x => x.UsuarioId == currentUser.UsuarioId && x.DataExclusao == null,
            cancellationToken
        ))
        .Select(x => x.ContratoId)
        .ToHashSet();
        var unidadeIdsAcessiveis = await GetAccessibleUnidadeIdsAsync(currentUser.UnidadeId, cancellationToken);

        var fornecedorIds = contratos
            .Where(contrato =>
                (contrato.UnidadeDemandanteId.HasValue && unidadeIdsAcessiveis.Contains(contrato.UnidadeDemandanteId.Value))
                || contratoIdsEquipe.Contains(contrato.Id)
            )
            .Select(contrato => contrato.FornecedorId)
            .ToHashSet();

        return fornecedores.Where(fornecedor => fornecedorIds.Contains(fornecedor.Id));
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

    private static FornecedorDto MapToDto(Fornecedor entity)
    {
        return new FornecedorDto
        {
            Id = entity.Id,
            RazaoSocial = entity.RazaoSocial,
            NomeFantasia = entity.NomeFantasia,
            Cnpj = entity.Cnpj,
            Email = entity.Email,
            TelefoneContato = entity.TelefoneContato,
            Endereco = entity.Endereco,
            Cidade = entity.Cidade,
            Estado = entity.Estado
        };
    }

    private static string GetDisplayName(FornecedorDto fornecedor)
    {
        return string.IsNullOrWhiteSpace(fornecedor.NomeFantasia)
            ? fornecedor.RazaoSocial
            : fornecedor.NomeFantasia;
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
          IsPerfilContratos = string.Equals(perfil, "Contratos", StringComparison.OrdinalIgnoreCase)
        };
    }

    private static void NormalizeAndValidate(FornecedorCreateUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RazaoSocial))
        {
            throw new InvalidOperationException("Razão social é obrigatória.");
        }

        if (string.IsNullOrWhiteSpace(dto.NomeFantasia))
        {
            throw new InvalidOperationException("Nome fantasia é obrigatório.");
        }

        if (SanitizeCnpj(dto.Cnpj).Length != 14)
        {
            throw new InvalidOperationException("CNPJ inválido.");
        }

        if (string.IsNullOrWhiteSpace(dto.TelefoneContato))
        {
            throw new InvalidOperationException("Telefone de contato é obrigatório.");
        }
    }

    private static string SanitizeCnpj(string value)
    {
        return new string((value ?? string.Empty).Where(char.IsDigit).ToArray());
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? FirstNotEmpty(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private static string? FirstPhoneNumber(params string?[] values)
    {
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            var trimmed = value.Trim();
            var digits = new string(trimmed.Where(char.IsDigit).ToArray());
            if (digits.Length >= 8)
            {
                return trimmed;
            }
        }

        return null;
    }

    private static string? BuildEndereco(MapaCnpjResponse payload)
    {
        var parts = new[]
        {
            payload.Endereco,
            payload.Numero,
            payload.Complemento,
            payload.Bairro
        }
        .Where(value => !string.IsNullOrWhiteSpace(value))
        .Select(value => value!.Trim());

        var endereco = string.Join(", ", parts);
        return string.IsNullOrWhiteSpace(endereco) ? null : endereco;
    }

    private sealed class MapaCnpjResponse
    {
        [JsonPropertyName("razao_social")]
        public string? RazaoSocial { get; set; }

        [JsonPropertyName("fantasia")]
        public string? Fantasia { get; set; }

        [JsonPropertyName("contato")]
        public string? Contato { get; set; }

        [JsonPropertyName("cnpj")]
        public string? Cnpj { get; set; }

        [JsonPropertyName("endereco")]
        public string? Endereco { get; set; }

        [JsonPropertyName("numero")]
        public string? Numero { get; set; }

        [JsonPropertyName("complemento")]
        public string? Complemento { get; set; }

        [JsonPropertyName("bairro")]
        public string? Bairro { get; set; }

        [JsonPropertyName("cidade")]
        public string? Cidade { get; set; }

        [JsonPropertyName("estado")]
        public string? Estado { get; set; }

        [JsonPropertyName("telefone")]
        public string? Telefone { get; set; }

        [JsonPropertyName("celular")]
        public string? Celular { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }
    }

    private sealed class CurrentUserContext
    {
        public Guid UsuarioId { get; set; }
        public Guid? UnidadeId { get; set; }
        public bool IsAdministrador { get; set; }
        public bool IsPerfilContratos { get; set; }
    }
}
