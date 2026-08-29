# TC-D10 — Desktop / Offline Sync Test Cases

**Source:** `New-Documents/10_Desktop_Offline_Sync_Workflows.md` (WF-10.1 … WF-10.5) + `New-Documents/11_Workflow_Gaps_Enhancement_Signals.md` §7 (SYN-01…SYN-04) and §4 (SEC-02).
**Scope:** Electron desktop shell (first-run, provisioning download, process lifecycle, auto-update) and the cloud-side export/provisioning endpoints plus the bi-directional sync engine with conflict resolution.
**Workflows covered:** WF-10.1, WF-10.2, WF-10.3, WF-10.4, WF-10.5.
**Gap signals referenced:** SYN-01, SYN-02, SYN-03, SYN-04, SEC-02.

**Testability tiers used in this catalog (binding for D10):**

| Tier | Applies to | How it is tested |
|---|---|---|
| **(a) IT / PM** | Cloud-side export & provisioning endpoints (`/api/tenants/my-database`, `/api/tenants/{id}/export-sqlite`), `POST /api/sync/now`, `GET /api/sync/status`, `ScheduledSyncService` registration | Normal xUnit integration tests (`TestWebApplicationFactory` + SQLite) and Postman requests against a **desktop-mode** server profile |
| **(b) UT** | Sync engine logic (pull/push selection, conflict rules, change tracking, `CloudApiClient` transport) | xUnit unit tests with **in-memory repos / in-memory EF context + fake `CloudApiClient`** (fake `HttpMessageHandler` where transport is asserted). No HTTP, no real cloud |
| **(c) E2E semi-manual** | Electron shell behaviors (spawn/kill, windows, updater, first-run journey) | Scripted **Playwright + Electron (`_electron.launch`)** where the harness can drive it; otherwise an explicit **"Manual QA script"** with exact steps. Nothing here is pretended automatable |
| **(d) Static config assertions** | Electron `main.js` settings (`nodeIntegration`, `contextIsolation`, signature flag, hard-coded URL) | Legitimate static test: parse/assert the main-process source or config object in a Node test runner (UT layer). Detects security regressions without launching the app |

**Test data prerequisites (shared seed):**
- Cloud-mode factory: Tenant A (active, licensed, ApiKey `KA-TENANT-A`), Tenant B (isolation checks); users `admin` (SuperAdmin), `manager` (no admin claims), `cashier` (POS claims only) on Tenant A; Product P-SIMPLE, Customer C-1, Supplier S-1, Category CAT-1, CompanyProfile CP-A on Tenant A
- Desktop-mode factory: `DeploymentSettings:DeploymentMode="Desktop"`, `MultiTenancy:Enabled=false`, SQLite provider, `SyncSettings:CloudApiUrl` pointed at a stub/loopback URL, `SyncSettings:SyncIntervalMinutes` overridable
- Sync UT fixtures: in-memory `POSDbContext` (SQLite in-memory) with `SyncMetadata`/`SyncLog`/`EntityChange` tables; fake `ICloudApiClient`-seam `FakeCloudApiClient` recording `GetEntitiesAsync`/`CreateEntityAsync`/`UpdateEntityAsync`/`DeleteEntityAsync` calls and returning scripted `UpdateResult { IsConflict }` values; injected fixed clock where timestamps are asserted
- Electron fixtures: packaged app path (or dev `main.js`), `ELECTRON_ENABLE_LOGGING=1`, loopback mock cloud server for login/download, `auth.json` fixtures encrypted per `encryption.js`
- Export artifacts: unzipped into temp dirs per test; row counts asserted via SQLite queries against the extracted `POSDb.db`

---

## WF-10.1 — Electron First-Run & Cloud Login Workflow

### TC-D10.001 — Full first-run journey: splash → cloud login → DB download → main window
- **Layers:** E2E (Playwright + Electron `_electron.launch` when harness available; **Manual QA script** fallback — steps below)
- **Priority:** P1  **Category:** Happy
- **Source:** WF-10.1 (steps 1–6)
- **Arrange:** machine with **no** `%APPDATA%/<appName>/POSDb.db` and no `auth.json`; mock cloud at loopback returning `{bearerToken, tenantId, apiKey, user}` for `POST /api/authentication` and a ≥1 MB zip for `GET /api/tenants/my-database`
- **Act (Manual QA script):** (1) launch packaged app; (2) verify frameless splash appears immediately; (3) when cloud-login window opens, enter valid cloud credentials; (4) watch setup splash progress events; (5) wait for main window
- **Assert:** splash closes and `login-cloud.html` window opens (450×600, frameless); setup splash shows `download-progress` events reaching 100%; `POSDb.db` exists in userData after download and `setup_package.zip` is deleted; `auth.json` exists; main window (1200×800) loads the Angular bundle and shows the login screen of the local API within 60 s; `api-debug.log` contains `CLOUD LOGIN: Setup complete. Starting regular API.`
- **Playwright variant:** drive steps via `electronApp.evaluate` + window selectors; assert window titles/URLs and file existence with `fs` from the test runner

### TC-D10.002 — API process spawned at boot; main window opens only on stdout health signal
- **Layers:** E2E (Playwright + Electron feasible: read `main.js` stdout handling via app logs); **Manual QA script** fallback
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.1 (steps 2, 6)
- **Arrange:** existing `POSDb.db` + valid `auth.json` (steady state); API path resolvable per packaging mode (`process.resourcesPath/api/POS.API.exe` packaged; `../SQLAPI/POS.API/bin/Release/net10.0/win-x64/publish/POS.API.exe` unpackaged)
- **Act (Manual QA script):** (1) launch app; (2) tail `api-debug.log`; (3) observe when `POS.API.exe` prints `Now listening on:`; (4) measure time from launch to main window visible
- **Assert:** a `POS.API.exe` child process exists (PID logged: `Process spawned with PID:`); main window does **not** open before the log line `API [STDOUT]` contains `Application is running on` **or** `Now listening on:`; after that line, `API Server reported ready.` is logged and the main window opens; the spawned process was started with argument `--ConnectionStrings:SqliteConnectionString=Data Source={userData}\POSDb.db`

### TC-D10.003 — 60-second safety timeout forces main window open if the API never reports ready
- **Layers:** E2E (**Manual QA script** — simulating a hung API is not reliably scriptable)
- **Priority:** P2  **Category:** Edge
- **Source:** WF-10.1 (step 2)
- **Arrange:** steady-state machine; replace/sabotage the API exe (e.g. rename a blocking stub that never prints the listening lines, or firewall-block the port) so it never emits `Now listening on:`
- **Act (Manual QA script):** launch the app and wait 65 seconds without touching it
- **Assert:** at ~60 s after spawn the main window opens anyway (`startupTimeout` fired); no crash dialog; `api-debug.log` records the timeout path; app remains killable and `will-quit` still kills the hung child (task manager shows no orphan `POS.API.exe` after quit)

### TC-D10.004 — First-run detection branches on POSDb.db presence and never re-downloads when DB exists
- **Layers:** E2E (Playwright + Electron feasible)
- **Priority:** P1  **Category:** Happy + Negative (re-provision guard)
- **Source:** WF-10.1 (step 3)
- **Arrange:** run A: userData without `POSDb.db`; run B (same machine after run A): `POSDb.db` present, `auth.json` present
- **Act:** launch the app in run A, complete cloud login, quit; relaunch in run B and wait 15 s
- **Assert (run A):** `login-cloud.html` window opens (no DB → cloud login path). **Assert (run B):** no cloud-login window; app goes straight to splash → main window; no `GET /api/tenants/my-database` request hits the mock cloud (loopback request log is empty); `POSDb.db` file LastWriteTime unchanged from run A

