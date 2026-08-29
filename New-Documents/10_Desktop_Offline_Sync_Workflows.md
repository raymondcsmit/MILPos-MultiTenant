# Workflow Document 10 — Desktop & Offline Sync Workflows

**Scope:** The Electron desktop application: first-run cloud login, tenant database provisioning/export, embedded API process lifecycle, auto-update, and the ongoing bi-directional sync engine with conflict resolution.

**Deployment context:** Desktop mode = Electron shell + embedded self-contained `POS.API.exe` (.NET 10, win-x64) + local SQLite `POSDb.db`. The desktop is an **offline-first client** of the cloud: data is provisioned once, then synced on a schedule.

---

## WF-10.1 — Electron First-Run & Cloud Login Workflow

**Files:** `Angular/main.js`, `Angular/preload.js`, `Angular/encryption.js`, `Angular/splash.html`, `Angular/setup-splash.html`, `Angular/login-cloud.html`.

1. **App boot** — `app.on('ready')` → `createWindow()` (main.js:459-480, 522): frameless **splash** window; immediately calls `startApi()` (478) and `checkForUpdates()` (479; updater logic 402-457).
2. **API path resolution** — `startApi()` (259-399): packaged → `process.resourcesPath/api/POS.API.exe` (276); unpackaged debug → `../SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POS.API.exe` (281-282). **60-second safety timeout** forces the main window open if the API hangs (290-296).
3. **First-run detection** (315-327): if `POSDb.db` absent in userData → close splash → `showCloudLogin()` opens `login-cloud.html` window (542-566; contextIsolation ON, preload bridge).
4. **Cloud login** — IPC `cloud-login` (123-168):
   - `axios.post(CLOUD_API_URL + '/api/authentication', {userName, password})` against hard-coded production cloud `http://208.110.72.211` (121).
   - Response `{bearerToken, tenantId, apiKey, user}` → `saveAuthConfig()` (78-101) **encrypts** token/apiKey/user.id via `./encryption` (**Windows DPAPI machine-bound** — `@primno/dpapi`); decryption failure (machine mismatch) clears the file (62-68). Stored in `auth.json` (userData).
5. **Database provisioning** — `downloadAndSetupDatabase(token)` (188-257):
   - Streams `GET {CLOUD_API_URL}/api/tenants/my-database` with Bearer token (201-206).
   - Progress events (`download-progress`) to the setup splash (195-247).
   - Writes `setup_package.zip` → **AdmZip extract** into userData (238-239) → delete zip (242).
