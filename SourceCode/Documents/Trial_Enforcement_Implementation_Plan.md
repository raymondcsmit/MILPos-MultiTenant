# Trial Enforcement & Subscription Implementation Plan

## Goal
Implement a **14-day** free trial period for the application. After 14 days from installation (based on `CompanyProfile.CreatedDate`), write operations (POST, PUT, DELETE) will be blocked until a valid license is activated. Users will be directed to a subscription page to purchase a license.

**Default Trial Credentials**: `LicenseKey: AAABBB`, `PurchaseCode: CCCCRR`.

---

## Evaluation of Plan
### Strengths
- **Robust & Centralized**: Using Middleware ensures that *all* write operations are protected, regardless of which controller or service is called. It's a "catch-all" safety net.
- **Performance Optimized**: Heavy reliance on `IMemoryCache` for the License Check prevents database hits on every request.
- **Offline Capable**: The desktop app checks its local database only. It doesn't need to ping a licensing server on every request.
- **Seamless Upgrade**: Buying a license on the Server propagates to the Desktop via the existing Sync Engine without manual key entry on the desktop (once synced).

### Risks & Mitigations
- **System Clock Manipulation**: A user could set their computer date back to extend the trial. 
    - *Mitigation*: Hard to prevent fully in an offline-first desktop app without an internet check. However, `CreatedDate` is fixed in the DB. If they change the clock *before* installation, trial is valid. If they change it *after*, we could implement a "LastKnownDate" check, but for now, we accept this risk as low-priority.
- **Static "AAABBB" Key**: The default key is hardcoded. 
    - *Mitigation*: Acceptable for this phase. In the future, we can generate unique trial keys or remove the fallback to "AAABBB" entirely and rely on `LicenseKey` simply being empty = Trial.

---

## Proposed Changes

### Backend (POS.API)

#### [NEW] [TrialEnforcementMiddleware.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Middlewares/TrialEnforcementMiddleware.cs)
- A new middleware that runs before controllers but *after* Authentication.
- **Dependencies**: `IMemoryCache`, `ICompanyProfileRepository`.
- **Logic**:
    1.  **Exclusion Check (Allowlist)**:
        - Check if the Request Path matches critical endpoints that *must* remain active.
        - **Allowed Paths**:
            - `/api/User/Login` (Authentication)
            - `/api/User/RefreshToken` (Session management)
            - `/api/License/Validate` (License Activation)
            - `/api/Sync/*` (Sync operations must typically continue, or at least Pull should)
        - If match: **Allow Request** immediately.
    2.  **Retrieve CompanyProfile**:
        - Try to get `CompanyProfile` from **Memory Cache** (Key: `CompanyProfile_License`).
        - If miss: Retrieve from DB and set in Cache (Expiration: 10 minutes).
    3.  **Trial Mode Check**: 
        - If `LicenseKey` == "AAABBB" OR `string.IsNullOrEmpty(LicenseKey)`:
            - **Check Duration**: Calculate `(DateTime.UtcNow - CompanyProfile.CreatedDate).TotalDays`.
            - If `> 14` AND Request Method is `POST`, `PUT`, or `DELETE`:
                - **BLOCK**: Return `403 Forbidden` with JSON: `{ "message": "Trial Period Expired. Please Purchase License.", "isTrialExpired": true }`.
            - Else: **Allow** (Read-Only Mode or Trial Active).
        - Else (Valid License): **Allow**.

#### [MODIFY] [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
- Register `TrialEnforcementMiddleware` in `Configure` method.
- **Placement**: MUST be after `app.UseAuthentication()` and `app.UseAuthorization()` but **BEFORE** `app.UseEndpoints()`.
- Ensure `IMemoryCache` is available (default in `.NET 6+`).

#### [MODIFY] [TenantRegistrationService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Tenant/TenantRegistrationService.cs)
- Update `SeedCompanyProfileAsync`:
    - Set default `LicenseKey = "AAABBB"`.
    - Set default `PurchaseCode = "CCCCRR"`.

### Backend (POS.MediatR)

#### [MODIFY] [ValidateLicenseCommandHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/WrLicense/Handler/ValidateLicenseCommandHandler.cs)
- **Logic Update**:
    - Validate the Input Key/Code.
    - Update `CompanyProfile` in DB.
    - **CRITICAL**: Invalidate the `CompanyProfile_License` cache key so middleware sees the change immediately.

### Backend (POS.Domain)

#### [MODIFY] [SyncEngine.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Sync/SyncEngine.cs)
- **Method**: `PullChangesAsync`
- **Action**: Add `"CompanyProfile"` to the `entityTypes` string array.
- **Reason**: This ensures that when a license is updated on the Cloud Server (by Admin), it syncs down to the Desktop Client automatically, unlocking the trial.

### Frontend (Angular)

#### [NEW] [SubscriptionComponent](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/subscription/subscription.component.ts)
- **Route**: `/subscription`
- **UI**:
    - Header: "Subscription Required"
    - Message: "Your 14-day free trial has expired unless you activate a license."
    - **Action 1**: "Pay Online" button -> Opens `https://buy.stripe.com/test_...` (Mock link for now) in new tab.
    - **Action 2**: "Contact Support" -> Display Email/Phone.
    - **Action 3**: "I have a License" -> Link to `/settings/license` (existing page).

#### [MODIFY] [http-request-interceptor.ts](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/core/interceptor/http-request-interceptor.ts)
- Catch `403 Forbidden` in the error handler.
- Check error body for `isTrialExpired: true` (or string match).
- If match: Redirect to `/subscription` using `Router`.

## Verification Plan

### Automated Tests (Unit)
- Create `TrialEnforcementMiddlewareTests.cs`:
    - Test 1: `Trial Active (<14 days)` -> POST request passes.
    - Test 2: `Trial Expired (>14 days)` -> POST request returns 403.
    - Test 3: `Trial Expired (>14 days)` -> GET request passes.
    - Test 4: `Valid License` -> POST request passes regardless of date.

### Manual Verification Steps
1.  **Fresh Install / Active Trial**:
    - Check DB: Ensure `CompanyProfile` has `LicenseKey="AAABBB"`.
    - Action: Create a new Customer.
    - Result: **Success**.

2.  **Expire the Trial**:
    - DB Modification: Update `CompanyProfile.CreatedDate` to `DATE('now', '-15 days')` (SQLite) or similar.
    - Action: Try to Create a Customer.
    - Result: **Error 403**.
    - UI Behavior: Should auto-redirect to `/subscription`.

3.  **Unlock with Key (Manual)**:
    - Go to `Settings -> License`.
    - Enter Valid Key (simulate validation).
    - Action: Try to Create Customer again.
    - Result: **Success**.

4.  **Unlock via Sync (Cloud-to-Desktop)**:
    - Set Desktop DB back to Trial Expired ("AAABBB" + Old Date).
    - **On Cloud Server**: Update the Tenant's `CompanyProfile` with a Valid License Key.
    - **On Desktop**: Wait for Sync (or trigger it).
    - Check Desktop DB: `LicenseKey` should be updated.
    - Action: Try to Create Customer.
    - Result: **Success**.
