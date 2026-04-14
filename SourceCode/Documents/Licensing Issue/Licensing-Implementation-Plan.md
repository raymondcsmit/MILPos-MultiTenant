# Licensing System – Detailed Implementation Plan (Review & Approval)

## Purpose

This plan addresses the licensing issues identified in:

- Licensing-System-Overview.md
- Licensing-Code-Analysis.md
- Licensing-Security-Vulnerabilities.md
- SuperAdmin-Expiration-RCA-Renewal-Tests-and-Recommendations.md

Primary goals:

1. Fix the **superAdmin “perpetual” expiration** issue.
2. Eliminate **renewal/activation deadlocks** after trial expiration.
3. Close high-impact **security gaps** and improve multi-tenant correctness.
4. Provide a path to a **best-practice licensing architecture** long-term.

This document is **plan-only**. It does not apply code changes until you approve.

## Summary of Current Problems (What We’re Fixing)

1. **Cross-tenant license cache leakage (Critical):** License/trial state is cached under a single global cache key (`CompanyProfile_License`), causing incorrect enforcement when tenant context changes.
2. **Activation deadlock (High):** Trial middleware allowlist mismatches the real activation route and blocks POST requests after trial expiry, potentially preventing activation/renewal.
3. **Perpetual SuperAdmin policy not implemented (High):** Master/SuperAdmin tenant can still be treated as trial and locked out after 14 days.
4. **Unsafe tenant scoping (High):** License handlers update the “first CompanyProfile” rather than tenant-scoped profile.
5. **Licensing is bypassable (Critical):** Current “validation” accepts any code and writes license state; plus an anonymous endpoint exists that can overwrite license values.

## Design Principles for the Fix

- **Correctness first:** Fix caching and tenant scoping before changing licensing model.
- **Never block recovery:** Activation/renewal endpoints must always work even when trial expired.
- **Server-side authority:** License enforcement should be based on server-side state/verification, not client-side tokens.
- **Tenant isolation:** All licensing data access and cache keys must be tenant-specific in Cloud mode.
- **Progressive hardening:** Apply immediate low-risk fixes, then move toward a robust architecture.

## Phase 1 — Hotfix (Correctness + Unblock Renewal)

### Deliverables

- Tenant-scoped license caching.
- Correct allowlisting for activation/renewal.
- Implement “SuperAdmin is perpetual” rule (policy-based).
- Ensure activation updates the correct tenant profile.

### Change Set 1.1 — Tenant-scoped cache key (Fixes superAdmin expiration bug)

**Why**

- Prevents cross-tenant license decisions and false trial-expired blocks when SuperAdmin switches tenants or when multiple tenants hit the same API instance.

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs
- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Repository\CompanyProfile\CompanyProfileRepository.cs

**Implementation steps**

1. In TrialEnforcementMiddleware:
   - Determine `tenantId` (prefer `ITenantProvider.GetTenantId()`).
   - Use cache key format: `CompanyProfile_License:{tenantId}`.
2. On cache miss:
   - Load company profile via `ICompanyProfileRepository.GetCompanyProfile()` (already tenant-aware).
3. Cache the profile under tenant-scoped key for a short TTL (keep 10 minutes initially).

**Acceptance criteria**

- Switching from an expired trial tenant to a paid tenant does not incorrectly block the paid tenant.
- Multiple tenants making requests concurrently do not interfere with each other’s licensing state.

**Rollback**

- Revert to old cache key (not recommended, only for emergency), or disable licensing enforcement via a temporary config toggle (optional).

### Change Set 1.2 — Fix activation allowlist (Prevents renewal deadlock)

**Why**

- Trial enforcement currently allows `/api/License/Validate`, but the real endpoint is `/api/WrLicense/validate`.
- Expired trial blocks write operations, including activation endpoints unless explicitly allowlisted.

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs
- (Reference) f:\MIllyass\pos-with-inventory-management\SourceCode\Angular\src\app\core\services\wr-license.service.ts

**Implementation steps**

1. Update allowlist to include:
   - `POST /api/WrLicense/validate`
   - `POST /api/CompanyProfile/activate_license` (if kept)
   - `POST /api/Tenants/register` (optional, if you want registration to work in expired state)
2. Keep existing login/token refresh paths allowlisted.
3. Make allowlist comparisons robust:
   - Normalize casing.
   - Allow matching by prefix for controllers if needed.

**Acceptance criteria**

- In a tenant where trial has expired, activation succeeds and removes the block for future writes.

### Change Set 1.3 — SuperAdmin perpetual policy (Control-plane availability)

**Why**

- Your requirement: superAdmin should not expire and should always be able to manage tenants/licenses.

**Two implementation options (choose one for Phase 1)**

**Option A (recommended, fastest / least risk): SuperAdmin bypass for trial write-blocking**

- If request user has claim `isSuperAdmin == true`, skip trial write-blocking logic.
- Optionally restrict bypass to “control-plane” endpoints only (Tenant management / licensing), but simplest is full bypass for superAdmin.

**Option B: Master tenant is perpetual based on subscription fields**

- If tenant is Master (SubscriptionPlan == "Master" OR ExpiresAt null/far future), do not expire.

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs
- (Reference) f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Repository\User\UserRepository.cs

**Acceptance criteria**

- SuperAdmin can always call:
  - `/api/Tenants/*` license generation and update endpoints
  - tenant switching endpoints
  - any required admin operations

