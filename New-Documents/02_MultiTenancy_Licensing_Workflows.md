# Workflow Document 02 — Multi-Tenancy & Licensing Workflows

**Scope:** Tenant registration with full data provisioning, tenant resolution middleware chain, tenant switching (SuperAdmin impersonation), trial & license enforcement, license activation/generation.

---

## WF-2.1 — Tenant Registration Workflow (Self-Service Signup)

**Entry:** `POST /api/Tenants/register` `[AllowAnonymous]` — `POS.API/Controllers/TenantsController.cs:45-68` maps `RegisterTenantDto` → `RegisterTenantCommand`.

**Handler:** `POS.MediatR/Tenant/Handlers/RegisterTenantCommandHandler.cs:40-113` — runs inside an explicit DB transaction (execution strategy + rollback on any failure):

1. **Subdomain uniqueness** (46-50): `Tenants.IgnoreQueryFilters()` check → 400 if exists.
2. **Tenant initialization** (53-66) — `POS.Repository/Tenant/TenantInitializationService.cs:17-42`:
   - Creates **Tenant** entity: `IsActive=true`, `SubscriptionPlan="Trial"`, `SubscriptionStartDate=UtcNow`, `SubscriptionEndDate=TrialExpiryDate=UtcNow+14d` (`AppConstants.TenantConfig.TrialPeriodDays=14`), `LicenseType=Trial`, `MaxUsers=5`, `BusinessType` (default Retail).
   - Generates cryptographically random **ApiKey** (`ApiKeyEnabled=true`).
3. **Admin user creation** (69-92): sends **AddUserCommand** (single source of truth): Email/UserName = AdminEmail, name "Admin User", password = provided or `AppConstants.Seeding.DefaultPassword` ("admin@123"), `TenantId` = new tenant, `IsAllLocations=true`. Failure → whole transaction rolls back.
4. **Data seeding** (95-97) — `POS.Repository/Tenant/TenantRegistrationService.cs`, `SeedTenantDataAsync` (51-146):

   **Path A — Master clone shortcut** (53-64): if new tenant ≠ master AND a master tenant exists → delegate to `TenantDataCloner.CloneTenantDataAsync` (Path C below).

   **Path B — CSV seeding** (used for the master tenant itself), two passes (new Guids into `globalIdMap`, then remap FKs + stamp TenantId/audit — `SeedTenantTableAsync<T>` 148-209), in dependency order:
   1. **CompanyProfile** (291-308): Title=tenant.Name, LicenseKey=`"AAABBB"` (default placeholder), PurchaseCode=`"CCCCRR"`.
   2. **Roles** (310-346): cloned from global roles or `Roles.csv`; Admin user gets "Admin" role via **UserRole**.
   3. **Location** (390-408): "Main Warehouse" **Location** (with FBRKey/POSID defaults) + **UserLocation** for admin.
   4. **FinancialYear** (410-428): guarantees open FY for current calendar year.
   5. **LedgerAccounts** (chart of accounts), Taxes, UnitConversations, Brands, ProductCategories, ExpenseCategories, EmailTemplates, EmailSMTPSettings, Actions.
   6. **RoleClaims** (348-388): remapped from Actions, deduplicated.
   7. Pages, PageHelpers, InquiryStatus/Source, Suppliers/Customers + addresses.
   8. **Products** (430-486): filtered by business-type prefix (Pharmacy/Petrol), FK remap, then **ProductStock** rows at main location.
   9. Transactional history CSVs (POs/SOs/Transactions/AccountingEntries/StockTransfers/Expenses/Loans/Inquiries/Reminders).
   10. **MenuItems + RoleMenuItems** (211-289): regenerated IDs with parent remap; **all four permissions** (CanView/Create/Edit/Delete) granted to "Super Admin" and "Admin" roles on every menu item.

   **Path C — Master clone** — `POS.Repository/Tenant/TenantDataCloner.cs`, `CloneTenantDataAsync` (23-67), dependency-first order:
   - CompanyProfile → Locations (+ admin UserLocations, 69-101) → FinancialYear/Tax/Brand/UnitConversation/ExpenseCategory/InquirySource/InquiryStatus → recursive clones with parent remap (ProductCategory, **MenuItem**, **LedgerAccount** — `CloneRecursiveAsync` 134-187) → Products (FK remap, 189-213) → ProductTax → **ProductStocks (quantities zeroed**, 215-260) → Suppliers/Customers + addresses → PageHelper/Page/Actions → **Roles + RoleClaims + RoleMenuItems + admin UserRole assignment** (262-360; unmapped ActionIds skipped to preserve isolation, 303-306).
   - `CloneEntity` (362-452): ID regeneration, TenantId override, timestamp refresh, generic FK remap via idMap.

