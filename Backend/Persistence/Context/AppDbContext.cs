using Domain.Model;
using Microsoft.EntityFrameworkCore;

namespace Persistence.Context;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Fornecedor> Fornecedores { get; set; }
    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Unidade> Unidades { get; set; }
    public DbSet<Equipe> Equipes { get; set; }
    public DbSet<Local> Locais { get; set; }
    public DbSet<ItemInventariado> ItensInventariados { get; set; }
    public DbSet<ItemInventarioFoto> ItensInventariadosFotos { get; set; }
    public DbSet<Contrato> Contratos { get; set; }
    public DbSet<Aditivo> Aditivos { get; set; }
    public DbSet<EquipeContrato> EquipesContrato { get; set; }
    public DbSet<ExercicioAnual> ExerciciosAnuais { get; set; }
    public DbSet<ProcessoPagamento> ProcessosPagamento { get; set; }
    public DbSet<Empenho> Empenhos { get; set; }
    public DbSet<Notificacao> Notificacoes { get; set; }
    public DbSet<Portaria> Portarias { get; set; }
    public DbSet<NotaFiscal> NotasFiscais { get; set; }
    public DbSet<GlosaNotaFiscal> GlosasNotasFiscais { get; set; }
    public DbSet<Liquidacao> Liquidacoes { get; set; }
    public DbSet<Pagamento> Pagamentos { get; set; }
    public DbSet<RestoPagar> RestosPagar { get; set; }
    public DbSet<ProcuradorContrato> ProcuradoresContrato { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Fornecedor>(entity =>
        {
            entity.ToTable("Fornecedores");
            entity.HasIndex(x => x.Cnpj).IsUnique();
            entity.Property(x => x.RazaoSocial).HasMaxLength(200).IsRequired();
            entity.Property(x => x.NomeFantasia).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Cnpj).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(200);
            entity.Property(x => x.TelefoneContato).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Endereco).HasMaxLength(300);
            entity.Property(x => x.Cidade).HasMaxLength(120);
            entity.Property(x => x.Estado).HasMaxLength(2);
        });

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

        modelBuilder.Entity<Unidade>(entity =>
        {
            entity.ToTable("Unidades");
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Sigla).HasMaxLength(30).IsRequired();
            entity.HasOne(x => x.UnidadeSuperior)
                .WithMany(x => x.UnidadesFilhas)
                .HasForeignKey(x => x.UnidadeSuperiorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Contrato>(entity =>
        {
            entity.ToTable("Contratos");
            entity.HasIndex(x => x.Numero).IsUnique();
            entity.HasOne(x => x.Fornecedor)
                .WithMany(x => x.Contratos)
                .HasForeignKey(x => x.FornecedorId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.UnidadeDemandante)
                .WithMany()
                .HasForeignKey(x => x.UnidadeDemandanteId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Numero).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.PrepostoNome).HasMaxLength(200);
            entity.Property(x => x.PrepostoNumeroContato).HasMaxLength(30);
            entity.Property(x => x.Processo).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Objeto).HasMaxLength(1000).IsRequired();
            entity.Property(x => x.ResponsavelGconv).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Lei).HasMaxLength(250).IsRequired();
            entity.Property(x => x.ValorInicialContratual).HasPrecision(18, 2);
            entity.Property(x => x.ValorAcrescimo).HasPrecision(18, 2);
            entity.Property(x => x.ValorSupressao).HasPrecision(18, 2);
            entity.Property(x => x.ValorAtualContrato).HasPrecision(18, 2);
        });

        modelBuilder.Entity<ProcuradorContrato>(entity =>
        {
            entity.ToTable("ProcuradoresContrato");
            entity.HasOne(x => x.Contrato)
                .WithMany(x => x.Procuradores)
                .HasForeignKey(x => x.ContratoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Nome).HasMaxLength(200).IsRequired();
            entity.Property(x => x.NumeroContato).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Aditivo>(entity =>
        {
            entity.ToTable("Aditivos");
            entity.HasOne(x => x.Contrato)
                .WithMany(x => x.Aditivos)
                .HasForeignKey(x => x.ContratoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Numero).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Valor).HasPrecision(18, 2);
        });

        modelBuilder.Entity<ExercicioAnual>(entity =>
        {
            entity.ToTable("ExerciciosAnuais");
            entity.HasIndex(x => new { x.ContratoId, x.Ano }).IsUnique();
            entity.HasOne(x => x.Contrato)
                .WithMany(x => x.ExerciciosAnuais)
                .HasForeignKey(x => x.ContratoId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProcessoPagamento>(entity =>
        {
            entity.ToTable("ProcessosPagamento");
            entity.HasOne(x => x.ExercicioAnual)
                .WithMany(x => x.ProcessosPagamento)
                .HasForeignKey(x => x.ExercicioAnualId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.NumeroProcesso).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Observacoes).HasMaxLength(1000);
        });

        modelBuilder.Entity<EquipeContrato>(entity =>
        {
            entity.ToTable("EquipesContrato");
            entity.HasOne(x => x.Contrato)
                .WithMany(x => x.Equipe)
                .HasForeignKey(x => x.ContratoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Usuario)
                .WithMany(x => x.EquipesContrato)
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.Portaria)
                .WithMany(x => x.EquipesContrato)
                .HasForeignKey(x => x.PortariaId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.MotivoExclusao).HasMaxLength(1000);
        });

        modelBuilder.Entity<Empenho>(entity =>
        {
            entity.ToTable("Empenhos");
            entity.HasOne(x => x.ExercicioAnual)
                .WithMany(x => x.Empenhos)
                .HasForeignKey(x => x.ExercicioAnualId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.NumeroEmpenho).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ValorEmpenhado).HasPrecision(18, 2);
            entity.Property(x => x.ValorLiquidado).HasPrecision(18, 2);
            entity.Property(x => x.Fonte).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<RestoPagar>(entity =>
        {
            entity.ToTable("RestosPagar");
            entity.HasOne(x => x.Empenho)
                .WithMany(x => x.RestosPagar)
                .HasForeignKey(x => x.EmpenhoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.NumeroNotaLancamento).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Valor).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Portaria>(entity =>
        {
            entity.ToTable("Portarias");
            entity.HasOne(x => x.Contrato)
                .WithMany(x => x.Portarias)
                .HasForeignKey(x => x.ContratoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.NumeroPortaria).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Descricao).HasMaxLength(1000);
        });

        modelBuilder.Entity<Notificacao>(entity =>
        {
            entity.ToTable("Notificacoes");
            entity.HasOne(x => x.Contrato)
                .WithMany(x => x.Notificacoes)
                .HasForeignKey(x => x.ContratoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Titulo).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Descricao).HasMaxLength(1000);
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSeiResposta).HasMaxLength(100);
        });

        modelBuilder.Entity<NotaFiscal>(entity =>
        {
            entity.ToTable("NotasFiscais");
            entity.HasOne(x => x.ProcessoPagamento)
                .WithMany(x => x.NotasFiscais)
                .HasForeignKey(x => x.ProcessoPagamentoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.Numero).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Serie).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Referencia).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Valor).HasPrecision(18, 2);
            entity.Property(x => x.BaseCalculo).HasPrecision(18, 2);
            entity.Property(x => x.Inss).HasPrecision(18, 2);
            entity.Property(x => x.Iss).HasPrecision(18, 2);
            entity.Property(x => x.Irrf).HasPrecision(18, 2);
        });

        modelBuilder.Entity<GlosaNotaFiscal>(entity =>
        {
            entity.ToTable("GlosasNotasFiscais");
            entity.HasOne(x => x.NotaFiscal)
                .WithMany(x => x.Glosas)
                .HasForeignKey(x => x.NotaFiscalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ValorGlosa).HasPrecision(18, 2);
            entity.Property(x => x.Descricao).HasMaxLength(1000);
        });

        modelBuilder.Entity<Liquidacao>(entity =>
        {
            entity.ToTable("Liquidacoes");
            entity.HasOne(x => x.Empenho)
                .WithMany(x => x.Liquidacoes)
                .HasForeignKey(x => x.EmpenhoId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.NotaFiscal)
                .WithMany()
                .HasForeignKey(x => x.NotaFiscalId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.NumeroLiquidacao).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSei).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ValorLiquidado).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Pagamento>(entity =>
        {
            entity.ToTable("Pagamentos");
            entity.HasIndex(x => x.LiquidacaoId).IsUnique();
            entity.HasOne(x => x.Liquidacao)
                .WithOne(x => x.Pagamento)
                .HasForeignKey<Pagamento>(x => x.LiquidacaoId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.Property(x => x.NumeroOrdemBancaria).HasMaxLength(100).IsRequired();
            entity.Property(x => x.IdSeiOrdemBancaria).HasMaxLength(100).IsRequired();
            entity.Property(x => x.ValorOrdemBancaria).HasPrecision(18, 2);
            entity.Property(x => x.NumeroPreparacaoPagamento).HasMaxLength(100).IsRequired(false);
            entity.Property(x => x.IdSeiPreparacaoPagamento).HasMaxLength(100).IsRequired(false);
            entity.Property(x => x.ValorPreparacaoPagamento).HasPrecision(18, 2);
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
