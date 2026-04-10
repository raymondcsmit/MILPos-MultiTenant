# Fix for Foreign Key Constraint Error

## Problem
The migration is failing because existing seed data in migrations references `TenantId`, but the `Tenants` table may not have matching records.

## Solution Options

### Option 1: Fresh Database (Recommended for Development)
If you're in development and can afford to lose existing data:

```powershell
# Delete the existing database
Remove-Item -Path "pos.db" -Force

# Run migrations fresh
dotnet ef database update --project POS.Domain --startup-project POS.API
```

### Option 2: Add Default Tenant First
If you need to keep existing data, add a default tenant before running migrations:

```powershell
# 1. First, manually create the Tenants table and insert default tenant
# Connect to your SQLite database and run:

CREATE TABLE IF NOT EXISTS Tenants (
    Id TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    IsActive INTEGER NOT NULL DEFAULT 1,
    CreatedDate TEXT NOT NULL,
    ModifiedDate TEXT NOT NULL,
    IsDeleted INTEGER NOT NULL DEFAULT 0
);

INSERT INTO Tenants (Id, Name, IsActive, CreatedDate, ModifiedDate, IsDeleted)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 1, datetime('now'), datetime('now'), 0);

# 2. Then run the migration
dotnet ef database update --project POS.Domain --startup-project POS.API
```

### Option 3: Disable Foreign Keys Temporarily (Quick Fix)

```powershell
# Run migration with foreign keys disabled
# This is done automatically in the migration, but if it's not working:

# 1. Open SQLite database
sqlite3 pos.db

# 2. Disable foreign keys
PRAGMA foreign_keys = OFF;

# 3. Exit and run migration
dotnet ef database update --project POS.Domain --startup-project POS.API
```

## Recommended Approach for Your Case

Since you're setting up a fresh Desktop environment, I recommend **Option 1**:

```powershell
# Navigate to SQLAPI folder
cd F:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI

# Delete old database
Remove-Item -Path "pos.db" -Force -ErrorAction SilentlyContinue

# Create fresh database with all migrations
dotnet ef database update --project POS.Domain --startup-project POS.API
```

This will:
1. Create a fresh `pos.db` file
2. Apply all migrations in order
3. Seed all initial data with proper foreign key relationships

## After Migration Success

Once the migration completes successfully, you can run the Desktop app:

```powershell
# Set environment to Desktop
$env:ASPNETCORE_ENVIRONMENT="Desktop"

# Run the application
dotnet run --project POS.API/POS.API.csproj
```

## Verify Migration

Check that sync columns were added:

```powershell
# Open SQLite database
sqlite3 pos.db

# Check if sync columns exist
PRAGMA table_info(Users);
# Should show: SyncVersion, LastSyncedAt columns

# Check sync tables
.tables
# Should show: SyncMetadata, SyncLogs tables

# Exit
.quit
```