5. **Commit** (99); any exception → rollback + 400 (102-113).

**Entities created:** Tenant, User (admin), UserRole, CompanyProfile, Role(s), RoleClaim(s), Location, UserLocation, FinancialYear, LedgerAccount, Tax, UnitConversation, Brand, ProductCategory, ExpenseCategory, EmailTemplate, EmailSMTPSetting, Action, Page, PageHelper, Supplier/Customer + addresses, Product, ProductStock, ProductTax, MenuItem, RoleMenuItem (+ optional history CSVs).

**⚠ GAPS:**
- Trial expiry is 14 days hard-coded; no per-plan configuration.
- Seeded admin password defaults to `admin@123` when caller omits it.
- Clone path zeroes ProductStock but does not seed InventoryBatch — batch table stays empty per tenant.
- No email verification / captcha on the anonymous register endpoint (abuse surface).

---

## WF-2.2 — Tenant Resolution Middleware Chain (Per-Request)

Registration order in `POS.API/Startup.cs` `Configure` (383-447):
`GlobalExceptionHandlerMiddleware` (383) → StaticFiles/CORS → `UseAuthentication` (433) → **ApiKeyAuthenticationMiddleware** (434) → **TenantResolutionMiddleware** (437-439, only when `DeploymentSettings.MultiTenancy.Enabled`) → Session/Routing → `UseAuthorization` (443) → **TrialEnforcementMiddleware** (444) → endpoints.

### A. TenantResolutionMiddleware (`POS.API/Controllers/Middleware/TenantResolutionMiddleware.cs`)
Resolution priority:
1. **Subdomain** from Host (23-24, 72-87): `parts[0]` when ≥3 labels; localhost/IP skipped.
2. Active **Tenant** lookup by Subdomain (`IgnoreQueryFilters`) → tenantId (28-39).
3. **Fallback — SuperAdmin `X-Tenant-ID` header** (42-52): impersonation channel.
4. **Fallback — JWT `TenantId` claim** (55-62).
5. `tenantProvider.SetTenantId(...)` (64-67) — request-scoped **TenantProvider** (`POS.Domain/TenantProvider.cs:19-56`).

### B. TenantIdAuthenticationMiddleware (same folder)
Used by desktop→cloud sync clients:
1. Skips `/swagger`, `/api/auth`, `/api/account` (27-34).
2. Reads `X-Tenant-ID` header or `tenantId` query param; absent → pass through (JWT path) (37-38).
3. Invalid GUID → 401 (47-52); tenant must exist and be `IsActive` else 403 (55-64).
4. Sets `HttpContext.Items["TenantId"]` + `["TenantIdAuthenticated"]` (67-68).

### C. ApiKeyAuthenticationMiddleware (same folder)
1. `X-API-Key` header; absent → pass through (28).
2. Matches **Tenant** by `ApiKey == key && ApiKeyEnabled` (IgnoreQueryFilters) (33-35).
3. Updates `tenant.ApiKeyLastUsedDate = UtcNow` (39-41) — a **write inside middleware**.
4. Fabricates ClaimsPrincipal: `TenantId`, `ApiKeyAuthenticated=true`, Name="SyncClient", Role="SyncAgent" (44-52); sets `Items["TenantId"]` etc. (55-57).
5. Invalid key → immediate 401 "Invalid API Key" (61-64).

### How isolation actually happens
`POSDbContext` (POS.Domain/Context/POSDbContext.cs) receives `ITenantProvider` and applies global query filters (`TenantId == current && !IsDeleted`) to every BaseEntity; `SaveChanges` interception auto-stamps TenantId on added entities. Admin paths deliberately bypass with `IgnoreQueryFilters()`.

