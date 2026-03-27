using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Application.Contract;
using Application.DTO.Auth;
using Application.DTO.Common;
using Domain.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Persistence.Contract;

namespace Application.Services;

public class AuthService : IAuthService
{
    private const string DefaultPassword = "12345678";
    private const string SystemAdminCpf = "00000000000";
    private const string StatusPendente = "Pendente";
    private const string StatusAtivo = "Ativo";
    private const string StatusDesativado = "Desativado";
    private readonly IGenericRepository<Usuario> _usuarioRepository;
    private readonly IGenericRepository<Equipe> _equipeRepository;
    private readonly IConfiguration _configuration;

    public AuthService(
        IGenericRepository<Usuario> usuarioRepository,
        IGenericRepository<Equipe> equipeRepository,
        IConfiguration configuration
    )
    {
        _usuarioRepository = usuarioRepository;
        _equipeRepository = equipeRepository;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var cpf = NormalizeCpf(dto.Cpf);
        if (cpf.Length != 11)
        {
            throw new InvalidOperationException("CPF inválido.");
        }

        var usuariosExistentes = await _usuarioRepository.FindAsync(
            x => x.Email == email || x.Cpf == cpf,
            cancellationToken
        );
        var usuarioExistente = usuariosExistentes
            .FirstOrDefault();
        if (usuarioExistente is not null)
        {
            throw new InvalidOperationException("Já existe um usuário cadastrado com este email ou CPF.");
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = HashPassword(DefaultPassword, salt);
        var equipeDescricao = await GetEquipeDescricaoAsync(dto.EquipeId, cancellationToken);

        var usuario = new Usuario
        {
            Nome = dto.Nome.Trim(),
            Email = email,
            Cpf = cpf,
            Perfil = NormalizePerfil(dto.Perfil),
            Status = NormalizeStatus(dto.Status),
            EquipeId = dto.EquipeId,
            PasswordHash = Convert.ToBase64String(hash),
            PasswordSalt = Convert.ToBase64String(salt),
            MustChangePassword = true
        };

        await _usuarioRepository.AddAsync(usuario, cancellationToken);
        await _usuarioRepository.SaveChangesAsync(cancellationToken);

        return GenerateAuthResponse(usuario, equipeDescricao);
    }

    public async Task<UsuarioDto> PreRegisterAsync(PreRegisterDto dto, CancellationToken cancellationToken = default)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var cpf = NormalizeCpf(dto.Cpf);
        if (cpf.Length != 11)
        {
            throw new InvalidOperationException("CPF inválido.");
        }

        if (string.IsNullOrWhiteSpace(dto.Senha) || dto.Senha.Trim().Length < 8)
        {
            throw new InvalidOperationException("A senha deve ter pelo menos 8 caracteres.");
        }

        var usuariosExistentes = await _usuarioRepository.FindAsync(
            x => x.Email == email || x.Cpf == cpf,
            cancellationToken
        );
        if (usuariosExistentes.Any())
        {
            throw new InvalidOperationException("Já existe um usuário cadastrado com este email ou CPF.");
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = HashPassword(dto.Senha.Trim(), salt);

        var usuario = new Usuario
        {
            Nome = dto.Nome.Trim(),
            Email = email,
            Cpf = cpf,
            Perfil = "Operador",
            Status = StatusPendente,
            PasswordHash = Convert.ToBase64String(hash),
            PasswordSalt = Convert.ToBase64String(salt),
            MustChangePassword = false
        };

        await _usuarioRepository.AddAsync(usuario, cancellationToken);
        await _usuarioRepository.SaveChangesAsync(cancellationToken);

        return new UsuarioDto
        {
            Id = usuario.Id,
            Nome = usuario.Nome,
            Email = usuario.Email,
            Cpf = MaskCpf(usuario.Cpf),
            Perfil = usuario.Perfil,
            Status = usuario.Status,
            MustChangePassword = usuario.MustChangePassword
        };
    }

    public async Task<UsuarioDto> UpdateUserAsync(Guid usuarioId, RegisterDto dto, CancellationToken cancellationToken = default)
    {
        var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, cancellationToken);
        if (usuario is null)
        {
            throw new InvalidOperationException("Usuário não encontrado.");
        }

        if (IsSystemAdminUser(usuario))
        {
            throw new InvalidOperationException("O usuário administrador do sistema não pode ser alterado.");
        }

        var email = dto.Email.Trim().ToLowerInvariant();
        var cpf = NormalizeCpf(dto.Cpf);
        if (cpf.Length != 11)
        {
            cpf = usuario.Cpf;
        }

        var usuariosExistentes = await _usuarioRepository.FindAsync(
            x => (x.Email == email || x.Cpf == cpf) && x.Id != usuarioId,
            cancellationToken
        );

        if (usuariosExistentes.Any())
        {
            throw new InvalidOperationException("Já existe um usuário cadastrado com este email ou CPF.");
        }

        usuario.Nome = dto.Nome.Trim();
        usuario.Email = email;
        usuario.Cpf = cpf;
        usuario.Perfil = NormalizePerfil(dto.Perfil);
        usuario.Status = NormalizeStatus(dto.Status);
        usuario.EquipeId = dto.EquipeId;

        _usuarioRepository.Update(usuario);
        await _usuarioRepository.SaveChangesAsync(cancellationToken);

        var equipeDescricao = await GetEquipeDescricaoAsync(usuario.EquipeId, cancellationToken);

        return new UsuarioDto
        {
            Id = usuario.Id,
            Nome = usuario.Nome,
            Email = usuario.Email,
            Cpf = MaskCpf(usuario.Cpf),
            Perfil = usuario.Perfil,
            Status = usuario.Status,
            EquipeId = usuario.EquipeId,
            EquipeDescricao = equipeDescricao,
            MustChangePassword = usuario.MustChangePassword
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        var cpf = NormalizeCpf(dto.Cpf);
        var usuario = (await _usuarioRepository.FindAsync(x => x.Cpf == cpf, cancellationToken))
            .FirstOrDefault();
        if (usuario is null || !VerifyPassword(dto.Senha, usuario.PasswordSalt, usuario.PasswordHash))
        {
            throw new InvalidOperationException("CPF ou senha inválidos.");
        }

        if (!string.Equals(usuario.Status, StatusAtivo, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Seu cadastro ainda está pendente de aprovação do administrador.");
        }

        var equipeDescricao = await GetEquipeDescricaoAsync(usuario.EquipeId, cancellationToken);
        return GenerateAuthResponse(usuario, equipeDescricao);
    }

    public async Task<AuthResponseDto> ChangePasswordAsync(
        Guid usuarioId,
        ChangePasswordDto dto,
        CancellationToken cancellationToken = default
    )
    {
        var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, cancellationToken);
        if (usuario is null)
        {
            throw new InvalidOperationException("Usuário não encontrado.");
        }

        if (string.IsNullOrWhiteSpace(dto.NovaSenha) || dto.NovaSenha.Trim().Length < 8)
        {
            throw new InvalidOperationException("A nova senha deve ter pelo menos 8 caracteres.");
        }

        if (!usuario.MustChangePassword)
        {
            if (string.IsNullOrWhiteSpace(dto.SenhaAtual) || !VerifyPassword(dto.SenhaAtual, usuario.PasswordSalt, usuario.PasswordHash))
            {
                throw new InvalidOperationException("Senha atual inválida.");
            }
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = HashPassword(dto.NovaSenha.Trim(), salt);

        usuario.PasswordSalt = Convert.ToBase64String(salt);
        usuario.PasswordHash = Convert.ToBase64String(hash);
        usuario.MustChangePassword = false;

        _usuarioRepository.Update(usuario);
        await _usuarioRepository.SaveChangesAsync(cancellationToken);

        var equipeDescricao = await GetEquipeDescricaoAsync(usuario.EquipeId, cancellationToken);
        return GenerateAuthResponse(usuario, equipeDescricao);
    }

    public async Task ResetPasswordAsync(Guid usuarioId, CancellationToken cancellationToken = default)
    {
        var usuario = await _usuarioRepository.GetByIdAsync(usuarioId, cancellationToken);
        if (usuario is null)
        {
            throw new InvalidOperationException("Usuário não encontrado.");
        }

        if (IsSystemAdminUser(usuario))
        {
            throw new InvalidOperationException("A senha do usuário administrador do sistema não pode ser redefinida.");
        }

        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = HashPassword(DefaultPassword, salt);

        usuario.PasswordSalt = Convert.ToBase64String(salt);
        usuario.PasswordHash = Convert.ToBase64String(hash);
        usuario.MustChangePassword = true;

        _usuarioRepository.Update(usuario);
        await _usuarioRepository.SaveChangesAsync(cancellationToken);
    }

    public async Task<IEnumerable<UsuarioDto>> GetAllUsersAsync(CancellationToken cancellationToken = default)
    {
        var usuarios = (await _usuarioRepository.GetAllAsync(cancellationToken)).ToList();
        var equipes = (await _equipeRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id, x => x.Descricao);
        return usuarios
            .Where(x => !IsSystemAdminUser(x))
            .Select(x => new UsuarioDto
            {
                Id = x.Id,
                Nome = x.Nome,
                Email = x.Email,
                Cpf = MaskCpf(x.Cpf),
                Perfil = x.Perfil,
                Status = x.Status,
                EquipeId = x.EquipeId,
                EquipeDescricao = x.EquipeId.HasValue ? equipes.GetValueOrDefault(x.EquipeId.Value) : null,
                MustChangePassword = x.MustChangePassword
            })
            .OrderBy(x => x.Nome);
    }

    public async Task<PagedResult<UsuarioDto>> GetPagedUsersAsync(
        PageParams pageParams,
        CancellationToken cancellationToken = default
    )
    {
        var usuarios = (await _usuarioRepository.GetAllAsync(cancellationToken)).ToList();
        var equipes = (await _equipeRepository.GetAllAsync(cancellationToken)).ToDictionary(x => x.Id, x => x.Descricao);
        var data = usuarios
            .Where(x => !IsSystemAdminUser(x))
            .Select(x => new UsuarioDto
            {
                Id = x.Id,
                Nome = x.Nome,
                Email = x.Email,
                Cpf = MaskCpf(x.Cpf),
                Perfil = x.Perfil,
                Status = x.Status,
                EquipeId = x.EquipeId,
                EquipeDescricao = x.EquipeId.HasValue ? equipes.GetValueOrDefault(x.EquipeId.Value) : null,
                MustChangePassword = x.MustChangePassword
            })
            .AsEnumerable();

        if (!string.IsNullOrWhiteSpace(pageParams.Term))
        {
            var term = pageParams.Term.Trim();
            var termDigits = OnlyDigits(term);
            data = data.Where(x =>
                ContainsTerm(x.Nome, term)
                || ContainsTerm(x.Email, term)
                || ContainsTerm(x.Perfil, term)
                || ContainsTerm(x.Status, term)
                || ContainsTerm(x.EquipeDescricao, term)
                || (!string.IsNullOrWhiteSpace(termDigits) && ContainsTerm(OnlyDigits(x.Cpf), termDigits))
            );
        }

        data = data.OrderBy(x => x.Nome);
        return PagedResult<UsuarioDto>.Create(data, pageParams);
    }

    public async Task<IEnumerable<UsuarioResponsavelDto>> GetInventarioUsersAsync(CancellationToken cancellationToken = default)
    {
        var usuarios = await _usuarioRepository.GetAllAsync(cancellationToken);
        return usuarios
            .Where(x =>
                string.Equals(x.Perfil, "Inventario", StringComparison.OrdinalIgnoreCase)
                && string.Equals(x.Status, StatusAtivo, StringComparison.OrdinalIgnoreCase))
            .OrderBy(x => x.Nome)
            .Select(x => new UsuarioResponsavelDto
            {
                Id = x.Id,
                Nome = x.Nome,
                Cpf = MaskCpf(x.Cpf)
            });
    }

    private AuthResponseDto GenerateAuthResponse(Usuario usuario, string? equipeDescricao = null)
    {
        var jwtSection = _configuration.GetSection("Jwt");
        var secret = jwtSection["Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        var issuer = jwtSection["Issuer"] ?? "Inventario.API";
        var audience = jwtSection["Audience"] ?? "Inventario.App";
        var expiresMinutes = int.TryParse(jwtSection["ExpiresMinutes"], out var value) ? value : 480;
        var expiresAt = DateTime.UtcNow.AddMinutes(expiresMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, usuario.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, usuario.Email),
            new Claim(JwtRegisteredClaimNames.Name, usuario.Nome),
            new Claim("cpf", usuario.Cpf),
            new Claim(ClaimTypes.Role, usuario.Perfil),
            new Claim("equipeId", usuario.EquipeId?.ToString() ?? string.Empty)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAt = expiresAt,
            Nome = usuario.Nome,
            Email = usuario.Email,
            Cpf = MaskCpf(usuario.Cpf),
            Perfil = usuario.Perfil,
            Status = usuario.Status,
            EquipeId = usuario.EquipeId,
            EquipeDescricao = equipeDescricao,
            MustChangePassword = usuario.MustChangePassword
        };
    }

    private async Task<string?> GetEquipeDescricaoAsync(Guid? equipeId, CancellationToken cancellationToken)
    {
        if (!equipeId.HasValue)
        {
            return null;
        }

        var equipe = await _equipeRepository.GetByIdAsync(equipeId.Value, cancellationToken);
        if (equipe is null)
        {
            throw new InvalidOperationException("Equipe não encontrada.");
        }

        return equipe.Descricao;
    }

    private static string NormalizeCpf(string cpf)
    {
        return new string(cpf.Where(char.IsDigit).ToArray());
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

    private static bool IsSystemAdminUser(Usuario usuario)
    {
        return NormalizeCpf(usuario.Cpf) == SystemAdminCpf;
    }

    private static string MaskCpf(string cpf)
    {
        var normalizedCpf = NormalizeCpf(cpf);
        if (normalizedCpf.Length != 11)
        {
            return cpf;
        }

        return $"{normalizedCpf[..3]}.***.***-{normalizedCpf[9..]}";
    }

    private static string NormalizePerfil(string perfil)
    {
        if (string.Equals(perfil, "Financeiro", StringComparison.OrdinalIgnoreCase))
        {
            return "Financeiro";
        }

        if (string.Equals(perfil, "Controle Interno", StringComparison.OrdinalIgnoreCase))
        {
            return "Controle Interno";
        }

        if (string.Equals(perfil, "Inventario", StringComparison.OrdinalIgnoreCase))
        {
            return "Inventario";
        }

        return string.Equals(perfil, "Administrador", StringComparison.OrdinalIgnoreCase)
            ? "Administrador"
            : "Operador";
    }

    private static string NormalizeStatus(string status)
    {
        if (string.Equals(status, StatusPendente, StringComparison.OrdinalIgnoreCase))
        {
            return StatusPendente;
        }

        if (string.Equals(status, StatusDesativado, StringComparison.OrdinalIgnoreCase))
        {
            return StatusDesativado;
        }

        return string.Equals(status, StatusAtivo, StringComparison.OrdinalIgnoreCase)
            ? StatusAtivo
            : throw new InvalidOperationException("Status inválido.");
    }

    private static byte[] HashPassword(string senha, byte[] salt)
    {
        return Rfc2898DeriveBytes.Pbkdf2(
            password: senha,
            salt: salt,
            iterations: 100_000,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: 32
        );
    }

    private static bool VerifyPassword(string senha, string saltBase64, string hashBase64)
    {
        var salt = Convert.FromBase64String(saltBase64);
        var expectedHash = Convert.FromBase64String(hashBase64);
        var currentHash = HashPassword(senha, salt);
        return CryptographicOperations.FixedTimeEquals(currentHash, expectedHash);
    }
}
