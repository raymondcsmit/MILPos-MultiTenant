# Work Document: Desktop App Sync Configuration Toggle (True/False) via AppSettings

**Document Version:** 1.0  
**Target Solution:** MILPOS Multi-Tenant (.NET 10 Web API & Electron Desktop)  
**Location:** `SourceCode/SQLAPI/Document/Desktop_App_Sync_Toggle_WorkDocument.md`  
**Date:** September 2026  
**Status:** **COMPLETED & VERIFIED (100% PASS RATE)**  

---

## 1. Executive Summary

In response to the user directive:
> *"let desktop app sync be true or false from appsettings file"*

We designed, implemented, and verified a configuration-driven synchronization toggle for MILPOS across the ASP.NET Core backend and the Electron Desktop edition.

Prior to this implementation:
- Desktop synchronization was implicitly active whenever `DeploymentMode == "Desktop"`.
- `ScheduledSyncService` attempted to run periodically regardless of whether offline operation without sync was desired.
- Manual sync triggers (`POST /api/sync/now`) did not check any global configuration toggle.
- `GET /api/sync/status` did not inform clients of whether synchronization was enabled or disabled.

With this implementation:
- Desktop synchronization can be cleanly toggled between `true` and `false` directly inside `appsettings.json`, `appsettings.Desktop.json`, and `appsettings.Development.json`.
- When set to `false`, background scheduled sync services (`ScheduledSyncService`) are not registered or cleanly exit without spinning timers or worker threads.
- When set to `false`, manual sync invocations (`POST /api/sync/now`) are rejected with `HTTP 400 Bad Request` and clear diagnostic messaging (`Status: "Disabled"`).
- `GET /api/sync/status` reports `"syncEnabled": true/false` in its telemetry response.
- Automated integration tests cover both `true` and `false` execution paths with 100% green results.

---

## 2. Configuration Schema & Hierarchy

### 2.1 File Updates
The following configuration files now support `SyncSettings`:

1. **`SourceCode/SQLAPI/POS.API/appsettings.Desktop.json`**:
```json
{
  "DeploymentMode": "Desktop",
  "DeploymentSettings": {
    "DeploymentMode": "Desktop",
    "DatabaseProvider": "Sqlite",
    "SyncSettings": {
      "Enabled": true,
      "CloudApiUrl": "http://localhost:5000",
      "SyncIntervalMinutes": 5
    }
  },
  "SyncSettings": {
    "Enabled": true,
    "CloudApiUrl": "http://localhost:5000",
    "SyncIntervalMinutes": 5
  },
  "DatabaseProvider": "Sqlite"
  ...
}
```

2. **`SourceCode/SQLAPI/POS.API/appsettings.json`**:
```json
  "SyncSettings": {
    "Enabled": true,
    "CloudApiUrl": "http://localhost:5000",
    "SyncIntervalMinutes": 5
  },
```

3. **`SourceCode/SQLAPI/POS.API/appsettings.Development.json`**:
```json
  "SyncSettings": {
    "Enabled": true,
    "CloudApiUrl": "http://localhost:5000",
    "SyncIntervalMinutes": 5
  },
```

### 2.2 Precedence & Fallback Resolution
The configuration resolution strategy supports:
```csharp
var isSyncEnabled = Configuration.GetValue<bool?>("SyncSettings:Enabled") ??
                    Configuration.GetValue<bool?>("SyncSettings:AutoSync") ??
                    Configuration.GetValue<bool?>("DeploymentSettings:SyncSettings:Enabled") ??
                    deploymentSettings?.SyncSettings?.Enabled ??
                    true;
```
This guarantees backwards compatibility with legacy seed and export tools (`POSDb.SeedTool`, `ExportTenantToSqliteCommandHandler`) which utilized `AutoSync`.

---

## 3. Code Modifications

