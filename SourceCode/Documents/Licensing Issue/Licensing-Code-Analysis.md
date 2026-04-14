# Licensing System – Code Analysis Report

## 1) Back-End Enforcement: TrialEnforcementMiddleware

File: f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Middleware\TrialEnforcementMiddleware.cs

### What it does

- Allows all GET requests unconditionally.
- Allows a small set of exact-path allowlisted endpoints.
- Loads CompanyProfile into memory cache using a single, global cache key:
  - CompanyProfile_License
- Computes “trial” as:
  - LicenseKey is null/empty OR LicenseKey == "AAABBB"
- Computes trial expiry as:
  - (UtcNow - CompanyProfile.CreatedDate) > 14 days
- If expired:
  - Blocks write HTTP methods (POST/PUT/DELETE/PATCH) with 403
  - Returns JSON: { message, isTrialExpired = true }

### Observations

- Enforces trial by CompanyProfile.CreatedDate, not by Tenant.TrialExpiryDate, Tenant.SubscriptionEndDate, or Tenant.LicenseType.
- The allowlist contains "/api/License/Validate" but the actual route used by Angular is "/api/WrLicense/validate".
- The middleware is executed after authentication/authorization in the pipeline (Startup.cs), so it can use claims/tenant context, but it currently does not.
- Cache key is not tenant-scoped, which can cause:
  - Cross-tenant leakage of license/trial decisions
  - Incorrect enforcement when a SuperAdmin switches tenants or when requests for different tenants hit the same instance

## 2) Back-End License “Validation”: WrLicenseController + Handler

Files:

- Controller: f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Controllers\WrLicense\WrLicenseController.cs
- Command: f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\WrLicense\Command\ValidateLicenseCommand.cs
- Handler: f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\WrLicense\Handler\ValidateLicenseCommandHandler.cs

### What it does

- Expects only a PurchaseCode string.
- Rejects empty purchase codes.
- Accepts any non-empty purchase code and:
  - Generates LicenseKey = Guid.NewGuid()
  - Writes purchase code + license key to the first CompanyProfile in the DB
  - Removes memory cache CompanyProfile_License
  - Returns “authenticated” response with a hard-coded dummy token string

### Observations

- This is placeholder logic and not true license validation:
  - No ownership verification
  - No signing, no server-side issued license artifact, no domain/machine binding
  - Writes directly into licensing state based solely on caller input
- “First CompanyProfile” selection is unsafe in multi-tenant deployments unless query filters always guarantee correctness.
- Cache invalidation is global and not tenant-scoped.

## 3) Back-End Alternative Activation: CompanyProfileController.activate_license

File: f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Controllers\CompanyProfile\CompanyProfileController.cs

Related handler:

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.MediatR\CompanyProfile\Handlers\UpdateActivatedLicenseCommandHandler.cs

### What it does

- POST /api/CompanyProfile/activate_license is marked [AllowAnonymous].
- Stores PurchaseCode + LicenseKey into CompanyProfile with no validation.

### Observations

- This endpoint is not tenant-bound in its handler (it selects the first CompanyProfile).
- It is a direct bypass for trial enforcement if it can be called.
- It is also impacted by trial enforcement itself (the middleware blocks POST operations in expired trial).

## 4) Cloud Tenant License APIs: TenantsController

File: f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.API\Controllers\TenantsController.cs

### Endpoints

- PUT /api/Tenants/{id}/license
  - Sets Tenant.LicenseType to Trial or Paid (from enum POS.Data.Entities.LicenseType)
- POST /api/Tenants/{id}/license/generate
  - Generates GUID values for CompanyProfile.LicenseKey and CompanyProfile.PurchaseCode for a given tenant

### Observations

- Tenant license state (Tenant.LicenseType / TrialExpiryDate / SubscriptionEndDate) is not used by TrialEnforcementMiddleware.
- The generated “license key” is only a GUID stored in the database.
  - It is not signed, not verifiable, and does not represent a cryptographic license.
- There is no renewal mechanism other than overwriting DB fields.

## 5) Seed-Time Defaults

Files:

- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Common\AppConstants.cs
- f:\MIllyass\pos-with-inventory-management\SourceCode\SQLAPI\POS.Repository\Tenant\TenantRegistrationService.cs

### What it does

- Seeds each tenant’s CompanyProfile with:
  - LicenseKey = "AAABBB"
  - PurchaseCode = "CCCCRR"
- TrialEnforcementMiddleware explicitly treats LicenseKey == "AAABBB" as trial mode.

### Impact

- Unless activation occurs, every tenant will enter trial-expired state 14 days after the seeded CompanyProfile.CreatedDate.
- This includes “MasterTenant” / SuperAdmin environments unless explicitly special-cased.

## 6) Front-End Flow (Angular)

### License Activation UI

Files:

- f:\MIllyass\pos-with-inventory-management\SourceCode\Angular\src\app\activate-license\activate-license.component.ts
- f:\MIllyass\pos-with-inventory-management\SourceCode\Angular\src\app\core\services\wr-license.service.ts

Behavior:

- Posts purchaseCode to /api/WrLicense/validate
- On success, stores localStorage.license_key = purchaseCode
- Does not store the returned LicenseKey or token from the API response

### Trial Expiry UX

File:

- f:\MIllyass\pos-with-inventory-management\SourceCode\Angular\src\app\http-request-interceptor.ts

Behavior:

- On 403 responses:
  - If payload includes isTrialExpired OR contains “Trial”, redirect to /subscription
  - Otherwise show “ACCESS_FORBIDDEN”

## 7) Summary of Gaps Affecting Renewal and Perpetual Behavior

- Renewal/activation endpoints can be blocked by TrialEnforcementMiddleware after the trial is expired, preventing recovery through the UI.
- Trial status is derived from CompanyProfile state (LicenseKey + CreatedDate), not from tenant subscription/license configuration.
- Cache key is global, so multi-tenant correctness is not guaranteed.
- Licensing is not cryptographically enforceable: it is DB-field driven and easily bypassed via writable endpoints.

