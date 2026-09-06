# Implementation Plan: Desktop App Sync Configuration Toggle (True/False) via AppSettings

**Document Version:** 1.0  
**Target Solution:** MILPOS Multi-Tenant (.NET 10 Web API & Electron Desktop)  
**Location:** `SourceCode/SQLAPI/Document/Desktop_App_Sync_Toggle_Implementation_Plan.md`  
**Date:** September 2026  

---

## 1. Goal Description

The user requested: **"let desktop app sync be true or false from appsettings file"**.

Currently, MILPOS runs in Desktop mode when configured with `DeploymentMode: "Desktop"` and `DatabaseProvider: "Sqlite"`. Synchronization between local desktop SQLite databases and the central cloud server is handled by:
1. `POS.API.Services.ScheduledSyncService` (background hosted service running periodic sync cycles).
2. `POS.API.Controllers.SyncController` (`POST /api/sync/now` and `GET /api/sync/status`).
3. `POS.Domain.Sync.SyncEngine` (orchestrates pull/push and conflict resolution).

However, `SyncSettings` in `appsettings.json` and `appsettings.Desktop.json` previously lacked a first-class `Enabled` boolean toggle. `ScheduledSyncService` would attempt to start whenever `DeploymentMode == "Desktop"`, even if the user or deployment environment wished to operate entirely offline or disable synchronization. Furthermore, manual sync endpoints did not respect configuration-level sync disabling.

This plan outlines the design and implementation to introduce a robust `SyncSettings:Enabled` (and `DeploymentSettings:SyncSettings:Enabled`) boolean flag across configuration files, startup dependency injection, background services, and API controllers.

---

## 2. Technical Architecture & Design

### 2.1 Configuration Schema
In `appsettings.json`, `appsettings.Desktop.json`, and `appsettings.Development.json`, `SyncSettings` will support:
```json
"SyncSettings": {
  "Enabled": true,
  "CloudApiUrl": "http://localhost:5000",
  "SyncIntervalMinutes": 5
}
```
And inside `DeploymentSettings`:
```json
"DeploymentSettings": {
  "DeploymentMode": "Desktop",
  "DatabaseProvider": "Sqlite",
  "SyncSettings": {
    "Enabled": true,
    "CloudApiUrl": "http://localhost:5000",
    "SyncIntervalMinutes": 5
  }
}
```

### 2.2 Hierarchical Fallback Resolution
To ensure full backwards compatibility with tools like `POSDb.SeedTool` and `ExportTenantToSqliteCommandHandler` (which historically used `AutoSync`), the resolution order for the sync toggle will be:
1. `Configuration.GetValue<bool?>("SyncSettings:Enabled")`
2. `Configuration.GetValue<bool?>("SyncSettings:AutoSync")`
3. `Configuration.GetValue<bool?>("DeploymentSettings:SyncSettings:Enabled")`
4. Default: `true` (if unspecified in Desktop mode, or configured to default).

### 2.3 Subsystem Behaviors When `Enabled = false`
1. **Background Service Registration (`Startup.cs`):**
   - If `isDesktopMode && isSyncEnabled`, `ScheduledSyncService` is registered as a hosted service.
   - If `isSyncEnabled == false`, `ScheduledSyncService` is not registered, saving CPU and thread pool resources.
2. **Background Service Execution Guard (`ScheduledSyncService.cs`):**
   - In `ExecuteAsync`, checks `isSyncEnabled`. If `false`, logs:
     `"ScheduledSyncService disabled - Sync is disabled in configuration (SyncSettings:Enabled = false)"`
     and exits cleanly.
3. **Manual Sync API (`POST /api/sync/now` in `SyncController.cs`):**
   - Injects `IConfiguration`.
   - When `isSyncEnabled == false`, returns `HTTP 400 Bad Request`:
     ```json
     {
       "Success": false,
       "Status": "Disabled",
       "ErrorMessage": "Synchronization is disabled in appsettings configuration (SyncSettings:Enabled is false)."
     }
     ```
4. **Telemetry & Status API (`GET /api/sync/status` in `SyncController.cs`):**
   - Adds `"SyncEnabled": isSyncEnabled` to the returned status payload, allowing frontend and diagnostic clients to immediately observe the current configuration state.
5. **Entity Model (`DeploymentSettings.cs`):**
   - Updates `SyncSettings` class to include:
     ```csharp
     public class SyncSettings
     {
         public bool Enabled { get; set; } = true;
         public bool AutoSync { get; set; } = true;
         public string CloudApiUrl { get; set; }
         public int SyncIntervalMinutes { get; set; } = 5;
     }
     ```

---

## 3. Proposed Changes

### Configuration Files
- **[MODIFY] `SourceCode/SQLAPI/POS.API/appsettings.Desktop.json`:**
  - Add `"SyncSettings": { "Enabled": true, "CloudApiUrl": "http://localhost:5000", "SyncIntervalMinutes": 5 }`.
  - Add `"SyncSettings"` under `"DeploymentSettings"`.
- **[MODIFY] `SourceCode/SQLAPI/POS.API/appsettings.json`:**
  - Update `"SyncSettings"` to include `"Enabled": true`, `"SyncIntervalMinutes": 5`.
- **[MODIFY] `SourceCode/SQLAPI/POS.API/appsettings.Development.json`:**
  - Update `"SyncSettings"` to include `"Enabled": true`.

### Backend Source Code
- **[MODIFY] `SourceCode/SQLAPI/POS.Data/Entities/DeploymentSettings.cs`:**
  - Add `public bool Enabled { get; set; } = true;`, `public bool AutoSync { get; set; } = true;`, `public int SyncIntervalMinutes { get; set; } = 5;` to `SyncSettings`.
- **[MODIFY] `SourceCode/SQLAPI/POS.API/Startup.cs`:**
  - Check `isSyncEnabled` before registering `POS.API.Services.ScheduledSyncService`.
- **[MODIFY] `SourceCode/SQLAPI/POS.API/Services/ScheduledSyncService.cs`:**
  - In `ExecuteAsync`, check `isSyncEnabled` and log explicit diagnostic message if disabled.
- **[MODIFY] `SourceCode/SQLAPI/POS.API/Controllers/SyncController.cs`:**
  - Inject `IConfiguration`.
  - In `SyncNow`, reject execution with clear message if `isSyncEnabled == false`.
  - In `GetSyncStatus`, include `"SyncEnabled": isSyncEnabled`.

### Automated Tests
- **[MODIFY] `SourceCode/SQLAPI/Tests/POS.API.Tests/Sync/SyncControllerTests.cs`:**
  - Add test: `Should_RejectSync_When_SyncEnabledIsFalseInConfiguration_GapTarget`
  - Add test: `Should_ReturnSyncEnabledTrue_When_Configured`
  - Add test: `Should_ReturnSyncEnabledFalse_When_DisabledInConfiguration`

---

## 4. Verification Plan

### Automated Tests
Run via dotnet CLI:
```bash
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~SyncControllerTests"
```
Ensure all tests (existing 4 + new tests) pass with 100% green status.

### Manual Verification
1. Test with `SyncSettings:Enabled = true`:
   - Call `GET /api/sync/status` -> verify `syncEnabled: true`.
   - Call `POST /api/sync/now` -> verify sync execution succeeds or performs normally.
2. Test with `SyncSettings:Enabled = false`:
   - Call `GET /api/sync/status` -> verify `syncEnabled: false`.
   - Call `POST /api/sync/now` -> verify `HTTP 400 Bad Request` with `Status: "Disabled"`.
3. Check `POSDb.db`: Ensure SQLite test data remains intact.