### TC-D10.005 — Cloud login persists DPAPI-encrypted auth.json (token, apiKey, userId)
- **Layers:** E2E (login flow, **Manual QA script**) + UT (file contents inspection is a scriptable post-condition)
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.1 (step 4)
- **Arrange:** no `auth.json`; mock cloud returns `bearerToken "tok-123"`, `tenantId "T-111"`, `apiKey "key-456"`, `user { id: "u-789" }`
- **Act (Manual QA script):** complete cloud login with valid credentials; quit app; open `%APPDATA%/<appName>/auth.json` in the post-test check
- **Assert:** `auth.json` exists; plaintext `tok-123`, `key-456`, `u-789` do **not** appear anywhere in the file bytes; fields `token`, `apiKey`, `user` (or `userId`) are present as DPAPI ciphertext blobs (`@primno/dpapi` machine-bound); `tenantId` and `cloudApiUrl` are readable; `cloudApiUrl` equals the configured cloud base URL. UT companion: `encryption.js` round-trip encrypt→decrypt on the same machine returns the original values

### TC-D10.006 — auth.json from a different machine fails decryption and is cleared
- **Layers:** UT (Node test runner, `@primno/dpapi` mocked to throw `NPException` on decrypt)
- **Priority:** P1  **Category:** Negative
- **Source:** WF-10.1 (step 4, decrypt-failure clears file)
- **Arrange:** `auth.json` fixture containing foreign-machine ciphertext; `dpapi.protectData`/`unprotectData` mocked so decrypt throws
- **Act:** call the main.js auth-config read path (or `encryption.js` decrypt wrapper) on boot against the fixture
- **Assert:** decrypt call throws; `auth.json` is deleted from userData (file no longer exists afterwards); app treats machine as first-run (cloud login shown on next window check); no token material from the foreign file is returned to callers

### TC-D10.007 — Gap-Char [SEC-02]: main window runs nodeIntegration:true / contextIsolation:false; login & splash windows are isolated
- **Layers:** UT (static source assertion — parse `Angular/main.js`, assert the `BrowserWindow` config objects; legitimate config-assertion test)
- **Priority:** P0  **Category:** Gap-Char [SEC-02]
- **Source:** WF-10.1 ⚠ gaps; doc-11 SEC-02 (verified: `main.js:488-491` main window, `main.js:550-555` login window, `main.js:467-469` splash, `main.js:178-182` setup splash)
- **Arrange:** checkout of `Angular/main.js` at current HEAD
- **Act:** extract `webPreferences` of `createMainWindow()`, `showCloudLogin()`, `createWindow()` (splash), `showSetupSplash()` and assert their literal values
- **Assert:** main window: `nodeIntegration === true` and `contextIsolation === false` (current insecure posture — characterization); login-cloud window: `nodeIntegration === false`, `contextIsolation === true`, `preload` = `preload.js`; setup-splash window: `nodeIntegration === false`, `contextIsolation === true`, `preload` = `preload.js`; splash window: `nodeIntegration === false`. (This test is GREEN today and guards against *accidental* change; it flips deliberately when TC-D10.008 lands.)

### TC-D10.008 — Gap-Target [SEC-02]: main window hardened to contextIsolation with a preload bridge — RED until fix lands
- **Layers:** UT (static source assertion on `Angular/main.js`)
- **Priority:** P0  **Category:** Gap-Target [SEC-02]
- **Source:** doc-11 SEC-02 (enhancement direction: "Harden Electron config")
- **Arrange:** same as TC-D10.007
- **Act:** assert `webPreferences` of `createMainWindow()`
- **Assert:** `nodeIntegration === false`, `contextIsolation === true`, a `preload` bridge exists for any renderer-needed APIs (grep shows `require('electron')` no longer callable from renderer context; `contextBridge.exposeInMainWorld` present in preload). **RED by definition** until the hardening lands — do not silently delete; flip only via reviewed change paired with retiring TC-D10.007

### TC-D10.009 — Gap-Char [SEC-02]: cloud URL hard-coded to production IP with no environment switch
- **Layers:** UT (static source assertion — regex `main.js` for the constant and its usages)
- **Priority:** P0  **Category:** Gap-Char [SEC-02]
- **Source:** WF-10.1 ⚠ gaps; doc-11 SEC-02 (verified: `main.js:121` `const CLOUD_API_URL = 'http://208.110.72.211';`)
- **Arrange:** checkout of `Angular/main.js`
- **Act:** scan the file for `CLOUD_API_URL` definition and every usage (login POST, `downloadAndSetupDatabase`, `authData.cloudApiUrl`)
- **Assert:** exactly one hard-coded literal `http://208.110.72.211` defines it; **no** read of `process.env.*` or config file for the base URL exists; both `axios.post(CLOUD_API_URL + '/api/authentication', …)` and `GET ${CLOUD_API_URL}/api/tenants/my-database` resolve against that literal. (Plain HTTP to a raw IP — also assertable as part of the characterization.)

### TC-D10.010 — Gap-Target [SEC-02]: cloud URL env-configurable with explicit fallback — RED until fix lands
- **Layers:** UT (static assertion) + E2E (Playwright + Electron: launch with env override and assert requests hit the override)
- **Priority:** P0  **Category:** Gap-Target [SEC-02]
- **Source:** doc-11 SEC-02 (enhancement direction: "env-config URL")
- **Arrange:** static: checkout of `main.js`. E2E: loopback mock cloud; launch Electron with `MILPOS_CLOUD_API_URL=http://127.0.0.1:<port>` (or agreed var name) and no `POSDb.db`
- **Act (static):** assert the URL resolves in order: env var → `auth.json`'s `cloudApiUrl` → built-in default; assert no bare production IP remains as the first choice. **Act (E2E):** complete cloud login
- **Assert (E2E):** `POST /api/authentication` and `GET /api/tenants/my-database` hit the loopback mock (mock log has both requests); `auth.json.cloudApiUrl` records the override; main window boots against the local API. **Static part is RED** until the fix lands

### TC-D10.011 — Gap-Char [SEC-02]: login window opens DevTools unconditionally in production
- **Layers:** UT (static assertion: `openDevTools` call present in `showCloudLogin`) + E2E observation (**Manual QA script**: launch first-run and screenshot)
- **Priority:** P2  **Category:** Gap-Char [SEC-02]
- **Source:** WF-10.1 ⚠ gaps; doc-11 SEC-02 (verified: `main.js:559` `win.webContents.openDevTools({ mode: 'detach' })` runs unconditionally, despite `devTools: false` at `main.js:554`)
- **Arrange:** machine without `POSDb.db` (first-run)
- **Act (static):** assert `showCloudLogin` contains an unconditional `openDevTools(...)` call and the misleading `devTools: false` comment ("Explicitly enable DevTools") — characterization of the contradiction. **Act (Manual QA):** launch app; when the cloud-login window appears, screenshot the desktop
- **Assert (manual):** a detached DevTools window is visible attached to the login window in a production build; token keystrokes could be observed from that window. **Static part GREEN today**; retires when TC-D10.010's hardening removes the call

---

## WF-10.2 — Tenant Database Export/Provisioning Workflow (Server Side)

### TC-D10.012 — GET /api/tenants/my-database returns a zip containing POSDb.db, generated appsettings.json, migration history, logo
- **Layers:** IT, PM
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.2 (steps 1–10; `TenantsController.cs:314-342` self-service, TenantId from claim)
- **Arrange:** desktop-mode-agnostic cloud factory; Tenant A seeded (products, customer, company profile with logo); JWT for `admin` of Tenant A (TenantId claim present)
- **Act:** `GET /api/tenants/my-database` with Bearer token; unzip response into temp dir
- **Assert:** HTTP 200; `Content-Type: application/zip`; `Content-Disposition` filename ends `.zip`; archive contains `POSDb.db` **and** `appsettings.json` **and** `wwwroot` logo file; extracted `POSDb.db` row counts match Tenant A seed (products = seeded count, customers = seeded count); `POSDb.db` contains `__EFMigrationsHistory` rows matching the cloud model (so desktop `Database.Migrate()` is a no-op at first boot); response temp file deleted server-side (`FilePath` cleaned). **(PM):** same request in the desktop-collection environment; chained follow-up assertion only on status + content-type (deep DB assertions stay in IT)

