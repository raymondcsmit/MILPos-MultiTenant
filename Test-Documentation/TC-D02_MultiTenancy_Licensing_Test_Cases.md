# TC-D02 — Multi-Tenancy & Licensing Test Cases

**Source:** `New-Documents/02_MultiTenancy_Licensing_Workflows.md` (WF-2.1 … WF-2.5), `New-Documents/11_Workflow_Gaps_Enhancement_Signals.md` (SEC-03, SEC-06, SEC-07, UX-01)
**Scope:** tenant registration with full data provisioning, per-request tenant resolution middleware chain, SuperAdmin impersonation/switch, trial & license enforcement, license activation/generation.
**Workflows covered:** WF-2.1, WF-2.2, WF-2.3, WF-2.4, WF-2.5
**Gap signals referenced:** SEC-03, SEC-06, SEC-07, UX-01 (doc-11); T-01…T-04 (doc-02 signals mapped to these).

**Code verification basis (spot-checked 2026-08-28):**
- Middleware registration order: `POS.API/Startup.cs:383` (GlobalExceptionHandler) → `:433` (UseAuthentication) → `:434` (ApiKeyAuthenticationMiddleware) → `:439` (TenantResolutionMiddleware, conditional on `DeploymentSettings.MultiTenancy.Enabled`) → `:443` (UseAuthorization) → `:444` (TrialEnforcementMiddleware).
- `POS.API/Controllers/Middleware/TenantResolutionMiddleware.cs:23-67` (subdomain → X-Tenant-ID [SuperAdmin only] → JWT `TenantId` claim → `tenantProvider.SetTenantId`), `:72-87` (`ExtractSubdomain`: `parts[0]` when ≥3 labels; localhost/127.0.0.1/IP → null).
- `POS.API/Controllers/Middleware/ApiKeyAuthenticationMiddleware.cs:28-64` (valid key → principal `SyncClient`/role `SyncAgent`, `Items["TenantId"]`, `ApiKeyLastUsedDate=UtcNow` **with `SaveChangesAsync` per request**; invalid → 401 `"Invalid API Key"`).
- `POS.API/Controllers/Middleware/TenantIdAuthenticationMiddleware.cs:27-68` (skip swagger/api/auth/api/account; `X-Tenant-ID` header or `tenantId` query; invalid GUID → 401 `"Invalid TenantId format"`; unknown/inactive → 403 `"Invalid or inactive TenantId"`; absent → pass-through).
- `POS.API/Controllers/Middleware/TrialEnforcementMiddleware.cs:49-53` (OPTIONS/HEAD pass), `:55-62` (allowlist incl. `/api/WrLicense/validate`, `/api/CompanyProfile/activate_license`, `/api/Tenants/register`, `/api/Sync`), `:64-69` (isSuperAdmin bypass), `:98-129` (License-entity branch: expired → 403 `"License Expired. Please Renew License."` on POST/PUT/DELETE/PATCH only), `:132-139` (profile `LicenseKey` ≠ `"AAABBB"` → allow), `:141-195` (tenant trial: `TrialExpiryDate ?? SubscriptionEndDate ?? profile.CreatedDate+14d`; past-due → 403 `"Trial Period Expired. Please Purchase License."` on write verbs), `:196-220` (no-tenant desktop path off `profile.CreatedDate`).
- `POS.Domain/Context/POSDbContext.cs:1429` (global query filter `TenantId == CurrentTenantId && !IsDeleted`), `:1437-1447` (`SaveChanges(Async)` → `ApplyTenantId`), `:1449-1517` (auto-stamp `TenantId` on Added `BaseEntity`/`User`/`Role` when `Guid.Empty`/null; skip when tenantId unresolved).
- `POS.MediatR/Tenant/Handlers/RegisterTenantCommandHandler.cs:40-114` (execution strategy + explicit transaction; subdomain dup → 400 `"Subdomain already exists."`; `AddUserCommand` default password; commit/rollback → 400).
- `POS.MediatR/Tenant/Handlers/SwitchTenantCommandHandler.cs:37-84` (IgnoreQueryFilters → 404 `"Target tenant not found."`; inactive → 400 `"Cannot switch to an inactive tenant."`; email → 401 `"User not found."`; in-memory impersonated user, never persisted).
- `POS.API/Controllers/TenantsController.cs:45-46` (`register` `[AllowAnonymous]`), `:247-266` (`{id}/switch` SuperAdmin → `{ token, tenantId }`), `:271-287` (`license/generate`).
- `POS.MediatR/WrLicense/Handler/ValidateLicenseCommandHandler.cs:44-106` (empty code → 409; no profile → 404; LicenseKey = `Guid "N"` uppercase; tenant → `LicenseType=Paid`, `TrialExpiryDate=null`, `SubscriptionEndDate=null`, plan Trial→Paid; cache eviction; `BearerToken = "DUMMY_TOKEN_FOR_LICENSE_VALIDATION"`).
- `POS.MediatR/Tenant/Handlers/UpdateTenantLicenseCommandHandler.cs:36-71`, `GenerateTenantLicenseKeysCommandHandler.cs:35-71`.
- `SourceCode/Angular/src/app/tenant/tenant-list/tenant-list.ts:91-107` (stores `'auth_token'`, `localStorage.clear()`, `window.location.href='/'`); `SourceCode/Angular/src/app/core/services/wr-license.service.ts:16` (`BEARER_TOKEN: 'access_token'`); `SourceCode/Angular/src/app/http-request-interceptor.ts:64-65` (403 `isTrialExpired` → `/subscription`).

**Test data prerequisites (shared seed):**
- Tenant A (`subdomain: alpha`, active, licensed placeholder profile), Tenant B (`subdomain: beta`, active, trial), Tenant C (inactive), Tenant M (`SubscriptionPlan="Master"`, seed master).
- Users: `superadmin` (claim `isSuperAdmin=true`, no tenant data ownership), `alpha-admin` (Tenant A, all claims), `beta-admin` (Tenant B), `cashier` (Tenant A, POS claims only).
- Products: P-A1 (Tenant A), P-B1 (Tenant B), same `Code` `"SKU-001"` in both tenants to prove filtering.
- Open FinancialYear FY2026 per tenant; Chart of Accounts per WF-6.2.
- Fixed clock injection (`TimeProvider`/`ISystemClock` stub) for trial-math tests; `TestWebApplicationFactory` (SQLite, per-class DB).

---

## WF-2.1 — Tenant Registration Workflow (Self-Service Signup)

