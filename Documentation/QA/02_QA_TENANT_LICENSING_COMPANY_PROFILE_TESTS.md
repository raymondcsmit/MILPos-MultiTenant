# 02 — QA Test Suite: Multi-Tenancy, Licensing & Company Profile

**Module:** Multi-Tenancy Architecture, Tenant Registration, Licensing, Tenant Switching & Company Settings  
**Location:** `Documentation/QA/02_QA_TENANT_LICENSING_COMPANY_PROFILE_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** N-21, N-25, N-26, N-43, SEC-03, SEC-06, SEC-07, UX-01

---

## 1. Module Overview & Quality Objectives
The Multi-Tenancy subsystem guarantees strict logical isolation between independent businesses sharing the same cloud application instance, database cluster, or local desktop runtime. It manages tenant provisioning, automated master database cloning, trial lifecycle enforcement, license key activation, API key authentication, and company-specific profile preferences.

### Primary Risks & Failure Modes:
- **Registration Failures & FK Violations (N-26):** Tenant onboarding falling back to legacy CSV seeding which violates immediate SQLite foreign key constraints (`Actions.PageId`).
- **License Persistence Silent Dropping (N-21):** Handlers updating `Tenant` entities fetched without `.AsTracking()` on a NoTracking `POSDbContext`, resulting in phantom activations where the company profile updates but the license state remains unchanged.
- **Tenant Switching Session Breakage (UX-01):** Angular token storage mismatch (`auth_token` vs `access_token`) causing users to be kicked out upon switching tenants.
- **Cross-Tenant Data Leakage:** Failure of EF Core Global Query Filters (`TenantId == CurrentTenantId`) allowing Tenant A users to read or mutate Tenant B records.

---

## 2. Test Cases with Concrete Execution Data

### QA-TEN-001 — Tenant Self-Registration via Master Tenant Cloning Path
- **Aspect / Sub-Module:** Tenant Onboarding & Automated Workspace Provisioning
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/Tenants/TenantsController.cs`, `POS.Domain/Services/TenantRegistrationService.cs`
- **Preconditions:**
  - Master Tenant configured in `appsettings.json` (`MasterTenant:TenantId` points to an existing seeded tenant).
  - Backend database accessible.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/tenants/register`
  - **Headers:**
    ```http
    Content-Type: application/json
    Accept: application/json
    ```
  - **Request Payload:**
    ```json
    {
      "name": "Zenith Supermarket Ltd",
      "email": "owner@zenithmart.com",
      "password": "Password123!",
      "connectionString": null,
      "address": "45 Blue Area, Islamabad",
      "phone": "03009988776",
      "currencyCode": "PKR",
      "currencySymbol": "₨"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Dispatch the `POST /api/tenants/register` request.
  2. Verify response status and payload.
  3. Query `Tenants`, `CompanyProfiles`, `Users`, `Roles`, `Locations`, and `Pages` tables using the returned `tenantId`.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK` (or `201 Created`)
  - **Response Payload:**
    ```json
    {
      "id": "ZENITH-TENANT-GUID",
      "name": "Zenith Supermarket Ltd",
      "isActive": true,
      "trialExpiryDate": "2026-09-20T12:00:00Z",
      "adminUser": {
        "email": "owner@zenithmart.com",
        "userName": "owner@zenithmart.com"
      }
    }
    ```
  - **Database Verification:**
    - `Tenants` table has row with `Name = "Zenith Supermarket Ltd"`, `IsActive = 1`.
    - `CompanyProfiles` has default profile cloned from Master Tenant.
    - `Users` table has an admin user with password hashed.
    - Default Location L1 created.
    - Default Chart of Accounts cloned with 0 balance.
- **Defects & Exceptions Targeted:**
  - N-26 Defect: Ensure `Tenants.Name` is supplied (not null) and master cloning succeeds without hitting SQLite FK 19 error on `Actions.PageId`.
- **QA Pass/Fail Checklist:**
  - [ ] Registration succeeds with HTTP 200/201.
  - [ ] Complete cloned workspace exists in DB for new Tenant ID.
  - [ ] Admin credentials allow successful login into new tenant.

---

### QA-TEN-002 — Tenant Registration Duplicate Name Conflict Validation
- **Aspect / Sub-Module:** Tenant Unique Constraints & Validation
- **Test Type:** Negative / Validation
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.API/Controllers/Tenants/TenantsController.cs`
- **Preconditions:** Tenant `Retail Corp Alpha` already exists in `Tenants` table.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/tenants/register`
  - **Request Payload:**
    ```json
    {
      "name": "Retail Corp Alpha",
      "email": "duplicate@alpha.com",
      "password": "Password123!"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit registration request with identical company name.
  2. Check response status code and error messages.
- **Expected Results:**
  - **HTTP Status Code:** `409 Conflict` (or `422 Unprocessable Entity`)
  - **Response Body:**
    ```json
    {
      "status": 409,
      "message": "Tenant name 'Retail Corp Alpha' already exists."
    }
    ```
  - Must NOT crash with unhandled unique constraint exception (`500 Internal Server Error`).
- **QA Pass/Fail Checklist:**
  - [ ] Duplicate tenant name returns 409/422.
  - [ ] No duplicate tenant persisted.

---

### QA-TEN-003 — Strict Multi-Tenant Data Isolation (Cross-Tenant Probing)
- **Aspect / Sub-Module:** Global Query Filters & Cross-Tenant Boundary Enforcement
- **Test Type:** Security / Boundary & Tenant Leakage
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.Domain/POSDbContext.cs` (Global Query Filters)
- **Preconditions:**
  - Tenant Alpha (`a1111111-1111-1111-1111-111111111111`) has Product `PROD-001` (`id = PROD-A-GUID`).
  - Tenant Beta (`b2222222-2222-2222-2222-222222222222`) has Product `PROD-BETA-999` (`id = PROD-B-GUID`).
  - Authenticated as `admin_alpha` with valid JWT bound to Tenant Alpha.
- **Concrete Test Data:**
  - **Probe 1 (Direct Query of Foreign Tenant Product):**
    - `GET /api/Product/PROD-B-GUID`
    - `Header: Authorization: Bearer {{token_admin_alpha}}`
  - **Probe 2 (List Products Scoping):**
    - `GET /api/Product?pageSize=100`
    - `Header: Authorization: Bearer {{token_admin_alpha}}`
  - **Probe 3 (Foreign Tenant Mutate Injection):**
    - `DELETE /api/Product/PROD-B-GUID`
    - `Header: Authorization: Bearer {{token_admin_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Send Probe 1 attempting to view Tenant Beta's product using Tenant Alpha's token.
  2. Send Probe 2 and verify list contents.
  3. Send Probe 3 attempting to delete Tenant Beta's product.
- **Expected Results:**
  - **Probe 1:** HTTP `404 Not Found` (Global Query Filter treats record as non-existent).
  - **Probe 2:** List contains ONLY Tenant Alpha products; zero records from Tenant Beta.
  - **Probe 3:** HTTP `404 Not Found`; Tenant Beta's product remains untouched in database.
- **Defects & Exceptions Targeted:** Verify that `POSDbContext` global query filters (`b.TenantId == CurrentTenantId`) cannot be bypassed via direct ID endpoints.
- **QA Pass/Fail Checklist:**
  - [ ] Zero cross-tenant data leakage observed.
  - [ ] Foreign tenant IDs yield 404 Not Found.

---

### QA-TEN-004 — Tenant Switching Token Storage Mismatch (UX-01 Finding)
- **Aspect / Sub-Module:** Frontend Multi-Tenant Context Switching
- **Test Type:** Functional & Defect Verification (UX-01)
- **Priority & Severity:** P1 (High)
- **Source & References:** `Angular/src/app/core/services/security.service.ts`, `POS.API/Controllers/Tenants/TenantsController.cs`
- **Preconditions:**
  - User `superadmin` has access to both `Retail Corp Alpha` and `Wholesale Mart Beta`.
  - Currently logged in and operating inside Tenant Alpha.
- **Concrete Test Data:**
  - **API Endpoint:** `POST /api/tenants/switch-tenant`
  - **Request Payload:**
    ```json
    {
      "targetTenantId": "b2222222-2222-2222-2222-222222222222"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. In the Angular UI header, click the Tenant Switcher dropdown.
  2. Select "Wholesale Mart Beta".
  3. Inspect Browser `localStorage` for stored tokens: `access_token` vs `auth_token`.
  4. Navigate to `/products`.
- **Expected Results (Fixed State):**
  - New JWT for Tenant Beta is stored under key `access_token`.
  - Next API call includes header `Authorization: Bearer {{new_token_beta}}`.
  - UI reloads displaying Tenant Beta products.
- **Defect Verification (UX-01 Pre-Fix State):**
  - Switch handler stored token in `auth_token`, while HTTP Interceptor read from `access_token`.
  - Result: Request continued using stale Tenant Alpha token or failed with 401 redirecting to login.
- **QA Pass/Fail Checklist:**
  - [ ] Verify `localStorage` token key consistency.
  - [ ] Ensure user remains authenticated and workspace context switches immediately.

---

### QA-TEN-005 — License Activation with Tracking Mutation Guard (N-21 / SEC-03)
- **Aspect / Sub-Module:** Commercial Licensing & Subscription Verification
- **Test Type:** Business Logic & State Persistence
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/CompanyProfile/Handlers/ValidateLicenseCommandHandler.cs`, `UpdateActivatedLicenseCommandHandler.cs`
- **Preconditions:**
  - Tenant `Wholesale Mart Beta` is in Trial mode (`LicenseType = "Trial"`).
  - Purchase Code obtained: `PC-ENTERPRISE-2026-XYZ`.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/CompanyProfile/activate_license`
  - **Headers:**
    ```http
    Authorization: Bearer {{token_admin_beta}}
    Content-Type: application/json
    ```
  - **Request Payload:**
    ```json
    {
      "purchaseCode": "PC-ENTERPRISE-2026-XYZ",
      "licenseKey": "LIC-ACTIVE-882200",
      "subscriptionStartDate": "2026-09-06T00:00:00Z",
      "trialExpiryDate": "2027-09-06T00:00:00Z"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit activation payload.
  2. Check API response status and message.
  3. Query `Tenants` table directly in the database:
     `SELECT LicenseType, SubscriptionStartDate, TrialExpiryDate FROM Tenants WHERE Id = 'b2222222-...'`
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`
  - **Database Verification:**
    - `LicenseType` in `Tenants` table is updated from `'Trial'` to `'Licensed'`.
    - `SubscriptionStartDate` and `TrialExpiryDate` are persisted.
- **Defects & Exceptions Targeted:**
  - N-21 Defect: Because `POSDbContext` defaults to `NoTracking`, fetching the tenant without `.AsTracking()` silently discards tenant updates while only persisting `CompanyProfile`. Test guarantees `.AsTracking()` is active.
- **QA Pass/Fail Checklist:**
  - [ ] API returns success confirmation.
  - [ ] Direct SQL query proves `Tenants.LicenseType` updated in the database.

---

### QA-TEN-006 — API Key Authentication & Middleware Mutation (N-25 / SEC-07)
- **Aspect / Sub-Module:** Machine-to-Machine Integration & API Key Auth
- **Test Type:** Security & Characterization
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.API/Middleware/ApiKeyAuthenticationMiddleware.cs`
- **Preconditions:**
  - Tenant Alpha has `ApiKey = "MILPOS_API_KEY_SECRET_ALPHA_123"`.
  - Database column `ApiKeyLastUsedDate` initially null.
- **Concrete Test Data:**
  - **Endpoint:** `GET /api/Product/get-all-products`
  - **Headers:**
    ```http
    X-Api-Key: MILPOS_API_KEY_SECRET_ALPHA_123
    Accept: application/json
    ```
- **Step-by-Step Execution Procedure:**
  1. Execute API request using `X-Api-Key` instead of Bearer token.
  2. Verify request succeeds.
  3. Query `Tenants` table: `SELECT ApiKeyLastUsedDate FROM Tenants WHERE Id = 'a1111111-...'`
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`
  - **Characterization Check (N-25):** Verify whether `ApiKeyLastUsedDate` persists or remains null due to NoTracking context.
- **QA Pass/Fail Checklist:**
  - [ ] API Key authentication grants access to authorized endpoints.
  - [ ] Invalid API Key returns HTTP 401 Unauthorized.

---

### QA-TEN-007 — Company Profile Preferences & Receipt Header Configuration
- **Aspect / Sub-Module:** Company Profile Customization
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.API/Controllers/CompanyProfile/CompanyProfileController.cs`
- **Preconditions:** Authenticated as `admin_alpha` with `SETT_UPDATE_COM_PROFILE`.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/CompanyProfile`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
  - **Request Payload:**
    ```json
    {
      "id": "PROFILE-ALPHA-GUID",
      "title": "Retail Corp Alpha Superstore",
      "address": "100 Commercial Plaza, Sector F-7, Islamabad",
      "phone": "051-2233445",
      "email": "info@alpha.com",
      "currencyCode": "PKR",
      "currencySymbol": "₨",
      "dateFormat": "DD/MM/YYYY",
      "timeFormat": "12",
      "taxNumber": "NTN-9988112-7"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Update company profile with tax registration and receipt formatting.
  2. Send `GET /api/CompanyProfile` to verify returned values.
  3. Load POS screen in Angular and check receipt header preview.
- **Expected Results:**
  - Profile updates successfully (HTTP 200).
  - POS receipts reflect "Retail Corp Alpha Superstore" and tax number "NTN-9988112-7".
- **QA Pass/Fail Checklist:**
  - [ ] Company profile values persist and reflect on generated receipts.
