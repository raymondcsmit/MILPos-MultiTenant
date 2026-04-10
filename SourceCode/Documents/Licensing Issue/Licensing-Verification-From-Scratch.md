# Licensing Verification – From-Scratch Test Cases (Clean Database)

This document is a clean-room test flow to validate licensing changes after you reset the database and start from scratch.

Scope validated:

- Phase 1: tenant-scoped cache, activation allowlist, superAdmin perpetual, tenant-correct writes
- Phase 2: subscription fields as source of truth + activation upgrades tenant to Paid
- Phase 3: `activate_license` not anonymous, `X-Tenant-ID` restricted, no GET bypass for trial checks
- Phase 4 (groundwork): `Licenses` table and license-record-based enforcement (Active/Expired)

## 0) Assumptions

- API base URL: `http://localhost:5000`
- You are running Cloud mode with seeding enabled (recommended for these tests), or you have a known super admin user.
- Default master admin credentials (from `appsettings.Cloud.json`):
  - Email: `admin@gmail.com`
  - Password: `Admin@123`

## 1) Start-of-Test Checklist (After DB Reset)

1. Start the API and ensure it is reachable:
   - `GET http://localhost:5000/api/CompanyProfile` returns 200.
2. Confirm master admin login works:
   - `POST /api/authentication` returns a JSON payload with `bearerToken`.

## 2) Test Data (Use These Values)

### Tenants to create

Create three tenants:

- Tenant A (trial-expired candidate):
  - Name: `QA Trial Tenant`
  - Subdomain: `qa-trial`
  - Admin email: `trial.admin@qa.local`
  - Admin password: `Admin@123`

- Tenant B (paid):
  - Name: `QA Paid Tenant`
  - Subdomain: `qa-paid`
  - Admin email: `paid.admin@qa.local`
  - Admin password: `Admin@123`

- Tenant C (cross-tenant isolation):
  - Name: `QA Tenant C`
  - Subdomain: `qa-c`
  - Admin email: `c.admin@qa.local`
  - Admin password: `Admin@123`

### License activation purchase code (UI path)

- `11111111-1111-1111-1111-111111111111`

### Phase 4 license record values

- TokenId: `lic_qa_0001`
- TokenHash: `sha256_dummy_hash_value_0001`
- Plan: `Pro`
- Status: `Active`
- MaxUsers: `25`

## 3) Common Commands

### 3.1 Login (Master Admin)

```bash
curl -s -X POST "http://localhost:5000/api/authentication" ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@gmail.com\",\"password\":\"Admin@123\"}"
```

Save `bearerToken` as: `MASTER_TOKEN`.

### 3.2 Register Tenant (Public)

Tenant A:

```bash
curl -s -X POST "http://localhost:5000/api/Tenants/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"QA Trial Tenant\",\"subdomain\":\"qa-trial\",\"adminEmail\":\"trial.admin@qa.local\",\"adminPassword\":\"Admin@123\",\"phone\":\"000\",\"address\":\"QA\"}"
```

Tenant B:

```bash
curl -s -X POST "http://localhost:5000/api/Tenants/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"QA Paid Tenant\",\"subdomain\":\"qa-paid\",\"adminEmail\":\"paid.admin@qa.local\",\"adminPassword\":\"Admin@123\",\"phone\":\"000\",\"address\":\"QA\"}"
```

Tenant C:

```bash
curl -s -X POST "http://localhost:5000/api/Tenants/register" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"QA Tenant C\",\"subdomain\":\"qa-c\",\"adminEmail\":\"c.admin@qa.local\",\"adminPassword\":\"Admin@123\",\"phone\":\"000\",\"address\":\"QA\"}"
```

Record the returned tenant IDs:

- `TENANT_A_ID`
- `TENANT_B_ID`
- `TENANT_C_ID`

### 3.3 Switch Tenant (SuperAdmin-only)

```bash
curl -s -X POST "http://localhost:5000/api/Tenants/<TENANT_ID>/switch" ^
  -H "Authorization: Bearer <MASTER_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{}"
```

Save `token` from response:

- `TOKEN_A` for Tenant A
- `TOKEN_B` for Tenant B
- `TOKEN_C` for Tenant C

