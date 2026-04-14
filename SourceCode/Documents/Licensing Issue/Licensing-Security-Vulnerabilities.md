# Licensing System – Vulnerabilities & Loopholes (Severity-Rated)

Severity scale used:

- Critical: Remote/low-effort bypass of licensing controls, cross-tenant impact, or direct privilege escalation.
- High: Practical bypass or data exposure with moderate effort.
- Medium: Weaknesses that enable abuse in specific conditions or reduce integrity guarantees.
- Low: Hardening opportunities and minor risks.

## A) Licensing Logic & Enforcement

| ID | Severity | Vulnerability | Evidence (code) | Exploit / Impact | Recommendation |
|---:|:--|:--|:--|:--|:--|
| L-001 | Critical | License “validation” accepts any non-empty purchase code and writes license state server-side | POS.MediatR\WrLicense\Handler\ValidateLicenseCommandHandler.cs | Any caller can “activate” by supplying any string; licensing has no integrity | Implement real validation (signed license tokens or server-side verification). Remove placeholder behavior that writes license state directly. |
| L-002 | Critical | Anonymous endpoint can overwrite license key + purchase code | POS.API\Controllers\CompanyProfile\CompanyProfileController.cs (activate_license) + POS.MediatR\UpdateActivatedLicenseCommandHandler.cs | Anyone can set arbitrary license values and potentially bypass trial enforcement | Require authentication + authorization; validate against a license server or signed license file; tenant-scope the update; log/audit all license changes. |
| L-003 | High | Trial enforcement uses “AAABBB” magic value as trial marker and is DB-field driven | POS.Common\AppConstants.cs + TrialEnforcementMiddleware.cs + TenantRegistrationService.cs | Attackers with any write path to CompanyProfile can disable trial enforcement by setting a non-empty LicenseKey | Replace magic value markers with explicit fields (e.g., LicenseStatus, LicenseKind). Enforce via signed licenses and server-side checks. |
| L-004 | High | Trial enforcement can block license activation/renewal endpoints after expiry | TrialEnforcementMiddleware.cs allowlist + Angular activation uses /api/WrLicense/validate | Once expired, POST calls are blocked; users cannot recover via activation | Ensure activation/renewal endpoints are always allowlisted, even in expired state. Prefer: allow activation endpoints, block only business operations. |
| L-005 | Medium | Enforcement allows all GET requests regardless of trial state | TrialEnforcementMiddleware.cs | If any endpoint performs state changes via GET (now or future), trial can be bypassed | Enforce by endpoint policy, not HTTP verb. At minimum, only allow safe GET endpoints or enforce on route metadata. |
| L-006 | Medium | Trial expiry is calculated from CompanyProfile.CreatedDate, not tenant trial/subscription fields | TrialEnforcementMiddleware.cs vs Tenant fields in Tenant.cs | License duration/renewal changes in Tenant are ignored; inconsistent behavior | Use one authoritative subscription model (Tenant.SubscriptionEndDate/LicenseType) or a dedicated License table; compute expiry from that. |

## B) Multi-Tenancy & Cross-Tenant Isolation

| ID | Severity | Vulnerability | Evidence (code) | Exploit / Impact | Recommendation |
|---:|:--|:--|:--|:--|:--|
| T-001 | Critical | IMemoryCache license entry is not tenant-scoped | TrialEnforcementMiddleware.cs uses key "CompanyProfile_License" | Cross-tenant incorrect enforcement; superAdmin tenant switching can read stale/wrong tenant license state; may cause wrongful lockouts or unintended access | Use tenant-specific cache key (e.g., CompanyProfile_License:{tenantId}). Invalidate per tenant. |
| T-002 | High | TenantResolution allows header-based tenant selection even for anonymous requests | POS.API\Middleware\TenantResolutionMiddleware.cs (fallback to X-Tenant-ID) | Attackers can target arbitrary tenant context for requests that rely on tenant provider; increases attack surface | Require authentication for header-based override; allow only for superAdmin; prefer subdomain strategy + JWT claim. |
| T-003 | Medium | Several license-related handlers select “first CompanyProfile” rather than tenant-bound profile | ValidateLicenseCommandHandler.cs, UpdateActivatedLicenseCommandHandler.cs | Wrong tenant may be updated in some deployments; inconsistent behavior | Always scope queries by tenantId resolved from ITenantProvider; enforce query filters and/or explicit WHERE TenantId = current. |

## C) AuthN/AuthZ and Licensing Control Plane

| ID | Severity | Vulnerability | Evidence (code) | Exploit / Impact | Recommendation |
|---:|:--|:--|:--|:--|:--|
| A-001 | High | Switching tenant token drops IsSuperAdmin (and possibly claims) due to partial user cloning | POS.MediatR\Tenant\Handlers\SwitchTenantCommandHandler.cs | Can cause authorization inconsistencies, unexpected loss of admin controls, and brittle enforcement decisions | Build tokens from the real user entity; explicitly preserve superAdmin claims during impersonation; validate user’s allowed tenants. |
| A-002 | Medium | License data is embedded into JWT claims but not validated on server for enforcement | POS.Repository\User\UserRepository.cs | Token content can become stale; server does not enforce it, but consumers may assume it is authoritative | Do not rely on client-visible claims for license enforcement; validate server-side on each request or via short-lived cached evaluation. |

## D) Secrets & Cryptography (Licensing Adjacent)

| ID | Severity | Vulnerability | Evidence (code/config) | Exploit / Impact | Recommendation |
|---:|:--|:--|:--|:--|:--|
| S-001 | High | Hard-coded JWT keys and default credentials in config | POS.API\appsettings.Cloud.json / appsettings.Desktop.json | If deployed as-is, tokens can be forged; accounts compromised | Move secrets to secure secret storage (env vars, vault). Rotate keys. Disallow default passwords in production. |
| S-002 | Medium | AES encryption key stored in config and appears weak in Desktop config | appsettings.Desktop.json (AesEncryptionKey) | If used for sensitive data, can be extracted from binaries/config | Use platform secret store; use strong keys; rotate and version. |

## Immediate Hardening Recommendations (No Architecture Rewrite Required)

- Tenant-scope memory cache keys used by licensing and invalidate per-tenant.
- Add license activation/renewal endpoints to allowlist so expired trials can be recovered.
- Gate activation endpoints behind authz + audit logging (even in Desktop, restrict to local admin context).
- Remove placeholder license validation that accepts any purchase code.
- Replace “AAABBB” marker with explicit license state fields and migrate.

