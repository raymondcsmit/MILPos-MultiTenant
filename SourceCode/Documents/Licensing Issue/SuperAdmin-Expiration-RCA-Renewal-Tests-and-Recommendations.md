# SuperAdmin “Perpetual” Expiration – Root Cause Analysis, Renewal Process, Test Cases, and Recommendations

## 1) Symptom Summary

Observed behavior:

- A user with SuperAdmin capabilities is redirected to /subscription (Angular) and blocked from write operations (POST/PUT/DELETE/PATCH) by the API with HTTP 403 and payload containing isTrialExpired.
- This occurs even in environments where the SuperAdmin/Master tenant is expected to be perpetual.

Front-end behavior is driven by:

- f:\MIllyass\pos-with-inventory-management\SourceCode\Angular\src\app\http-request-interceptor.ts
  - Redirects to /subscription on 403 if isTrialExpired is present.

Server-side blocking is driven by:

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs

## 2) Reproduction Paths (Based on Current Code)

### Scenario A: Master/SuperAdmin tenant becomes “trial expired” after 14 days

Preconditions:

- Tenant was created/seeded and its CompanyProfile has LicenseKey = "AAABBB" (trial marker) as seeded by:
  - f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Repository\Tenant\TenantRegistrationService.cs
  - AppConstants.Seeding.DefaultLicenseKey = "AAABBB":
    - f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Common\AppConstants.cs
- CompanyProfile.CreatedDate is older than 14 days.

Steps:

1. Login as SuperAdmin.
2. Call any write endpoint (example): PUT /api/Tenants/{id}/license or POST /api/Tenants/{id}/license/generate.
3. API returns 403 { isTrialExpired: true } and Angular redirects to /subscription.

Expected (per requirement):

- SuperAdmin/Master should remain operational (perpetual) and should not be locked out by trial expiry.

### Scenario B: SuperAdmin tenant switching causes incorrect expiration due to cache leakage

Preconditions:

- Multi-tenant deployment with multiple tenants.
- One tenant is trial-expired; another is paid/active.
- TrialEnforcementMiddleware uses a single global cache key "CompanyProfile_License".

Steps:

1. As SuperAdmin, switch or target Tenant A (trial-expired) so that CompanyProfile for A is cached.
2. Switch/target Tenant B (expected active/perpetual).
3. Make a write request in context of Tenant B.

Observed:

- TrialEnforcementMiddleware may continue to use cached profile from Tenant A because the cache key is not tenant-scoped, producing false “trial expired” blocks for Tenant B.

## 3) Root Causes

### RCA-1 (Primary, correctness): Tenant-agnostic caching of license state (Critical)

Evidence:

- TrialEnforcementMiddleware caches CompanyProfile under key "CompanyProfile_License" with no tenantId suffix.
  - f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs
- ValidateLicenseCommandHandler invalidates the same global key.
  - f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\WrLicense\Handler\ValidateLicenseCommandHandler.cs

Impact:

- Any tenant’s license state can affect another tenant’s enforcement results in the same process.
- SuperAdmin tenant switching amplifies the issue because tenant context can legitimately change across requests.

### RCA-2 (Policy/design): SuperAdmin/Master tenant is treated as trial by default (High)

Evidence:

- TenantRegistrationService seeds every CompanyProfile with AAABBB (trial marker).
- TrialEnforcementMiddleware treats AAABBB as trial and expires it after 14 days based on CompanyProfile.CreatedDate.

Impact:

- Unless activation happens in time, SuperAdmin/Master tenant becomes blocked like any trial tenant, violating “perpetual SuperAdmin” requirement.

### RCA-3 (Availability): Expired trial can block activation/renewal endpoints (High)

Evidence:

- Allowlist in TrialEnforcementMiddleware includes "/api/License/Validate" (not the actual route used: "/api/WrLicense/validate").
- Activation endpoints are POST and therefore blocked in expired trial unless allowlisted.

Impact:

- Systems can enter a state where users cannot activate/renew through the intended UI/API once expired.

## 4) Current Renewal Process (As Implemented)

There is no cryptographic “renewal”; renewal is effectively overwriting DB fields.

### Desktop activation path (used by Angular activate-license screen)

1. User enters purchaseCode in Angular UI.
2. Angular calls POST /api/WrLicense/validate with { purchaseCode }.
3. Server accepts any non-empty purchaseCode, generates random LicenseKey, stores to CompanyProfile.
4. TrialEnforcementMiddleware sees LicenseKey != empty and != AAABBB and stops blocking writes.

Key limitation:

- After trial expiry, POST calls can be blocked, preventing renewal/activation.

### Cloud admin paths (SuperAdmin)

- PUT /api/Tenants/{id}/license (Trial/Paid)
- POST /api/Tenants/{id}/license/generate (generates GUIDs)

Key limitation:

- TrialEnforcementMiddleware does not consult Tenant.LicenseType or Tenant.SubscriptionEndDate, so these updates do not affect enforcement.

## 5) Immediate Fixes (Low-Risk, High-Impact)

These items can be implemented without introducing a full licensing server, and directly address the superAdmin expiration bug and renewal lockout.

### Fix-1: Tenant-scope the cached CompanyProfile license state

Implementation intent:

- Replace cache key "CompanyProfile_License" with "CompanyProfile_License:{tenantId}".
- tenantId should be resolved from ITenantProvider (already available via ICompanyProfileRepository.GetCompanyProfile()).

Expected outcome:

- Eliminates cross-tenant license leakage and false trial-expired decisions during tenant switching.

### Fix-2: Allowlist activation/renewal endpoints unconditionally

Implementation intent:

- Ensure these routes are allowed even when trial expired:
  - POST /api/WrLicense/validate
  - POST /api/CompanyProfile/activate_license
  - POST /api/Tenants/register (if public registration is required)

Expected outcome:

- Prevents “cannot renew because renewal is blocked” deadlock.

### Fix-3: Make SuperAdmin/Master tenant perpetual by policy

Recommended approaches (choose one):

- Approach A (cleaner): add an explicit license/subscription model and enforce it:
  - Tenant.SubscriptionEndDate governs expiry
  - SubscriptionPlan = "Master" or LicenseType = "Paid" with null expiry indicates perpetual
- Approach B (tactical): bypass trial enforcement for SuperAdmin users:
  - If request.User has claim isSuperAdmin == true, skip trial write-blocking
  - Restrict bypass to control-plane endpoints if needed

Expected outcome:

- SuperAdmin can always manage tenants and recover/activate licenses.

## 6) Long-Term Architecture Improvements (Best Practices)

### 6.1 Licensing Model (Recommended)

Create a dedicated server-side License aggregate per tenant:

- LicenseId
- TenantId
- Status: Trial / Active / Suspended / Expired
- Plan: Trial / Standard / Pro / Master
- StartsAt, ExpiresAt (nullable for perpetual)
- GracePeriodDays (for temporary validation outages)
- IssuedAt, IssuedBy
- Features: structured flags/limits (max users, modules)
- Signature (server-private-key signature of license payload)

Enforcement:

- Compute license verdict server-side on each request or on a short-lived cache:
  - verdict = { allowed, reason, expiresAt, plan, limits }
- Apply verdict to write endpoints and any feature-gated endpoints using policy-based authorization.

### 6.2 Cryptographic Best Practice

- Use asymmetric signing for license tokens:
  - Private key stored securely server-side
  - Public key embedded in clients only if offline verification is required
- Never accept “license key” input that is directly written into authoritative state without verification.
- Bind licenses to tenant identity:
  - TenantId, domain/subdomain, and optionally machine fingerprint (Desktop)

### 6.3 Multi-Tenant Safety

- Tenant context must be resolved consistently:
  - Prefer JWT TenantId claim for authenticated requests
  - Subdomain strategy for anonymous bootstrap endpoints
  - Header override only for SuperAdmin and only when authenticated
- All tenant-scoped caches must use tenant keys.

### 6.4 Operational & Security Best Practices

- Audit log all license changes with:
  - who, when, old/new values, request metadata
- Add rate limiting to activation endpoints.
- Lock down configuration secrets:
  - Move JWT/AES keys and master admin credentials out of repo configs
  - Rotate secrets and enforce strong passwords

## 7) Validation Test Cases (Manual + Automated Checklist)

### 7.1 Trial enforcement correctness

- TC-01: Trial tenant within 14 days
  - Given: CompanyProfile.LicenseKey == "AAABBB", CreatedDate = now-1 day
  - When: POST a typical business endpoint
  - Then: request succeeds (no 403 trial-expired)

- TC-02: Trial tenant after 14 days
  - Given: CompanyProfile.LicenseKey == "AAABBB", CreatedDate = now-30 days
  - When: POST/PUT/DELETE a business endpoint
  - Then: 403 with isTrialExpired = true

- TC-03: Paid tenant
  - Given: CompanyProfile.LicenseKey != "" and != "AAABBB"
  - When: POST/PUT/DELETE business endpoint
  - Then: request succeeds (no trial block)

### 7.2 Renewal/activation survivability

- TC-04: Activation after trial expiry must be possible
  - Given: Trial expired tenant (TC-02)
  - When: POST /api/WrLicense/validate with purchaseCode
  - Then: activation succeeds and subsequent business POST succeeds

- TC-05: Wrong allowlist regression test
  - Given: Trial expired tenant
  - When: POST /api/WrLicense/validate
  - Then: it must not be blocked due to allowlist mismatch

### 7.3 Multi-tenant cache isolation (SuperAdmin bug regression)

- TC-06: Cross-tenant cache isolation
  - Given: Tenant A is trial-expired; Tenant B is paid/active
  - When: Call a write endpoint in Tenant A context first, then immediately in Tenant B context
  - Then: Tenant B request must not be blocked based on Tenant A state

### 7.4 Perpetual SuperAdmin/Master behavior

- TC-07: SuperAdmin is never locked out of control-plane operations
  - Given: Master/SuperAdmin tenant older than 14 days
  - When: SuperAdmin calls control-plane endpoints (Tenants CRUD, license generation)
  - Then: requests must succeed regardless of trial state (per business requirement)

## 8) Recommended Implementation Order

1. Tenant-scope the CompanyProfile_License cache key.
2. Fix allowlist to include real activation endpoints used by the UI.
3. Decide and enforce a single authoritative model for expiry (Tenant subscription or License aggregate).
4. Replace placeholder “validate any purchaseCode” handler with real licensing verification.
5. Add audit logs + rate limiting for activation/renewal APIs.

