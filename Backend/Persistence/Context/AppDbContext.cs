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

        modelBuilder.Entity<Transferencia>(entity =>
        {
            entity.ToTable("Transferencias");
            entity.Property(x => x.ResponsavelDestino).HasMaxLength(200).IsRequired();
            entity.Property(x => x.IdSeiTermo).HasMaxLength(120);
            entity.Property(x => x.Status).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Observacao).HasMaxLength(2000);
            entity.HasOne(x => x.LocalDestino)
                .WithMany(x => x.TransferenciasDestino)
                .HasForeignKey(x => x.LocalDestinoId)
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