**⚠ GAPS:**
- ApiKey middleware writes to DB on every API-keyed request (performance + failure surface).
- Subdomain parsing assumes `sub.domain.tld` shape; custom domains (CNAME per tenant) unsupported.
- No rate limiting on any middleware path.

---

## WF-2.3 — Tenant Switching / Impersonation (SuperAdmin)

1. **Endpoint** — `POST /api/Tenants/{id}/switch` `[Authorize(Policy=SuperAdmin)]` (TenantsController.cs:247-266) → `SwitchTenantCommand { TenantId, Email = current JWT email }`.
2. **Handler** — `POS.MediatR/Tenant/Handlers/SwitchTenantCommandHandler.cs:37-84`:
   - Load target **Tenant** (IgnoreQueryFilters) → 404; inactive → 400.
   - Find user by email → 401 if missing.
   - Constructs an **in-memory impersonated User** — same Id/UserName/Email but `TenantId = target.Id`, `IsAllLocations=true` — **never persisted** (61-71).
   - `BuildUserAuthObject(impersonatedUser)` → fresh JWT whose `TenantId` claim, locations, CompanyProfile license fields, ApiKey all resolve against the target tenant. Roles/claims still come from the original user's UserRole/RoleClaim rows → SuperAdmin keeps their powers, operates in target's data.
3. **Response** (261-265): `{ token, tenantId }`.
4. **Angular** — `Angular/src/app/tenant/tenant-list/tenant-list.ts:91-107`: `localStorage.clear()`, store token under **`'auth_token'`**, hard-navigate `window.location.href='/'` to re-bootstrap.

**⚠ GAP (functional bug):** the Angular tenant switch stores the token under key `'auth_token'`, but the HTTP interceptor reads `'access_token'` (wr-license.service.ts:16) — after switching, API calls may go out unauthenticated until some code path re-derives the token.

---

## WF-2.4 — Trial & License Enforcement Workflow

**Middleware:** `POS.API/Controllers/Middleware/TrialEnforcementMiddleware.cs` — runs at the END of the pipeline (after authorization), on every request:

1. OPTIONS/HEAD pass through (49-53).
2. **Allowlist** (55-62): login endpoints, `/api/License/Validate`, `/api/WrLicense/validate`, `/api/CompanyProfile/activate_license`, `/api/Tenants/register`, `/api/Sync*`.
3. `isSuperAdmin=true` claim → bypass (64-69).
4. Load **CompanyProfile** via repository (cached 10 min, `CompanyProfile_License:{tenantId}`) (71-83). No profile → allow (setup mode) (86-90). Lazily ensures licensing schema once per 6h (92-96).
5. **License table check** (98-129): latest non-deleted **License** with `Status=="Active"` for the tenant — unexpired → allow; expired → **403** `{ message: "License Expired. Please Renew License.", isTrialExpired: true }` on write verbs (POST/PUT/DELETE/PATCH). **GETs still pass** — expired tenants keep read-only access.
6. **Profile license check** (132-139): non-empty LicenseKey ≠ `"AAABBB"` (default placeholder) → allow.
7. **Tenant trial check** (141-195): Tenant (cached 5 min `Tenant_Subscription:{id}`); `SubscriptionPlan=="Master"` or `LicenseType=="Paid"` → allow; Trial/blank → expiry = `TrialExpiryDate ?? SubscriptionEndDate ?? profile.CreatedDate+14d`; past-due → **403** `"Trial Period Expired. Please Purchase License."` on write verbs.
8. No tenant (desktop/single-tenant) → same trial math off `profile.CreatedDate` (196-220).

**Angular handling:** 403 `isTrialExpired` → interceptor redirects to `/subscription` (http-request-interceptor.ts:63-66), which shows the purchase/activate screen.

**Design intent:** expired tenants can still log in and view data (reads allowed) but cannot create/modify anything.

---

## WF-2.5 — License Activation & Generation Workflows

