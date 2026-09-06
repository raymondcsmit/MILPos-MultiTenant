# Implementation Plan: Electron Desktop End-to-End Testing, Defect Hunting & Remediation

**Document Reference:** `SourceCode/SQLAPI/Document/Electron_Desktop_Testing_Bug_Fixing_Implementation_Plan.md`  
**Target Solution:** MILPOS Multi-Tenant POS & Inventory Management System  
**Subsystem:** Electron Desktop Shell (`SourceCode/Angular/main.js`), Embedded ASP.NET Core 10 Web API (`SourceCode/SQLAPI/POS.API`), Embedded SQLite Engine (`POSDb.db`), and Cloud Synchronization Subsystem (`POS.Domain/Sync`)  
**Associated Playbook:** `Documentation/QA/10_QA_DESKTOP_ELECTRON_OFFLINE_SYNC_TESTS.md`  
**Defect Catalog Target:** `Documentation/Bugs-Issues/`  
**Date:** September 6, 2026  
**Status:** **PENDING USER APPROVAL**

---

## 1. Executive Summary & Goals

The user requested end-to-end testing of the **Electronized version** of MILPOS, analogous to the web browser testing performed previously:
1. Run and evaluate the Electron desktop application (frontend, backend, SQLite database).
2. Execute end-to-end desktop and offline test cases as specified in `Documentation/QA/10_QA_DESKTOP_ELECTRON_OFFLINE_SYNC_TESTS.md`.
3. Uncover, diagnose, and document each bug, security issue, configuration flaw, and exception inside `Documentation/Bugs-Issues/`.
4. Fix the identified bugs across Electron (`main.js`), ASP.NET Core API (`SyncController`, `ScheduledSyncService`), domain sync services (`SyncEngine`), and configurations (`appsettings.Desktop.json`).
5. Write and execute automated unit and integration tests covering the fixes.
6. Run the application, verify offline and sync capabilities, and demonstrate the fixes.

---

## 2. Desktop Architecture & Execution Workflow Analysis

### 2.1 Dual Electron Execution Modes
- **Development Mode (`npm run electron` / `--dev`):**
  - Spawns Electron shell loading `http://localhost:4200` directly with Chromium DevTools.
  - Connects to the local running API on `http://localhost:5000` backed by SQLite `POSDb.db`.
- **Production / Simulation Mode (`npm run electron:prod`):**
  - Spawns `splash.html` window while initializing the background environment.
  - Spawns embedded self-contained API: `../SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POS.API.exe`.
  - Passes connection string argument pointing to local SQLite database in `%AppData%\milpos\POSDb.db`.
  - Closes splash and launches main window loading either packaged distribution or API client app.

### 2.2 Offline & Cloud Synchronization Pipeline
- **First Run & Provisioning:**
  - If no local database exists, the shell opens `login-cloud.html` to authenticate with Cloud API (`/api/authentication`), receives JWT + ApiKey, and downloads the tenant database zip package (`/api/tenants/my-database`).
- **Offline Transaction Execution:**
  - Cashier processes sales and prints receipts with zero internet dependency against local SQLite database.
- **Bi-Directional Cloud Sync:**
  - `ScheduledSyncService` runs every N minutes (default 5 or 15) in Desktop mode, invoking `SyncEngine.SynchronizeAsync(Bidirectional)`.
  - Manual sync can be triggered via `POST /api/sync/now?direction=pull|push|Bidirectional`.
  - Sync telemetry queried via `GET /api/sync/status`.

---

## 3. Targeted Defects & Vulnerabilities Identified for Remediation