### 3.1 Entity Model
- **File:** [`SourceCode/SQLAPI/POS.Data/Entities/DeploymentSettings.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Entities/DeploymentSettings.cs)
- Added `Enabled`, `AutoSync`, and `SyncIntervalMinutes` properties to `SyncSettings`:
```csharp
public class SyncSettings
{
    public bool Enabled { get; set; } = true;
    public bool AutoSync { get; set; } = true;
    public string CloudApiUrl { get; set; }
    public int SyncIntervalMinutes { get; set; } = 5;
}
```

### 3.2 Startup Dependency Injection
- **File:** [`SourceCode/SQLAPI/POS.API/Startup.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
- Gated `services.AddHostedService<ScheduledSyncService>()` on both `isDesktopMode` and `isSyncEnabled`:
```csharp
var isDesktopMode = deploymentSettings?.DeploymentMode == "Desktop" ||
                    Configuration.GetValue<string>("DeploymentMode") == "Desktop" ||
                    Configuration.GetValue<string>("DeploymentSettings:DeploymentMode") == "Desktop";
var isSyncEnabled = Configuration.GetValue<bool?>("SyncSettings:Enabled") ??
                    Configuration.GetValue<bool?>("SyncSettings:AutoSync") ??
                    Configuration.GetValue<bool?>("DeploymentSettings:SyncSettings:Enabled") ??
                    deploymentSettings?.SyncSettings?.Enabled ??
                    true;
if (isDesktopMode && isSyncEnabled)
{
    services.AddHostedService<POS.API.Services.ScheduledSyncService>();
}
```

### 3.3 Background Scheduled Sync Service
- **File:** [`SourceCode/SQLAPI/POS.API/Services/ScheduledSyncService.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Services/ScheduledSyncService.cs)
- In `ExecuteAsync`, added configuration guard:
```csharp
var isSyncEnabled = _configuration.GetValue<bool?>("SyncSettings:Enabled") ??
                    _configuration.GetValue<bool?>("SyncSettings:AutoSync") ??
                    _configuration.GetValue<bool?>("DeploymentSettings:SyncSettings:Enabled") ??
                    true;
if (!isSyncEnabled)
{
    _logger.LogInformation("ScheduledSyncService disabled - Sync is disabled in configuration (SyncSettings:Enabled = false)");
    return;
}
```

### 3.4 Sync Controller
- **File:** [`SourceCode/SQLAPI/POS.API/Controllers/SyncController.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/SyncController.cs)
- Injected `IConfiguration configuration`.
- In `SyncNow` (`POST /api/sync/now`):
```csharp
if (!IsSyncEnabled())
{
    _logger.LogWarning("Manual sync rejected - Sync is disabled in configuration");
    return BadRequest(new
    {
        Success = false,
        Status = "Disabled",
        ErrorMessage = "Synchronization is disabled in appsettings configuration (SyncSettings:Enabled is false)."
    });
}
```
- In `GetSyncStatus` (`GET /api/sync/status`):
  Included `"SyncEnabled": isSyncEnabled` in the response JSON payload.

### 3.5 Rebuilt and Published Self-Contained API
- Executed `dotnet publish SourceCode/SQLAPI/POS.API/POS.API.csproj -c Release -r win-x64 --self-contained true` to produce the updated embedded API binaries for the Electron desktop shell.

---

## 4. Automated Testing Verification

### Test Suite: `Tests/POS.API.Tests/Sync/SyncControllerTests.cs`
All 6 automated integration tests executed against local SQLite and passed with 0 failures:

| Test Name | Verification Target | Result |
| :--- | :--- | :--- |
| `Should_Return401_When_SyncNowTriggeredUnauthenticated_GapTargetFixed` | Auth Guard: rejects unauthenticated `POST /api/sync/now` | **PASSED** |
| `Should_Return401_When_GetSyncStatusUnauthenticated_GapTargetFixed` | Auth Guard: rejects unauthenticated `GET /api/sync/status` | **PASSED** |
| `Should_Return200AndLiveTelemetry_When_AuthorizedUserRequestsSyncStatus_GapTargetFixed` | Telemetry: returns `syncEnabled: true`, live metrics & logs | **PASSED** |
| `Should_ReturnSyncEnabledFalse_When_DisabledInConfiguration` | Toggle: returns `syncEnabled: false` when config is overridden | **PASSED** |
| `Should_RejectSync_When_SyncEnabledIsFalseInConfiguration` | Enforcement: rejects `POST /api/sync/now` with 400 Bad Request when sync is disabled | **PASSED** |
| `Should_AdvanceLastPushSync_When_SyncEnginePushesChanges_GapTargetFixed` | Timestamp: advances `LastPushSync` on push completion | **PASSED** |

### Execution Command & Output
```bash
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~SyncControllerTests"
# Passed!  - Failed: 0, Passed: 6, Skipped: 0, Total: 6, Duration: 1 m 43 s - POS.API.Tests.dll (net10.0)
```

---

## 5. Database Integrity

- SQLite Database: `SourceCode/SQLAPI/POS.API/POSDb.db` (3,502,080 bytes) remains completely intact with all seed data and live test transactions (`SO#00001`, `SO#00002`).