### 3.4 Activation (UI path)

```bash
curl -s -X POST "http://localhost:5000/api/WrLicense/validate" ^
  -H "Authorization: Bearer <TENANT_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"purchaseCode\":\"11111111-1111-1111-1111-111111111111\"}"
```

## 4) From-Scratch Test Cases (Recommended Order)

### TC-FS-01 — Baseline: all new tenants start as Trial (subscription fields)

Steps:

1. After tenant registration, fetch the tenant as SuperAdmin:

```bash
curl -s -X GET "http://localhost:5000/api/Tenants/<TENANT_A_ID>" ^
  -H "Authorization: Bearer <MASTER_TOKEN>"
```

Expected:

- `LicenseType` is `Trial`
- `TrialExpiryDate` is present (Phase 2 tenant initialization)

Repeat for Tenant B and C.

### TC-FS-02 — Trial expiry blocks writes for a tenant (Phase 2 enforcement)

Goal: force Tenant A into an expired trial state and verify write blocking.

Steps:

1. Force Tenant A expiry (DB script in Section 6).
2. Attempt a write operation as Tenant A.

Use a write endpoint (example: license generation is a POST):

```bash
curl -i -X POST "http://localhost:5000/api/Tenants/<TENANT_A_ID>/license/generate" ^
  -H "Authorization: Bearer <MASTER_TOKEN>"
```

Expected:

- If you call with `MASTER_TOKEN`, this may succeed due to superAdmin bypass.
- To validate tenant-level blocking, call a business write endpoint using `TOKEN_A` (tenant token) instead of `MASTER_TOKEN`.

If you don’t have a safe tenant write endpoint ready, you can use any POST/PUT endpoint requiring only auth for that tenant.

Expected tenant behavior:

- `403` with JSON containing `isTrialExpired=true` for tenant-authenticated write.

### TC-FS-03 — Activation works after trial expiry (no deadlock)

Goal: ensure the system can recover from expired trial using `/api/WrLicense/validate`.

Precondition:

- Tenant A is trial-expired (TC-FS-02).

Steps:

1. Activate Tenant A using `TOKEN_A`:

```bash
curl -s -X POST "http://localhost:5000/api/WrLicense/validate" ^
  -H "Authorization: Bearer <TOKEN_A>" ^
  -H "Content-Type: application/json" ^
  -d "{\"purchaseCode\":\"11111111-1111-1111-1111-111111111111\"}"
```

2. Re-check Tenant A subscription fields:

```bash
curl -s -X GET "http://localhost:5000/api/Tenants/<TENANT_A_ID>" ^
  -H "Authorization: Bearer <MASTER_TOKEN>"
```

Expected:

- Tenant A now has `LicenseType = Paid`
- `TrialExpiryDate` is null
- `SubscriptionEndDate` is null (perpetual Paid in current implementation)

3. Retry the same tenant write endpoint with `TOKEN_A`.

Expected:

- No trial blocking (`200`).

### TC-FS-04 — `activate_license` is not anonymous (Phase 3)

Steps:

```bash
curl -i -X POST "http://localhost:5000/api/CompanyProfile/activate_license" ^
  -H "Content-Type: application/json" ^
  -d "{\"purchaseCode\":\"11111111-1111-1111-1111-111111111111\",\"licenseKey\":\"SOMEKEY\"}"
```

Expected:

- `401` or `403` (must not succeed anonymously).

### TC-FS-05 — `X-Tenant-ID` cannot be used by non-superAdmin to change tenant context (Phase 3)

Precondition:

- You have `TOKEN_B` (tenant token for Tenant B).

Steps:

Attempt to fetch CompanyProfile but override to Tenant C:

```bash
curl -s -X GET "http://localhost:5000/api/CompanyProfile" ^
  -H "Authorization: Bearer <TOKEN_B>" ^
  -H "X-Tenant-ID: <TENANT_C_ID>"
```

Expected:

- Response must still be Tenant B’s CompanyProfile (override ignored).

### TC-FS-06 — SuperAdmin can override tenant context using `X-Tenant-ID` (Phase 3)

Steps:

```bash
curl -s -X GET "http://localhost:5000/api/CompanyProfile" ^
  -H "Authorization: Bearer <MASTER_TOKEN>" ^
  -H "X-Tenant-ID: <TENANT_C_ID>"
```

Expected:

- Response must be Tenant C’s CompanyProfile.

### TC-FS-07 — Cross-tenant cache isolation regression (original bug)

Goal: ensure that cached license/profile state from one tenant does not affect another tenant.

Steps:

1. Force Tenant C into expired trial (DB script).
2. Ensure Tenant B is Paid (activate Tenant B via WrLicense validate).
3. Alternate tenant requests quickly:
   - Call a tenant-authenticated write under Tenant C (expect 403).
   - Immediately call the same type of tenant-authenticated write under Tenant B (expect 200).

Expected:

- Tenant B must never be blocked due to Tenant C state.

### TC-FS-08 — Phase 4 License Record: Active license record allows writes even if CompanyProfile marker is trial

Goal: validate license-record-based enforcement priority.

Steps:

1. Set Tenant A back to trial with expired fields (DB script).
2. Insert an Active `Licenses` record for Tenant A with ExpiresAt in the future (DB script).
3. Perform tenant-authenticated write with `TOKEN_A`.

Expected:

- Write should be allowed because Active License record is present and unexpired.

### TC-FS-09 — Phase 4 License Record: Expired license record blocks writes

Steps:

1. Update the Tenant A license record ExpiresAt to the past.
2. Perform the same tenant-authenticated write with `TOKEN_A`.

Expected:

- `403` with message “License Expired. Please Renew License.”

## 5) Minimal “Write Endpoint” Suggestions

To validate write-blocking you need at least one write endpoint callable with a tenant-authenticated token.

Common options:

- Any POST/PUT endpoint in your app that is accessible to tenant admins (inventory/product/expense etc.)
- Avoid using SuperAdmin-only endpoints for tenant-blocking tests because superAdmin is bypassed by design.

## 6) Database Scripts (Use Based on Your Provider)

### 6.1 SQLite

Force Tenant expiry:

```sql
UPDATE "Tenants"
SET "LicenseType"='Trial',
    "TrialExpiryDate"=datetime('now','-1 day'),
    "SubscriptionEndDate"=datetime('now','-1 day')
WHERE "Id"='<TENANT_ID>';
```

Insert Active license record:

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

Expire the license record:

```sql
UPDATE "Licenses"
SET "ExpiresAt"=datetime('now','-1 day')
WHERE "TenantId"='<TENANT_ID>' AND "TokenId"='lic_qa_0001';
```

### 6.2 PostgreSQL

Force Tenant expiry:

```sql
UPDATE "Tenants"
SET "LicenseType"='Trial',
    "TrialExpiryDate"=now() - interval '1 day',
    "SubscriptionEndDate"=now() - interval '1 day'
WHERE "Id"='<TENANT_ID>'::uuid;
```

Insert Active license record:

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

Expire the license record:

```sql
UPDATE "Licenses"
SET "ExpiresAt"=now() - interval '1 day'
WHERE "TenantId"='<TENANT_ID>'::uuid AND "TokenId"='lic_qa_0001';
```

### 6.3 SQL Server

Force Tenant expiry:

```sql
UPDATE [dbo].[Tenants]
SET [LicenseType]='Trial',
    [TrialExpiryDate]=DATEADD(day, -1, SYSUTCDATETIME()),
    [SubscriptionEndDate]=DATEADD(day, -1, SYSUTCDATETIME())
WHERE [Id]='<TENANT_ID>';
```

Insert Active license record:

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

Expire the license record:

```sql
UPDATE [dbo].[Licenses]
SET [ExpiresAt]=DATEADD(day, -1, SYSUTCDATETIME())
WHERE [TenantId]='<TENANT_ID>' AND [TokenId]='lic_qa_0001';
```

## 7) Pass/Fail Criteria (Quick)

- Tenant-authenticated writes are blocked only when expired (trial or expired license record).
- Activation via `WrLicense/validate` always works and upgrades tenant to Paid.
- `activate_license` cannot be called anonymously.
- `X-Tenant-ID` override only works for authenticated superAdmin.
- Cross-tenant requests do not leak enforcement decisions.