### TC-D10.013 — my-database without a TenantId claim returns 401 and no file
- **Layers:** IT
- **Priority:** P0  **Category:** Validation
- **Source:** WF-10.2 (`TenantsController.cs:318-322` — verified null/unparsable claim → `Unauthorized`)
- **Arrange:** JWT whose claims lack `TenantId` (e.g. cloud SuperAdmin token without tenant context, or hand-built token)
- **Act:** `GET /api/tenants/my-database` with that token
- **Assert:** HTTP 401; body contains `Tenant ID not found in token.`; no zip created in the app temp space; no `ExportTenantToSqliteCommand` dispatched (no side-effect rows anywhere)

### TC-D10.014 — POST /api/tenants/{id}/export-sqlite requires SuperAdmin
- **Layers:** IT, PM
- **Priority:** P0  **Category:** Permission
- **Source:** WF-10.2 (`TenantsController.cs:292-309`, `[Authorize(Policy = SuperAdmin)]`)
- **Arrange:** Tenant A id; JWTs for `admin` (SuperAdmin) and `manager` (no SuperAdmin claim)
- **Act:** `POST /api/tenants/{TenantA}/export-sqlite` twice — once with manager token, once with admin token
- **Assert (manager):** HTTP 403 (forbidden by policy), empty body, no file created. **Assert (admin):** HTTP 200, `application/zip` body, `POSDb.db` + `appsettings.json` inside. **(PM):** both requests in the cloud collection; 403 then 200 sequence asserted

