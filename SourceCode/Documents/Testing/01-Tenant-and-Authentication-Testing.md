# 01. Tenant, Licensing, and Authentication Test Cases

**Module:** SuperAdmin, Tenant Registration, Login, Licensing
**Prerequisites:** Database created, migrations applied, API and Angular running.

---

## Test Case 1.1: SuperAdmin Login & Authentication
**Objective:** Verify that the system SuperAdmin can log in successfully.

**Steps:**
1. Navigate to the POS Application Login Page.
2. Enter the SuperAdmin credentials (from `00-Test-Data-Preparation.md`).
3. Click "Login".

**Expected Result:**
- System authenticates the user successfully.
- User is redirected to the SuperAdmin Dashboard.
- A valid JWT token containing the `isSuperAdmin` claim is generated and stored in the browser (LocalStorage/SessionStorage).

---

## Test Case 1.2: New Tenant Registration
**Objective:** Verify that a new company/tenant can register and access the system.
*(Note: If you run the Postman collection `POS-Test.json`, this step is completed automatically via the `0. Register Tenant` request).*

**Steps:**
1. Navigate to the Registration / Sign-Up page.
2. Enter Company Name: "TechCorp POS".
3. Enter Admin Email: `admin@techcorp.com` and Password: `TechCorp@2024`.
4. Submit the registration form.
5. Check the email (or database if email is bypassed) for confirmation/activation if required.
6. Log in with `admin@techcorp.com`.

**Expected Result:**
- Registration is successful.
- The `Tenants` and `CompanyProfiles` tables reflect the new company.
- The default license type is assigned (e.g., Trial or Free).
- User is redirected to the Tenant Dashboard.

---

## Test Case 1.3: Tenant Trial Enforcement & Expiration
**Objective:** Verify that an expired trial tenant is blocked from using the system, while SuperAdmins remain unblocked.

**Steps:**
1. In the database, manually set the `Tenant.LicenseType` to `Trial` and `SubscriptionEndDate` to a date in the past (e.g., yesterday) for "TechCorp POS".
2. Attempt to log in as `admin@techcorp.com`.
3. Try to navigate to `/dashboard` or make an API call to `/api/Product`.
4. Log out.
5. Log in as SuperAdmin and access the global tenant list.

**Expected Result:**
- Tenant Admin (`admin@techcorp.com`) receives a "License Expired" or "Payment Required" message.
- API calls return `402 Payment Required` or `403 Forbidden` due to `TrialEnforcementMiddleware`.
- SuperAdmin can successfully log in and view the tenants list without being blocked.

---

## Test Case 1.4: License Activation
**Objective:** Verify that a tenant can be upgraded to a Paid license.

**Steps:**
1. Log in as SuperAdmin or use the Tenant Admin's billing page (if exposed).
2. Trigger the license activation for "TechCorp POS" (changing `LicenseType` to `Paid`).
3. Clear cache or wait for the system to process the activation.
4. Log in as `admin@techcorp.com`.
5. Navigate to the Dashboard and Products page.

**Expected Result:**
- The Tenant's `LicenseType` in the database is updated to `Paid`.
- The `CompanyProfile_License:{tenantId}` cache is invalidated.
- The Tenant Admin can successfully access the system and API calls return `200 OK`.

---

## Test Case 1.5: Multi-Tenant Data Isolation (Cross-Tenant Security)
**Objective:** Verify that Tenant A cannot access Tenant B's data via headers or API manipulation.

**Steps:**
1. Create a second tenant: "RetailPro" (`admin@retailpro.com`).
2. Log in as `admin@techcorp.com` (Tenant A).
3. Create a Product in Tenant A.
4. Intercept the HTTP Request (using browser DevTools or Postman) for fetching products.
5. Inject or modify the `X-Tenant-ID` header to match Tenant B's ID.
6. Execute the request.

**Expected Result:**
- The system ignores the spoofed `X-Tenant-ID` header because `admin@techcorp.com` lacks the `isSuperAdmin` claim.
- The API returns products belonging *only* to Tenant A.
- Tenant isolation is securely enforced by the `TenantResolutionMiddleware`.
