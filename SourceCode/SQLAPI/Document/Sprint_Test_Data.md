# Secure Sync System - Sprint Test Data & Scenarios

This document provides specific test data and scenarios to verify each phase of the Secure Sync System implementation, as defined in the [Resolution Implementation Plan](file:///c:/Users/user/.gemini/antigravity/brain/e2d38f2e-0aa0-4bed-b322-05c0043f8729/implementation_plan.md.resolved).

---

## Sprint 1: API Key Infrastructure (Backend)

### Test Data
| Entity | Property | Value |
| :--- | :--- | :--- |
| **Tenant A** | Name | `Retail Store Alpha` |
| | Subdomain | `alpha` |
| | ApiKey | *(Auto-generated during registration)* |
| **Tenant B** | Name | `Retail Store Beta` |
| | Subdomain | `beta` |
| | ApiKey | *(Auto-generated during registration)* |

### Scenarios
1.  **Key Generation**:
    *   **Action**: Create `Tenant A` via SuperAdmin.
    *   **Verification**: Check `Tenants` table. `ApiKey` should be a non-null, unique Base64 string (~32-44 chars).
2.  **Valid Authentication**:
    *   **Action**: `POST /api/sync/products` with Header `X-API-Key: {Tenant A Key}`.
    *   **Verification**: Response `200 OK`. Data should be saved under `Tenant A` ID.
3.  **Cross-Tenant Isolation**:
    *   **Action**: `POST /api/sync/products` with Header `X-API-Key: {Tenant B Key}` attempting to update `Tenant A` data.
    *   **Verification**: API should correctly scope to `Tenant B` (Isolation check).
4.  **Security Rejection**:
    *   **Action**: `POST /api/sync/products` with invalid or missing `X-API-Key`.
    *   **Verification**: Response `401 Unauthorized`.

---

## Sprint 2: Cloud Auth & Database Download (Backend)

### Test Data
| Entity | Property | Value |
| :--- | :--- | :--- |
| **User Alpha** | Email | `admin@store-alpha.com` |
| | Password | `Admin123!` |
| | Role | `Admin` (linked to Tenant A) |

### Scenarios
1.  **JWT Claim Verification**:
    *   **Action**: Login as `User Alpha`.
    *   **Verification**: Decode JWT. It MUST contain an `ApiKey` claim matching Tenant A's key.
2.  **Self-Service Download**:
    *   **Action**: `GET /api/tenants/my-database` with User Alpha's Token.
    *   **Verification**: Response `200 OK`. Returns a `.zip` or `.db` file.
3.  **Config Extraction**:
    *   **Action**: Inspect downloaded package.
    *   **Verification**: Must contain `appsettings.json` with correct `TenantId`, `ApiKey`, and `CloudApiUrl`.

---

## Sprint 3: Machine-Specific Encryption (Electron)

### Test Data
*   **Sample Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
*   **Sample API Key**: `Z2VuZXJhdGVkX2FwaV9rZXlfZm9yX3Rlc3Rpbmc=`

### Scenarios
1.  **Local Protection**:
    *   **Action**: App saves login credentials on `Machine X`.
    *   **Verification**: `auth.json` contains encrypted Base64 blobs.
2.  **Machine Binding**:
    *   **Action**: Copy `auth.json` from `Machine X` to `Machine Y`. Launch App on `Machine Y`.
    *   **Verification**: Decryption fails. App identifies the "Machine Mismatch" and prompts for a fresh Cloud Login (Clearing `auth.json`).

---

## Sprint 4: Cloud Login & Auto-Download (Electron)

### Test Data
*   **Cloud API URL**: `https://cloud-api.milpos.com` (Simulated)
*   **Test Credentials**: Use `User Alpha` credentials from Sprint 2.

### Scenarios
1.  **First-Run Detection**:
    *   **Action**: Delete `POSDb.db` from AppData. Launch App.
    *   **Verification**: App redirects to `login-cloud.html` instead of the main dashboard.
2.  **Progress Tracking**:
    *   **Action**: Submit Cloud Login.
    *   **Verification**: `setup-splash.html` appears. Progress bar moves from 0% (Authenticating) -> 80% (Downloading) -> 100% (Configuring).

---

## Sprint 5: Integration & Testing

### Scenarios
1.  **Full Setup Loop**:
    *   **State**: Fresh machine (no DB).
    *   **Steps**: Open App -> Cloud Login -> Download Setup -> App Starts.
    *   **Verification**: User sees their products (seeded from Cloud) in the local SQLite dashboard.
2.  **Verified Background Sync**:
    *   **Action**: Create a sale locally. Wait 15 mins (or trigger Hangfire manual sync).
    *   **Verification**: The sale record appears in the Cloud PostgreSQL database with the correct `TenantId`.