### A. Tenant self-service activation (WrLicense)
1. `POST /api/WrLicense/validate` (POS.API/Controllers/WrLicense/WrLicenseController.cs:19-24) → `ValidateLicenseCommand`.
2. Handler `POS.MediatR/WrLicense/Handler/ValidateLicenseCommandHandler.cs:44-106`:
   - Load CompanyProfile → 404 if none.
   - Generate `LicenseKey = Guid "N".ToUpper()`; store PurchaseCode + LicenseKey on **CompanyProfile**.
   - Mutate **Tenant**: `LicenseType="Paid"`, `TrialExpiryDate=null`, `SubscriptionEndDate=null`, `SubscriptionStartDate=UtcNow` if unset, `SubscriptionPlan="Paid"` if was "Trial".
   - Evict caches (`Tenant_Subscription:*`, `CompanyProfile_License:*`).
   - Return `UserAuthDto` with `BearerToken = "DUMMY_TOKEN_FOR_LICENSE_VALIDATION"` (marker, not a real JWT).
3. **Angular** — `activate-license.component.ts:27-47`: form requires purchaseCode (min 36 chars) → POST → save `localStorage['license_key']` → redirect `/login`. Route is public.

### B. Profile-based activation
`POST /api/CompanyProfile/activate_license` `[ClaimCheck("SETT_UPDATE_COM_PROFILE")]` → `UpdateActivatedLicenseCommandHandler` (POS.MediatR/CompanyProfile/Handlers/UpdateActivatedLicenseCommandHandler.cs:18-69) — identical CompanyProfile+Tenant mutation + cache eviction.

### C. SuperAdmin license generation
- `POST /api/Tenants/{id}/license/generate` (TenantsController.cs:271-287) → `GenerateTenantLicenseKeysCommandHandler` (35-71): random LicenseKey + PurchaseCode, upserts **CompanyProfile** (creates if absent), returns both. **Does not** flip LicenseType to Paid by itself.
- `PUT /api/Tenants/{id}/license` (215-228) → `UpdateTenantLicenseCommandHandler` (36-71): sets `LicenseType`; Trial → resets `TrialExpiryDate=UtcNow+14d`; Paid → nulls trial dates; evicts `Tenant_Subscription:{id}`.

**Entities modified:** CompanyProfile (LicenseKey/PurchaseCode), Tenant (LicenseType/SubscriptionPlan/TrialExpiryDate/SubscriptionStart/EndDate), License (read by middleware).

**⚠ GAPS:**
- License validation is **offline-honored**: `ValidateLicenseCommandHandler` accepts any ≥36-char purchase code without verifying against an external licensing server (the `WrLicense` external check exists as a separate controller but activation itself trusts client input).
- `BearerToken = "DUMMY_TOKEN_FOR_LICENSE_VALIDATION"` is a code smell — any client-side logic depending on a real token here will misbehave.
- `License` entity table is checked by middleware but nothing in the documented flows **writes** License rows (only seeding/legacy paths) — the middleware's License branch may be dead in practice.
- LicenseKey generated at activation is stored but never used for cryptographic verification.

---

## Workflow Interaction Map

```
 Signup (WF-2.1) ──► Tenant + seeded data (Trial, 14d clock)
        │
        ▼
 Every request: WF-2.2 middleware chain ──► TenantProvider ──► EF global query filters
        │
        ▼
 WF-2.4 Trial gate: writes blocked after expiry (reads OK)
        │
        ├──► WF-2.5A/B activation (purchaseCode) ──► Paid ──► gate opens
        └──► WF-2.5C SuperAdmin generates/extends license

 WF-2.3 Switch: SuperAdmin mints JWT with target TenantId ──► full impersonation
```

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| T-01 | Registration | No captcha/email-verification on anonymous signup; abuse surface |
| T-02 | Licensing | Activation trusts client-supplied purchase code (no external verification) |
| T-03 | Licensing | DUMMY_TOKEN return value; License table write-path missing |
| T-04 | Switch tenant | Angular token key mismatch (`auth_token` vs `access_token`) breaks post-switch auth |
| T-05 | Middleware | ApiKey middleware DB write per request; no rate limiting anywhere |
| T-06 | Provisioning | InventoryBatch not seeded/cloned; batch lifecycle inert (see WF-5.6) |
| T-07 | Isolation | Custom-domain per-tenant support missing (subdomain only) |
