using Domain.Model;
using Microsoft.EntityFrameworkCore;
using Persistence.Contract;

namespace Persistence.Context;

public class AppDbContext : DbContext
{
    private static readonly HashSet<string> IgnoredAuditFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "CreatedAt",
        "UpdatedAt",
        "PasswordHash",
        "PasswordSalt",
        "Token",
        "RefreshToken"
    };

    private readonly IAuditSink? _auditSink;
    private readonly IAuditContextAccessor? _auditContextAccessor;

    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        IAuditSink? auditSink = null,
        IAuditContextAccessor? auditContextAccessor = null
    )
        : base(options)
    {
        _auditSink = auditSink;
        _auditContextAccessor = auditContextAccessor;
    }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Bem> Bens { get; set; }
    public DbSet<Equipe> Equipes { get; set; }
    public DbSet<Local> Locais { get; set; }
    public DbSet<LocalMembro> LocaisMembros { get; set; }
    public DbSet<UnidadeAdministrativa> UnidadesAdministrativas { get; set; }
    public DbSet<Comissao> Comissoes { get; set; }
    public DbSet<ComissaoMembro> ComissoesMembros { get; set; }
    public DbSet<ItemInventariado> ItensInventariados { get; set; }
    public DbSet<ItemInventarioFoto> ItensInventariadosFotos { get; set; }
    public DbSet<Levantamento> Levantamentos { get; set; }
    public DbSet<LevantamentoCompartilhamento> LevantamentosCompartilhamentos { get; set; }
    public DbSet<LevantamentoItem> LevantamentosItens { get; set; }
    public DbSet<Transferencia> Transferencias { get; set; }
    public DbSet<TransferenciaItem> TransferenciasItens { get; set; }
    public DbSet<LaudoTecnico> LaudosTecnicos { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("Usuarios");
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Cpf).IsUnique();
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Cpf).HasMaxLength(11).IsRequired();
            entity.Property(x => x.PermissoesJson).HasColumnType("longtext").IsRequired();
            entity.Property(x => x.Status).HasMaxLength(20).IsRequired().HasDefaultValue("Ativo");
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.PasswordSalt).HasMaxLength(500).IsRequired();
            entity.Property(x => x.MustChangePassword).HasDefaultValue(true);
        });

        modelBuilder.Entity<Bem>(entity =>
        {
            entity.ToTable("Bens");
            entity.HasIndex(x => x.Tombamento).IsUnique();
            entity.Property(x => x.Tombamento).HasMaxLength(120).IsRequired();
            entity.Property(x => x.TombamentoFormatado).HasMaxLength(120).IsRequired();
            entity.Property(x => x.TombamentoAntigo).HasMaxLength(120);
            entity.Property(x => x.Tipo).HasMaxLength(200);
            entity.Property(x => x.Descricao).HasMaxLength(500).IsRequired();
            entity.Property(x => x.UrlConsulta).HasMaxLength(500);
        });

        modelBuilder.Entity<Equipe>(entity =>
        {
            entity.ToTable("Equipes");
            entity.Property(x => x.Descricao).HasMaxLength(200).IsRequired();
            entity.HasOne(x => x.Comissao)
                .WithMany(x => x.Equipes)
                .HasForeignKey(x => x.ComissaoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Local>(entity =>
        {
            entity.ToTable("Locais");
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Latitude).HasPrecision(10, 8);
            entity.Property(x => x.Longitude).HasPrecision(11, 8);
            entity.HasOne(x => x.Comissao)
                .WithMany(x => x.Locais)
                .HasForeignKey(x => x.ComissaoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LocalMembro>(entity =>
        {
            entity.ToTable("LocaisMembros");
            entity.HasIndex(x => new { x.LocalId, x.UsuarioId })
                .IsUnique();
            entity.HasOne(x => x.Local)
                .WithMany(x => x.Membros)
                .HasForeignKey(x => x.LocalId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Usuario)
                .WithMany()
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UnidadeAdministrativa>(entity =>
        {
            entity.ToTable("UnidadesAdministrativas");
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Sigla).HasMaxLength(40).IsRequired();
            entity.HasOne(x => x.UnidadeSuperior)
                .WithMany(x => x.UnidadesFilhas)
                .HasForeignKey(x => x.UnidadeSuperiorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Comissao>(entity =>
        {
            entity.ToTable("Comissoes");
            entity.HasIndex(x => x.Ano).IsUnique();
            entity.Property(x => x.Ano).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(20).IsRequired();
            entity.HasOne(x => x.Presidente)
                .WithMany(x => x.ComissoesPresididas)
                .HasForeignKey(x => x.PresidenteId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ComissaoMembro>(entity =>
        {
            entity.ToTable("ComissoesMembros");
            entity.HasIndex(x => new { x.ComissaoId, x.UsuarioId })
                .IsUnique();
            entity.HasOne(x => x.Comissao)
                .WithMany(x => x.Membros)
                .HasForeignKey(x => x.ComissaoId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Usuario)
                .WithMany(x => x.ComissoesMembro)
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ItemInventariado>(entity =>
        {
            entity.ToTable("ItensInventariados");
            entity.Property(x => x.TombamentoNovo).HasMaxLength(120);
            entity.Property(x => x.TombamentoAntigo).HasMaxLength(120);
            entity.Property(x => x.Descricao).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(80).IsRequired();
            entity.Property(x => x.EstadoConservacao).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Observacao).HasMaxLength(2000);
            entity.Property(x => x.Latitude).HasPrecision(10, 8);
            entity.Property(x => x.Longitude).HasPrecision(11, 8);
            entity.Property(x => x.PrecisaoLocalizacao).HasPrecision(10, 2);
            entity.HasOne(x => x.LancadoEEstadoPorUsuario)
                .WithMany()
                .HasForeignKey(x => x.LancadoEEstadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Local)
                .WithMany(x => x.ItensInventariados)
                .HasForeignKey(x => x.LocalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Usuario)
                .WithMany(x => x.ItensInventariados)
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Comissao)
                .WithMany(x => x.ItensInventariados)
                .HasForeignKey(x => x.ComissaoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ItemInventarioFoto>(entity =>
        {
            entity.ToTable("ItensInventariadosFotos");
            entity.Property(x => x.NomeArquivo).HasMaxLength(255).IsRequired();
            entity.Property(x => x.NomeOriginal).HasMaxLength(255).IsRequired();
            entity.Property(x => x.CaminhoRelativo).HasMaxLength(500).IsRequired();
            entity.Property(x => x.Url).HasMaxLength(500).IsRequired();
            entity.HasOne(x => x.ItemInventariado)
                .WithMany(x => x.Fotos)
                .HasForeignKey(x => x.ItemInventariadoId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Levantamento>(entity =>
        {
            entity.ToTable("Levantamentos");
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Descricao).HasMaxLength(2000);
            entity.HasOne(x => x.CriadoPorUsuario)
                .WithMany(x => x.LevantamentosCriados)
                .HasForeignKey(x => x.CriadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LevantamentoItem>(entity =>
        {
            entity.ToTable("LevantamentosItens");
            entity.HasIndex(x => new { x.LevantamentoId, x.Tombamento })
                .IsUnique();
            entity.Property(x => x.Tombamento).HasMaxLength(120).IsRequired();
            entity.Property(x => x.TombamentoAntigo).HasMaxLength(120);
            entity.Property(x => x.Descricao).HasMaxLength(500);
            entity.Property(x => x.Tipo).HasMaxLength(200);
            entity.Property(x => x.UrlConsulta).HasMaxLength(500);
            entity.HasOne(x => x.Levantamento)
                .WithMany(x => x.Itens)
                .HasForeignKey(x => x.LevantamentoId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.ConfirmadoPorUsuario)
                .WithMany(x => x.LevantamentosItensConfirmados)
                .HasForeignKey(x => x.ConfirmadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LevantamentoCompartilhamento>(entity =>
        {
            entity.ToTable("LevantamentosCompartilhamentos");
            entity.HasIndex(x => new { x.LevantamentoId, x.UsuarioId })
                .IsUnique();
            entity.HasOne(x => x.Levantamento)
                .WithMany(x => x.Compartilhamentos)
                .HasForeignKey(x => x.LevantamentoId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Usuario)
                .WithMany(x => x.LevantamentosCompartilhados)
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CompartilhadoPorUsuario)
                .WithMany(x => x.LevantamentosCompartilhadosPorUsuario)
                .HasForeignKey(x => x.CompartilhadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Transferencia>(entity =>
        {
            entity.ToTable("Transferencias");
            entity.Property(x => x.ResponsavelDestino).HasMaxLength(200).IsRequired();
            entity.Property(x => x.IdSeiTermo).HasMaxLength(120);
            entity.Property(x => x.Status).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Observacao).HasMaxLength(2000);
            entity.HasOne(x => x.UnidadeAdministrativaDestino)
                .WithMany(x => x.TransferenciasDestino)
                .HasForeignKey(x => x.UnidadeAdministrativaDestinoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.CriadoPorUsuario)
                .WithMany(x => x.TransferenciasCriadas)
                .HasForeignKey(x => x.CriadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.FinalizadoPorUsuario)
                .WithMany(x => x.TransferenciasFinalizadas)
                .HasForeignKey(x => x.FinalizadoPorUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TransferenciaItem>(entity =>
        {
            entity.ToTable("TransferenciasItens");
            entity.Property(x => x.TombamentoNovo).HasMaxLength(120);
            entity.Property(x => x.TombamentoAntigo).HasMaxLength(120);
            entity.Property(x => x.Descricao).HasMaxLength(500).IsRequired();
            entity.Property(x => x.StatusItem).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Condicao).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Observacao).HasMaxLength(2000);
            entity.HasOne(x => x.Transferencia)
                .WithMany(x => x.Itens)
                .HasForeignKey(x => x.TransferenciaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LaudoTecnico>(entity =>
        {
            entity.ToTable("LaudosTecnicos");
            entity.Property(x => x.ProcessoSei).HasMaxLength(120);
            entity.Property(x => x.IdDevolucaoSei).HasMaxLength(120);
            entity.Property(x => x.UnidadeGestora).HasMaxLength(200);
            entity.Property(x => x.Setor).HasMaxLength(200);
            entity.Property(x => x.TipoEquipamento).HasMaxLength(80).IsRequired();
            entity.Property(x => x.OutroTipoEquipamento).HasMaxLength(120);
            entity.Property(x => x.Patrimonio).HasMaxLength(120);
            entity.Property(x => x.NumeroSerie).HasMaxLength(120);
            entity.Property(x => x.Marca).HasMaxLength(120);
            entity.Property(x => x.Modelo).HasMaxLength(120);
            entity.Property(x => x.AnoAquisicao).HasMaxLength(40);
            entity.Property(x => x.Processador).HasMaxLength(120);
            entity.Property(x => x.Memoria).HasMaxLength(120);
            entity.Property(x => x.Armazenamento).HasMaxLength(120);
            entity.Property(x => x.SistemaOperacional).HasMaxLength(120);
            entity.Property(x => x.Outros).HasMaxLength(1000);
            entity.Property(x => x.CondicaoFuncionamento).HasMaxLength(80).IsRequired();
            entity.Property(x => x.DescricaoFuncionamento).HasMaxLength(2000);
            entity.Property(x => x.EstadoConservacao).HasMaxLength(80).IsRequired();
            entity.Property(x => x.ProblemasIdentificadosJson).HasColumnType("longtext").IsRequired();
            entity.Property(x => x.OutroProblema).HasMaxLength(300);
            entity.Property(x => x.DescricaoTecnicaDetalhada).HasMaxLength(4000);
            entity.Property(x => x.DescricaoReparo).HasMaxLength(2000);
            entity.Property(x => x.ValorEstimadoMercado).HasPrecision(12, 2);
            entity.Property(x => x.CustoEstimadoManutencao).HasPrecision(12, 2);
            entity.Property(x => x.PercentualEstimado).HasPrecision(6, 2);
            entity.Property(x => x.ClassificacaoTecnica).HasMaxLength(80).IsRequired();
            entity.Property(x => x.JustificativaTecnica).HasMaxLength(4000).IsRequired();
            entity.Property(x => x.RecomendacoesJson).HasColumnType("longtext").IsRequired();
            entity.Property(x => x.SugestoesDestinacaoJson).HasColumnType("longtext").IsRequired();
            entity.Property(x => x.RegistroFotograficoJson).HasColumnType("longtext").IsRequired();
            entity.Property(x => x.ConclusaoCondicao).HasMaxLength(80).IsRequired();
            entity.Property(x => x.ClassificacaoFinal).HasMaxLength(200);
            entity.Property(x => x.ResponsavelTecnicoNome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.ResponsavelTecnicoCargo).HasMaxLength(80).IsRequired();
            entity.HasOne(x => x.ResponsavelTecnicoUsuario)
                .WithMany(x => x.LaudosTecnicos)
                .HasForeignKey(x => x.ResponsavelTecnicoUsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                continue;
            }

            modelBuilder.Entity(entityType.ClrType).Property("CreatedAt").HasColumnType("datetime(6)");
            modelBuilder.Entity(entityType.ClrType).Property("UpdatedAt").HasColumnType("datetime(6)");
            modelBuilder.Entity(entityType.ClrType).Property("DeletedAt").HasColumnType("datetime(6)");
        }
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var entries = ChangeTracker.Entries<BaseEntity>();
        var utcNow = DateTime.UtcNow;

        foreach (var entry in entries)
        {
            if (entry.State == EntityState.Added && entry.Entity.CreatedAt == default)
            {
                entry.Entity.CreatedAt = utcNow;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = utcNow;
            }
        }

        var auditEntries = BuildAuditEntries(utcNow);
        var result = await base.SaveChangesAsync(cancellationToken);

        if (_auditSink is not null)
        {
            foreach (var auditEntry in auditEntries)
            {
                await _auditSink.EnqueueAsync("entity-changes", auditEntry, cancellationToken);
            }
        }

        return result;
    }

    private List<object> BuildAuditEntries(DateTime utcNow)
    {
        var auditContext = _auditContextAccessor?.Current ?? new AuditContext();
        var entries = ChangeTracker.Entries<BaseEntity>()
            .Where(entry => entry.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Where(entry => entry.Entity.GetType().Name.StartsWith("Audit", StringComparison.OrdinalIgnoreCase) is false)
            .ToList();

        var auditEntries = new List<object>();

        foreach (var entry in entries)
        {
            var changes = new Dictionary<string, object?>();
            var action = ResolveAuditAction(entry);

            foreach (var property in entry.Properties)
            {
                if (IgnoredAuditFields.Contains(property.Metadata.Name))
                {
                    continue;
                }

                if (entry.State == EntityState.Added)
                {
                    changes[property.Metadata.Name] = new
                    {
                        oldValue = (object?)null,
                        newValue = property.CurrentValue
                    };
                    continue;
                }

                if (entry.State == EntityState.Deleted)
                {
                    changes[property.Metadata.Name] = new
                    {
                        oldValue = property.OriginalValue,
                        newValue = (object?)null
                    };
                    continue;
                }

                if (!property.IsModified || Equals(property.OriginalValue, property.CurrentValue))
                {
                    continue;
                }

                changes[property.Metadata.Name] = new
                {
                    oldValue = property.OriginalValue,
                    newValue = property.CurrentValue
                };
            }

            auditEntries.Add(new
            {
                timestampUtc = utcNow,
                action,
                entityName = entry.Metadata.ClrType.Name,
                tableName = entry.Metadata.GetTableName(),
                entityId = entry.Entity.Id,
                changes,
                userId = auditContext.UsuarioId,
                login = auditContext.Login,
                roles = auditContext.Perfis,
                endpoint = auditContext.Path,
                httpMethod = auditContext.MetodoHttp,
                traceId = auditContext.TraceId
            });
        }

        return auditEntries;
    }

    private static string ResolveAuditAction(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry<BaseEntity> entry)
    {
        if (entry.State == EntityState.Added)
        {
            return "create";
        }

        if (entry.State == EntityState.Deleted)
        {
            return "delete";
        }

        var deletedAt = entry.Property(nameof(BaseEntity.DeletedAt));
        if (deletedAt.IsModified && deletedAt.OriginalValue is null && deletedAt.CurrentValue is not null)
        {
            return "soft-delete";
        }

        return "update";
    }
}
