# 10 — QA Test Suite: Desktop Electron, Offline Mode & Cloud Sync

**Module:** Desktop Shell (Electron), Embedded SQLite Engine, Database Download, Offline POS & Cloud Synchronization  
**Location:** `Documentation/QA/10_QA_DESKTOP_ELECTRON_OFFLINE_SYNC_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** N-01, N-06, N-32, SEC-02, SYN-01, SYN-02, SYN-03, SYN-04

---

## 1. Module Overview & Quality Objectives
The Desktop and Offline Synchronization subsystem allows MILPOS to function as a standalone, zero-latency desktop application on Windows client machines. It packages an Electron GUI shell, an embedded self-contained ASP.NET Core 10 Web API, a local SQLite database (`pos.db`), an initial cloud database download pipeline (`/api/tenants/my-database`), and a bidirectional cloud sync engine.

### Primary Risks & Failure Modes:
- **Offline DB Download Schema-Stale Failure (N-32):** The shipped template SQLite database (`POSDb.db`) is schema-stale; copying it directly and bulk-inserting cloud records throws SQLite column missing errors (`SupplierAddresses.CreatedBy`, `Customers.LocationId`, etc.), crashing the desktop setup process with a 500 error.
- **Unauthenticated Sync Controller Vulnerability (N-01):** `SyncController` completely lacks `[Authorize]` attributes, allowing unauthenticated anonymous HTTP calls to trigger database sync passes or query sync health.
- **Stubbed Sync Status & Stale Push Epoch (N-06):** `GET /api/sync/status` returns a static stub rather than live telemetry, and push sync never updates `LastPushSync`, forcing every push to rescan the entire database since epoch.
- **Asymmetric 6-Entity Pull Limitation (SYN-01):** Pull synchronization is restricted to only 6 entities (products, categories, brands, units, customers, taxes); purchase orders, expenses, payments, and stock adjustments are never pulled.
- **Push Conflict Silent Dropping (SYN-02):** When a desktop record generates a 409 conflict on the cloud server, the sync engine silently skips the row without retry, dropping local offline transactions.

---

## 2. Test Cases with Concrete Execution Data

### QA-DSK-001 — Desktop Database Export & Schema Reconciliation (N-32 Fix Verification)
- **Aspect / Sub-Module:** Desktop Setup & Database Download Pipeline
- **Test Type:** Integration & Defect Fix Verification (N-32)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/Tenant/Handlers/ExportTenantToSqliteCommandHandler.cs`
- **Preconditions:**
  - Tenant `Retail Corp Alpha` has active cloud data (users, locations, products, sales, customers).
  - Client authenticates with valid cloud token.
- **Concrete Test Data:**
  - **Endpoint:** `GET /api/tenants/my-database`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Call `GET /api/tenants/my-database`.
  2. Inspect response HTTP status code, Content-Type, and Content-Disposition.
  3. Extract the downloaded ZIP archive to a temporary directory.
  4. Validate the extracted `pos.db` SQLite database using SQLite command-line or DB Browser.
- **Expected Results (Fixed State N-32):**
  - **HTTP Status Code:** `200 OK`.
  - **Content-Type:** `application/zip`.
  - **Archive Contents:** Contains valid `pos.db` and `appsettings.json`.
  - **Schema Validation:**
    - Table `SupplierAddresses` contains column `CreatedBy`.
    - Table `Customers` contains column `LocationId`.
    - SQLite magic bytes (`53 51 4C 69 74 65 20 66 6F 72 6D 61 74 20 33 00`) verified.
  - **Defect Verification (N-32 Pre-Fix State):** In unfixed code, `ExportTenantToSqliteCommandHandler` crashes with 500 error (`table SupplierAddresses has no column named CreatedBy`). Test proves `ReconcileMissingColumnsAsync` adds missing columns.
- **QA Pass/Fail Checklist:**
  - [ ] ZIP archive downloads successfully with HTTP 200.
  - [ ] Extracted SQLite database opens cleanly and contains cloud tenant data.

---