### TC-D02.001 — Register tenant creates active Trial tenant with 14-day clock and ApiKey
- **Layers:** IT, PM, E2E
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.1 (RegisterTenantCommandHandler.cs:52-66, TenantInitializationService.cs:17-42)
- **Arrange:** no tenant with subdomain `gamma` exists; anonymous client
- **Act:** POST `/api/Tenants/register` `{ name:"Gamma Traders", subdomain:"gamma", adminEmail:"admin@gamma.test", adminPassword:"Str0ng!Pass1", businessType:"Retail", phone:"+92000111222", address:"Karachi" }`
- **Assert (IT):** 200 · response `Tenant` has `IsActive==true`, `SubscriptionPlan=="Trial"`, `LicenseType=="Trial"`, `MaxUsers==5`, `SubscriptionStartDate` within 1 min of UtcNow, `SubscriptionEndDate==TrialExpiryDate==SubscriptionStartDate+14d` (exact 14.0 days ±1 min), `ApiKey` non-empty (32+ chars), `ApiKeyEnabled==true` · `Users` row with Email `admin@gamma.test`, `TenantId==tenant.Id`, `IsAllLocations==true` · `CompanyProfile.Title=="Gamma Traders"` · register is on the trial-middleware allowlist, so no 403 before it
- **Assert (PM):** response matches Tenant schema; follow-up `POST /api/authentication/login` with admin credentials returns 200 (proves WF-2.1→WF-1.1 chaining)
- **Assert (E2E):** signup form → success toast → redirected to login page of the new tenant

### TC-D02.002 — Registration provisions full default data set per WF-2.1 (roles, menus 4-perm grants, COA, open FY, location, products)
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.1 (SeedTenantDataAsync, TenantRegistrationService.cs:51-146; TenantDataCloner.cs:23-67)
- **Arrange:** master tenant M exists (so Path A master-clone shortcut runs); anonymous register for `delta`
- **Act:** POST `/api/Tenants/register` `{ subdomain:"delta", ... }` then inspect new tenant DB slice
- **Assert (IT):** all rows exist with `TenantId==delta.Id`: ≥1 `Role` incl. `"Admin"`; `UserRole` linking admin user ↔ Admin role; ≥1 `Location` named `"Main Warehouse"`; `UserLocation` for admin; exactly 1 open `FinancialYear` covering current calendar year; `LedgerAccounts` seeded (contains accounts 1100/1050/1200/4100/5100 — count ≥11 per WF-6.2 list); `MenuItem` rows ≥1 and for every MenuItem ≥2 `RoleMenuItem` rows granting CanView+CanCreate+CanEdit+CanDelete to Super Admin and Admin roles; ≥1 `Product` with ≥1 `ProductStock` row **with `CurrentStock==0`** (clone path zeroes quantities); `CompanyProfile.LicenseKey=="AAABBB"` · total seeded-table set matches doc's entity list (Supplier, Customer, Tax, UnitConversation, Brand, ProductCategory, ExpenseCategory, EmailTemplate, EmailSMTPSetting, Action, Page)

### TC-D02.003 — Master-clone path preserves isolation: unmapped ActionIds skipped, ProductStock zeroed, new Guids
- **Layers:** IT
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-2.1 Path C (TenantDataCloner.cs:215-360, CloneEntity 362-452)
- **Arrange:** master M has product P-M with ProductStock.CurrentStock=50, a batch-only Action row A-X not mapped to any master Role; register `epsilon`
- **Act:** POST `/api/Tenants/register` `{ subdomain:"epsilon" }`; query both tenants' rows
- **Assert (IT):** cloned Product has new Guid ≠ P-M.Id, `TenantId==epsilon.Id`, same Name/Code · cloned ProductStock `CurrentStock==0` (not 50) · no `InventoryBatch` rows for epsilon (batch table empty per doc-02 gap) · no `RoleClaim` in epsilon references master-only ActionId A-X · no epsilon row carries any master Guid (spot-check Products, LedgerAccounts, MenuItems)

### TC-D02.004 — Duplicate subdomain rejected with 400 before any provisioning
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Validation
- **Source:** WF-2.1 (RegisterTenantCommandHandler.cs:47-50)
- **Arrange:** tenant A exists with subdomain `alpha`
- **Act:** POST `/api/Tenants/register` `{ subdomain:"alpha", name:"Copy", adminEmail:"x@y.test" }`
- **Assert (IT):** 400 · body contains exact message `"Subdomain already exists."` · `Tenants` count with Subdomain `alpha` == 1 · no new User, CompanyProfile, Product rows created (rollback/no-op)

### TC-D02.005 — Registration is atomic: failure during admin-user creation rolls back everything
- **Layers:** IT
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-2.1 (RegisterTenantCommandHandler.cs:83-88, 102-113)
- **Arrange:** sabotage path — pre-create Identity user with email `taken@dup.test` so `AddUserCommand` fails inside the transaction (or force seed failure via fault-injected repository)
- **Act:** POST `/api/Tenants/register` `{ subdomain:"zeta", adminEmail:"taken@dup.test" }`
- **Assert (IT):** 400 · body contains `"Admin user creation failed"` · `Tenants` with Subdomain `zeta` count == 0 · `CompanyProfile`/`Role`/`Location`/`Product` rows with TenantId == zeta's (would-be) id == 0 — transaction rollback proven

### TC-D02.006 — Omitted admin password defaults to seed constant `admin@123` (characterization of known gap)
- **Layers:** IT
- **Priority:** P1
- **Category:** Gap-Char
- **Source:** WF-2.1 ⚠ GAP (RegisterTenantCommandHandler.cs:76, `AppConstants.Seeding.DefaultPassword`)
- **Arrange:** anonymous client; no password field
- **Act:** POST `/api/Tenants/register` `{ subdomain:"theta", adminEmail:"admin@theta.test" }` (no `adminPassword`)
- **Assert (IT):** 200 · POST `/api/authentication/login` `{ userName:"admin@theta.test", password:"admin@123" }` → 200 with valid JWT · login with password `"wrong"` → 401 — proves the default weak password is live (guards current behavior until a password policy lands; deliberate guard, not endorsement)

### TC-D02.007 — Seeded CompanyProfile carries placeholder LicenseKey `AAABBB` / PurchaseCode `CCCCRR`
- **Layers:** IT, UT
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-2.1 Path B step 1 (TenantRegistrationService.cs:291-308); feeds WF-2.4 placeholder check (TrialEnforcementMiddleware.cs:132-133)
- **Arrange:** fresh registration `iota`
- **Act:** GET `/api/CompanyProfile` with iota admin JWT (AllowAnonymous GET per CompanyProfileController.cs:34)
- **Assert (IT):** 200 · `LicenseKey=="AAABBB"`, `PurchaseCode=="CCCCRR"`, `Title` == registered tenant name
- **Assert (UT):** trial-check helper `IsActivatedLicense("AAABBB") == false`, `IsActivatedLicense(null/empty) == false`, `IsActivatedLicense(any other non-empty) == true` — placeholder is the sentinel

### TC-D02.008 — Trial period math: exactly 14 days from UtcNow, deterministic under injected clock
- **Layers:** UT, IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.1 (`AppConstants.TenantConfig.TrialPeriodDays==14`, TenantInitializationService.cs:17-42)
- **Arrange:** injected fixed clock `2026-08-28T10:00:00Z`
- **Act:** call `InitializeNewTenant(...)` (UT); register via API (IT)
- **Assert (UT):** `SubscriptionStartDate==2026-08-28T10:00:00Z` · `TrialExpiryDate==2026-09-11T10:00:00Z` · `SubscriptionEndDate==TrialExpiryDate` · `MaxUsers==5` · `BusinessType` defaults to `"Retail"` when not supplied
- **Assert (IT):** stored Tenant row matches the same instant ±1 min