### Change Set 1.4 — Correct tenant scoping for activation updates

**Why**

- Several handlers update “first CompanyProfile”, which is unsafe in Cloud mode.

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\WrLicense\Handler\ValidateLicenseCommandHandler.cs
- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\CompanyProfile\Handlers\UpdateActivatedLicenseCommandHandler.cs

**Implementation steps**

1. Replace `.All.FirstOrDefault()` with `GetCompanyProfile()` in both handlers.
2. Invalidate the tenant-scoped cache key after updating profile license state.
3. Ensure handler behavior is consistent in both Desktop and Cloud modes.

**Acceptance criteria**

- Activating license affects only the current tenant’s CompanyProfile.

## Phase 2 — Normalize Licensing Rules (Stop Using CreatedDate as the Source of Truth)

### Deliverables

- One authoritative expiry model based on Tenant subscription fields (or a dedicated License aggregate).
- Trial enforcement derived from subscription, not from `CompanyProfile.CreatedDate`.

### Change Set 2.1 — Define authoritative license verdict computation

**Why**

- Current enforcement ignores Tenant fields (`LicenseType`, `TrialExpiryDate`, `SubscriptionEndDate`) and uses CompanyProfile.CreatedDate.

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs
- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Data\Entities\Tenant\Tenant.cs
- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\Tenant\Handlers\UpdateTenantLicenseCommandHandler.cs
- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Repository\Tenant\TenantInitializationService.cs

**Proposed rules**

- If tenant is Paid:
  - allow writes (no trial enforcement)
- If tenant is Trial:
  - expiry = `TrialExpiryDate` if set
  - else fallback to `SubscriptionEndDate` if set
  - else fallback to `CompanyProfile.CreatedDate + 14 days` (migration/backward compatibility only)

**Acceptance criteria**

- Updating tenant license to Paid actually removes expiry blocking.
- Trial expiry date and subscription end date behave consistently.

### Change Set 2.2 — Align tenant creation + license update handlers

**Implementation steps**

- Ensure tenant creation sets:
  - TrialExpiryDate and SubscriptionEndDate for trial tenants
- Ensure license update API:
  - For Trial: sets TrialExpiryDate (and optionally SubscriptionEndDate)
  - For Paid: clears TrialExpiryDate (and sets SubscriptionEndDate null or far-future depending on policy)

## Phase 3 — Security Hardening (Close Bypasses & Reduce Attack Surface)

### Deliverables

- Remove trivial license overwrite vectors.
- Restrict tenant selection attack surface.
- Improve auditability.

### Change Set 3.1 — Lock down anonymous license overwrite endpoint

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Controllers\CompanyProfile\CompanyProfileController.cs

**Implementation steps**

- Remove `[AllowAnonymous]` from `/api/CompanyProfile/activate_license` OR deprecate this endpoint.
- Require SuperAdmin/authorized user for license state updates.
- Add audit logging for every license change (who, tenant, old/new, timestamp).

### Change Set 3.2 — Restrict X-Tenant-ID header usage

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TenantResolutionMiddleware.cs
- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Domain\TenantProvider.cs

**Implementation steps**

- Honor `X-Tenant-ID` only when:
  - request is authenticated AND `isSuperAdmin == true`
- Otherwise, ignore the header.

### Change Set 3.3 — Remove “allow all GET” enforcement loophole

**Target files**

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs

**Implementation steps**

- Replace “all GET allowed” with explicit allowlist of safe GET endpoints, or use metadata-based endpoint policies.

## Phase 4 — Long-Term Licensing Architecture (Best Practice)

### Deliverables

- Real license verification (not placeholder).
- Durable, auditable license records.
- Support for perpetual licenses (explicitly modeled).

### Recommended architecture

1. Add a dedicated `Licenses` table per tenant:
   - TenantId, Plan, Status, IssuedAt, ExpiresAt (nullable), Limits, Signature, LastValidatedAt
2. Use signed license payloads:
   - Server signs with private key, service verifies signature before applying.
3. Replace purchase-code-only validation with:
   - verified ownership (license server), or
   - signed license file/token issued by an internal admin tool/service.

## Testing & Validation Plan (Must Pass Before Release)

### Manual validation matrix (Phase 1)

- TC-04: Activation works after trial expiry
- TC-06: Cross-tenant cache isolation
- TC-07: SuperAdmin never blocked from control-plane operations

### Regression checks (Phase 2/3)

- Paid tenant never shows trial-expired block.
- Trial tenant blocks only after configured expiry date.
- Header-based tenant override not usable by non-superAdmin.

## Rollout Strategy

1. Deploy Phase 1 first (hotfix).
2. Monitor logs for trial block counts and activation failures.
3. Deploy Phase 2 subscription normalization.
4. Deploy Phase 3 hardening.
5. Plan Phase 4 as a separate project milestone.

## Approval Checklist (Please Confirm Before Implementation)

1. SuperAdmin perpetual policy:
   - Option A: bypass trial enforcement for `isSuperAdmin == true`
   - Option B: perpetual only for Master tenant via subscription plan/expiry fields
2. Keep or deprecate `/api/CompanyProfile/activate_license`:
   - Keep (secure it)
   - Deprecate/remove (use only `/api/WrLicense/validate` or future license service)
3. For Paid tenant expiry:
   - ExpiresAt = null (true perpetual)
   - ExpiresAt = far-future (operational workaround)

