# Sprint 2: Cloud Auth & Database Download - Implementation Plan

## Goal
Enable secure database distribution to client machines by allowing users to download a pre-configured, tenant-specific SQLite database after cloud authentication.

## Proposed Changes

### POS.Repository
- **Modify** `UserRepository.cs`: Fetch `ApiKey` from `Tenant` table and add to `UserAuthDto` and JWT claims.

### POS.Data
- **Modify** `UserAuthDto`: Add `ApiKey` property.

### POS.MediatR
- **Modify** `ExportTenantToSqliteCommand`: Add `CloudApiUrl` and `ApiKey` properties.
- **Modify** `ExportTenantToSqliteCommandHandler`:
    - Fetch `ApiKey` if not provided.
    - Generate `appsettings.json` with cloud configuration.
    - Bundle database and config into a ZIP file.
    - Fix `SyncMetadata` state for first-time use.

### POS.API
- **Modify** `TenantsController`: Add `DownloadMyDatabase` endpoint.
- **Modify** `Startup.cs` (if needed): Ensure proper service mapping for `ITenantProvider` in export context.

## Verification Plan
1. Ensure solution builds without errors.
2. Verify JWT contains the `ApiKey` claim after login.
3. Verify `/api/tenants/my-database` returns a ZIP file containing `pos.db` and `appsettings.json`.
3. Verify `/api/tenants/my-database` returns a ZIP file containing `pos.db` and `appsettings.json`.
4. Verify `appsettings.json` contains correct `CloudApiUrl` and `ApiKey`.

## Bug Fix: Menu Duplication on Tenant Switch
### Problem
When an admin switches tenants, the menu items are duplicated.
- **Cause**: `POSDbContext` allows both Tenant-Specific items AND Global items (`TenantId == null`) for `MenuItem`.
- **Conflict**: `TenantRegistrationService` seeds a full copy of the menu for every new tenant. This results in the user seeing both the tenant-specific copy AND the global default items.

### Proposed Solution
- **Modify** `POSDbContext.cs`: Update the global query filter for `MenuItem` to STRICTLY filter by `CurrentTenantId`. Remove the `|| m.TenantId == null` clause.

### Verification
- **Login as Admin**.
- **Switch Tenant**.
- **Verify Menu**: Ensure no duplicate items appear.
