# Licensing Verification – Test Cases & Test Data (Phases 1–4)

This package validates the licensing changes implemented from:

- Hotfix (Phase 1): tenant-scoped cache, allowlist fix, superAdmin perpetual rule, tenant-correct activation writes
- Normalization (Phase 2): enforce expiry from Tenant subscription fields + activation sets tenant to Paid
- Security hardening (Phase 3): lock down `activate_license`, restrict `X-Tenant-ID`, remove GET bypass
- Long-term groundwork (Phase 4): `Licenses` table + license-record-based enforcement (database-driven)

All tests are designed to be executable using cURL and DB scripts.

## 0) Test Environment Setup

### 0.1 Base URLs

Choose one:

- Desktop (local): `http://localhost:5000`
- Cloud (local): `http://localhost:5000` (but tenant resolution is typically subdomain-based)

Use one of these strategies for tenant resolution:

- JWT claim `TenantId` (recommended for authenticated requests)
- Subdomain host (cloud): `tenant1.yourdomain.com` (in local testing you can use hosts file or reverse proxy)

### 0.2 Authentication Endpoint

Backend supports:

- `POST /api/authentication`
- `POST /api/authentication/login`

Source: `AuthenticationController` at `f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Controllers\Authentication\AuthenticationController.cs`

### 0.3 Required Headers

- `Content-Type: application/json`
- For authenticated endpoints: `Authorization: Bearer <token>`
- For superAdmin tenant switch override: `X-Tenant-ID: <tenant-guid>` (only honored when authenticated AND `isSuperAdmin=true`)

## 1) Test Data (Copy/Paste Values)

Use these values to keep tests consistent.

### 1.1 Tenant Names + Subdomains

Create three tenants:

- Trial tenant (expected to expire in tests):  
  - Name: `QA Trial Tenant`
  - Subdomain: `qa-trial`

- Paid tenant (expected active):  
  - Name: `QA Paid Tenant`
  - Subdomain: `qa-paid`

- Tenant B (for cross-tenant isolation checks):  
  - Name: `QA Tenant B`
  - Subdomain: `qa-b`

If subdomains must be globally unique in your environment, append a suffix like `-20260404`.

### 1.2 User Credentials (Cloud mode master admin)

From `appsettings.Cloud.json` (default seed):

- Email: `admin@gmail.com`
- Password: `Admin@123`

### 1.3 License Activation Inputs

- PurchaseCode sample (36 chars min, used by UI):  
  - `11111111-1111-1111-1111-111111111111`

- Fake “bad” purchase code (to validate input validation only):  
  - empty string

### 1.4 License Record Test Values (Phase 4)

Use these values when inserting into `Licenses` table:

- TokenId: `lic_qa_0001`
- TokenHash: `sha256_dummy_hash_value_0001`
- Plan: `Pro`
- Status: `Active`
- MaxUsers: `25`

## 2) Utility Commands (Reusable)

### 2.1 Login (get bearer token)

```bash
curl -s -X POST "http://localhost:5000/api/authentication" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@gmail.com\",\"password\":\"Admin@123\"}"
```

Expected: JSON containing `bearerToken`.

### 2.2 Register Tenant (Public)

```bash
curl -s -X POST "http://localhost:5000/api/Tenants/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"QA Trial Tenant\",\"subdomain\":\"qa-trial\",\"adminEmail\":\"trial.admin@qa.local\",\"adminPassword\":\"Admin@123\",\"phone\":\"000\",\"address\":\"QA\"}"
```

Repeat with `qa-paid` and `qa-b` and distinct emails.

Expected: JSON contains tenant `id`.

### 2.3 Switch Tenant (SuperAdmin only)

```bash
curl -s -X POST "http://localhost:5000/api/Tenants/<TENANT_ID>/switch" ^
  -H "Authorization: Bearer <MASTER_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

Expected: JSON contains `token` and `tenantId`.

### 2.4 Activate License (UI path)

```bash
curl -s -X POST "http://localhost:5000/api/WrLicense/validate" ^
  -H "Authorization: Bearer <TENANT_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"purchaseCode\":\"11111111-1111-1111-1111-111111111111\"}"
