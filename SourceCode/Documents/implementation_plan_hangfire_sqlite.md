# Hangfire SQLite Storage Configuration

I will replace the in-memory storage configuration for Hangfire with SQLite storage when the application is running with the "Sqlite" provider.

## User Review Required

> [!IMPORTANT]
> This change introduces a new dependency `Hangfire.Storage.SQLite` and modifies the `Program.cs` file. Ensure that the SQLite connection string provided in your configuration is compatible with this library.

## Proposed Changes

### POS.API

#### [MODIFY] [Program.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Program.cs)
- Replace `configuration.UseMemoryStorage()` with `configuration.UseSQLiteStorage(connectionString)` for the "Sqlite" provider.
- Add `using Hangfire.Storage.SQLite;` if necessary.

#### [NEW Dependency]
- Add `Hangfire.Storage.SQLite` package.

## Verification Plan

### Automated Tests
- Run the application with `provider` set to "Sqlite" and check if Hangfire server starts successfully.
- Trigger a background job and verify it is persisted.

### Manual Verification
- Check if the SQLite database file for Hangfire is created (if not using the main DB).
- Verify Hangfire dashboard is accessible and shows the server running with SQLite storage.
