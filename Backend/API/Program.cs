using API.Auditing;
using Application.Contract;
using Application.Services;
using Domain.Model;
using Domain.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Persistence.Context;
using Persistence.Contract;
using Persistence.Repository;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection is not configured.");
}

var databaseServerVersion = builder.Configuration["Database:ServerVersion"] ?? "8.0.36-mysql";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseMySql(connectionString, ServerVersion.Parse(databaseServerVersion));
});
builder.Services.AddHttpContextAccessor();

var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSecret = jwtSection["Secret"] ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
{
    throw new InvalidOperationException("Jwt:Secret must contain at least 32 bytes.");
}
var jwtIssuer = jwtSection["Issuer"] ?? "Inventario.API";
var jwtAudience = jwtSection["Audience"] ?? "Inventario.App";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var usuarioIdValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? context.Principal?.FindFirstValue("sub");

                if (!Guid.TryParse(usuarioIdValue, out var usuarioId))
                {
                    context.Fail("Usuário inválido.");
                    return;
                }

                var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var usuarioAtivo = await dbContext.Usuarios
                    .AsNoTracking()
                    .AnyAsync(usuario =>
                        usuario.Id == usuarioId
                        && usuario.DeletedAt == null
                        && usuario.Status == "Ativo");

                if (!usuarioAtivo)
                {
                    context.Fail("Usuário desativado ou excluído.");
                }
            }
        };
    });

builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IAuditContextAccessor, HttpAuditContextAccessor>();
builder.Services.AddSingleton<JsonlAuditWriter>();
builder.Services.AddSingleton<IAuditSink>(services => services.GetRequiredService<JsonlAuditWriter>());
builder.Services.AddHostedService(services => services.GetRequiredService<JsonlAuditWriter>());
builder.Services.AddHttpClient("MapaCnpj", client =>
{
    client.BaseAddress = new Uri("https://mapacnpj.seunegocionanuvem.com.br/api/");
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddHttpClient("PatrimonioPublico", client =>
{
    client.BaseAddress = new Uri("https://e-estado.ro.gov.br/");
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IEquipeService, EquipeService>();
builder.Services.AddScoped<ILocalService, LocalService>();
builder.Services.AddScoped<IComissaoService, ComissaoService>();
builder.Services.AddScoped<IUnidadeAdministrativaService, UnidadeAdministrativaService>();
builder.Services.AddScoped<IItemInventariadoService, ItemInventariadoService>();
builder.Services.AddScoped<ILevantamentoService, LevantamentoService>();
builder.Services.AddScoped<ITransferenciaService, TransferenciaService>();
builder.Services.AddScoped<ILaudoTecnicoService, LaudoTecnicoService>();

builder.Services
    .AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(entry => entry.Value?.Errors.Count > 0)
                .ToDictionary(
                    entry => entry.Key,
                    entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray()
                );

            return new BadRequestObjectResult(new
            {
                message = "Dados inválidos enviados para a API.",
                errors
            });
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("Authentication", limiterOptions =>
    {
        limiterOptions.PermitLimit = 10;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
        limiterOptions.AutoReplenishment = true;
    });
});
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "DefaultCors",
        policy =>
        {
            if (allowedOrigins.Length > 0)
            {
                policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
            }
        }
    );
});

var app = builder.Build();

await SeedInitialAdminAsync(app.Services, app.Configuration);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DefaultCors");
app.UseRateLimiter();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
    context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
    context.Response.Headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
    context.Response.Headers.TryAdd("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    if (context.User.Identity?.IsAuthenticated == true)
    {
        context.Response.Headers.TryAdd("Cache-Control", "no-store");
    }

    await next();
});
app.UseMiddleware<ApiAccessAuditMiddleware>();
app.UseAuthorization();
app.MapControllers();

app.Run();

static async Task SeedInitialAdminAsync(IServiceProvider services, IConfiguration configuration)
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();

    var cpf = new string((configuration["BootstrapAdmin:Cpf"] ?? string.Empty).Where(char.IsDigit).ToArray());
    var password = configuration["BootstrapAdmin:Password"];
    if (cpf.Length != 11 || string.IsNullOrWhiteSpace(password))
    {
        return;
    }

    if (password.Length < 12)
    {
        throw new InvalidOperationException("BootstrapAdmin:Password must contain at least 12 characters.");
    }

    var usuarioExistente = await dbContext.Usuarios.FirstOrDefaultAsync(x => x.Cpf == cpf && x.DeletedAt == null);
    if (usuarioExistente is not null)
    {
        return;
    }

    var usuario = new Usuario
    {
        Nome = configuration["BootstrapAdmin:Name"]?.Trim() ?? "Administrador do sistema",
        Email = configuration["BootstrapAdmin:Email"]?.Trim().ToLowerInvariant() ?? "sysadmin@local",
        Cpf = cpf,
        PermissoesJson = UsuarioPermissoes.Serialize([UsuarioPermissoes.Administrador])
    };

    ApplyBootstrapPassword(usuario, password);
    dbContext.Usuarios.Add(usuario);

    await dbContext.SaveChangesAsync();
}

static void ApplyBootstrapPassword(Usuario usuario, string password)
{
    var salt = RandomNumberGenerator.GetBytes(16);
    var hash = Rfc2898DeriveBytes.Pbkdf2(
        password: password,
        salt: salt,
        iterations: 100_000,
        hashAlgorithm: HashAlgorithmName.SHA256,
        outputLength: 32
    );

    usuario.PasswordSalt = Convert.ToBase64String(salt);
    usuario.PasswordHash = Convert.ToBase64String(hash);
    usuario.MustChangePassword = true;
}
