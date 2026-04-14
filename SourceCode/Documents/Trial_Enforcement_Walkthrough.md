# Trial Enforcement Walkthrough

## Overview
Implemented a **14-day** trial enforcement mechanism.
- **Backend**: Middleware blocks write operations if trial is expired (Default keys: `AAABBB`).
- **Frontend**: Redirects to `/subscription` page when 403 Forbidden is received.
- **Synchronization**: `CompanyProfile` is now synced, allowing Server-side activation to propagate to Desktop.

## Changes Made

### Backend
1.  **[NEW] `TrialEnforcementMiddleware.cs`**
    - Intercepts requests.
    - Checks `CompanyProfile` (cached 10m).
    - Blocks `POST/PUT/DELETE` if `CreatedDate > 14 days` AND `LicenseKey == "AAABBB"`.
2.  **[MODIFY] `Startup.cs`**
    - Registered `TrialEnforcementMiddleware` after Authentication.
3.  **[MODIFY] `TenantRegistrationService.cs`**
    - Sets default `LicenseKey="AAABBB"` and `PurchaseCode="CCCCRR"`.
4.  **[MODIFY] `SyncEngine.cs`**
    - Added `"CompanyProfile"` to `PullChangesAsync`.
5.  **[MODIFY] `ValidateLicenseCommandHandler.cs`**
    - Updates DB and **invalidates cache**.

### Frontend
1.  **[NEW] `SubscriptionComponent`** (`/subscription`)
    - Shows "Trial Expired" message.
    - Buttons for "Pay Online" (Stripe mock) and "Contact Sales".
2.  **[MODIFY] `http-request-interceptor.ts`**
    - Redirects to `/subscription` if response is `403` AND contains `isTrialExpired`.
3.  **[MODIFY] `app.routes.ts`**
    - Added `subscription` route.

### Configuration
1.  **[MODIFY] `appsettings.json`**
    - Added `SyncSettings` (CloudApiUrl).
2.  **[MODIFY] `DeploymentSettings.cs`**
    - Added strong typing for `SyncSettings`.

## Verification Steps (Manual)

### 1. New Install Test
- Run the app (fresh DB).
- `LicenseKey` should be "AAABBB".
- Try adding a customer -> **Should Succeed** (Trial Active).

### 2. Expiration Test
- Open Database (SQLite).
- Update `CompanyProfile` set `CreatedDate = '2020-01-01'`.
- Restart App (or wait 10m for cache).
- Try adding a customer -> **Should Fail (403)**.
- **Frontend**: Should redirect to `/subscription`.

### 3. Activation Test (Local)
- Go to `/activate-license` (Available via "Already have a key?" link).
- Enter any Purchase Code.
- Click Validate.
- **Result**: Success.
- Try adding a customer -> **Should Succeed**.

### 4. Activation Test (Sync)
- *Requires Cloud Server setup*.
- Reset Desktop to Expired.
- Update Cloud Server `CompanyProfile` with Valid Key.
- Wait for Sync.
- **Result**: Desktop should unlock automatically.
