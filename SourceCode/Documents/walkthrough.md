# PostgreSQL Support Walkthrough

## Overview
We have successfully implemented PostgreSQL support for the POS API. This allows the application to run with a PostgreSQL database in addition to the existing SQL Server and SQLite options.

## Changes Implemented

### 1. New Migration Project
Created `POS.Migrations.PostgreSQL` to handle database schema changes specifically for PostgreSQL.
- **Path**: `SourceCode/SQLAPI/POS.Migrations.PostgreSQL`

### 2. Dependency Injection
Updated `POS.API` to include the `Npgsql.EntityFrameworkCore.PostgreSQL` provider.
- **File**: `POS.API.csproj`

### 3. Application Configuration
Modified `Startup.cs` to detect the `DatabaseProvider` setting and configure the `POSDbContext` to use Npgsql when "PostgreSql" is selected.
- **File**: `Startup.cs`

Updated `appsettings.json` to include a placeholder connection string for PostgreSQL.
- **File**: `appsettings.json`

### 4. Documentation
Updated `EFCommands.txt` with the necessary commands to generate migrations and update the PostgreSQL database.
- **File**: `EFCommands.txt`

## Verification
- **Build**: The solution `dotnet build` was successful, ensuring all dependencies and configurations are valid.

## Next Steps for You
### 4. Migration Status
I have successfully generated the initial PostgreSQL migration for you.
- **Migration Name**: `MainInitPostgreSQL`
- **Location**: `SourceCode/SQLAPI/POS.Migrations.PostgreSQL/Migrations`

## Next Steps for You
1.  **Set Connection String**: Update `appsettings.json` with your actual PostgreSQL credentials in `PostgresConnectionString`.
2.  **Update Database**: Apply the migration to your database by running:
    ```powershell
    dotnet ef database update MainInitPostgreSQL -c POSDbContext -p POS.Migrations.PostgreSQL/POS.Migrations.PostgreSQL.csproj --startup-project POS.API/POS.API.csproj -- --DatabaseProvider=PostgreSql
    ```
    *(Note: The `-- --DatabaseProvider=PostgreSql` part is critical to ensure the tool uses the PostgreSQL configuration)*