### TC-D02.009 — Anonymous registration accepts requests with no captcha / no email verification (current abuse surface)
- **Layers:** IT, PM
- **Priority:** P1
- **Category:** Gap-Char
- **Source:** WF-2.1 ⚠ GAP + doc-11 **SEC-06** (TenantsController.cs:45-46 `[AllowAnonymous]`)
- **Arrange:** nothing; controller has no captcha/verification dependency registered
- **Act:** 5 sequential POSTs to `/api/Tenants/register` with distinct subdomains, **no captcha token, no verified email, same IP**
- **Assert (IT):** all 5 → 200 · 5 Tenant rows created — characterizes today's wide-open endpoint (rate limiting/anti-abuse absent; see SEC-07 middleware note). PM: same 5 requests in collection runner all green.

### TC-D02.010 — Registration requires server-side anti-abuse token (captcha/email verification) — RED until fix
- **Layers:** IT, PM
- **Priority:** P1
- **Category:** Gap-Target [SEC-06]
- **Source:** doc-11 SEC-06 + WF-2.1 enhancement (T-01)
- **Arrange:** registration endpoint enhanced with server-verified anti-abuse (captcha token or email verification code required)
- **Act:** POST `/api/Tenants/register` with valid payload but **missing/invalid** `captchaToken`
- **Assert (IT):** 400 · body indicates anti-abuse validation failure · zero Tenant rows created · a second POST with a valid (test-signed) token → 200. **RED by definition until SEC-06 enhancement lands.**

### TC-D02.011 — Concurrent registrations with the same subdomain: exactly one wins
- **Layers:** IT
- **Priority:** P1
- **Category:** Concurrency
- **Source:** WF-2.1 (check-then-insert at RegisterTenantCommandHandler.cs:47-50) + rules-checklist concurrency requirement
- **Arrange:** no tenant `lambda`; fire two registrations in parallel (`Task.WhenAll`)
- **Act:** both POST `/api/Tenants/register` `{ subdomain:"lambda" }` simultaneously
- **Assert (IT):** exactly 1 response is 200 and 1 is 400/409 (no partial double-insert; DB unique constraint or transaction serializes) · `Tenants` with Subdomain `lambda` count == 1 · the loser's error does not leave orphaned admin-user/seed rows

---

## WF-2.2 — Tenant Resolution Middleware Chain (Per-Request)

### TC-D02.012 — UT: subdomain extraction for ≥3-label hosts returns first label
- **Layers:** UT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.2A (TenantResolutionMiddleware.cs:72-87)
- **Arrange:** `ExtractSubdomain` under test via reflection/`Invoke` helper (no HTTP)
- **Act:** call with `host = "alpha.milpos.com"`, `"deep.sub.milpos.com"`
- **Assert (UT):** returns `"alpha"` and `"deep"` respectively (always `parts[0]` when `parts.Length >= 3`)

### TC-D02.013 — UT: subdomain extraction skips localhost, loopback IP, any IP, and 2-label hosts
- **Layers:** UT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-2.2A (TenantResolutionMiddleware.cs:76-86)
- **Arrange:** as TC-D02.012
- **Act:** call with `"localhost"`, `"localhost:5000"` host `"localhost"`, `"127.0.0.1"`, `"192.168.1.10"`, `"milpos.com"` (2 labels)
- **Assert (UT):** all return `null` (no tenant resolution from host; desktop/local mode)