### QA-DSK-002 — Unauthenticated Sync Controller Security Probe (N-01 Finding)
- **Aspect / Sub-Module:** Sync API Security Audit
- **Test Type:** Security / Access Control Audit (N-01)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/SyncController.cs`
- **Preconditions:** Unauthenticated client (no Bearer token, anonymous HTTP request).
- **Concrete Test Data:**
  - **Probe 1 (Sync Status):** `GET /api/sync/status`
  - **Probe 2 (Trigger Push):** `POST /api/sync/push`
    ```json
    {
      "lastSyncDate": "2026-09-01T00:00:00Z"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Send GET request to `/api/sync/status` without auth token.
  2. Send POST request to `/api/sync/push` without auth token.
- **Expected Results (Hardened Target):**
  - Both requests strictly return `401 Unauthorized`.
- **Defect Verification (N-01 Vulnerability):**
  - In unfixed code, `SyncController` has NO `[Authorize]`. Probe 1 returns 200 with status stub, and Probe 2 accepts anonymous sync pushes.
- **QA Pass/Fail Checklist:**
  - [ ] Anonymous sync requests are blocked.
  - [ ] Log defect N-01 if sync controller allows unauthenticated access.

---

### QA-DSK-003 — Offline POS Transaction Persistence (Simulated Network Outage)
- **Aspect / Sub-Module:** Desktop Standalone Offline Execution
- **Test Type:** Resilience & Offline Functional
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** Electron embedded runtime, local `pos.db`
- **Preconditions:**
  - Desktop Electron app launched with embedded API on `http://localhost:5000`.
  - Machine network adapter disabled (Offline mode: zero internet or cloud connectivity).
- **Concrete Test Data:**
  - Cashier scans 2 × `PROD-001` (Rice) @ 180.00 + tax = 421.20 total.
  - Payment: Cash 500.00, Change 78.80.
- **Step-by-Step Execution Procedure:**
  1. With network unplugged, complete POS checkout in desktop app.
  2. Verify receipt printing dialog.
  3. Query local SQLite database `pos.db`:
     `SELECT OrderNumber, TotalAmount, DeliveryStatus FROM SalesOrders;`
  4. Query `SyncMetadata` table to check sync queue state.
- **Expected Results:**
  - Order completes instantly with green success toast notification.
  - Receipt prints with offline order number e.g. `SO-OFFLINE-0001`.
  - SQLite database commits the sale locally with balanced debits and credits.
  - Record marked with `SyncStatus = 0 (PendingPush)`.
- **QA Pass/Fail Checklist:**
  - [ ] Checkout completes with zero cloud network access.
  - [ ] Transaction committed locally and queued for cloud sync.

---

### QA-DSK-004 — Cloud Push Sync & LastPushSync Timestamp Advancement (N-06)
- **Aspect / Sub-Module:** Cloud Sync Engine Telemetry
- **Test Type:** Data Sync & Characterization (N-06)
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.Domain/Services/SyncEngine.cs`
- **Preconditions:**
  - 5 offline sales orders completed in desktop mode.
  - Network connection restored.
- **Concrete Test Data:**
  - Trigger desktop sync push to cloud API.
- **Step-by-Step Execution Procedure:**
  1. Trigger cloud sync.
  2. Verify all 5 orders are uploaded to cloud database.
  3. Inspect local SQLite `SyncMetadata` table:
     `SELECT LastPushSync, LastPullSync FROM SyncMetadata;`
- **Expected Results (Target Behavior):**
  - Cloud database receives and persists all 5 orders.
  - `LastPushSync` advances to the current timestamp e.g. `2026-09-06T13:30:00Z`.
- **Defect Verification (N-06 Bug):**
  - In unfixed code, `LastPushSync` never advances, causing the desktop sync engine to rescan all tables from epoch (year 2000) on every subsequent sync pass.
- **QA Pass/Fail Checklist:**
  - [ ] Offline transactions synchronize to cloud without data loss.
  - [ ] Verify if `LastPushSync` advances properly.

---

### QA-DSK-005 — Push Sync 409 Conflict Handling (SYN-02 Finding)
- **Aspect / Sub-Module:** Sync Conflict Resolution Strategy
- **Test Type:** Conflict Resolution & Edge Case (SYN-02)
- **Priority & Severity:** P1 (High)
- **Source & References:** `SyncEngine.cs`
- **Preconditions:**
  - Customer `CUST-001` updated on desktop offline (Phone changed to `03009999999`).
  - Same customer updated on cloud simultaneously (Phone changed to `03008888888`).
- **Concrete Test Data:**
  - Push desktop update to cloud. Cloud returns `409 Conflict`.
- **Step-by-Step Execution Procedure:**
  1. Trigger sync push encountering conflict.
  2. Inspect sync log and local customer record.
- **Expected Results:**
  - System applies conflict strategy (ServerWins or LastWriteWins) with audit log.
- **Defect Verification (SYN-02 Gap):**
  - In unfixed code, 409 conflicts are silently caught and skipped; the local record is never retried and remains permanently out-of-sync with cloud.
- **QA Pass/Fail Checklist:**
  - [ ] Sync conflict triggers explicit resolution policy.
  - [ ] No silent permanent data desynchronization.

---

### QA-DSK-006 — Electron Security Configuration Audit (SEC-02 Finding)
- **Aspect / Sub-Module:** Electron Desktop Shell Hardening
- **Test Type:** Security / Desktop Shell Hardening (SEC-02)
- **Priority & Severity:** P1 (High)
- **Source & References:** `SourceCode/Angular/main.js:createMainWindow()`
- **Preconditions:** Electron desktop installation files inspected.
- **Concrete Test Data:**
  - Inspect `main.js` window creation parameters.
- **Step-by-Step Execution Procedure:**
  1. Read `main.js` configuration for `BrowserWindow`.
  2. Check `webPreferences`:
     - `nodeIntegration`
     - `contextIsolation`
  3. Inspect if `openDevTools()` is called in production builds.
- **Expected Results (Hardened Security Target):**
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - DevTools disabled in production builds.
- **Defect Verification (SEC-02 Finding):**
  - In unfixed code, `main.js` sets `nodeIntegration: true` and `contextIsolation: false`, exposing native Node.js APIs to renderer scripts.
- **QA Pass/Fail Checklist:**
  - [ ] Electron configuration enforces context isolation.
  - [ ] Document SEC-02 finding if node integration is enabled.