| Bug ID | Reference | Severity | Module / Location | Defect Description | Planned Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-08** | `N-01` / `SEC-09` | **CRITICAL** | `POS.API/Controllers/SyncController.cs` | `SyncController` completely lacks `[Authorize]` or `[ClaimCheck]` attributes. Unauthenticated anonymous callers can trigger resource-intensive database synchronization passes (`/api/sync/now`) or probe sync telemetry. | Add `[Authorize]` to `SyncController`, require authenticated tenant user or administrative claims (`SETT_MANAGE_MAINTENANCE` / `SYNC_EXECUTE`). |
| **BUG-09** | `N-06` / `DATA-02` | **HIGH** | `POS.Domain/Sync/SyncEngine.cs` & `POS.API/Controllers/SyncController.cs` | `SyncEngine.PushChangesAsync` never updates `LastPushSync` in `SyncMetadata`, forcing every push pass to rescan all tables from epoch. In addition, `GET /api/sync/status` is an empty `TODO` stub returning hardcoded messages rather than actual sync telemetry from `SyncLog` and `SyncMetadata`. | Update `SyncEngine` to call `_changeTracker.UpdateSyncMetadata("All", DateTime.UtcNow, isPull: false)` upon push completion, and implement `GetSyncStatus` to query latest `SyncLog` and `SyncMetadata`. |
| **BUG-10** | `SEC-02` / `DESK-01` | **HIGH** | `SourceCode/Angular/main.js` | Electron `createMainWindow()` sets `nodeIntegration: true` and `contextIsolation: false`, exposing the full Node.js API to renderer scripts. Also, `showCloudLogin()` opens DevTools unconditionally (`detach` mode) in a secure authentication window. | Enforce `nodeIntegration: false` and `contextIsolation: true` with secure `preload.js` IPC bridge. Restrict DevTools to explicit `--dev` flags. |
| **BUG-11** | `UX-03` / `DESK-02` | **CRITICAL** | `SourceCode/Angular/main.js:315-336` | Unreachable bundled database copy: `if (!fs.existsSync(dbPath))` returns immediately to open Cloud Login, making lines 329-336 (which copy the bundled `sourceDbPath` to `%AppData%\milpos\POSDb.db`) completely dead code. This breaks offline initialization when pre-seeded database templates exist. | Reorder check: if `!fs.existsSync(dbPath)` and `fs.existsSync(sourceDbPath)`, copy bundled database first; only trigger Cloud Login if neither exists. |
| **BUG-12** | `CONF-01` / `DESK-03` | **MEDIUM** | `POS.API/appsettings.Desktop.json` & `Startup.cs` | `appsettings.Desktop.json` declares `"DeploymentMode": "Desktop"` at the root level, whereas `Startup.cs:96` and `ScheduledSyncService.cs:39` check `Configuration["DeploymentSettings:DeploymentMode"]`. Consequently, `ScheduledSyncService` logs `"ScheduledSyncService disabled - not in Desktop mode"` and fails to start. | Update `Startup.cs` and `ScheduledSyncService.cs` to check both `DeploymentSettings:DeploymentMode` and root `DeploymentMode`, and align `appsettings.Desktop.json`. |
| **BUG-13** | `CONF-02` / `DESK-04` | **LOW** | `SourceCode/Angular/main.js:121` | Hardcoded production cloud URL (`http://208.110.72.211`) in `main.js` prevents local testing, staging environments, or custom cloud hosts. | Allow `CLOUD_API_URL` to be overridden by `process.env.CLOUD_API_URL` with a sensible fallback. |
| **BUG-14** | `SYN-02` / `SYNC-01` | **HIGH** | `POS.Domain/Sync/SyncEngine.cs:212-218` | When pushing local updates to cloud and receiving a 409 Conflict, `SyncEngine` logs a warning and does `continue;` without scheduling retry or updating sync state, leaving conflicting local records permanently desynchronized. | Implement conflict logging and mark records for conflict resolution review. |

---

## 4. Implementation Steps & File Modifications

### 4.1 Step 1: Security & Sync Controller Hardening
- Modify `SourceCode/SQLAPI/POS.API/Controllers/SyncController.cs`:
  - Add `[Authorize]` attribute to the controller class.
  - Implement real sync status retrieval in `GetSyncStatus()`: query `_context.SyncLogs.OrderByDescending(l => l.StartedAt).FirstOrDefaultAsync()` and entity sync metadata.
  - Return comprehensive telemetry: `lastSyncTime`, `syncStatus`, `recordsSynced`, `recordsConflicted`, `recordsFailed`, `deviceId`.

