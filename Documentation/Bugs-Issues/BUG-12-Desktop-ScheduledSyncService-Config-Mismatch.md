# Defect Report: BUG-12 (CONF-01 / DESK-03)

**Bug ID:** BUG-12  
**Legacy Reference:** CONF-01 / DESK-03  
**Component:** Backend Configuration & Background Services (`appsettings.Desktop.json`, `Startup.cs`, `ScheduledSyncService.cs`)  
**Module:** Desktop Background Scheduled Synchronization  
**Severity:** **MEDIUM**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Impact

When running in Desktop mode (`ASPNETCORE_ENVIRONMENT=Desktop`), the background service `ScheduledSyncService` fails to activate. In the API output logs, the service logs:
```
INFO: ScheduledSyncService disabled - not in Desktop mode
```
and terminates immediately.
Because of this failure, scheduled cloud synchronization never runs in the background on desktop installations. Any transactions or updates performed on the desktop machine remain strictly local unless the cashier or user manually triggers synchronization.

---

## 2. Root Cause Analysis

Look at `SourceCode/SQLAPI/POS.API/appsettings.Desktop.json`:
```json
{
  "DeploymentMode": "Desktop",
  "DatabaseProvider": "Sqlite",
  ...
}
```
`"DeploymentMode": "Desktop"` is defined as a top-level property.

Now look at `Startup.cs` line 96:
```csharp
var deploymentSettings = Configuration.GetSection("DeploymentSettings").Get<DeploymentSettings>();
if (deploymentSettings?.DeploymentMode == "Desktop")
{
    services.AddHostedService<POS.API.Services.ScheduledSyncService>();
}
```
And look at `ScheduledSyncService.cs` lines 39-44:
```csharp
var deploymentMode = _configuration["DeploymentSettings:DeploymentMode"];
if (deploymentMode != "Desktop")
{
    _logger.LogInformation("ScheduledSyncService disabled - not in Desktop mode");
    return;
}
```

Both `Startup.cs` and `ScheduledSyncService.cs` attempt to read `DeploymentSettings:DeploymentMode` from a section named `"DeploymentSettings"`. But in `appsettings.Desktop.json` (and `appsettings.json`), no `"DeploymentSettings"` section exists—only a top-level `"DeploymentMode"` string!
Therefore, `Configuration["DeploymentSettings:DeploymentMode"]` evaluates to `null`.

---

## 3. Remediation Plan

1. In `appsettings.Desktop.json`, define the section:
   ```json
   "DeploymentSettings": {
     "DeploymentMode": "Desktop",
     "DatabaseProvider": "Sqlite"
   }
   ```
2. In `Startup.cs` and `ScheduledSyncService.cs`, make the check resilient by checking both `Configuration["DeploymentSettings:DeploymentMode"]` and the fallback root `Configuration["DeploymentMode"]`.
