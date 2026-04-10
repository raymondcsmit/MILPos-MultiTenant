# PostgreSQL Support Implementation Plan

## Goal
Enable the ASP.NET Core API to support PostgreSQL as a database provider, alongside the existing SQL Server and SQLite options. This involves adding a new migration project, configuring the database context, and updating configuration files.

## User Review Required
- [ ] **Hangfire Storage**: Do you want to use PostgreSQL for Hangfire background jobs as well? Currently, it uses SQLite or SQL Server. If yes, we need to add `Hangfire.PostgreSql`.
- [ ] **Connection String**: Please provide the target PostgreSQL connection string (Host, Port, DB, User, Password).

## Proposed Changes

### 1. New Migration Project
Create a new Class Library project `POS.Migrations.PostgreSQL` to isolate PostgreSQL-specific migrations (following the pattern of `POS.Migrations.Sqlite` and `POS.Migrations.SqlServer`).

#### [NEW] [POS.Migrations.PostgreSQL](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Migrations.PostgreSQL/POS.Migrations.PostgreSQL.csproj)
- Target Framework: `net8.0` (matching other projects)
- Dependencies:
    - `Npgsql.EntityFrameworkCore.PostgreSQL`
    - `Microsoft.EntityFrameworkCore.Tools`
    - Project Reference to `POS.Domain`

### 2. Dependency Updates
Add PostgreSQL provider to the main API project.

#### [MODIFY] [POS.API.csproj](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/POS.API.csproj)
- Add package: `Npgsql.EntityFrameworkCore.PostgreSQL`

### 3. Database Context Configuration
Update `Program.cs` to handle the `PostgreSql` provider switch.

#### [MODIFY] [Program.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Program.cs)
- Add logic to check `DatabaseProvider` configuration.
- If "PostgreSql", use `options.UseNpgsql()` with the connection string and point to `POS.Migrations.PostgreSQL` assembly.
- **Timestamp Handling**: Enable `AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);` or ensure all DateTime interactions are UTC to prevent `timestamp with time zone` errors.

### 4. Configuration
Update `appsettings.json` to include the provider option and connection string.

#### [MODIFY] [appsettings.json](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/appsettings.json)
- Add `"PostgresConnectionString"` property.
- Allow `DatabaseProvider` to be set to "PostgreSql".

### 5. Documentation
Update developer docs with migration commands.

#### [MODIFY] [EFCommands.txt](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/EFCommands.txt)
- Add `dotnet ef migrations add` and `database update` commands for the PostgreSQL context.

## Verification
1.  **Build**: Ensure the solution builds with the new project.
2.  **Migration**: Create an initial migration for PostgreSQL.
3.  **Run**: Configure `appsettings.json` to use PostgreSQL and run the API.
4.  **Verify**: Check if tables are created in the PostgreSQL database and the API responds to requests.