```

Expected: success response and license fields updated for that tenant.

## 3) Test Cases

Each test case includes: Preconditions → Steps → Expected Result.

### TC-01 — Tenant-scoped cache isolation (Fixes original superAdmin false-expiry bug)

Preconditions:

- Tenant A is trial-expired (set `TrialExpiryDate` in the past).
- Tenant B is paid (set `LicenseType = Paid`).

Steps:

1. Login as master admin → obtain `MASTER_TOKEN`.
2. Switch to Tenant A → obtain `TOKEN_A`.
3. Switch to Tenant B → obtain `TOKEN_B`.
4. Call a write endpoint under Tenant A context (expected blocked).
5. Immediately call the same write endpoint under Tenant B context (expected allowed).

Commands:

- Set Tenant A to expired trial (requires superAdmin):

```bash
curl -s -X PUT "http://localhost:5000/api/Tenants/<TENANT_A_ID>/license" ^
  -H "Authorization: Bearer <MASTER_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"licenseType\":\"Trial\"}"
```

Then manually set expiry in DB (see Section 4) OR temporarily change server clock in a sandbox.

- Set Tenant B to paid:

```bash
curl -s -X PUT "http://localhost:5000/api/Tenants/<TENANT_B_ID>/license" ^
  -H "Authorization: Bearer <MASTER_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"licenseType\":\"Paid\"}"
```

- Write endpoint example (use license generation as write operation):

```bash
curl -i -X POST "http://localhost:5000/api/Tenants/<TENANT_A_ID>/license/generate" ^
  -H "Authorization: Bearer <MASTER_TOKEN>"
```

Expected:

- Tenant A request returns `403` with `isTrialExpired=true` (if not superAdmin-bypassed).
- Tenant B request returns `200`.
- Results must be consistent across repeated alternating calls (no cross-tenant leakage).

### TC-02 — Activation endpoint works even when trial expired (No deadlock)

Preconditions:

- Tenant is in expired trial state.

Steps:

1. Switch to tenant → obtain `TENANT_TOKEN`.
2. Call `POST /api/WrLicense/validate` with purchaseCode.
3. Call a write endpoint again.

Expected:

- Activation call succeeds (not blocked by middleware).
- Tenant becomes paid (Phase 2 behavior), subsequent writes succeed.

### TC-03 — `/api/CompanyProfile/activate_license` is no longer anonymous (Security hardening)

Steps:

```bash
curl -i -X POST "http://localhost:5000/api/CompanyProfile/activate_license" ^
  -H "Content-Type: application/json" ^
  -d "{\"purchaseCode\":\"11111111-1111-1111-1111-111111111111\",\"licenseKey\":\"SOMEKEY\"}"
```

Expected:

- Returns `401 Unauthorized` (or `403 Forbidden`) when called without authentication.

### TC-04 — Non-superAdmin cannot override tenant context using `X-Tenant-ID`

Preconditions:

- Create Tenant A and Tenant B and have separate tenant tokens:
  - `TOKEN_A` (TenantId=A)
  - `TOKEN_B` (TenantId=B)

Steps:

1. Call an endpoint that is tenant-filtered using `TOKEN_A` while trying to override with header `X-Tenant-ID: <TENANT_B_ID>`.

Example:

```bash
curl -s -X GET "http://localhost:5000/api/CompanyProfile" ^
  -H "Authorization: Bearer <TOKEN_A>" ^
  -H "X-Tenant-ID: <TENANT_B_ID>"
```

Expected:

- Response must be Tenant A profile (header ignored for non-superAdmin).

### TC-05 — SuperAdmin can override tenant context using `X-Tenant-ID` (Impersonation path)

Steps:

```bash
curl -s -X GET "http://localhost:5000/api/CompanyProfile" ^
  -H "Authorization: Bearer <MASTER_TOKEN>" ^
  -H "X-Tenant-ID: <TENANT_B_ID>"
