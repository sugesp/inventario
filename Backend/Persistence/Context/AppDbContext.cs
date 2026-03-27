using Domain.Model;
using Microsoft.EntityFrameworkCore;

namespace Persistence.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Equipe> Equipes { get; set; }
    public DbSet<Local> Locais { get; set; }
    public DbSet<ItemInventariado> ItensInventariados { get; set; }
    public DbSet<ItemInventarioFoto> ItensInventariadosFotos { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("Usuarios");
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Cpf).IsUnique();
            entity.HasOne(x => x.Equipe)
                .WithMany()
                .HasForeignKey(x => x.EquipeId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Cpf).HasMaxLength(11).IsRequired();
            entity.Property(x => x.Perfil).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(20).IsRequired().HasDefaultValue("Ativo");
            entity.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
            entity.Property(x => x.PasswordSalt).HasMaxLength(500).IsRequired();
            entity.Property(x => x.MustChangePassword).HasDefaultValue(true);
        });

        modelBuilder.Entity<Equipe>(entity =>
        {
            entity.ToTable("Equipes");
            entity.Property(x => x.Descricao).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Local>(entity =>
        {
            entity.ToTable("Locais");
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.HasOne(x => x.Equipe)
                .WithMany(x => x.Locais)
                .HasForeignKey(x => x.EquipeId)
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
            entity.HasOne(x => x.Local)
                .WithMany(x => x.ItensInventariados)
                .HasForeignKey(x => x.LocalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Usuario)
                .WithMany(x => x.ItensInventariados)
                .HasForeignKey(x => x.UsuarioId)
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

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
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

        return base.SaveChangesAsync(cancellationToken);
    }
}
