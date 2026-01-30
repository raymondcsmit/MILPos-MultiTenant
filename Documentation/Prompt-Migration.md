# Multi-Database Provider Migration Strategy Prompt

I need you to implement a **Multi-Database Provider Migration Strategy** for my ASP.NET Core application, supporting both **SQLite** and **SQL Server**. The goal is to keep migration snapshots separate for each database provider to avoid conflicts.

Please follow these specific steps:

### 1. Project Structure Setup
Create two separate Class Library projects in the solution to hold the migrations:
*   `[AppName].Migrations.Sqlite` (Targets `net8.0` or matching version)
*   `[AppName].Migrations.SqlServer` (Targets `net8.0` or matching version)

Both projects must reference the project containing the `DbContext` (e.g., `[AppName].Domain` or `[AppName].Data`).

### 2. AppSettings Configuration
Configure your `appsettings.json` to include the `DatabaseProvider` setting and connection strings for both providers.

```json
{
  "DatabaseProvider": "Sqlite", // Options: "Sqlite" or "SqlServer"
  "ConnectionStrings": {
    "SqlServerConnectionString": "Server=YOUR_SERVER;Database=YOUR_DB;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;",
    "SqliteConnectionString": "Data Source=MyDb.db"
  }
}
```

### 3. Startup/Program Configuration
In the startup project (API), configure the `DbContext` to dynamically select the provider based on a configuration setting (`DatabaseProvider`). Use the following logic pattern:

```csharp
services.AddDbContext<MyDbContext>((serviceProvider, options) =>
{
    var provider = Configuration.GetValue<string>("DatabaseProvider"); // e.g., "Sqlite" or "SqlServer"
    
    if (provider == "Sqlite")
    {
        options.UseSqlite(
            Configuration.GetConnectionString("SqliteConnectionString"),
            b => b.MigrationsAssembly("[AppName].Migrations.Sqlite") // Point to specific assembly
        );
    }
    else
    {
        options.UseSqlServer(
            Configuration.GetConnectionString("SqlServerConnectionString"),
            b => b.MigrationsAssembly("[AppName].Migrations.SqlServer") // Point to specific assembly
        );
    }
});
```

### 4. Migration Generation Commands
Provide the exact PowerShell commands to generate migrations. The strategy relies on setting the `DatabaseProvider` environment variable before running the command so the API starts up using the correct provider.

**For SQL Server:**
```powershell
$env:DatabaseProvider="SqlServer"
dotnet ef migrations add [MigrationName] -p [AppName].Migrations.SqlServer -s [AppName].API -o Migrations
dotnet ef database update -p [AppName].Migrations.SqlServer -s [AppName].API
```

**For SQLite:**
```powershell
$env:DatabaseProvider="Sqlite"
dotnet ef migrations add [MigrationName] -p [AppName].Migrations.Sqlite -s [AppName].API -o Migrations
dotnet ef database update -p [AppName].Migrations.Sqlite -s [AppName].API
```

**Key Requirements:**
*   Ensure the `DbContext` has **no** hardcoded `OnConfiguring` setup that overrides these options.
*   The migration commands must explicitly target the migration project (`-p`) and the startup project (`-s`).
*   The output folder should be standardized (e.g., `-o Migrations`) inside the respective projects.
