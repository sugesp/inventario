using Application.Contract;
using Application.Services;
using Domain.Model;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Persistence.Context;
using Persistence.Contract;
using Persistence.Repository;
using System.Security.Cryptography;
using System.Text;

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
    });

builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
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
builder.Services.AddScoped<IItemInventariadoService, ItemInventariadoService>();
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
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "DefaultCors",
        policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()
    );
});

var app = builder.Build();

await SeedDefaultAdminAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DefaultCors");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static async Task SeedDefaultAdminAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();

    var cpf = "00000000000";
    var usuarioExistente = await dbContext.Usuarios.FirstOrDefaultAsync(x => x.Cpf == cpf && x.DeletedAt == null);
    if (usuarioExistente is not null)
    {
        if (usuarioExistente.MustChangePassword && !VerifyPassword("12345678", usuarioExistente.PasswordSalt, usuarioExistente.PasswordHash))
        {
            ApplyDefaultPassword(usuarioExistente);
            await dbContext.SaveChangesAsync();
        }

        return;
    }

    var usuario = new Usuario
    {
        Nome = "sysadmin",
        Email = "sysadmin@local",
        Cpf = cpf,
        Perfil = "Administrador"
    };

    ApplyDefaultPassword(usuario);
    dbContext.Usuarios.Add(usuario);

    await dbContext.SaveChangesAsync();
}

static void ApplyDefaultPassword(Usuario usuario)
{
    var salt = RandomNumberGenerator.GetBytes(16);
    var hash = Rfc2898DeriveBytes.Pbkdf2(
        password: "12345678",
        salt: salt,
        iterations: 100_000,
        hashAlgorithm: HashAlgorithmName.SHA256,
        outputLength: 32
    );

    usuario.PasswordSalt = Convert.ToBase64String(salt);
    usuario.PasswordHash = Convert.ToBase64String(hash);
    usuario.MustChangePassword = true;
}

static bool VerifyPassword(string senha, string saltBase64, string hashBase64)
{
    var salt = Convert.FromBase64String(saltBase64);
    var expectedHash = Convert.FromBase64String(hashBase64);
    var currentHash = Rfc2898DeriveBytes.Pbkdf2(
        password: senha,
        salt: salt,
        iterations: 100_000,
        hashAlgorithm: HashAlgorithmName.SHA256,
        outputLength: 32
    );

    return CryptographicOperations.FixedTimeEquals(currentHash, expectedHash);
}
