# 01 — QA Test Suite: Authentication, Authorization & Security

**Module:** Authentication, Identity, Access Control, Users & Roles  
**Location:** `Documentation/QA/01_QA_AUTH_USERS_ROLES_SECURITY_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** SEC-04, SEC-05, SEC-08, N-01, N-02, N-08, N-09, N-19, N-40, N-42, N-43

---

## 1. Module Overview & Quality Objectives
The Authentication and Access Control subsystem manages system entry, identity verification, multi-tenant scoping, role-based claim authorization (`[ClaimCheck]`), user session issuance via JSON Web Tokens (JWT), password recovery, and real-time user presence.

### Primary Risks & Failure Modes:
- **Authentication Bypass & Inactive Leaks:** Users of deactivated tenants logging in due to `IgnoreQueryFilters` (SEC-08).
- **Password Reset Flaws:** Token validation expression bugs allowing arbitrary tokens to reset passwords (SEC-04 / N-19).
- **Role & Permission Escalation:** Controller routes missing `[ClaimCheck]` or `[Authorize]`, granting unauthenticated/unauthorized actors access to critical data (N-01, N-02, N-40, N-42, N-43).
- **Session & Token Fragility:** Excessively lenient clock skew (N-09) and NullReferenceExceptions during role updates (N-08).

---

## 2. Test Cases with Concrete Execution Data

### QA-AUTH-001 — Standard Successful Login with Full Claim Issuance & Audit Recording
- **Aspect / Sub-Module:** User Authentication (Credential Validation & JWT Generation)
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/Authentication/AuthenticationController.cs`, `POS.MediatR/User/Handlers/UserLoginCommandHandler.cs`
- **Preconditions:**
  - Tenant `Retail Corp Alpha` (`a1111111-1111-1111-1111-111111111111`) is active.
  - User `admin_alpha` exists with password `Admin@123!`, `IsActive = true`.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/authentication`
  - **Headers:**
    ```http
    Content-Type: application/json
    CF-Connecting-IP: 182.180.45.10
    User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) QA-Client/1.0
    ```
  - **Request Payload:**
    ```json
    {
      "userName": "admin_alpha",
      "password": "Admin@123!",
      "latitude": 33.6844,
      "longitude": 73.0479
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Dispatch the `POST` request to `/api/authentication` using the specified payload and headers.
  2. Capture the HTTP response code, headers, and body.
  3. Extract the `bearerToken` from the response JSON and inspect its claims.
  4. Query the backend database `LoginAudits` table.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`
  - **Response Body Schema:**
    ```json
    {
      "id": "USR-ALPHA-ADMIN-GUID",
      "userName": "admin_alpha",
      "email": "admin@alpha.com",
      "firstName": "System",
      "lastName": "Administrator",
      "bearerToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "isAuthenticated": true,
      "claims": [
        { "claimType": "POS_POS", "claimValue": "true" },
        { "claimType": "SO_ADD_SO", "claimValue": "true" },
        { "claimType": "PO_ADD_PO", "claimValue": "true" }
      ],
      "locations": [
        { "id": "L1", "name": "Alpha Flagship Store" }
      ]
    }
    ```
  - **JWT Decoded Payload Assertions:**
    - `sub`: User ID matching `admin_alpha`.
    - `TenantId`: `a1111111-1111-1111-1111-111111111111`.
    - `exp`: Timestamp exactly `iat + 720 minutes` (desktop default) or `iat + 60 minutes` (cloud default).
  - **Database State (`LoginAudits`):**
    - New record created with `UserName = "admin_alpha"`, `Status = "Success"`, `RemoteIP = "182.180.45.10"`, `Latitude = 33.6844`, `Longitude = 73.0479`.
- **Defects & Exceptions Targeted:** Verify that IP extraction prioritizes `CF-Connecting-IP` over local reverse proxy loopback IPs (`127.0.0.1`).
- **QA Pass/Fail Checklist:**
  - [ ] Returns HTTP 200 with non-empty JWT string.
  - [ ] `isAuthenticated` is true.
  - [ ] `LoginAudits` row written with exact IP and coordinates.

---

### QA-AUTH-002 — Login Rejection on Inactive User with Valid Password
- **Aspect / Sub-Module:** Credential Security & Inactive Account Enforcement
- **Test Type:** Negative / Access Control
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/User/Handlers/UserLoginCommandHandler.cs:92-96`
- **Preconditions:**
  - User `terminated_cashier` in `Retail Corp Alpha` has `IsActive = false`, password `Password123!`.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/authentication`
  - **Headers:** `Content-Type: application/json`, `CF-Connecting-IP: 192.168.1.50`
  - **Request Payload:**
    ```json
    {
      "userName": "terminated_cashier",
      "password": "Password123!",
      "latitude": null,
      "longitude": null
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit the login request for `terminated_cashier`.
  2. Inspect the HTTP status code and response payload.
  3. Query `LoginAudits` table.
- **Expected Results:**
  - **HTTP Status Code:** `401 Unauthorized`
  - **Response Body:**
    ```json
    {
      "messages": ["UserName Or Password is InCorrect."]
    }
    ```
  - **Database Verification:**
    - `LoginAudits` table logs an entry: `UserName = "terminated_cashier"`, `Status = "Error"`.
    - No JWT token issued; user cannot access any authorized routes.
- **Defects & Exceptions Targeted:** Ensure generic error message is returned (no username enumeration indicating "User is deactivated").
- **QA Pass/Fail Checklist:**
  - [ ] HTTP 401 returned.
  - [ ] Error message matches standard generic text.
  - [ ] Audit log stamped as "Error".

---

### QA-AUTH-003 — Inactive Tenant Login Security Guard (SEC-08 Finding)
- **Aspect / Sub-Module:** Multi-Tenant Account Lifecycle Isolation
- **Test Type:** Security / Defect Verification (SEC-08)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/User/Handlers/UserLoginCommandHandler.cs:74-81`, `POS.Repository/User/UserRepository.cs:94-130`
- **Preconditions:**
  - Tenant `Deactivated Gamma` (`c3333333-3333-3333-3333-333333333333`) has `IsActive = false`.
  - User `gamma_manager` inside Tenant Gamma has `IsActive = true`, password `Password123!`.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/authentication`
  - **Headers:** `Content-Type: application/json`, `CF-Connecting-IP: 110.39.20.5`
  - **Request Payload:**
    ```json
    {
      "userName": "gamma_manager",
      "password": "Password123!"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Dispatch the login request for a user belonging to the inactive tenant.
  2. Inspect if the login handler bypasses tenant status via `.IgnoreQueryFilters()`.
- **Expected Results (Post-Enhancement Target):**
  - **HTTP Status Code:** `401 Unauthorized` (or `403 Forbidden`)
  - **Response Body:** `{"messages": ["Tenant account is deactivated or expired. Please contact support."]}`
  - **Defect Identification (Unfixed Pre-Condition):** If the server returns HTTP 200 and issues a JWT, SEC-08 is present and logged as a critical security defect.
- **Defects & Exceptions Targeted:** `UserLoginCommandHandler` dereferencing user repository with `.IgnoreQueryFilters()`, allowing deactivated tenant users to continue executing sales.
- **QA Pass/Fail Checklist:**
  - [ ] Verify that inactive tenant users cannot log in.
  - [ ] Flag as Defect SEC-08 if login succeeds.

---

### QA-AUTH-004 — Password Recovery & Reset Token Integrity (SEC-04 / N-19 Finding)
- **Aspect / Sub-Module:** Password Recovery Lifecycle & Token Validation
- **Test Type:** Security / Boundary & Fault Injection
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/User/Handlers/ResetPasswordCommandHandler.cs`, `RecoverPasswordCommandHandler.cs`
- **Preconditions:**
  - User `cashier_l1` (`cashier1@alpha.com`) requested password reset.
  - Legitimate code generated in database: `ResetPasswordCode = "789123"`.
- **Concrete Test Data:**
  - **Endpoint 1 (Recover Trigger):** `POST /api/user/recoverpassword`
    ```json
    {
      "email": "cashier1@alpha.com"
    }
    ```
  - **Endpoint 2 (Tampered Reset Attempt):** `POST /api/user/resetpassword`
    ```json
    {
      "email": "cashier1@alpha.com",
      "token": "INVALID_TAMPERED_TOKEN_999",
      "password": "NewSecretPassword2026!"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Trigger password recovery to set `ResetPasswordCode`.
  2. Send reset password request with the tampered token `"INVALID_TAMPERED_TOKEN_999"`.
  3. Send reset password request for non-existent email `"ghost_user@alpha.com"`.
- **Expected Results:**
  - **Tampered Token:** HTTP `400 Bad Request` or `422 Unprocessable Entity` with message `"Invalid or expired password reset token."`
  - **Unknown User:** HTTP `404 Not Found` (must NOT return 500 Internal Server Error due to NRE).
  - **Database Verification:** `cashier_l1` password hash in `Users` table remains unchanged.
- **Defects & Exceptions Targeted:**
  - SEC-04 Bug: `entity == null && entity.ResetPasswordCode != request.Token` logic flaw where `&&` evaluated on null throws NRE or allows any token when user is non-null.
  - N-19: Unhandled 500 when recovering password for unknown user.
- **QA Pass/Fail Checklist:**
  - [ ] Arbitrary tokens are strictly rejected.
  - [ ] Unknown user returns proper status code (not 500).
  - [ ] Valid token resets password successfully.

---

### QA-AUTH-005 — Role & Claim Authorization Gate Validation (`[ClaimCheck]`)
- **Aspect / Sub-Module:** API Permission Middleware & Route Protection
- **Test Type:** Security / Access Control Enforcement
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.API/Filters/ClaimCheckAttribute.cs`, `POS.API/Controllers/SalesOrder/SalesOrderController.cs`
- **Preconditions:**
  - User `unauthorized_user` is authenticated with a valid JWT, but has ZERO claims.
  - User `cashier_l1` has claim `POS_POS`, but lacks `USR_ADD_USER`.
- **Concrete Test Data:**
  - **Test Case A (Unauthorized Role Access):**
    - **Endpoint:** `POST /api/User` (Requires `USR_ADD_USER`)
    - **Header:** `Authorization: Bearer {{token_cashier_l1}}`
    - **Payload:**
      ```json
      {
        "userName": "hacker_user",
        "email": "hacker@alpha.com",
        "password": "Password123!",
        "roleId": "ROLE-ADMIN-ID"
      }
      ```
  - **Test Case B (Completely Unclaimed Token):**
    - **Endpoint:** `POST /api/SalesOrder` (Requires `SO_ADD_SO` or `POS_POS`)
    - **Header:** `Authorization: Bearer {{token_unauthorized_user}}`
    - **Payload:** `{ "orderNumber": "SO-TEST-001" }`
- **Step-by-Step Execution Procedure:**
  1. Execute Test Case A using Cashier's token.
  2. Execute Test Case B using Unauthorized User's token.
- **Expected Results:**
  - **Test Case A:** HTTP `403 Forbidden` (`{"message": "Forbidden - You lack the required USR_ADD_USER claim."}`)
  - **Test Case B:** HTTP `403 Forbidden`.
  - No records created in `Users` or `SalesOrders` tables.
- **Defects & Exceptions Targeted:** Ensure `ClaimCheckAttribute` does not default to open access when claims collection is null or empty.
- **QA Pass/Fail Checklist:**
  - [ ] Both requests return HTTP 403 Forbidden.
  - [ ] Zero database mutations occur.

---

### QA-AUTH-006 — Probing Completely Unprotected Endpoints (N-02, N-40, N-42, N-43)
- **Aspect / Sub-Module:** Authorization Gap Analysis & Route Auditing
- **Test Type:** Security / Vulnerability Audit
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `ImportExportController.cs`, `ContactUsController.cs`, `WrLicenseController.cs`, `FBRController.cs`
- **Preconditions:** Unauthenticated client (No Bearer token, anonymous HTTP request).
- **Concrete Test Data:**
  - **Probe 1 (ImportExport):** `GET /api/ImportExport/export-products`
  - **Probe 2 (ContactUs List):** `GET /api/ContactUs`
  - **Probe 3 (ContactUs Create):** `POST /api/ContactUs`
    ```json
    {
      "name": "Anonymous Attacker",
      "email": "spam@darknet.org",
      "message": "Public spam injected without token"
    }
    ```
  - **Probe 4 (License Validation):** `POST /api/WrLicense/validate`
    ```json
    {
      "purchaseCode": "DUMMY-ANY-STRING-12345"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Send HTTP requests without any `Authorization` header to each of the 4 probe endpoints.
  2. Verify whether HTTP 401 Unauthorized is enforced.
- **Expected Results (Secure Target):**
  - All 4 probes return `401 Unauthorized`.
- **Defect Verification (Current Source State):**
  - **N-40 Defect:** `ImportExportController` has zero `[Authorize]` attributes; probe 1 returns HTTP 200 with raw CSV data of all products.
  - **N-42 Defect:** `ContactUsController` has zero auth; probe 2 returns all contact messages; probe 3 writes message into DB.
  - **N-43 Defect:** `WrLicenseController` returns a dummy authenticated token for any arbitrary purchase code.
- **QA Pass/Fail Checklist:**
  - [ ] Verify if unauthenticated requests are blocked.
  - [ ] Log findings N-40, N-42, N-43 if anonymous access succeeds.

---

### QA-AUTH-007 — Role Update NullReferenceException Prevention (N-08 Finding)
- **Aspect / Sub-Module:** Role Management Handlers
- **Test Type:** Exception & Robustness Test
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/Role/Handlers/UpdateRoleCommandHandler.cs`
- **Preconditions:** Authenticated as `admin_alpha` with `ROLES_UPDATE_ROLE`.
- **Concrete Test Data:**
  - **Endpoint:** `PUT /api/Role/00000000-0000-0000-0000-999999999999`
  - **Headers:**
    ```http
    Authorization: Bearer {{token_admin_alpha}}
    Content-Type: application/json
    ```
  - **Request Payload:**
    ```json
    {
      "id": "00000000-0000-0000-0000-999999999999",
      "name": "NonExistentRole",
      "roleClaims": []
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Send update command for an unknown role GUID.
  2. Check server error log and HTTP status code.
- **Expected Results:**
  - **HTTP Status Code:** `404 Not Found` with message `"Role not found."`
  - **Defect Identification:** Must NOT return `500 Internal Server Error` with `NullReferenceException` in `UpdateRoleCommandHandler.cs`.
- **QA Pass/Fail Checklist:**
  - [ ] Response is clean 404 (no unhandled 500 crash).
  - [ ] No server-side stack trace leaked in response body.

---

### QA-AUTH-008 — Real-Time SignalR Presence Tracking (`UserHub`)
- **Aspect / Sub-Module:** Real-Time WebSocket Session Synchronization
- **Test Type:** Integration & Real-Time Presence
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.API/Hubs/UserHub.cs`
- **Preconditions:**
  - WebSocket client library configured to connect to `/userHub`.
- **Concrete Test Data:**
  - **WebSocket URL:** `ws://localhost:5000/userHub?access_token={{token_admin_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Establish WebSocket handshake with valid JWT in query string.
  2. Listen for `UserConnected` or `Joined` broadcasts.
  3. Disconnect the WebSocket connection.
  4. Verify server logs for connection and disconnection events.
- **Expected Results:**
  - Connection successfully upgrades to WebSocket protocol (HTTP 101 Switching Protocols).
  - Client receives event: `userOnline` with payload containing user ID and email.
  - Upon disconnect, server cleans up connection mapping without memory leakage.
- **QA Pass/Fail Checklist:**
  - [ ] WebSocket connection established with valid JWT.
  - [ ] Connection rejected (HTTP 401) if token is missing or invalid.
  - [ ] Presence broadcast delivered to connected clients.
