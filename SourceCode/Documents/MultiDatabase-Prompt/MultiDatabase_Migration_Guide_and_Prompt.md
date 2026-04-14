# Multi-Database Migration Strategy with Entity Framework Core

This document outlines the architecture and implementation strategy for supporting multiple database providers (SQL Server, SQLite, PostgreSQL, etc.) using a single `DbContext` but separate migration projects.

## Architecture Overview

The core idea is to decouple the database migrations from the main API and Domain projects. Instead of storing migrations in the API or Domain project (which would clutter it and make it harder to switch providers), we create a separate Class Library project for each database provider.

### Project Structure

1.  **Main Application (API)**: The entry point. It references all migration projects. It contains the `IDesignTimeDbContextFactory` implementation to select the correct provider based on configuration.
2.  **Domain Project**: Contains the `DbContext` and entity definitions. It does *not* contain migrations.
3.  **Migration Projects**:
    *   `ProjectName.Migrations.SqlServer`: Contains migrations specific to SQL Server.
    *   `ProjectName.Migrations.Sqlite`: Contains migrations specific to SQLite.
    *   `ProjectName.Migrations.PostgreSQL`: Contains migrations specific to PostgreSQL.

## Implementation Details

### 1. Create Migration Projects

Create a Class Library project for each provider.
*   **Add Reference**: Each migration project must reference the **Domain** project.
*   **Add NuGet Packages**: Add the specific EF Core provider package (e.g., `Microsoft.EntityFrameworkCore.SqlServer`) and `Microsoft.EntityFrameworkCore.Tools`.

### 2. Configure DbContext in Domain

In your `DbContext` (inside the Domain project), ensure it can handle provider-specific configurations if necessary.

```csharp
protected override void OnModelCreating(ModelBuilder builder)
{
    base.OnModelCreating(builder);

    if (Database.IsSqlite())
    {
        // SQLite specific configurations (e.g., Collation)
        builder.Entity<User>(b =>
        {
            b.Property(u => u.NormalizedUserName).UseCollation("NOCASE");
            b.Property(u => u.NormalizedEmail).UseCollation("NOCASE");
        });
    }
}
```

### 3. Implement IDesignTimeDbContextFactory in API

In the API project, implement `IDesignTimeDbContextFactory<TContext>`. This factory is used by EF Core tools to create the context at design time. It should read the configuration (e.g., `appsettings.json` or environment variables) to determine which provider to use and **importantly**, set the migrations assembly to the corresponding migration project.

```csharp
public class MyDbContextFactory : IDesignTimeDbContextFactory<MyDbContext>
{
    public MyDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<MyDbContext>();
        
        // Build configuration
        IConfigurationRoot configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .AddEnvironmentVariables()
            .Build();

        var provider = configuration["DatabaseProvider"] ?? "SqlServer";
        
        if (string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase))
        {
             var connectionString = configuration.GetConnectionString("SqliteConnectionString");
             optionsBuilder.UseSqlite(connectionString, b => b.MigrationsAssembly("ProjectName.Migrations.Sqlite"));
        }
        else if (string.Equals(provider, "PostgreSql", StringComparison.OrdinalIgnoreCase))
        {
             var connectionString = configuration.GetConnectionString("PostgresConnectionString");
             optionsBuilder.UseNpgsql(connectionString, b => b.MigrationsAssembly("ProjectName.Migrations.PostgreSQL"));
        }
        else
        {
             var connectionString = configuration.GetConnectionString("DbConnectionString");
             optionsBuilder.UseSqlServer(connectionString, b => b.MigrationsAssembly("ProjectName.Migrations.SqlServer"));
        }

        return new MyDbContext(optionsBuilder.Options);
    }
}
```

### 4. Running Migrations

You must specify the migration project and the startup project when running EF Core commands.

**Powershell Example:**

```powershell
# SQL Server
$env:DatabaseProvider="SqlServer"
dotnet ef migrations add InitialCreate -p ProjectName.Migrations.SqlServer -s ProjectName.API -o Migrations

# SQLite
$env:DatabaseProvider="Sqlite"
dotnet ef migrations add InitialCreate -p ProjectName.Migrations.Sqlite -s ProjectName.API -o Migrations

# PostgreSQL
$env:DatabaseProvider="PostgreSql"
dotnet ef migrations add InitialCreate -p ProjectName.Migrations.PostgreSQL -s ProjectName.API -o Migrations
```

## Prompt for Generating Similar Architecture

Use the following prompt with an LLM to generate the necessary code and project structure for a new solution.

---

**Copy and paste the following prompt:**

```markdown
# Role
Act as a Senior .NET Architect specializing in Entity Framework Core and Clean Architecture.

# Task
I need to set up a .NET solution that supports multiple database providers (SQL Server, SQLite, PostgreSQL) for the same DbContext, but with migrations stored in separate projects to keep the solution clean.

# Requirements

1.  **Project Structure**:
    *   `[SolutionName].Domain`: Contains the `DbContext` and Entities.
    *   `[SolutionName].API`: The main Web API project.
    *   `[SolutionName].Migrations.SqlServer`: Class library for SQL Server migrations.
    *   `[SolutionName].Migrations.Sqlite`: Class library for SQLite migrations.
    *   `[SolutionName].Migrations.PostgreSQL`: Class library for PostgreSQL migrations.

2.  **Dependencies**:
    *   Migration projects should reference `[SolutionName].Domain`.
    *   API project should reference `[SolutionName].Domain` and ALL Migration projects.

3.  **DbContext Configuration**:
    *   In `[SolutionName].API`, implement `IDesignTimeDbContextFactory<MyDbContext>`.
    *   The factory should read a `DatabaseProvider` setting from `appsettings.json` or Environment Variables.
    *   Based on the provider, it should configure the `DbContextOptions` to use the correct provider (UseSqlServer, UseSqlite, UseNpgsql).
    *   **CRITICAL**: It must set the `MigrationsAssembly` to the corresponding migration project (e.g., `b => b.MigrationsAssembly("[SolutionName].Migrations.SqlServer")`).

4.  **Output**:
    *   Provide the `.csproj` content for the Migration projects showing necessary NuGet packages.
    *   Provide the `IDesignTimeDbContextFactory` implementation code.
    *   Provide the `DbContext` `OnModelCreating` method showing how to handle SQLite specific limitations (like collation) if needed.
    *   Provide a `EFCommands.txt` cheat sheet with the `dotnet ef` commands to add migrations and update the database for each provider, specifically showing how to target the correct project (`-p`) and startup project (`-s`) and setting the environment variable.

5.  **Context**:
    *   Solution Name: [YourSolutionName]
    *   DbContext Name: [YourDbContextName]

Please generate the code and project configuration to achieve this multi-database migration architecture.
```