### 4.2 Step 2: Sync Engine & Change Tracking Fixes
- Modify `SourceCode/SQLAPI/POS.Domain/Sync/SyncEngine.cs`:
  - In `PushChangesAsync`, after processing all entity changes, call `await _changeTracker.UpdateSyncMetadata("All", DateTime.UtcNow, isPull: false);` and update per-entity push timestamps.
  - In conflict detection, log conflicts to `SyncLog` and preserve conflict telemetry.

### 4.3 Step 3: Electron Shell Fixes (`main.js`)
- Modify `SourceCode/Angular/main.js`:
  - Fix bundled DB initialization: check if `sourceDbPath` exists before triggering Cloud Login.
  - Hardening: ensure context isolation and conditional DevTools.
  - Allow `CLOUD_API_URL` override from environment variable.

### 4.4 Step 4: Configuration & Background Service Alignment
- Modify `SourceCode/SQLAPI/POS.API/Startup.cs` and `ScheduledSyncService.cs`:
  - Support both root `DeploymentMode` and section `DeploymentSettings:DeploymentMode`.
  - Update `SourceCode/SQLAPI/POS.API/appsettings.Desktop.json` to include `"DeploymentSettings": { "DeploymentMode": "Desktop" }`.

---

## 5. Automated Testing Plan

### 5.1 New Backend Integration Tests
Create `SourceCode/SQLAPI/Tests/POS.API.Tests/Sync/SyncControllerTests.cs`:
- `Should_Return401_When_SyncNowTriggeredUnauthenticated_GapTargetFixed`: Verifies that anonymous calls to `POST /api/sync/now` return HTTP 401 Unauthorized.
- `Should_Return401_When_GetSyncStatusUnauthenticated_GapTargetFixed`: Verifies that anonymous calls to `GET /api/sync/status` return HTTP 401 Unauthorized.
- `Should_Return200AndLiveTelemetry_When_AuthorizedUserRequestsSyncStatus_GapTargetFixed`: Verifies that authorized requests return 200 with structured sync metadata.

### 5.2 New Backend Unit Tests
Create or expand `SourceCode/SQLAPI/Tests/POS.MediatR.Tests/Sync/SyncEngineTests.cs`:
- Verifies that `SyncEngine.SynchronizeAsync` advances `LastPushSync` in `SyncMetadata` after pushing changes.
- Verifies conflict handling behavior.

### 5.3 Execution Commands
```powershell
# Kill running API daemon before test compilation
# Run Sync integration tests
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~SyncControllerTests"

# Run MediatR unit tests
dotnet test Tests\POS.MediatR.Tests\POS.MediatR.Tests.csproj --filter "FullyQualifiedName~Sync"
```

---

## 6. Live Electron Verification & Demonstration Plan

1. **Verify Development Mode Launch:**
   - Launch Electron with `--dev` against active Angular dev server (`http://localhost:4200`) and backend (`http://localhost:5000`).
   - Verify Electron window opens, DevTools attached, and POS UI renders.
2. **Offline Transaction Test:**
   - Perform a complete sale in the Electron desktop window.
   - Verify receipt generation and SQLite persistence in `POSDb.db`.
3. **Sync API Verification:**
   - Call `/api/sync/status` with and without authorization tokens.
   - Verify telemetry returns valid sync timestamps.
4. **Documentation:**
   - Write comprehensive bug reports in `Documentation/Bugs-Issues/BUG-08` through `BUG-14`.
   - Update `Documentation/Bugs-Issues/00_BUGS_AND_ISSUES_INDEX.md`.
   - Author post-implementation work document: `SourceCode/SQLAPI/Document/Electron_Desktop_Testing_Bug_Fixing_WorkDocument.md`.
