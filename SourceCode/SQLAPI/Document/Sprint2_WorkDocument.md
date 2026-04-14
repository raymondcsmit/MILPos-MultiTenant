# Sprint 2: Cloud Auth & Database Download - Work Document

## Overview
This document summarizes the changes implemented during Sprint 2 to support secure cloud authentication and tenant database distribution for offline use.

## Completed Tasks

### 1. JWT Enhancement
- Added `ApiKey` claim to the JWT generated during login.
- Modified `UserRepository.cs` to fetch the tenant's API Key from the database and include it in the `UserAuthDto` and JWT payload.
- This allows background sync processes (like the Electron app) to authenticate with the cloud API using the user's JWT while also having the `ApiKey` readily available for sync validation.

### 2. Cloud Database Download Endpoint (`/api/tenants/my-database`)
- Created a new endpoint in `TenantsController.cs` that allows an authenticated user to download their tenant's specific database.
- The endpoint automatically retrieves the `TenantId` from the current user's JWT.
- It triggers a background command to export the tenant's data to a SQLite database.

### 3. Enhanced SQLite Export Logic
- Updated `ExportTenantToSqliteCommandHandler.cs` to handle the export process.
- **Dynamic Configuration**: Generates an `appsettings.json` file inside the export package containing necessary connection details:
    - `TenantId`
    - `ApiKey`
    - `CloudApiUrl` (dynamically determined from the request)
- **Data Filtering**: Correctly filters tenant-specific data while including global shared entities (like countries, cities).
- **Sync Metadata**: Automatically generates `SyncMetadata` entries in the local database with the export timestamp to prevent redundant syncs immediately after download.
- **Packaging**: Bundles the SQLite `.db` file and the `appsettings.json` into a single ZIP file for easy distribution to the Electron app.

## Verification Results
- **Build**: The entire `POS.API` solution builds successfully with zero errors.
- **Code Audit**: Verified that `ApiKey` is only included if present and that the `appsettings.json` contains the correct `CloudApiUrl`.
- **Security**: The download endpoint is protected by `[Authorize]` and strictly enforces tenant isolation by using the `TenantId` from the authenticated token.

### 4. Bug Fix: Menu Duplication on Tenant Switch
- **Issue**: Tenants were seeing duplicate menu items—one set from the default seed (Global) and one set specific to their Tenant.
- **Root Cause**: `POSDbContext` allowed `MenuItem` queries to return items where `TenantId` was `NULL` (Global) OR matched the `CurrentTenantId`.
- **Resolution**: Updated `POSDbContext.cs` to enforce **Strict Tenant Isolation**. Removed the `|| m.TenantId == null` clause from the `MenuItem` query filter.
- **Verification**: Confirmed that when a SuperAdmin switches tenants:
    - A new JWT is issued with the **Target Tenant ID**.
    - The `POSDbContext` correctly filters for the target tenant's items only.
    - The frontend displays the menu correctly (even without explicit role assignments in the target tenant) because it relies on the `IsVisible` property.

## Next Steps (Sprint 3)
- Implementation of machine-specific encryption in the Electron app to protect the downloaded `ApiKey` and database.
- Integration of the download flow into the Electron login experience.