6. **API spawn with credentials** — `startApi()` continuation (339-372):
   - Reads decrypted auth; spawns `POS.API.exe` with arg `--ConnectionStrings:SqliteConnectionString=Data Source={dbPath}` and env: `ASPNETCORE_ENVIRONMENT=Desktop`, **`TENANT_ID`**, **`API_KEY`**, **`CLOUD_API_URL`** (343-350). (Program.cs:32-38 maps these env vars over config — required for `CloudApiClient`.)
   - When stdout contains `Application is running on` / `Now listening on:` → splash closes → `createMainWindow()` (482-520) loads the Angular bundle (packaged: `dist/index.html`; unpackaged: API's ClientApp/browser).
   - `app.on('will-quit')` kills the API child (530-534).

**⚠ GAPS:**
- Main window uses `nodeIntegration: true, contextIsolation: false` (489-491) — weak Electron security posture (login windows are isolated, main window is not).
- `autoUpdater.verifyUpdateCodeSignature = false` (411) — unsigned updates accepted.
- Hard-coded cloud URL (no environment switching UI).
- `showCloudLogin` calls `openDevTools()` unconditionally (559) — devtools open in production login window.

---

## WF-10.2 — Tenant Database Export/Provisioning Workflow (Server Side)

**Endpoints:** `GET api/tenants/my-database` (TenantsController.cs:314-342, self-service; extracts TenantId claim) and `POST api/tenants/{id}/export-sqlite` (292-309, SuperAdmin).

**Handler:** `POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs` (Handle 48-238):

1. Create temp folder + empty `POSDb.db` (51-57).
2. Copy template `wwwroot/App_Data/Templates/POSDb.db` if present; else `EnsureCreatedAsync` + inject migration history via `IDbUtilityService.EnsureMigrationHistoryAsync` (64-87) — so the desktop's `Database.Migrate()` at boot does not re-run applied migrations.
3. Open SQLite connection; **disable FK checks** (90-92).
4. Pre-fetch user/role IDs (95-105) and tenant ApiKey (108-112).
5. Reflect over every `DbSet<>` on POSDbContext → generic `CopyEntity<T>` per entity (115-141); exclusions in `IsExcludedEntity` (240-258): SyncMetadata, SyncLog, LoginAudit, NLog, EmailLog, FBRSubmissionLog, Action, Page, PageHelper, IdentityUserPasskey.
6. `CopyEntity<T>` (260-453) — filter expression trees per strategy:
   - Tenant itself (279-290); `TenantId == tenantId || Guid.Empty || null` (291-336); parent-chain tenant via `HasParentWithTenantId` (337-381); shared entities unfiltered (382-386); UserId/RoleId membership (387-412); unknown → skipped (413-420).
   - Non-orphan navigation properties detached; `AddRange` + save (426-452).
7. Re-enable FKs (144-145); generate fresh **SyncMetadata** rows (`LastPullSync = LastPushSync = exportTime`) for every entity (152-153, 559-579) — desktop starts "fully synced" (no immediate re-pull).
8. Copy company logo into the package's wwwroot (156-178).
9. Write generated `appsettings.json`: TenantId, ApiKey, JwtSettings, `SyncSettings { CloudApiUrl, SyncIntervalMinutes=15, AutoSync=true }`, `DatabaseProvider="Sqlite"` (185-208).
10. Zip everything (211); clear SQLite pools; cleanup (182-237). Controller streams the zip and deletes the temp file.

---

## WF-10.3 — Ongoing Bi-Directional Sync Workflow (Desktop ↔ Cloud)

**Files:** `POS.Domain/Sync/{SyncEngine, CloudApiClient, ChangeTrackingService, ConflictResolutionService, DeviceIdentifier}.cs`, `POS.API/Services/ScheduledSyncService.cs`, `POS.API/Controllers/SyncController.cs`.

### Trigger
1. **Scheduled** — `ScheduledSyncService : BackgroundService` (registered only when `DeploymentSettings:DeploymentMode == "Desktop"`, Startup.cs:96-99): `ExecuteAsync` (36-82) waits 30s, then loops `SyncEngine.SynchronizeAsync(Bidirectional)` every `SyncSettings:SyncIntervalMinutes` (default 5; export package writes 15).
2. **Manual** — `POST api/sync/now?direction=pull|push|Bidirectional` (SyncController.cs:30-65). `GET api/sync/status` is a **TODO stub** (70-79).

### Orchestration — `SyncEngine.SynchronizeAsync` (43-85)
3. Record `DeviceId` = `Environment.MachineName` (DeviceIdentifier.cs:21-30).
4. **Pull → Push**; write **SyncLog** row (`LogSyncResult`, 291-310).

### Pull — (90-169)
5. Entity set **hard-coded**: `{ Product, Customer, SalesOrder, Supplier, Category, CompanyProfile }` (93).
6. Per entity: read `SyncMetadata.LastPullSync` (99-100) → `CloudApiClient.GetEntitiesAsync(entityType, modifiedSince)` → `GET /api/{type}s?modifiedSince=...` with `X-Tenant-ID` header (CloudApiClient.cs:42-54, 35-36).
7. For each cloud record: load local via reflection over DbContext DbSets (266-277); if both sides changed since lastSync → `ConflictResolutionService.DetectConflict` (133) → default strategy **ServerWins** (cloud wins, 138) → apply locally; else straight insert/update via EF `EntityState.Modified/Deleted` (`ApplyToLocalDb`, 241-261).
8. Update per-entity metadata (161).

### Push — (174-236)
9. `ChangeTrackingService.GetLocalChanges(lastPushSync)` (ChangeTrackingService.cs:29-87): scans **all** non-abstract `BaseEntity` types; classifies each change: Delete (IsDeleted), Insert (CreatedDate == ModifiedDate), Update; serializes to JSON with `SyncVersion`.
10. Per change: POST create / PUT update / DELETE via `CloudApiClient` (59-100); **409 response → `UpdateResult.IsConflict`** (76-86) → push skipped with warning (212-218). Success → `LastSyncedAt = now` (`MarkAsSynced`, 92-112).

### Conflict resolution — `ConflictResolutionService.cs`
11. `DetectConflict` compares `Version` (18-34); strategies **ServerWins / ClientWins / LastWriteWins / MergeFields** (39-63); `MergeChanges` merges field-by-field favoring newer timestamp, bumps `Version = max+1` (68-103). Conflict types: UpdateUpdate/UpdateDelete/DeleteUpdate/InsertInsert (137-143).

**⚠ GAPS:**
- Pull entity set hard-coded to 6 types — purchases, payments, expenses, transactions, inventory, reminders are **never pulled** (asymmetric sync).
- Push conflicts (409) are **skipped, not resolved** — no MergeFields/ServerWins applied on push; conflicting local changes silently never reach the cloud until they change again.
- `SyncLog` recorded but `GET api/sync/status` unimplemented — no user-visible sync health.
- Two sync surfaces (reflective engine vs one-shot export) share metadata semantics only loosely.

---

## WF-10.4 — Auto-Update Workflow (Electron)

**Files:** `main.js` (402-457), `package.json` (publish config), `Documentation/UPDATE_STRATEGY.md`.

1. `checkForUpdates()` on boot (skipped unpackaged, 403-406); **`verifyUpdateCodeSignature = false`** (411) for unsigned builds.
2. `autoUpdater.checkForUpdatesAndNotify()` → GitHub Releases provider (`raymondcsmit/MILPOS-Release` per package.json publish block).
3. Events logged to `api-debug.log` (419-440); on `update-downloaded` (442-456): dialog "Restart Now / Later" → kill API child → `quitAndInstall(false, true)`.
4. Release artifacts: `MIL POS Setup x.y.z.exe` + `latest.yml` + `.blockmap` (differential updates).
5. **Schema continuity:** the embedded API runs `context.Database.Migrate()` on startup (Program.cs) — the local SQLite schema auto-migrates after updates; clients never run manual DB scripts.

**⚠ GAPS:** unsigned-update acceptance; no update channel (beta/stable); no rollback mechanism beyond reinstall.

---

## WF-10.5 — Desktop Runtime Behavior Differences (Recap)

| Aspect | Behavior |
|---|---|
| Tenant | `SingleTenantProvider` — first tenant row, fallback fixed GUID (no middleware) |
| DB | SQLite (`POSDb.db` in userData), migrations auto-applied at boot |
| Hangfire | SQLite storage `%APPDATA%/milpos/HangFireDB.db`; all jobs active (reminders work offline) |
| Storefront | Not registered (`AddControllers()` — no MVC views) |
| FBR QR | `%APPDATA%/milpos/qrcodes` |
| Sync | ScheduledSyncService loop (5–15 min) + manual `POST api/sync/now` |
| Cloud calls | `CloudApiClient` with `X-Tenant-ID` header + ApiKey env |
| Auth storage | `auth.json` with DPAPI-encrypted token/apiKey/userId |

---

## Workflow Interaction Map

```
 FIRST RUN                          STEADY STATE
 ──────────                         ────────────
 splash ──► no POSDb.db?            Electron ──► spawn POS.API.exe (Desktop env)
   │                                   │            │ Database.Migrate() on boot
   ▼                                   │            ▼
 cloud login (cloud API)            Angular SPA (localhost)
   │ token+apiKey encrypted           │
   ▼                                  │
 GET /tenants/my-database            │
   │  (server: copy tenant rows      │
   │   → SQLite + SyncMetadata       │
   │   + appsettings → zip)          │
   ▼                                  ▼
 extract → spawn API ──► main UI     ScheduledSyncService (5-15 min)
                                      ├─ PULL: 6 entity types ← cloud (ServerWins)
                                      └─ PUSH: all BaseEntity changes → cloud (409 → skip)
                                      SyncLog rows; /sync/status TODO
 Auto-update: GitHub Releases ──► restart ──► SQLite Migrate()
```

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| D-01 | Sync coverage | Pull limited to 6 entity types; purchases/expenses/payments/inventory never pulled |
| D-02 | Sync conflicts | Push-side 409 skipped (no resolution strategy applied) |
| D-03 | Sync UX | No sync status UI; no error surfacing to users |
| D-04 | Security | Main window nodeIntegration=true/contextIsolation=false; unsigned updates; hard-coded cloud URL; devtools in login |
| D-05 | Provisioning | Full-DB zip export (size grows unbounded); no incremental re-provision |
| D-06 | Ops | Sync engine reflection-based (fragile to entity renames); no per-entity sync enable flag |
| D-07 | Multi-instance | Single-instance assumption; no device management UI (list/wipe devices) |
