# Multi-Database Configuration Guide (SQLite + SQL Server + PostgreSQL)

This document outlines the architecture and implementation details for supporting multiple database providers (SQLite, SQL Server, and PostgreSQL) within a single ASP.NET Core application using Entity Framework Core.

## 1. Project Structure

To maintain clean and provider-specific migrations, each database provider has its own migration project. This prevents "pollution" of migrations where provider-specific features (like sequences in Postgres vs. identity columns in SQL Server) might conflict.

- **POS.Domain**: Contains the `POSDbContext`, Entities, and `IDesignTimeDbContextFactory`.
- **POS.Migrations.Sqlite**: Target for SQLite migrations.
- **POS.Migrations.SqlServer**: Target for SQL Server migrations.
- **POS.Migrations.PostgreSQL**: Target for PostgreSQL migrations.

## 2. Configuration (`appsettings.json`)

Use a `DatabaseProvider` key to switch between environments.

```json
{
  "DatabaseProvider": "PostgreSql", // Options: "Sqlite", "SqlServer", "PostgreSql"

  "ConnectionStrings": {
    "DbConnectionString": "Server=localhost;Database=POSDb;User Id=sa;Password=Admin@123;",
    "SqliteConnectionString": "Data Source=pos.db",
    "PostgresConnectionString": "Host=localhost;Port=5432;Database=POSDb;Username=postgres;Password=password"
  }
}
```

## 3. DbContext Configuration (`Startup.cs` / `Program.cs`)

The `DbContext` is configured dynamically based on the `DatabaseProvider` setting.

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddDbContext<POSDbContext>((serviceProvider, options) =>
    {
        var provider = Configuration.GetValue<string>("DatabaseProvider") ?? "Sqlite";
        
        if (provider == "Sqlite")
        {
            options.UseSqlite(Configuration.GetConnectionString("SqliteConnectionString"),
                b => b.MigrationsAssembly("POS.Migrations.Sqlite"));
        }
        else if (provider == "PostgreSql")
        {
            // PostgreSQL specific switch for legacy timestamp behavior if needed
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            
            options.UseNpgsql(Configuration.GetConnectionString("PostgresConnectionString"),
                b => b.MigrationsAssembly("POS.Migrations.PostgreSQL"));
        }
        else // Default to SQL Server
        {
            options.UseSqlServer(Configuration.GetConnectionString("DbConnectionString"),
                b => b.MigrationsAssembly("POS.Migrations.SqlServer"));
        }
    });
}
```

## 4. Design-Time Factory (`IDesignTimeDbContextFactory`)

Migration tools (`dotnet ef`) run in a separate context. To ensure they use the correct provider and migration assembly, implement `IDesignTimeDbContextFactory`.

**Key features of this implementation:**
1. Reads `appsettings.json`.
2. Supports command-line arguments to override the provider (critical for generating migrations for a provider different from the one currently active in config).

```csharp
public class POSDbContextFactory : IDesignTimeDbContextFactory<POSDbContext>
{
    public POSDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
        
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .AddCommandLine(args) // Allows: --DatabaseProvider=PostgreSql
            .Build();

        var provider = configuration["DatabaseProvider"] ?? "SqlServer";

        if (string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            optionsBuilder.UseSqlite(configuration.GetConnectionString("SqliteConnectionString"), 
                b => b.MigrationsAssembly("POS.Migrations.Sqlite"));
        }
        else if (string.Equals(provider, "PostgreSql", StringComparison.OrdinalIgnoreCase))
        {
            AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);
            optionsBuilder.UseNpgsql(configuration.GetConnectionString("PostgresConnectionString"), 
                b => b.MigrationsAssembly("POS.Migrations.PostgreSQL"));
        }
        else
        {
            optionsBuilder.UseSqlServer(configuration.GetConnectionString("DbConnectionString"), 
                b => b.MigrationsAssembly("POS.Migrations.SqlServer"));
        }

        return new POSDbContext(optionsBuilder.Options, new SingleTenantProvider());
    }
}
```

## 5. Migration Commands (CLI)

Use the `--` separator to pass the `DatabaseProvider` argument to your application code through the tools.

### PostgreSQL
```powershell
# Add Migration
dotnet ef migrations add Initial --project POS.Migrations.PostgreSQL --startup-project POS.API -- -o Migrations --DatabaseProvider=PostgreSql

# Update Database
dotnet ef database update --project POS.Migrations.PostgreSQL --startup-project POS.API --DatabaseProvider=PostgreSql
```

### SQLite
```powershell
dotnet ef migrations add Initial --project POS.Migrations.Sqlite --startup-project POS.API --DatabaseProvider=Sqlite
```

### SQL Server
```powershell
dotnet ef migrations add Initial --project POS.Migrations.SqlServer --startup-project POS.API --DatabaseProvider=SqlServer
```

## 6. Important Considerations

1. **Naming Strategy**: Some providers are case-sensitive (Postgres) while others are not (SQL Server). Use snake_case or consistent PascalCase with quotes if necessary.
2. **Schema Support**: SQLite does not support schemas (e.g., `dbo.`). If using schemas for organizational purposes, ensure they are handled conditionally in `OnModelCreating`.
3. **Data Types**: Be mindful of types like `GUID` and `DateTimeOffset`. SQLite stores GUIDs as strings/blobs, and Postgres handles `DateTime` with timezone differently than SQL Server.
