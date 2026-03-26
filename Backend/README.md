# Contratos Backend (Base)

Estrutura inicial em camadas para evoluir o projeto:

- `API`: controllers, configuração HTTP e injeção de dependências.
- `Application`: serviços e DTOs.
- `Domain`: entidades e regras de domínio.
- `Persistence`: contexto EF Core, contratos de persistência e repositórios.

## Estrutura criada

- `Domain/Model/BaseEntity.cs`
- `Application/Contract/IBaseService.cs`
- `Application/DTO/BaseEntityDto.cs`
- `Persistence/Contract/IGenericRepository.cs`
- `Persistence/Repository/GenericRepository.cs`
- `API/Controllers/HealthController.cs`

## Rodando

1. Ajuste a connection string em `API/appsettings.Development.json`.
2. Na pasta `Backend`, execute:

```bash
dotnet restore
dotnet build
```

## Próximos passos

1. Criar as entidades em `Domain/Model`.
2. Expor `DbSet<T>` no `AppDbContext` para cada entidade.
3. Criar migrations:

```bash
dotnet ef migrations add Inicial -p Persistence -s API
dotnet ef database update -p Persistence -s API
```