```

Expected:

- Response must be Tenant B profile.

### TC-06 — Trial enforcement blocks writes based on subscription dates (Phase 2)

Preconditions:

- Tenant has `LicenseType=Trial`.
- `TrialExpiryDate` is in the past OR `SubscriptionEndDate` in the past.

Steps:

- Attempt a write call using tenant token.

Expected:

- `403` with `isTrialExpired=true`.

### TC-07 — Paid tenant never blocked by trial middleware (Phase 2)

Preconditions:

- Tenant has `LicenseType=Paid`.

Steps:

- Attempt the same write call.

Expected:

- `200` (no trial block).

### TC-08 — License record (Phase 4) blocks/enables access independent of CompanyProfile marker

Preconditions:

- Insert a row in `Licenses` table for the tenant:
  - Status = Active
  - ExpiresAt = future (should allow)

Steps:

1. Insert active license record (see Section 4).
2. Call a write endpoint.

Expected:

- `200` even if CompanyProfile.LicenseKey is empty or AAABBB.

Repeat with:

- ExpiresAt in the past → expect `403` with message “License Expired. Please Renew License.”

### TC-09 — Ensure GET is not a bypass for writes (Phase 3 hardening)

Steps:

- Verify that when trial/license is expired:
  - GET endpoints still return 200 (reads allowed)
  - POST/PUT/DELETE/PATCH are blocked

Expected:

- Reads are functional, writes are blocked based on subscription/license state.

## 4) Database Test Data Scripts (Phase 4 + Expiry Manipulation)

Use the script that matches your database provider.

### 4.1 SQLite (POSDb.db)

Insert active license (expires in future):

```sql
INSERT INTO "Licenses"
("Id","TenantId","TokenId","TokenHash","Plan","Status","IssuedAt","ActivatedAt","ExpiresAt","MaxUsers","CreatedDate","CreatedBy","ModifiedDate","ModifiedBy","IsDeleted","SyncVersion")
VALUES
('22222222-2222-2222-2222-222222222222',
 '<TENANT_ID>',
 'lic_qa_0001',
 'sha256_dummy_hash_value_0001',
 'Pro',
 'Active',
 datetime('now'),
 datetime('now'),
 datetime('now','+30 day'),
 25,
 datetime('now'),
 '00000000-0000-0000-0000-000000000000',
 datetime('now'),
 '00000000-0000-0000-0000-000000000000',
 0,
 0);
```

Force trial expiry quickly:

```sql
UPDATE "Tenants"
SET "LicenseType"='Trial',
    "TrialExpiryDate"=datetime('now','-1 day'),
    "SubscriptionEndDate"=datetime('now','-1 day')
WHERE "Id"='<TENANT_ID>';
```

### 4.2 PostgreSQL

```sql
INSERT INTO "Licenses"
("Id","TenantId","TokenId","TokenHash","Plan","Status","IssuedAt","ActivatedAt","ExpiresAt","MaxUsers","CreatedDate","CreatedBy","ModifiedDate","ModifiedBy","IsDeleted","SyncVersion")
VALUES
('22222222-2222-2222-2222-222222222222'::uuid,
 '<TENANT_ID>'::uuid,
 'lic_qa_0001',
 'sha256_dummy_hash_value_0001',
 'Pro',
 'Active',
 now(),
 now(),
 now() + interval '30 days',
 25,
 now(),
 '00000000-0000-0000-0000-000000000000'::uuid,
 now(),
 '00000000-0000-0000-0000-000000000000'::uuid,
 false,
 0);
```

Force trial expiry:

```sql
UPDATE "Tenants"
SET "LicenseType"='Trial',
    "TrialExpiryDate"=now() - interval '1 day',
    "SubscriptionEndDate"=now() - interval '1 day'
WHERE "Id"='<TENANT_ID>'::uuid;
```

### 4.3 SQL Server

```sql
INSERT INTO [dbo].[Licenses]
([Id],[TenantId],[TokenId],[TokenHash],[Plan],[Status],[IssuedAt],[ActivatedAt],[ExpiresAt],[MaxUsers],[CreatedDate],[CreatedBy],[ModifiedDate],[ModifiedBy],[IsDeleted],[SyncVersion])
VALUES
('22222222-2222-2222-2222-222222222222',
 '<TENANT_ID>',
 'lic_qa_0001',
 'sha256_dummy_hash_value_0001',
 'Pro',
 'Active',
 SYSUTCDATETIME(),
 SYSUTCDATETIME(),
 DATEADD(day, 30, SYSUTCDATETIME()),
 25,
 SYSUTCDATETIME(),
 '00000000-0000-0000-0000-000000000000',
 SYSUTCDATETIME(),
 '00000000-0000-0000-0000-000000000000',
 0,
 0);
```

Force trial expiry:

```sql
UPDATE [dbo].[Tenants]
SET [LicenseType]='Trial',
    [TrialExpiryDate]=DATEADD(day, -1, SYSUTCDATETIME()),
    [SubscriptionEndDate]=DATEADD(day, -1, SYSUTCDATETIME())
WHERE [Id]='<TENANT_ID>';
```

## 5) Expected Outcomes Checklist

- Tenant switching does not cause false expiry due to caching.
- Activation via `/api/WrLicense/validate` works even after trial expiry and results in Paid tenant.
- Anonymous overwrite of license key via `/api/CompanyProfile/activate_license` is blocked.
- `X-Tenant-ID` header is ignored unless request is authenticated and superAdmin.
- Trial enforcement is based on tenant subscription fields.
- License-record enforcement (Licenses table) overrides CompanyProfile “marker” behavior for allow/deny.