### TC-D10.015 — Export copies only tenant-owned rows; other tenants' data absent; shared entities unfiltered
- **Layers:** IT
- **Priority:** P0  **Category:** Tenant-Isolation
- **Source:** WF-10.2 (steps 5–6; `CopyEntity<T>` strategies: `TenantId == tenantId || Guid.Empty || null`, parent-chain, membership, shared-unfiltered; verified `ExportTenantToSqliteCommandHandler.cs`)
- **Arrange:** Tenant A (2 products, 1 customer, user U-A) and Tenant B (3 products, 1 customer, user U-B) in the cloud DB
- **Act:** export Tenant A via `my-database`; open extracted `POSDb.db`
- **Assert:** products = 2 (Tenant A's only — Tenant B's 3 absent); customers = 1 (A's); **no** row anywhere whose `TenantId` equals Tenant B's id (query every `TenantId`-bearing table); shared/global entities (e.g. tax categories or units seeded with `TenantId = Guid.Empty`, per strategy `Guid.Empty || null`) **are** present with their full row count; Tenant A's own `Tenant` row = exactly 1
- **Gap-Char note:** if a shared table is empty because the current strategy skips unknowns, that specific absence is TC-D10.021's subject, not a failure here — keep the assertions scoped to the strategies above

### TC-D10.016 — Exported DB starts "fully synced": fresh SyncMetadata with LastPullSync = LastPushSync = exportTime for every synced entity
- **Layers:** IT
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.2 (step 7; verified `ExportTenantToSqliteCommandHandler.cs:559-579` `LastPullSync = exportTime`)
- **Arrange:** Tenant A with rows in all pull-entity tables (Product, Customer, SalesOrder, Supplier, Category, CompanyProfile); inject/observe export time T
- **Act:** export and inspect `SyncMetadata` rows in the extracted DB
- **Assert:** exactly one `SyncMetadata` row per entity type included in the fresh-metadata generation; each row has `LastPullSync == T` and `LastPushSync == T` (±1 s clock tolerance via injected/observed timestamps); no row has `DateTime.MinValue` or a stale pre-export value; consequence assert: a desktop pull immediately after provisioning requests `modifiedSince=T` (verified against SyncEngine read of `LastPullSync`) and receives only post-export changes

### TC-D10.017 — Excluded operational entities are absent from the export package
- **Layers:** IT
- **Priority:** P1  **Category:** Happy
- **Source:** WF-10.2 (step 5 exclusions; verified `IsExcludedEntity` — SyncMetadata, SyncLog, LoginAudit, NLog, EmailLog, FBRSubmissionLog, Action, Page, PageHelper, IdentityUserPasskey)
- **Arrange:** cloud DB pre-populated with noise: 5 `SyncLog` rows, 3 `LoginAudit` rows, 2 `EmailLog` rows, 1 `NLog` row, menu `Page`/`PageHelper` rows
- **Act:** export Tenant A; inspect extracted `POSDb.db`
- **Assert:** tables exist (schema) but contain **0 rows** for: SyncLog, LoginAudit, NLog, EmailLog, FBRSubmissionLog, Action, Page, PageHelper, IdentityUserPasskey; SyncMetadata contains **only** the freshly generated rows (count = entity types, per TC-D10.016) — no copied historical metadata

### TC-D10.018 — Generated appsettings.json has the exact desktop contract
- **Layers:** IT
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.2 (step 9; verified `ExportTenantToSqliteCommandHandler.cs:185-208`, `SyncIntervalMinutes = 15` at line 196)
- **Arrange:** Tenant A with ApiKey `KA-TENANT-A`; export performed with `CloudApiUrl = http://cloud-host` (self-service path derives it from the request host — assert that derivation)
- **Act:** export; parse the `appsettings.json` inside the zip
- **Assert:** JSON fields exactly: `TenantId` = Tenant A id; `ApiKey` = `KA-TENANT-A`; `JwtSettings` block present (signing key/issuer non-empty); `SyncSettings.CloudApiUrl` = `http://cloud-host` (scheme://host from `my-database` request; for `export-sqlite` path = the command's value); `SyncSettings.SyncIntervalMinutes` = **15**; `SyncSettings.AutoSync` = **true**; `DatabaseProvider` = `"Sqlite"`; no connection string with the cloud SQL password present in the file

### TC-D10.019 — Gap-Char [SYN-04]: export is a full unbounded copy — size and content do not scale with actual changes
- **Layers:** IT
- **Priority:** P1  **Category:** Gap-Char [SYN-04]
- **Source:** WF-10.2 (copies every `DbSet` via reflection each run); doc-11 SYN-04 ("Full-DB zip export (size unbounded)"); verified `ExportTenantToSqliteCommandHandler.cs:115-141`
- **Arrange:** Tenant A seeded with N = 500 sales orders (bulk seed); record `zipSize₁` and extracted `SalesOrders` count after a first export; create exactly **1** new product; wait past any cache window
- **Act:** second export
- **Assert (characterization of current behavior):** extracted DB again contains **all 500** sales orders + 501 products (full copy — no incremental delta); `zipSize₂ ≥ zipSize₁` (grows with total data, not with the 1 change); the response offers **no** `since`/`baseline`/`incremental` query parameter (calling with `?since=…` still returns the full export — parameter is ignored if accepted); server reads the whole zip into memory before streaming (`File.ReadAllBytesAsync`, `TenantsController.cs:305/338`) — assert memory-bound behavior documented, not fixed. GREEN today; retires when SYN-04 fix (TC-D10.020) lands

### TC-D10.020 — Gap-Target [SYN-04]: incremental/baseline export produces a delta package scoped to changes since a baseline
- **Layers:** IT
- **Priority:** P2  **Category:** Gap-Target [SYN-04]
- **Source:** doc-11 SYN-04 (enhancement direction: "Incremental export; typed copy pipeline")
- **Arrange:** baseline full export at T0; then 2 new products, 1 edited customer, 0 sales
- **Act:** `GET /api/tenants/my-database?since={T0}` (or agreed baseline mechanism)
- **Assert:** package contains only the change set (2 inserts + 1 update rows) **plus** schema/history as needed to apply on top of an existing desktop DB; zip size ≪ full export; applying the delta onto the T0 desktop DB yields final row counts equal to a fresh full export at T1. **RED by definition** until implemented

### TC-D10.021 — Gap-Char [SYN-04]: reflection-based copying silently skips entities without a recognized strategy
- **Layers:** IT (observable as missing rows + no error) — the skip decision itself is `ExportTenantToSqliteCommandHandler.IsExcludedEntity`/strategy fallback (verified: unknown → skipped at lines 413-420)
- **Priority:** P1  **Category:** Gap-Char [SYN-04]
- **Source:** WF-10.2 (step 6 strategies, unknown → skipped); doc-11 SYN-04 ("reflection-based entity copying fragile")
- **Arrange:** add a test entity `SyncProbeEntity` (inheriting `BaseEntity`, `TenantId` set, 2 rows) **without** extending the copy strategies (simulates an entity added later without export support); seed it on Tenant A alongside normal rows
- **Act:** export Tenant A; inspect extracted DB and response
- **Assert:** the extracted `POSDb.db` **does not contain** the 2 `SyncProbeEntity` rows (table absent or empty); export response is still HTTP 200 and otherwise complete; **no error, warning field, or skipped-entities list** surfaces to the caller (silent skip — the fragility being characterized); rename scenario (same skip when the DbSet name/type changes) documented as the risk mechanism. GREEN today

### TC-D10.022 — Gap-Target [SYN-04]: typed copy pipeline — new entities are exported without per-type reflection additions and skips are reported
- **Layers:** IT
- **Priority:** P2  **Category:** Gap-Target [SYN-04]
- **Source:** doc-11 SYN-04 (enhancement direction)
- **Arrange:** `SyncProbeEntity` with `TenantId` rows registered only by convention (typed pipeline discovers it)
- **Act:** export Tenant A
- **Assert:** extracted DB contains the 2 probe rows; response metadata (or log) lists any genuinely skipped entities with reasons (no silent skips); compile-time/type-safety assert: removing the entity type causes a build/test failure rather than a silent export gap. **RED by definition** until the typed pipeline lands

### TC-D10.023 — Export for a nonexistent tenant fails cleanly with no partial artifact
- **Layers:** IT
- **Priority:** P1  **Category:** Validation
- **Source:** WF-10.2 (handler validates tenant existence before copy; `TenantsController.cs:299-301/333-336` error paths)
- **Arrange:** fresh GUID with no tenant row
- **Act:** `POST /api/tenants/{unknownId}/export-sqlite` as SuperAdmin; also `GET /api/tenants/my-database` with a token whose TenantId claim = unknownId
- **Assert:** both return an error status (`response.Success == false` surfaced — status ≥ 400, body lists `response.Errors`); **no** temp folder/zip remains (handler cleanup ran); DB unchanged (no partial `POSDb.db` written to the template/output path)

---

## WF-10.3 — Ongoing Bi-Directional Sync Workflow (Desktop ↔ Cloud)

### TC-D10.024 — Gap-Char [SYN-01]: pull entity set is hard-coded to exactly 6 types; Purchase is never pulled even when changed in the cloud
- **Layers:** UT (sync engine with in-memory EF context + `FakeCloudApiClient` recording `GetEntitiesAsync` calls)
- **Priority:** P0  **Category:** Gap-Char [SYN-01]
- **Source:** WF-10.3 pull step 5 (verified `SyncEngine.cs:93`); doc-11 SYN-01
- **Arrange:** in-memory local DB; fake cloud holding changed records of **all** types: Product, Customer, SalesOrder, Supplier, Category, CompanyProfile, **Purchase, Payment, Expense, StockTransaction**; `SyncMetadata.LastPullSync = MinValue` for all
- **Act:** `SyncEngine.SynchronizeAsync(new SyncOptions { Direction = Pull })`
- **Assert:** `FakeCloudApiClient` received `GetEntitiesAsync` for **exactly** the set { Product, Customer, SalesOrder, Supplier, Category, CompanyProfile } — 6 calls, no others; local DB afterwards contains the pulled Product/Customer/etc. rows but **0** Purchase/Payment/Expense/StockTransaction rows (cloud purchases invisible to desktop forever); `result.RecordsSynced` counts only the 6 types' records. GREEN today

### TC-D10.025 — Gap-Target [SYN-01]: pull entity set is configurable and symmetric — RED until fix lands
- **Layers:** UT (same harness as TC-D10.024) + IT (config binding)
- **Priority:** P1  **Category:** Gap-Target [SYN-01]
- **Source:** doc-11 SYN-01 ("Configurable entity set; symmetric pull")
- **Arrange:** `SyncSettings:PullEntityTypes` (agreed key) = the 6 current types **+ Purchase, Payment, Expense, StockTransaction**; fake cloud holding changes in each
- **Act:** pull
- **Assert:** `GetEntitiesAsync` called once per configured type (8 calls); every changed cloud row of each configured type exists locally after pull; omitting a type from config results in no call for it; default config (unset) preserves today's 6-type behavior (documented default, not silent widening). **RED by definition** until implemented

### TC-D10.026 — Pull applies cloud inserts/updates to local DB and advances per-entity LastPullSync
- **Layers:** UT (sync engine, in-memory repos)
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.3 pull steps 6–8 (verified `SyncEngine.cs:99-161`)
- **Arrange:** local DB has Product P1 (ModifiedDate T-10, SyncVersion 1); fake cloud returns for `Product?modifiedSince=T-10`: new P2 and updated P1 (ModifiedDate T-1, SyncVersion 2); local P1.ModifiedDate ≤ lastSync (no local edit)
- **Act:** `SynchronizeAsync(Pull)`
- **Assert:** local DB now has P1 with the cloud's field values (SyncVersion 2) and P2 inserted; `EntityState` path used was Update for P1 / Insert for P2 (observable as row states, not internals); `SyncMetadata["Product"].LastPullSync` advanced to ≈ now (injected clock ±1 s); metadata for the other 5 types advanced too (per-entity update loop, line 161); `result.RecordsSynced == 2`, `RecordsConflicted == 0`
- **Note (per clock rule):** the metadata timestamp assert uses the injected fixed clock, never `DateTime.Now` in the assertion itself

### TC-D10.027 — Pull conflict (both sides changed since lastSync) resolves ServerWins: cloud overwrites local
- **Layers:** UT (sync engine + real `ConflictResolutionService`, in-memory repos)
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.3 pull step 7 (verified `SyncEngine.cs:112-146`, default `ConflictStrategy.ServerWins` at line 138)
- **Arrange:** lastSync = T0; local P1 modified at T1 (name "LocalName", Version 5); cloud P1 modified at T2 > T1 (name "CloudName", Version 7)
- **Act:** pull
- **Assert:** local P1.Name == "CloudName", SyncVersion == 7 (server won); `result.RecordsConflicted == 1`; no exception; conflict counted but sync still `Completed`; `SyncMetadata["Product"].LastPullSync` advanced
- **Edge companion:** same arrange with cloud unchanged since T0 (only local changed) → **no** conflict branch taken, local row untouched by pull, `RecordsConflicted == 0`

### TC-D10.028 — ChangeTrackingService classifies local changes (Insert/Update/Delete) and serializes with SyncVersion
- **Layers:** UT (in-memory context)
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.3 push step 9 (verified `ChangeTrackingService.cs:29-87`)
- **Arrange:** three local rows since lastPush: entity A inserted (CreatedDate == ModifiedDate), entity B updated (ModifiedDate > CreatedDate), entity C soft-deleted (`IsDeleted = true`)
- **Act:** `ChangeTrackingService.GetLocalChanges(lastSync)`
- **Assert:** result contains all 3 changes; A.ChangeType == Insert, B.ChangeType == Update, C.ChangeType == Delete; each `Data` payload deserializes back to the entity with matching field values and carries its `SyncVersion`; rows unchanged since lastSync are **not** included; non-`BaseEntity` and abstract types excluded from the scan (assert by seeding one such type and observing its absence)

### TC-D10.029 — Push maps Insert→POST, Update→PUT, Delete→DELETE and marks successes synced
- **Layers:** UT (sync engine + FakeCloudApiClient)
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.3 push step 10 (verified `SyncEngine.cs:196-227`, `CloudApiClient.cs:59-100`)
- **Arrange:** local changes: 1 insert (P2), 1 update (P1), 1 delete (C9); fake cloud accepts all (no conflict)
- **Act:** `SynchronizeAsync(Push)`
- **Assert:** fake received `CreateEntityAsync("Product", P2)`, `UpdateEntityAsync("Product", P1.Id, …)`, `DeleteEntityAsync("Product", C9.Id)` — verb mapping correct per change type; `MarkAsSynced` ran for all 3 ids (their `LastSyncedAt` set to now ±1 s injected clock); `result.RecordsSynced == 3`, `RecordsFailed == 0`, `Status == Completed`

### TC-D10.030 — Gap-Char [SYN-02]: push hitting 409 skips the change silently — it never reaches the cloud and is not retried or resolved
- **Layers:** UT (sync engine + FakeCloudApiClient returning `UpdateResult { IsConflict = true }`)
- **Priority:** P0  **Category:** Gap-Char [SYN-02]
- **Source:** WF-10.3 push step 10 + ⚠ gap (verified `SyncEngine.cs:212-218` `continue` on `IsConflict`; `CloudApiClient.cs:76-86` maps HTTP 409 → `IsConflict`); doc-11 SYN-02
- **Arrange:** local update to P1 (name "LocalNew", Version 5); fake cloud holds P1 (Version 9) and its `UpdateEntityAsync` is scripted to return 409/IsConflict once; fake cloud's internal "store" records what it would have accepted
- **Act:** `SynchronizeAsync(Push)`; then run push a **second** time with the same unchanged local row
- **Assert:** `UpdateEntityAsync` was called (409 received); local P1 **unchanged** — no ServerWins/MergeFields applied to it; fake cloud's stored P1 still Version 9 / old name (the local change **never arrives**); `MarkAsSynced` NOT called for P1; `result.RecordsConflicted == 1`, `RecordsFailed == 0`, `Status == Completed` (conflict is not an error); **no retry queue entry exists** and the second run behaves identically (still skipped) — the change reaches the cloud only if it is edited again (the silent-loss window being characterized). GREEN today

### TC-D10.031 — Gap-Target [SYN-02]: push conflicts are resolved with a strategy and queued for retry — RED until fix lands
- **Layers:** UT (same harness)
- **Priority:** P1  **Category:** Gap-Target [SYN-02]
- **Source:** doc-11 SYN-02 ("Apply ServerWins/MergeFields on push; queue retry")
- **Arrange:** as TC-D10.030; configured push strategy `MergeFields` (and a second run with `ServerWins`)
- **Act:** push
- **Assert (MergeFields):** merged payload posted — non-conflicting local fields applied, conflicting field resolved by newer timestamp, `Version = max(local, cloud) + 1`; cloud ends with merged P1; retry queue drains (no residual queue entries) and `RecordsConflicted == 0` after resolution. **Assert (ServerWins):** cloud P1 (Version 9) pushed back and applied locally. **Assert (queue):** a transient 5xx/timeout on push enqueues the change and a subsequent run delivers it without user action. **RED by definition** until implemented

### TC-D10.032 — ConflictResolutionService.MergeChanges merges field-by-field favoring newer timestamp and bumps Version to max+1
- **Layers:** UT (pure logic — no DB)
- **Priority:** P1  **Category:** Happy
- **Source:** WF-10.3 conflict step 11 (verified `ConflictResolutionService.cs:68-103`)
- **Arrange:** local change {Name @ T1, Price unchanged} Version 4; remote change {Price @ T2 > T1, Name unchanged} Version 6
- **Act:** `MergeChanges(local, remote)`
- **Assert:** result Name == local's (T1 newer for that field if timestamps differ per field; where field-level timestamps are absent, newer **entity** timestamp side wins the changed fields — assert per implementation contract documented in the test), Price == remote's; `Version == 7` (max(4,6)+1); unchanged fields retain their values; both inputs unmodified (pure function)

### TC-D10.033 — DetectConflict classifies UpdateUpdate / UpdateDelete / DeleteUpdate / InsertInsert
- **Layers:** UT (pure logic)
- **Priority:** P1  **Category:** Edge
- **Source:** WF-10.3 conflict step 11 (verified `ConflictResolutionService.cs:18-34, 137-143`)
- **Arrange:** four pairs of `EntityChange` fixtures: (a) both Update with different Versions; (b) local Update vs remote Delete; (c) local Delete vs remote Update; (d) both Insert same Id
- **Act:** `DetectConflict(local, remote)` ×4
- **Assert:** (a) `HasConflict == true`, type UpdateUpdate; (b) UpdateDelete; (c) DeleteUpdate; (d) InsertInsert; same-Version/no-change pairs return `HasConflict == false`; the `Version`-equality case (identical versions, differing data) resolves per documented rule — assert the rule the implementation actually applies (characterize, don't assume)

### TC-D10.034 — Offline accumulation and replay: failed pushes are not marked synced and are delivered on the next connected run
- **Layers:** UT (sync engine + FakeCloudApiClient that throws on first run, succeeds on second)
- **Priority:** P1  **Category:** Edge
- **Source:** WF-10.3 push step 10 + WF-10.5 (offline-first recap; grounded in verified behavior: `MarkAsSynced` only on success `SyncEngine.cs:226`; `UpdateSyncMetadata(isPull:false)` is never called — see Discrepancy note 3 — so the change set is re-scanned each cycle)
- **Arrange:** 3 local changes; fake client mode = offline (all calls throw `HttpRequestException`)
- **Act:** run 1 (offline) → switch fake to online → run 2
- **Assert (run 1):** all 3 pushes fail; `RecordsFailed == 3`; none of the 3 entities' `LastSyncedAt` set; `Status == Completed` (per-change failures are caught — `SyncEngine.cs:229-233`) or `Failed` if thrown at orchestration level — assert whichever the current code does (characterize precisely in the test); local rows intact. **Assert (run 2):** all 3 delivered to fake cloud; `RecordsSynced == 3`; `LastSyncedAt` now set for all 3; no duplicate delivery of already-synced entities on a third run (idempotence via `MarkAsSynced`)

### TC-D10.035 — POST /api/sync/now: contract, direction parameter, and invalid-direction default
- **Layers:** IT, PM (desktop-mode server profile)
- **Priority:** P1  **Category:** Happy + Validation
- **Source:** WF-10.3 trigger step 2 (verified `SyncController.cs:30-65` — `direction` query, switch default → Bidirectional)
- **Arrange:** desktop-mode factory with `CloudApiUrl` pointed at a loopback stub cloud that returns empty lists
- **Act:** `POST /api/sync/now?direction=pull`; then `?direction=bogus`
- **Assert (pull):** HTTP 200; body fields exactly `{ Success, Status, RecordsSynced, RecordsConflicted, RecordsFailed, Duration, StartedAt, CompletedAt, ErrorMessage }`; `Status == "Completed"`; `Success == true`; `Duration` ≥ 0; a `SyncLog` row persisted (Direction recorded — see Discrepancy note 4). **Assert (bogus):** HTTP 200 with `Status == "Completed"` (invalid value silently **defaults to Bidirectional** — characterize this, do not assume 400); stub cloud saw a pull and a push attempt (Bidirectional). **(PM):** both requests in the desktop collection with chained env `baseUrl`

### TC-D10.036 — Gap-Char [SYN-03]: GET /api/sync/status is an unimplemented stub that returns 200 with no real sync data
- **Layers:** IT, PM
- **Priority:** P2  **Category:** Gap-Char [SYN-03]
- **Source:** WF-10.3 trigger step 2 + ⚠ gap (verified `SyncController.cs:70-79`: literal TODO, returns `Ok(new { Message = "Sync status endpoint - to be implemented", LastSync = DateTime.UtcNow })`). **Reality-check note:** doc-11 phrasing suggests absent/404; the actual current code returns **200** — this Gap-Char asserts the verified stub (see Discrepancy note 1)
- **Arrange:** desktop-mode factory; 3 prior sync runs written to `SyncLog` (via `POST /api/sync/now`)
- **Act:** `GET /api/sync/status`
- **Assert:** HTTP **200** (not 404); body has exactly the stub shape — `Message == "Sync status endpoint - to be implemented"` and a `LastSync` timestamp; **no** SyncLog-derived data (no records-synced counts, no per-device rows, no failure history) despite 3 rows existing in `SyncLog`; no [Authorize] requirement — the call succeeds **without** any token (anonymous; see Discrepancy note 2). GREEN today

### TC-D10.037 — Gap-Target [SYN-03]: status endpoint returns real sync health from SyncLog — RED until fix lands
- **Layers:** IT
- **Priority:** P2  **Category:** Gap-Target [SYN-03]
- **Source:** doc-11 SYN-03 ("Sync health endpoint + UI")
- **Arrange:** desktop-mode factory; seed `SyncLog` rows: 2 Completed, 1 Failed with `ErrorMessage`, distinct `DeviceId`s
- **Act:** `GET /api/sync/status`
- **Assert:** HTTP 200; body includes last-run outcome (status, StartedAt/CompletedAt, records counters), recent history (≥ the 3 seeded rows), and failure surfacing (`ErrorMessage` visible); response requires authentication ([Authorize]) — anonymous call → 401. **RED by definition** until implemented

### TC-D10.038 — ScheduledSyncService is registered and loops only in Desktop mode
- **Layers:** IT (WebApplicationFactory config matrix)
- **Priority:** P1  **Category:** Happy + Negative
- **Source:** WF-10.3 trigger step 1 (verified `Startup.cs:96-99` registers the hosted service iff `DeploymentSettings:DeploymentMode == "Desktop"`; `ScheduledSyncService.cs:36-82` waits 30 s then loops per `SyncIntervalMinutes`)
- **Arrange:** factory A with Desktop config; factory B identical but `DeploymentMode = "Cloud"`
- **Act:** resolve `IHostedService` instances from each host
- **Assert (A):** exactly one hosted service of type `ScheduledSyncService` is registered; with `SyncIntervalMinutes` overridden to 1 and a stub cloud, the sync loop invokes `SyncEngine.SynchronizeAsync(Bidirectional)` after the initial ~30 s delay and again after the interval (observable via `SyncLog` row count growth or the stub cloud's request count: ≥2 runs within ~95 s). **Assert (B):** **no** `ScheduledSyncService` registered in cloud mode; no sync calls to the stub within the same window

### TC-D10.039 — Every sync run persists a SyncLog row keyed by DeviceId = machine name
- **Layers:** UT (in-memory context) + IT (row persistence through the real stack)
- **Priority:** P1  **Category:** Happy
- **Source:** WF-10.3 orchestration steps 3–4 (verified `DeviceIdentifier.cs:21-30` `Environment.MachineName`; `SyncEngine.cs:291-310` `LogSyncResult`)
- **Arrange:** UT: sync engine with in-memory context on a machine named deterministically for the test host; IT: desktop-mode factory, one `POST /api/sync/now`
- **Act:** one successful sync run
- **Assert (UT):** exactly 1 `SyncLog` row; `DeviceId == Environment.MachineName`; `Direction == Bidirectional` (hard-coded at line 298 — characterize; see Discrepancy note 4); `RecordsSynced/RecordsConflicted/RecordsFailed` match the `SyncResult`; `Status == Completed`; `StartedAt < CompletedAt`. **Assert (IT):** the row survives through the real EF/SQLite stack and is queryable (per TC-D10.036 the status endpoint does not expose it — assert via DB)

### TC-D10.040 — CloudApiClient sends X-Tenant-ID header and authenticates with the provisioned ApiKey
- **Layers:** UT (fake `HttpMessageHandler` capturing requests)
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.3 pull step 6 + WF-10.5 table (verified `CloudApiClient.cs:35-36, 42-54`)
- **Arrange:** `CloudApiClient` configured with TenantId = T-111, ApiKey from env/config, base URL = loopback; handler records every request
- **Act:** `GetEntitiesAsync("Product", modifiedSince: T0)`
- **Assert:** request URL is `{base}/api/Products` with `modifiedSince=T0` query; header `X-Tenant-ID: T-111` present; ApiKey credential present (header/query per implementation — assert the actual mechanism, e.g. `X-API-Key` or bearer); a 409 response to `UpdateEntityAsync` produces `UpdateResult.IsConflict == true` (verified `CloudApiClient.cs:76-86`); non-409 error statuses produce `IsConflict == false` and a failure signal — not a silent success

### TC-D10.041 — Gap-Char: push side never advances LastPushSync — every push rescans all local changes since epoch
- **Layers:** UT (in-memory context + FakeCloudApiClient)
- **Priority:** P1  **Category:** Gap-Char (code-verified finding, WF-10.3 push; see Discrepancy note 3)
- **Source:** WF-10.3 push steps 9–10 (verified: `UpdateSyncMetadata` is called **only** with `isPull: true` at `SyncEngine.cs:161`; `PushChangesAsync` (174-236) contains no metadata update; `ChangeTrackingService.cs:147-168` supports push but is never invoked for push)
- **Arrange:** local change P1; successful fake cloud
- **Act:** push run 1 → add local change P2 → push run 2
- **Assert:** `SyncMetadata` rows' `LastPushSync` remain at `DateTime.MinValue` (or absent) after run 1 — push metadata is **never** advanced; run 2's `GetLocalChanges` scan therefore spans the full change set again (P1 re-fetched by the scan; P1 not re-POSTed only because `MarkAsSynced`/`LastSyncedAt` gates it — assert that dedup relies solely on per-entity `LastSyncedAt`, not on a push watermark); cost grows with total local change volume (characterized). GREEN today; flips deliberately when a push watermark lands (pairs with TC-D10.031)

---

## WF-10.4 — Auto-Update Workflow (Electron)

### TC-D10.042 — Gap-Char [SEC-02]: updater accepts unsigned updates (verifyUpdateCodeSignature = false)
- **Layers:** UT (static assertion on `main.js`) + E2E semi-manual (**Manual QA script** with a local update provider; electron-updater's `dev-app-update.yml`/local http provider makes the download scriptable, the install dialog is manual)
- **Priority:** P0  **Category:** Gap-Char [SEC-02]
- **Source:** WF-10.4 steps 1–3 (verified `main.js:411` `autoUpdater.verifyUpdateCodeSignature = false`; GitHub Releases provider per `package.json` publish block)
- **Arrange:** static: checkout of `main.js`. E2E: packaged app v1.0.0 + local update feed serving a valid `latest.yml` and an **unsigned** `MIL POS Setup 1.0.1.exe` (+ `.blockmap`)
- **Act (static):** assert `verifyUpdateCodeSignature` is set to `false` before `checkForUpdatesAndNotify()`, and that unpackaged/dev mode skips the check entirely (`main.js:403-406` — characterize). **Act (Manual QA script):** (1) launch packaged v1.0.0; (2) wait for `update-downloaded`; (3) accept "Restart Now"
- **Assert:** updater logs (api-debug.log lines `UPDATE: …`, `main.js:419-440`) show update-available → downloaded for the **unsigned** artifact; dialog "Restart Now / Later" appears; on accept, the API child is killed first (no orphan `POS.API.exe`), then `quitAndInstall(false, true)` runs and app version becomes 1.0.1 — an unsigned binary was installed (the security exposure being characterized). GREEN today

### TC-D10.043 — Gap-Target [SEC-02]: signed-update validation enforced — unsigned/tampered artifacts rejected
- **Layers:** UT (static assertion) + E2E semi-manual (tampered-artifact QA script)
- **Priority:** P0  **Category:** Gap-Target [SEC-02]
- **Source:** doc-11 SEC-02 ("sign updates")
- **Arrange:** app published with signing configured (publisherName / certificate in `package.json` build); local feed serving (a) an unsigned installer, (b) a signed-but-tampered installer
- **Act (static):** assert `verifyUpdateCodeSignature` is no longer forced `false` (removed or `true`) in `main.js`. **Act (E2E):** point the app at each artifact
- **Assert:** unsigned artifact → updater errors out with a signature-verification error logged (`autoUpdater.on('error')` path), no dialog offering install, app stays on current version; tampered artifact → same rejection. **Static part RED by definition** until the fix lands

### TC-D10.044 — update-downloaded flow: Restart Now kills the API child before installing; Later defers without side effects
- **Layers:** E2E (**Manual QA script** — dialog interaction + process inspection; the kill ordering is verifiable only by observing process state)
- **Priority:** P2  **Category:** Happy
- **Source:** WF-10.4 step 3 (verified `main.js:442-456`)
- **Arrange:** packaged app + local update feed with a newer valid version (signed per TC-D10.043 once landed)
- **Act (Manual QA script):** (1) launch app, note `POS.API.exe` PID from `api-debug.log`; (2) when the update dialog appears choose **"Later"**; (3) observe app for 60 s; (4) trigger the dialog again and choose **"Restart Now"**
- **Assert ("Later"):** dialog closes; app keeps running; API child PID unchanged; no install attempted. **Assert ("Restart Now"):** `api-debug.log` logs `UPDATE: User accepted restart.`; `POS.API.exe` PID is gone (child killed, `main.js:452`) **before** the installer runs; app exits and relaunches on the new version; after relaunch the embedded API runs and the main window opens (ties to TC-D10.002)

### TC-D10.045 — Schema continuity: embedded API auto-migrates the local SQLite DB after an update — no manual scripts
- **Layers:** IT (real migration stack against a SQLite file)
- **Priority:** P0  **Category:** Happy
- **Source:** WF-10.4 step 5 (`Program.cs` `context.Database.Migrate()` on startup)
- **Arrange:** SQLite `POSDb.db` at schema version N (created by the previous app version — take a copy of the migration-history state minus the newest migration(s)); desktop-mode config
- **Act:** boot the desktop-mode API against that file
- **Assert:** startup succeeds without manual intervention; `__EFMigrationsHistory` now contains all migrations up to the current assembly (version N+1 rows appended); newly added columns/tables exist and are empty/defaults; pre-existing data rows intact (row counts before == after for unaffected tables); second boot performs no further migration work (idempotent — history complete)

---

## WF-10.5 — Desktop Runtime Behavior Differences (Recap)

### TC-D10.046 — Desktop mode uses SingleTenantProvider with no tenant middleware; requests resolve without tenant context
- **Layers:** IT (mode-matrix: two factories, Desktop vs Cloud)
- **Priority:** P0  **Category:** Happy + Tenant-Isolation
- **Source:** WF-10.5 table rows 1 & 6 (verified `SingleTenantProvider.cs`; `Startup.cs:437-440` registers `TenantResolutionMiddleware` only when `MultiTenancy.Enabled`)
- **Arrange:** Desktop factory: SQLite DB containing exactly 1 Tenant row (fallback fixed-GUID path exercised by a second factory with the tenant row **removed**); Cloud factory: multi-tenant enabled with Tenants A & B
- **Act (Desktop):** call an authenticated GET (e.g. `GET /api/products`) **without** any `X-Tenant-ID` header
- **Assert (Desktop):** 200 with Tenant A's (the only tenant's) data; provider resolved the first tenant row; with the tenant row removed, the fixed fallback GUID is used (requests still resolve — characterize which entity results it yields). **Assert (Cloud):** same request without tenant context does not silently return Tenant A's data (middleware/claims path differs); SuperAdmin `X-Tenant-ID` impersonation still honored in cloud mode but is irrelevant in desktop (single tenant — cross-tenant data is physically absent from the SQLite file, asserted by TC-D10.015)

### TC-D10.047 — Desktop mode runs on SQLite with auto-migration at boot and SQLite-backed Hangfire; QR path under %APPDATA%/milpos/qrcodes
- **Layers:** IT (desktop-mode factory with real SQLite file + Hangfire storage inspection)
- **Priority:** P1  **Category:** Happy
- **Source:** WF-10.5 table rows 2–5 (verified: `DatabaseProvider="Sqlite"` from export package TC-D10.018; migrations at boot per `Program.cs`; Hangfire `%APPDATA%/milpos/HangFireDB.db`; FBR QR `%APPDATA%/milpos/qrcodes`)
- **Arrange:** desktop-mode config; Hangfire storage pointed at the SQLite path; FBR QR directory setting
- **Act:** boot the API; enqueue one recurring reminder job; generate one FBR QR via the relevant endpoint
- **Assert:** data writes land in `POSDb.db` (SQLite file — not the cloud SQL connection string); Hangfire dashboard/storage is active against `HangFireDB.db` (SQLite) and the recurring reminder job exists and executes offline (no cloud connectivity needed — disable network in the test host and verify the job still fires); QR file created under `%APPDATA%/milpos/qrcodes`; migrations applied at boot (see TC-D10.045 for the deep assert)

### TC-D10.048 — Desktop mode serves API-only: no MVC/storefront routes; cloud mode still maps them
- **Layers:** IT (mode-matrix)
- **Priority:** P2  **Category:** Happy
- **Source:** WF-10.5 table row 4 (verified `Startup.cs:284-293` Desktop → `AddControllers()` only, no views; `Startup.cs:450-455` MVC default route mapped only when NOT Desktop)
- **Arrange:** Desktop factory and Cloud factory with identical seeds
- **Act:** request an MVC view route (e.g. `GET /Home/Index` or the storefront controller path) on both
- **Assert (Desktop):** 404 (route not mapped — no MVC fallback controller/view); API attribute-routed controllers still 200; no Razor view compilation services registered. **Assert (Cloud):** the same route resolves (200/302 per its implementation — assert the cloud behavior once to pin the matrix)

### TC-D10.049 — Postman desktop-mode smoke: full offline API loop works without any cloud dependency
- **Layers:** PM (desktop environment `local-desktop`)
- **Priority:** P1  **Category:** Happy
- **Source:** WF-10.5 (recap — desktop is self-sufficient between syncs)
- **Arrange:** desktop-mode server running on SQLite (provisioned DB from TC-D10.012 or factory-seeded equivalent); Postman env `local-desktop` (`baseUrl`, `token`, `tenantId`)
- **Act (collection runner, in order):** (1) `POST /api/authentication` (local login — desktop issues its own JWT from the provisioned user store); (2) `POST /api/salesorders` (1 item, cash) → capture id; (3) `GET /api/productStock?productId=…` → stock delta visible; (4) `POST /api/sync/now?direction=push` with cloud stub unreachable → per TC-D10.034 semantics the sale survives locally; (5) `GET /api/salesorders/{id}`
- **Assert:** every step 200; step 3 stock decreased by the sold qty; step 4 sync response shape valid with `RecordsFailed` reflecting the unreachable cloud and the sale row intact; step 5 order retrievable with correct totals (key totals only per strategy §1). Deep money assertions remain in D03/D06 IT suites

### TC-D10.050 — Manual QA journey: offline sale made in the desktop UI is pushed to the cloud on reconnect
- **Layers:** E2E (**Manual QA script** — full Electron + two-machine/loopback-cloud choreography; not automatable without a signed, installed, networked Electron harness)
- **Priority:** P1  **Category:** Happy
- **Source:** WF-10.5 (recap) + WF-10.3 (steady-state loop)
- **Arrange:** desktop app provisioned and running (post TC-D10.001 state); cloud reachable; POS user logged in on the main window
- **Act (Manual QA script):** (1) disconnect network (or block the cloud IP via firewall); (2) in the desktop UI, complete one cash sale for P-SIMPLE qty 2; (3) create one new customer; (4) verify the UI is fully functional offline; (5) restore network; (6) wait for the scheduled sync tick (or open DevTools/monitoring to issue `POST /api/sync/now` — per TC-D10.036 there is **no** user-facing sync status to watch, which is SYN-03); (7) in the cloud DB (admin query), inspect Product/Customer/SalesOrder rows
- **Assert:** steps 2–4 all succeed with zero cloud connectivity; stock decremented locally at sale time; after reconnect the cloud shows: SalesOrder row for the sale, Customer row created, Product stock/transaction rows pushed (push covers **all** `BaseEntity` types — unlike pull, verified WF-10.3 step 9); `SyncLog` rows recorded on the desktop with the sale's device id; if the cloud had concurrently edited the same product (conflict), the sale-side update is **silently skipped** (SYN-02 — record observed outcome in the QA log and link TC-D10.030)

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case — WF-10.1: TC-D10.001/002/005 · WF-10.2: TC-D10.012/016/018 · WF-10.3: TC-D10.026/029/035 · WF-10.4: TC-D10.044/045 · WF-10.5: TC-D10.046/047/049/050
- [x] Every write endpoint has Validation / Permission / Tenant-Isolation cases — covered: `my-database` (Validation TC-D10.013, Tenant-Isolation via export content TC-D10.015), `export-sqlite` (Permission TC-D10.014, Validation TC-D10.023), `sync/now` (Validation via direction default TC-D10.035). **Partially N/A with reason:** `sync/now` and `sync/status` currently carry **no `[Authorize]`** (verified `SyncController.cs:14-26`) so a conventional 403 Permission case cannot be written honestly; the anonymous-access fact is captured as Gap-Char asserts inside TC-D10.036 and flagged in Discrepancy note 2 for SEC follow-up. `POST /api/sync/now` is device-scoped single-tenant on the desktop — a cross-tenant 404 case is meaningless there; tenant isolation for D10 lives in the export content (TC-D10.015)
- [ ] Every money/stock mutation has DB-state assertions — **N/A with reason:** D10 performs no money/tax/stock mutations of its own; sync/export cases assert DB row state directly (row counts, SyncMetadata timestamps, SyncLog rows), and the one sales mutation in TC-D10.049/050 defers deep money asserts to the D03/D06 suites per strategy §1
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case — SYN-01: TC-D10.024/025 · SYN-02: TC-D10.030/031 · SYN-03: TC-D10.036/037 · SYN-04: TC-D10.019/020/021/022 · SEC-02: TC-D10.007/008/009/010/011/042/043
- [x] Gap-Char assertions describe CURRENT behavior (source-verified, file:line cited); Gap-Target describes DESIRED behavior and is RED now — TC-D10.008/010/020/022/025/031/037/043 are RED by definition
- [ ] Concurrency case for sequential-number generation (INT-11) — **N/A with reason:** D10 has no sequential-number generation (no OrderNumber/ReceiptNumber paths in sync/export); INT-11 cases live in D03/D04
- [x] Edge/boundary cases present where meaningful — zero-change export (TC-D10.019), unknown tenant (TC-D10.023), unknown-strategy entity (TC-D10.021), hung API timeout (TC-D10.003), foreign-machine auth.json (TC-D10.006), offline full-failure run (TC-D10.034), invalid direction param (TC-D10.035). **Partially N/A with reason:** money-math boundaries (zero/negative qty, rounding, multi-tax) belong to D03/D06 and are deliberately not duplicated here

## Discrepancy notes

1. **`GET /api/sync/status` returns 200, not 404/absent.** Doc-11 SYN-03 and the task brief describe the endpoint as a "TODO stub (404/absent)". Verified `SyncController.cs:70-79`: it exists and returns **200 OK** with `{ Message = "Sync status endpoint - to be implemented", LastSync = DateTime.UtcNow }`. TC-D10.036 asserts the verified stub behavior per the strategy's reality-check rule.
2. **`SyncController` endpoints are anonymous.** `SyncController` (`SyncController.cs:14-26`) has no `[Authorize]`/ClaimCheck — `POST /api/sync/now` and `GET /api/sync/status` succeed unauthenticated. Not catalogued in doc-11 (SEC-02 covers only the Electron side). Flagged for the SEC workstream; captured as Gap-Char asserts in TC-D10.036 rather than a separate case to avoid inventing a gap ID.
3. **Push never advances `LastPushSync`.** `UpdateSyncMetadata` is invoked only with `isPull: true` (`SyncEngine.cs:161`); `PushChangesAsync` (174-236) contains no push-watermark update, though `ChangeTrackingService.UpdateSyncMetadata` supports it (`ChangeTrackingService.cs:147-168`). Every push therefore rescans changes since `DateTime.MinValue`, and per-entity dedup relies solely on `MarkAsSynced`/`LastSyncedAt`. Characterized in TC-D10.041; adjacent to (but distinct from) SYN-02.
4. **`SyncLog.Direction` is hard-coded `Bidirectional`** (`SyncEngine.cs:298`) regardless of the actual `options.Direction` executed — pull/push-only runs are logged as Bidirectional. Characterized in TC-D10.039.
5. **`SyncOptions.ConflictStrategy` exists but is ignored on push** (`SyncEngine.cs:319` defaults to ServerWins; `PushChangesAsync` never consults it — 409 → skip at 212-218). Strengthens the SYN-02 characterization in TC-D10.030; the Gap-Target (TC-D10.031) should either wire this option or replace it.
6. **WF-10.1 line-citation nuances:** the cloud-login window sets `devTools: false` with the comment "Explicitly enable DevTools" (`main.js:554`) yet `openDevTools()` is still called unconditionally (`main.js:559`) — both facts captured in TC-D10.011. The splash window (`main.js:467-469`) sets `nodeIntegration: false` but leaves `contextIsolation` unset (Electron default applies) — noted in TC-D10.007.
7. **Export zip is fully buffered in memory** before streaming (`File.ReadAllBytesAsync`, `TenantsController.cs:305/338`), compounding SYN-04's unbounded-size risk (disk **and** memory). Documented in TC-D10.019's asserts.
8. **"Tenant exists → 409-ish" provisioning semantics:** WF-10.2 defines no server-side 409 duplicate-provision endpoint; the closest real behaviors are (a) client-side re-run guard — `POSDb.db` present → no re-download (TC-D10.004/050) and (b) unknown-tenant export failing cleanly (TC-D10.023). The catalog tests the verified behaviors instead of an assumed 409 contract.