### TC-D02.014 — Subdomain host resolves the active tenant and scopes every query to it
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.2A steps 1-2 (TenantResolutionMiddleware.cs:23-39)
- **Arrange:** tenant A active with subdomain `alpha`; product P-A1 (code `SKU-001`)
- **Act:** GET `/api/Product/ SKU-A1` with `Host: alpha.milpos.com`, no Authorization header needed for resolution path (use alpha-admin JWT for authorization)
- **Assert (IT):** 200 · returned product `TenantId==A.Id`, Id==P-A1 · `TenantProvider.GetTenantId()==A.Id` (observed via `GET /api/Tenants/my-database` returning A's tenant id, TenantsController.cs:314-321) · follow-up query `dbContext.Tenants.Where(t=>t.Subdomain=="alpha")` used `IgnoreQueryFilters` semantics (resolves even while per-request filter is set)

### TC-D02.015 — Inactive/unknown subdomain falls through to JWT `TenantId` claim fallback
- **Layers:** IT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-2.2A steps 2-4 (TenantResolutionMiddleware.cs:28-62: lookup requires `t.IsActive`; null tenant → claim fallback)
- **Arrange:** tenant C inactive with subdomain `gamma-c`; beta-admin JWT (claim `TenantId==B.Id`)
- **Act:** GET `/api/Tenants/my-database` with `Host: gamma-c.milpos.com` + beta-admin JWT
- **Assert (IT):** 200 · tenant id == **B.Id** (not C.Id — subdomain did not resolve because tenant inactive; JWT claim used) · repeat with `Host: nosuch.milpos.com` → same result B.Id

### TC-D02.016 — SuperAdmin `X-Tenant-ID` header impersonation channel resolves target tenant
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.2A step 3 (TenantResolutionMiddleware.cs:42-52); TenantProvider.cs:33-40 mirrors it
- **Arrange:** superadmin JWT (claim `isSuperAdmin=true`, own TenantId possibly A); tenant B active
- **Act:** GET `/api/Tenants/my-database` with superadmin JWT + header `X-Tenant-ID: <B.Id>`
- **Assert (IT):** 200 · tenant id == **B.Id** (header beats superadmin's own claim) · GET `/api/customers` returns only B's customers (empty if none seeded)
- **Assert (PM):** environment `local-cloud` variable `tenantId` switched to B; collection's next requests all read B's data (chained `pm.collectionVariables` test script asserts first customer's `tenantId` field if present)

### TC-D02.017 — Non-SuperAdmin `X-Tenant-ID` header is ignored (claim wins)
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-2.2A step 3 guard (TenantResolutionMiddleware.cs:44-52 requires `isSuperAdmin`)
- **Arrange:** alpha-admin JWT (TenantId==A), tenant B exists
- **Act:** GET `/api/Tenants/my-database` with alpha-admin JWT + header `X-Tenant-ID: <B.Id>`
- **Assert (IT):** 200 · tenant id == **A.Id** — header silently ignored for non-superadmins; no privilege escalation · GET `/api/customers` returns only A's customers

### TC-D02.018 — Cross-tenant GET by id returns 404; cross-tenant list returns empty (query filter)
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Tenant-Isolation
- **Source:** WF-2.2 (POSDbContext.cs:1429 `TenantId == CurrentTenantId && !IsDeleted`); strategy §1 integration ownership
- **Arrange:** product P-B1 exists in tenant B only (same Code `SKU-001` also in A); alpha-admin JWT resolves tenant A
- **Act:** GET `/api/Product/{P-B1.Id}` and GET `/api/Product` (list) with alpha-admin JWT (no host subdomain, no header)
- **Assert (IT):** GET by B's id → **404** (not 403 — filtered out, invisible) · list → 200, **zero rows with TenantId==B.Id**; P-A1 present exactly once · repeat the pair with beta-admin JWT: P-B1 by id → 200, list contains P-B1 not P-A1
- **Assert (PM):** two-environment runner (`tenantId`=A then B) — same product id request yields 404 then 200 respectively

### TC-D02.019 — Soft-deleted rows are invisible to filtered queries but visible to admin `IgnoreQueryFilters` paths
- **Layers:** IT
- **Priority:** P1
- **Category:** Tenant-Isolation
- **Source:** WF-2.2 (POSDbContext.cs:1429 filter includes `!IsDeleted`; doc: admin paths deliberately bypass)
- **Arrange:** tenant A product P-A1 with `IsDeleted=true` (soft-delete via DELETE endpoint); alpha-admin JWT
- **Act:** GET `/api/Product/{P-A1.Id}` (regular endpoint) then list
- **Assert (IT):** GET by id → 404 · list → does not contain P-A1 · a registered SuperAdmin `IgnoreQueryFilters` listing (e.g., `/api/Tenants` style admin query over products) still finds P-A1 with `IsDeleted==true` — proves filter, not hard deletion

### TC-D02.020 — SaveChanges auto-stamps TenantId from TenantProvider on Added entities
- **Layers:** UT, IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.2 (POSDbContext.cs:1437-1447, 1449-1517)
- **Arrange (IT):** alpha-admin JWT (tenant A resolved); entity created with `TenantId` left `Guid.Empty` (POST `/api/Brand` `{name:"Z-Brand"}`)
- **Act:** POST `/api/Brand`; then direct-context test: set `TenantProvider.SetTenantId(A.Id)`, `Add` a `BaseEntity`-derived entity with TenantId unset, `SaveChangesAsync`
- **Assert (IT):** 200/201 · stored Brand row `TenantId==A.Id` — stamped by `ApplyTenantId`, not by the DTO (DTO had no tenant field) · audit fallback: `CreatedDate` non-default
- **Assert (UT):** entity `TenantId` mutated to `A.Id` before base save; with provider returning `null`, `ApplyTenantId` skips (entity keeps `Guid.Empty` — first-tenant bootstrap allowance, POSDbContext.cs:1451-1457) · `User` and `Role` added-entities also stamped (POSDbContext.cs:1499-1517)

### TC-D02.021 — Valid `X-API-Key` authenticates sync client and stamps `ApiKeyLastUsedDate`
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.2C (ApiKeyAuthenticationMiddleware.cs:28-58)
- **Arrange:** tenant A with `ApiKey="TESTKEY-123"`, `ApiKeyEnabled=true`; record `ApiKeyLastUsedDate` before
- **Act:** GET `/api/Tenants/my-database` with header `X-API-Key: TESTKEY-123`, **no JWT**; then GET an authorized sync endpoint requiring role `SyncAgent`
- **Assert (IT):** 200 · tenant id == A.Id (middleware matched by `ApiKey==key && ApiKeyEnabled` with `IgnoreQueryFilters`) · `context.User` has claims `TenantId==A.Id`, `ApiKeyAuthenticated==true`, `Name=="SyncClient"`, `Role=="SyncAgent"` (observable: SyncAgent-guarded endpoint returns 200 without JWT) · DB `Tenant.ApiKeyLastUsedDate` > recorded-before (UtcNow write, ApiKeyAuthenticationMiddleware.cs:40-41) · `Items["TenantIdAuthenticated"]==true`
- **Assert (PM):** desktop environment (`local-desktop`) collection folder runs fully on `X-API-Key` header, no token variable

### TC-D02.022 — Invalid or disabled API key rejected 401 with exact body
- **Layers:** IT
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-2.2C (ApiKeyAuthenticationMiddleware.cs:59-65)
- **Arrange:** tenant A key enabled; a second tenant with `ApiKeyEnabled=false` and key `DISABLED-1`
- **Act:** GET any endpoint with `X-API-Key: WRONG-KEY`; then `X-API-Key: DISABLED-1`
- **Assert (IT):** both → **401**, response body exactly `"Invalid API Key"` · request pipeline short-circuited (no controller executed — no auth-challenge headers from MVC) · tenant A's `ApiKeyLastUsedDate` unchanged

### TC-D02.023 — API-key middleware performs a synchronous DB write on every keyed request (SEC-07 characterization)
- **Layers:** IT
- **Priority:** P1
- **Category:** Gap-Char
- **Source:** doc-11 **SEC-07** + WF-2.2 ⚠ GAP (ApiKeyAuthenticationMiddleware.cs:39-41 `SaveChangesAsync` inside middleware)
- **Arrange:** tenant A with enabled key; EF `DbCommandInterceptor` counting non-query writes on `Tenants` table
- **Act:** 3 consecutive GETs with `X-API-Key` (read-only endpoints, no business writes)
- **Assert (IT):** interceptor recorded **3 tenant UPDATE statements** (one per request, `ApiKeyLastUsedDate` refresh) — characterizes the per-request write cost; also proves DB outage during this write fails the request (fault-injected connection → 500, not 200)

### TC-D02.024 — API-key last-used stamping is batched/async and never blocks or fails the request — RED until fix
- **Layers:** IT
- **Priority:** P1
- **Category:** Gap-Target [SEC-07]
- **Source:** doc-11 SEC-07 enhancement ("async last-used stamping (batched)")
- **Arrange:** same interceptor harness as TC-D02.023 after enhancement lands
- **Act:** 3 consecutive API-keyed GETs; also run with fault-injected audit-write connection
- **Assert (IT):** all 3 GETs → 200 with **0 synchronous UPDATE statements on `Tenants` in the request path** · `ApiKeyLastUsedDate` reflects the requests within the batching flush window (e.g., background flush ≤60 s) · fault-injected write does NOT fail the request (200). **RED by definition until SEC-07 lands.**

### TC-D02.025 — Desktop-sync TenantIdAuthenticationMiddleware: header/query variants, invalid GUID 401, inactive 403, absent passes through
- **Layers:** IT
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-2.2B (TenantIdAuthenticationMiddleware.cs:27-68)
- **Arrange:** tenant A active, tenant C inactive; desktop client (no JWT, no subdomain host)
- **Act & Assert (IT), one sub-cluster per variant:**
  1. `X-Tenant-ID: <A.Id>` → pipeline continues; `Items["TenantId"]==A.Id`, `Items["TenantIdAuthenticated"]==true` (observed via a diagnostic echo/test-only endpoint or downstream controller reading Items)
  2. query `?tenantId=<A.Id>` (no header) → same Items set
  3. `X-Tenant-ID: not-a-guid` → **401** body `"Invalid TenantId format"`
  4. `X-Tenant-ID: <unknown-guid>` or `<C.Id>` → **403** body `"Invalid or inactive TenantId"`
  5. no header/query → pass-through (JWT path unharmed): with valid JWT request succeeds; swagger/auth/account paths skipped even with garbage header → no 401/403 from this middleware

### TC-D02.026 — Middleware order interactions: authentication gates before tenant scoping; trial enforcement runs last (after authorization)
- **Layers:** IT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-2.2 (Startup.cs:383→433→434→439→443→444); strategy integration ownership "middleware chain"
- **Arrange:** expired-trial tenant B; alpha-admin (valid) JWT; garbage JWT
- **Act & Assert (IT):**
  1. Request to a `[Authorize]` endpoint with **garbage JWT** → **401** (authentication middleware, position 433, short-circuits before TenantResolution/Trial can produce 403) — order observable: unauthorized yields 401, never a trial 403
  2. Same endpoint, valid JWT, **trial-expired** tenant → **403** `isTrialExpired:true` (TrialEnforcement, position 444, ran after UseAuthorization at 443)
  3. `OPTIONS` preflight to expired tenant → **204/200** passes (allowlist/OPTIONS branch at TrialEnforcementMiddleware.cs:49-53 fires even last)
  4. With `DeploymentSettings.MultiTenancy.Enabled==false` (desktop profile factory) the whole TenantResolution middleware is absent: alpha JWT request resolves tenant purely via claim path inside `TenantProvider` (TenantProvider.cs:42-47) and `/api/Tenants/my-database` still returns A.Id — single-tenant desktop mode skips subdomain resolution entirely

---

## WF-2.3 — Tenant Switching / Impersonation (SuperAdmin)

### TC-D02.027 — SuperAdmin switch returns token+tenantId and mints a JWT bound to the target tenant
- **Layers:** IT, PM, E2E
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.3 steps 1-3 (TenantsController.cs:247-266; SwitchTenantCommandHandler.cs:37-84)
- **Arrange:** superadmin JWT; active tenant B
- **Act:** POST `/api/Tenants/{B.Id}/switch`
- **Assert (IT):** 200 · body `{ token: <non-empty string>, tenantId: <B.Id> }` (exact shape, TenantsController.cs:261-265) · decode `token` JWT: claim `TenantId==B.Id`, `isSuperAdmin==true` retained, Email == superadmin's email · GET `/api/customers` with new token returns B's customers (CompanyProfile/license fields in token resolve against target per BuildUserAuthObject)
- **Assert (PM):** runner stores `token`/`tenantId` into environment; subsequent requests use them
- **Assert (E2E):** tenant-list switch button → app re-bootstraps on target tenant's data (see TC-D02.031/032 for storage-key behavior)

### TC-D02.028 — Switch to unknown tenant → 404; to inactive tenant → 400
- **Layers:** IT
- **Priority:** P1
- **Category:** Negative
- **Source:** WF-2.3 step 2 (SwitchTenantCommandHandler.cs:39-42)
- **Arrange:** superadmin JWT; tenant C inactive; random Guid G
- **Act:** POST `/api/Tenants/{G}/switch`; POST `/api/Tenants/{C.Id}/switch`
- **Assert (IT):** 404 with `"Target tenant not found."`; 400 with `"Cannot switch to an inactive tenant."` · no token in either response body · tenant C's `IsActive` still false

### TC-D02.029 — Switch endpoint forbidden without SuperAdmin policy
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-2.3 step 1 (TenantsController.cs:249 `[Authorize(Policy=SuperAdmin)]`)
- **Arrange:** alpha-admin JWT (no isSuperAdmin)
- **Act:** POST `/api/Tenants/{B.Id}/switch` with alpha-admin JWT
- **Assert (IT):** **403** · body is the framework authz error (no token/tenantId fields) · repeat with JWT missing entirely → 401 (authentication precedes authorization — chain order per WF-2.2)

### TC-D02.030 — Impersonated user is never persisted; roles/claims still derive from the original user
- **Layers:** IT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-2.3 step 2 (SwitchTenantCommandHandler.cs:61-77: in-memory clone, `IsAllLocations=true`, never saved)
- **Arrange:** superadmin user with exactly 1 `User` row (TenantId==superadmin realm), admin role assignments; target tenant B active
- **Act:** POST `/api/Tenants/{B.Id}/switch`; then query DB
- **Assert (IT):** `Users` table count unchanged · no User row with `TenantId==B.Id` and Email==superadmin's email (impersonation left no trace) · new token's role claims equal the original user's `UserRole`/`RoleClaim` rows (SuperAdmin powers intact) · `IsAllLocations` in token == true (locations of target tenant)

### TC-D02.031 — Post-switch Angular stores token under `auth_token` while token service reads `access_token` — broken auth after switch (current behavior)
- **Layers:** UT (FE), E2E
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-2.3 ⚠ GAP + doc-11 **UX-01** (tenant-list.ts:100-104 stores `'auth_token'`; wr-license.service.ts:16 `BEARER_TOKEN:'access_token'`)
- **Arrange:** Playwright + instrumented browser; superadmin logged in; tenant list open
- **Act:** click **Switch** on tenant B; wait for `window.location.href='/'` reload; inspect localStorage; then load any data-driven page (e.g., dashboard)
- **Assert (E2E):** localStorage contains key **`auth_token`** (and **not** `access_token`) after switch · subsequent XHR to `/api/*` carries **no** `Authorization` header (interceptor found nothing at `access_token`) → data calls fail/redirect to login — characterizes the current broken UX exactly
- **Assert (UT-FE):** `token-list.ts` switch handler writes `'auth_token'`; `StorageKeys.BEARER_TOKEN==='access_token'` — mismatch asserted as current constants

### TC-D02.032 — Post-switch token stored under `access_token`; API calls authenticated on target tenant — RED until fix
- **Layers:** UT (FE), E2E
- **Priority:** P0
- **Category:** Gap-Target [UX-01]
- **Source:** doc-11 UX-01 enhancement ("fix key") + WF-2.3
- **Arrange:** after the one-line key fix (`auth_token` → `access_token`)
- **Act:** same journey as TC-D02.031
- **Assert (E2E):** localStorage key `access_token` holds the switch token · first post-reload XHR carries `Authorization: Bearer <token>` · dashboard renders **tenant B's** data (tenant name/company title from B's CompanyProfile) · **RED by definition until UX-01 lands**

---

## WF-2.4 — Trial & License Enforcement Workflow

### TC-D02.033 — UT: expiry-date resolution chain `TrialExpiryDate ?? SubscriptionEndDate ?? profile.CreatedDate+14d`
- **Layers:** UT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.4 step 7 (TrialEnforcementMiddleware.cs:169-175)
- **Arrange:** pure function/wrapper under test with three tenant fixtures (fixed clock)
- **Act & Assert (UT):**
  1. `TrialExpiryDate=2026-09-11` → resolved expiry `2026-09-11` (first branch wins even if SubscriptionEndDate differs)
  2. `TrialExpiryDate=null, SubscriptionEndDate=2026-10-01` → `2026-10-01`
  3. both null, `profile.CreatedDate=2026-08-28` → `2026-09-11` (=CreatedDate+14d exactly)

### TC-D02.034 — Active trial tenant: writes allowed, no 403
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.4 step 7 (middleware passes when `UtcNow <= expiresAt`)
- **Arrange:** tenant B registered 1 day ago (fixed clock), CompanyProfile placeholder `AAABBB`, no License rows
- **Act:** POST `/api/Brand` `{name:"TrialBrand"}` with beta-admin JWT
- **Assert (IT):** 200/201 · Brand row exists with TenantId==B.Id · no trial response fields anywhere
- **Assert (PM):** `local-cloud` environment happy write passes during trial window

### TC-D02.035 — Expired trial: writes → 403 with exact payload; reads still pass (read-only access design)
- **Layers:** IT, PM, E2E
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-2.4 step 7 (TrialEnforcementMiddleware.cs:177-192; doc design intent "reads allowed, writes blocked")
- **Arrange:** tenant B with `TrialExpiryDate = UtcNow - 1d` (clock-injected factory), no LicenseKey, LicenseType Trial
- **Act:** POST `/api/Brand` `{name:"X"}` then GET `/api/Brand`
- **Assert (IT):** POST → **403**, body exactly `{ "message": "Trial Period Expired. Please Purchase License.", "isTrialExpired": true }` (serialized JSON, field names verbatim) · no Brand row created · GET `/api/Brand` → **200** (read allowed) · PUT/DELETE/PATCH on any resource → same 403 payload
- **Assert (PM):** expired-tenant environment: write requests all 403 with `isTrialExpired==true`, read requests 200
- **Assert (E2E):** expired cashier attempts a sale → blocked with subscription redirect (see TC-D02.041)

### TC-D02.036 — Allowlisted endpoints stay reachable for expired tenants (login, validate, activate, register)
- **Layers:** IT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-2.4 step 2 (TrialEnforcementMiddleware.cs:25-36, 55-62)
- **Arrange:** tenant B trial expired (as TC-D02.035)
- **Act & Assert (IT):** POST `/api/authentication/login` (expired beta-admin) → **200** with JWT (not 403-trial) · POST `/api/WrLicense/validate` → NOT the trial-403 (proceeds to handler: 200 valid code / 409 empty) · POST `/api/CompanyProfile/activate_license` → NOT trial-403 (authz outcome instead) · POST `/api/Tenants/register` (anonymous) → 200/400 handler-level, never trial-403 · POST `/api/Sync/push` (allowlisted `/api/Sync` prefix) → not trial-403

### TC-D02.037 — `isSuperAdmin` claim bypasses trial enforcement even when impersonated tenant is expired
- **Layers:** IT
- **Priority:** P1
- **Category:** Permission
- **Source:** WF-2.4 step 3 (TrialEnforcementMiddleware.cs:64-69)
- **Arrange:** tenant B expired; superadmin JWT + `X-Tenant-ID: <B.Id>` (impersonation channel from WF-2.2)
- **Act:** POST `/api/Brand` `{name:"SuperWrite"}` with superadmin credentials
- **Assert (IT):** 200/201 — bypass branch fires before CompanyProfile/tenant checks · Brand row `TenantId==B.Id` (stamped to impersonated tenant per TC-D02.020 mechanics)

### TC-D02.038 — Placeholder `AAABBB` LicenseKey does not unlock; a real non-placeholder key does
- **Layers:** IT, UT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-2.4 step 6 (TrialEnforcementMiddleware.cs:132-139; `AppConstants.Seeding.DefaultLicenseKey=="AAABBB"`)
- **Arrange:** tenant B expired trial; CompanyProfile fixtures: (a) `LicenseKey=="AAABBB"`, (b) `LicenseKey=="REALKEY1"` (any non-placeholder, case-insensitive check), (c) `LicenseKey==""`
- **Act & Assert (IT):** (a) POST → 403 trial payload (placeholder == not activated) · (b) POST → **200** (profile branch allows before tenant trial check) · (c) POST → 403 · (d) `LicenseKey=="aaabbb"` lowercase → 403 (comparison `OrdinalIgnoreCase` — placeholder can't be smuggled in any case)
- **Assert (UT):** activation predicate `hasActivatedLicense` truth table over {null, "", "AAABBB", "aaabbb", "X"} → {false,false,false,false,true}

### TC-D02.039 — Desktop / single-tenant mode: no tenant row → trial math off `profile.CreatedDate`
- **Layers:** IT, UT
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-2.4 step 8 (TrialEnforcementMiddleware.cs:196-220)
- **Arrange:** factory with `MultiTenancy.Enabled==false`; CompanyProfile with placeholder key; fixture (a) `CreatedDate = UtcNow-15d`, (b) `CreatedDate = UtcNow-13d`
- **Act & Assert (IT):** (a) POST write → **403** `"Trial Period Expired. Please Purchase License."` (daysSinceCreation 15 > 14) · (b) POST → 200 (13 ≤ 14) · GET in (a) → 200
- **Assert (UT):** boundary helper: `days==14` → allowed, `days==14.0001` → blocked (strict `>` comparison, TrialEnforcementMiddleware.cs:202)

### TC-D02.040 — License-entity branch: active unexpired License allows; expired License blocks writes with license-specific message
- **Layers:** IT
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-2.4 step 5 (TrialEnforcementMiddleware.cs:98-129; doc-02 gap "nothing writes License rows" — seeded/legacy rows only)
- **Arrange:** tenant A with seeded `License` rows: fixture (a) `Status=="Active"`, `ExpiresAt=UtcNow+30d`; fixture (b) `Status=="Active"`, `ExpiresAt=UtcNow-1d`; both with `IsDeleted=false`; profile placeholder
- **Act & Assert (IT):** (a) POST → 200 (branch allows before profile/tenant checks) · (b) POST → **403** body exactly `{ "message": "License Expired. Please Renew License.", "isTrialExpired": true }` · (b) GET → 200 (expired-license GETs fall through and pass) · soft-deleted latest License (`IsDeleted==true`) is ignored by the lookup (filter `!l.IsDeleted`, OrderByDescending IssuedAt)

### TC-D02.041 — Angular interceptor: 403 `isTrialExpired` redirects to `/subscription` purchase screen
- **Layers:** E2E, UT (FE)
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-2.4 Angular handling (http-request-interceptor.ts:64-65)
- **Arrange:** expired-trial tenant B logged into the UI
- **Act:** trigger any write from the UI (e.g., save brand form)
- **Assert (E2E):** browser URL becomes `/#/subscription` (router.navigate) · subscription/purchase screen visible with activation form (purchaseCode input) · login screen is NOT shown (session preserved)
- **Assert (UT-FE):** interceptor error branch asserts `isTrialExpired` truthy → `router.navigate(['/subscription'])` called once

---

## WF-2.5 — License Activation & Generation Workflows

### TC-D02.042 — UT: generated license key/purchase-code format is a 32-char uppercase dashless N-GUID
- **Layers:** UT
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-2.5A step 2 (ValidateLicenseCommandHandler.cs:55 `Guid "N".ToUpper()`), WF-2.5C (GenerateTenantLicenseKeysCommandHandler.cs:40-41)
- **Arrange:** generator under test (fixed Guid fixture `00112233445566778899aabbccddeeff`)
- **Assert (UT):** output == `"00112233445566778899AABBCCDDEEFF"` — length 32, matches `^[0-9A-F]{32}$`, zero dashes · 100 generated keys all match the pattern and are unique
- **Category note:** validation logic of the key format itself (no client-side regex exists — Angular only checks purchaseCode length; see TC-D02.047)

### TC-D02.043 — WrLicense validate: current behavior returns DUMMY_TOKEN and flips tenant to Paid (characterization)
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-2.5A (ValidateLicenseCommandHandler.cs:44-106); doc-02 signal T-03
- **Arrange:** tenant B (trial, unexpired), CompanyProfile with placeholder `AAABBB`; beta-admin JWT
- **Act:** POST `/api/WrLicense/validate` `{ purchaseCode: "<36+ char arbitrary string>" }`
- **Assert (IT):** 200 · body `UserAuthDto` with `IsAuthenticated==true`, `PurchaseCode` echoed back exactly, `LicenseKey` matches `^[0-9A-F]{32}$`, **`BearerToken=="DUMMY_TOKEN_FOR_LICENSE_VALIDATION"` exact constant string** (not a decodable JWT — characterizes current smell) · DB: `CompanyProfile.PurchaseCode` == sent code, `LicenseKey` == returned key · `Tenant.LicenseType=="Paid"`, `TrialExpiryDate==null`, `SubscriptionEndDate==null`, `SubscriptionPlan` was `"Trial"` → now `"Paid"`, `SubscriptionStartDate` unchanged (was already set)
- **Assert (PM):** response schema check includes the literal DUMMY constant (contract pin); `license_key` chain variable set from `LicenseKey`

### TC-D02.044 — License validation returns a real, usable JWT instead of DUMMY marker — RED until fix
- **Layers:** IT
- **Priority:** P1
- **Category:** Gap-Target [SEC-03]
- **Source:** doc-11 SEC-03 + doc-02 T-03 ("DUMMY_TOKEN returned")
- **Arrange:** post-enhancement build; same arrange as TC-D02.043
- **Act:** POST `/api/WrLicense/validate` with valid purchase code
- **Assert (IT):** 200 · `BearerToken` decodes as a JWT whose `TenantId` claim == B.Id and passes `POST /api/Brand` with it → 200 (token actually usable client-side) · string `"DUMMY_TOKEN_FOR_LICENSE_VALIDATION"` absent from response. **RED by definition until SEC-03/T-03 lands.**

### TC-D02.045 — Activation trusts any client-supplied purchase code — no server-side verification (SEC-03 characterization)
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** doc-11 **SEC-03** + WF-2.5 ⚠ GAP (ValidateLicenseCommandHandler.cs:46-49 — only null/whitespace rejected; no external licensing call)
- **Arrange:** tenant B unexpired trial; external licensing host unreachable (mock 404/no outbound allowed — proves no external dependency)
- **Act:** POST `/api/WrLicense/validate` `{ purchaseCode: "X" }` (1 char, not ≥36, not a real code)
- **Assert (IT):** **200** — arbitrary code accepted offline; tenant flips Paid exactly as TC-D02.043 · DB LicenseType=="Paid" · proves current activation is client-trust (characterization pins the hole)
- **Assert (PM):** contract test asserts 200 for `"X"` today (guards the characterization; will be superseded by TC-D02.046 when fixed)

### TC-D02.046 — Server-verified activation rejects invalid purchase codes without mutating state — RED until fix
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Target [SEC-03]
- **Source:** doc-11 SEC-03 enhancement ("server-verified activation; signed license files")
- **Arrange:** licensing-server mock at HTTP layer (per strategy §6 externals rule): rejects code `"X"` with 4xx, accepts fixture code `"VALID-CODE-FROM-SERVER"`
- **Act & Assert (IT):** POST with `"X"` → **400/422** verification-failure body · DB unchanged: `LicenseType=="Trial"`, `TrialExpiryDate` non-null, CompanyProfile still `AAABBB` · POST with `"VALID-CODE-FROM-SERVER"` → 200 and full paid-flip per TC-D02.043's DB asserts · licensing server was actually contacted (mock hit-count ≥1). **RED by definition until SEC-03 lands.**

### TC-D02.047 — Validate handler input validation: empty purchase code 409; missing CompanyProfile 404
- **Layers:** IT, UT
- **Priority:** P1
- **Category:** Validation
- **Source:** WF-2.5A (ValidateLicenseCommandHandler.cs:46-49, 105)
- **Arrange:** tenant A with profile (case a); factory fixture without any CompanyProfile (case b)
- **Act & Assert (IT):** (a) `{ purchaseCode: "" }` and `{ purchaseCode: "   " }` → **409** `"Purchase Code is required."` · (b) valid-looking code, no profile → **404** `"Company Profile not found."` · neither mutates Tenant rows
- **Assert (UT):** client-side form rule: purchaseCode `minlength 36` blocks submit below 36 chars (activate-license form, doc §WF-2.5A.3) — documents the client/server split (server has NO length minimum; see Discrepancy notes)

### TC-D02.048 — Profile-based activation endpoint requires `SETT_UPDATE_COM_PROFILE` claim; with claim flips tenant Paid
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-2.5B (CompanyProfileController.cs:61-63 `[ClaimCheck("SETT_UPDATE_COM_PROFILE")]`; UpdateActivatedLicenseCommandHandler.cs:18-69)
- **Arrange:** cashier JWT (no SETT claims) vs admin JWT (has claim); tenant B trial
- **Act & Assert (IT):** cashier POST `/api/CompanyProfile/activate_license` → **403** (ClaimCheck), no state change · admin POST `{licenseKey/purchaseCode payload}` → 200 · DB: same CompanyProfile+Tenant mutation as TC-D02.043 (LicenseType Paid, trial dates nulled) + cache keys `Tenant_Subscription:{B}`/`CompanyProfile_License:{B}` evicted (next trial-check reads fresh state)
- **Assert (PM):** both claim variants in collection; 403 body shape asserted

### TC-D02.049 — SuperAdmin generate-license-keys: returns both codes, upserts profile, does NOT flip LicenseType
- **Layers:** IT, PM
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-2.5C (TenantsController.cs:271-287; GenerateTenantLicenseKeysCommandHandler.cs:35-71)
- **Arrange:** tenant B (LicenseType stays Trial); superadmin JWT
- **Act:** POST `/api/Tenants/{B.Id}/license/generate` twice
- **Assert (IT):** each → 200 `{ LicenseKey, PurchaseCode, Message }` both matching `^[0-9A-F]{32}$` · two calls return **different** key pairs · CompanyProfile row for B has latest pair (upsert) · **`Tenant.LicenseType` still `"Trial"`** and `TrialExpiryDate` unchanged — generation alone does not open the trial gate (Negative aspect of the workflow) · fresh tenant with no profile: first call **creates** CompanyProfile (`Title==tenant.Name`) then stores keys
- **Assert (PM):** keys captured into env vars for the manual activation runner

### TC-D02.050 — PUT license endpoint: Trial resets 14-day clock; Paid nulls trial dates; unknown tenant 404
- **Layers:** IT
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-2.5C (TenantsController.cs:215-228; UpdateTenantLicenseCommandHandler.cs:36-71)
- **Arrange:** superadmin JWT; tenant B expired trial; fixed clock
- **Act & Assert (IT):** PUT `/api/Tenants/{B.Id}/license` `{ licenseType:"Trial" }` → 200 true · Tenant: `TrialExpiryDate==UtcNow+14d` (exact, ±1 min), `SubscriptionStartDate==UtcNow`, `SubscriptionPlan=="Trial"` → clock restarted · PUT `{ licenseType:"Paid" }` → `TrialExpiryDate==null`, `SubscriptionEndDate==null`, `SubscriptionPlan` `"Trial"`→`"Paid"`, cache `Tenant_Subscription:{B}` evicted (subsequent middleware read sees Paid — POST now 200) · PUT on unknown Guid → **404** `"Tenant not found"`

### TC-D02.051 — PM end-to-end API runner: register → login → trial write → activate → write unlocked, with tenant-header environment switching
- **Layers:** PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.1→WF-2.2→WF-2.4→WF-2.5 interaction map; strategy §6 environments (`local-cloud`, `local-desktop`, `staging`; vars `baseUrl`, `token`, `tenantId`)
- **Arrange:** fresh runner state; environments `local-cloud` and `local-desktop` configured
- **Act & Assert (PM):** collection runner executes in order:
  1. POST `/api/Tenants/register` (new subdomain) → 200; script chains `tenantId` from response
  2. POST login for new admin → 200; `token` chained
  3. POST `/api/Brand` with Bearer → 2xx (trial allows writes)
  4. POST `/api/WrLicense/validate` → 200; `LicenseKey` captured
  5. POST `/api/Brand` again → 2xx (now Paid — gate open)
  6. **Environment switch:** same protected GET run against `local-desktop` env using `X-API-Key` header (no JWT) → 2xx, and against `local-cloud` using superadmin JWT + `X-Tenant-ID: {{tenantId}}` → 2xx — proves tenant header switching across environments resolves the same tenant data
  7. Contract checks each step: required fields, exact enum strings (`"Trial"`, `"Paid"`), DUMMY-token pin per TC-D02.043

### TC-D02.052 — E2E journey: register tenant → login into new tenant → first-run dashboard renders
- **Layers:** E2E
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-2.1 entry/exit + WF-2.4 allowlist; journey spec `J-01` in `E2E_JOURNEYS.md`
- **Arrange:** Playwright against real API + SQLite backend; public signup route
- **Act:** fill signup form (name/subdomain/admin email/password) → submit → assert success → login with new admin credentials → land on dashboard
- **Assert (E2E):** signup success UI feedback; login redirect to dashboard within timeout · dashboard shows the seeded defaults: company title == registered name, menu items visible (RoleMenuItem grants per TC-D02.002), "Main Warehouse" location selectable, zero-stock products listed (clone zeroing per TC-D02.003) · localStorage `access_token` holds a JWT with `TenantId` == new tenant (proves WF-2.1→WF-1.1→WF-2.2 chain through real UI)

---

## Statistics

| Metric | Count |
|---|---|
| Total cases | 52 |
| WF-2.1 | 11 (TC-D02.001–011) |
| WF-2.2 | 16 (TC-D02.012–026) |
| WF-2.3 | 6 (TC-D02.027–032) |
| WF-2.4 | 9 (TC-D02.033–041) |
| WF-2.5 | 10 (TC-D02.042–051) + TC-D02.052 (cross-WF journey, logged under WF-2.5/PM-E2E) |
| Gap-Char | 6 (TC-D02.006, 009, 023, 031, 043, 045) |
| Gap-Target (RED) | 5 (TC-D02.010 [SEC-06], 024 [SEC-07], 032 [UX-01], 044 [SEC-03], 046 [SEC-03]) |
| P0 | 24 · P1 | 28 |

*(WF-2.5 covers TC-D02.042–052: 11 cases; table row above splits the cross-WF journey for traceability.)*

---

### Rules checklist (enforced in review)
- [x] Every WF in the domain has ≥1 Happy case — WF-2.1: 001/002; WF-2.2: 014/021; WF-2.3: 027; WF-2.4: 034/041; WF-2.5: 043 (characterization-happy)/050/052
- [x] Every write endpoint has: Validation case (bad input → 400/409), Permission case (missing claim → 403), Tenant-Isolation case (other tenant's id → 404) — register: 004/011 validation, **anonymous by design** (TenantsController.cs:46 — documented exception; anti-abuse is Gap pair 009/010), isolation via subdomain-uniqueness global scope; switch: 028 validation, 029 permission; WrLicense/validate: 047 validation, deliberately public (allowlist); activate_license: 048 permission; PUT license / generate: SuperAdmin-gated 050/049 with permission implied by 029's policy test; cross-tenant isolation generic pattern 018/019
- [x] Every money/stock mutation has DB-state assertions — D02's mutations are registration/provisioning/licensing; all assert persisted Tenant/User/CompanyProfile/seed rows (001–005, 043–050); money math itself belongs to D06
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case — SEC-03: 045/046 (+044); SEC-06: 009/010; SEC-07: 023/024; UX-01: 031/032
- [x] Gap-Char assertions describe CURRENT behavior (code-verified, paths cited above); Gap-Target describes DESIRED behavior (all marked RED until enhancement lands)
- [x] Concurrency case for sequential-number generation where the doc flags it — INT-11 targets WF-3.2/4.1 (D03/D04, not D02; D02 uses Guids) → covered instead by the check-then-insert race on subdomain uniqueness (TC-D02.011)
- [x] Edge/boundary cases: host-label boundaries (012/013), 14-day exact boundary incl. day-14.0 vs 14.0001 (039), expiry-chain null fallbacks (033), placeholder case-insensitivity (038), 1-char vs ≥36-char purchase code (045/047), OPTIONS/HEAD pass-through (026/036), inactive-tenant fallthrough (015), no-profile bootstrap (020 UT, 049 upsert)

### Discrepancy notes
1. **Purchase-code length (SEC-03 tests).** Doc 02 (WF-2.5A, ⚠ GAP list) claims the handler "accepts any ≥36-char purchase code". Code (`ValidateLicenseCommandHandler.cs:46-49`) rejects only null/whitespace (409) and accepts **any** non-empty code — there is no server-side length minimum. The 36-char minimum exists only in the Angular form (doc 02 §WF-2.5A.3). Tests TC-D02.045/047 are written against actual code behavior; doc wording flagged for correction.
2. **Allowlist pattern.** Doc 02 writes the sync allowlist as `/api/Sync*`. Code (TrialEnforcementMiddleware.cs:35, 57-58) matches exact `"/api/Sync"` plus `StartsWith("/api/Sync/")` — net equivalent; tests assert the net effect.
3. **Expired-License GET fall-through.** Doc 02 says expired-license tenants keep read access. In code, an expired License does not short-circuit GETs — the middleware falls through to the profile/tenant branches (TrialEnforcementMiddleware.cs:107-129, no return on GET). Net observable behavior matches the doc ("reads pass"); TC-D02.040 asserts the net effect, not the fall-through mechanics.
4. **UX-01 citation path.** Doc 02 cites `wr-license.service.ts:16`; verified at `SourceCode/Angular/src/app/core/services/wr-license.service.ts:16` (`BEARER_TOKEN: 'access_token'`) — note the Angular app lives under `SourceCode/Angular/`, not `SourceCode/SQLAPI/Angular/` as doc 02's path implies.
5. **TrialEnforcementMiddleware License branch liveness.** Doc 02 flags that nothing documented writes `License` rows. Confirmed — `GenerateTenantLicenseKeysCommandHandler` and both activation handlers touch only CompanyProfile/Tenant; the License branch (TC-D02.040) is tested with seeded/legacy rows so the middleware branch remains covered regardless of its production write-path gap (T-03).
