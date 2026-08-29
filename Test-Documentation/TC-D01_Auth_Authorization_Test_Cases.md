# TC-D01 — Authentication & Authorization Test Cases

**Source:** `New-Documents/01_Authentication_Authorization_Workflows.md` (WF-1.1 … WF-1.6), gap signals from `New-Documents/11_Workflow_Gaps_Enhancement_Signals.md`.
**Scope:** Login/JWT issuance, session + guard behavior, password reset, user management, role/claim management with the full permission pipeline, company profile settings, and SignalR presence.
**Workflows covered:** WF-1.1, WF-1.2, WF-1.3, WF-1.4, WF-1.5, WF-1.6.
**Gap signals referenced:** SEC-04, SEC-05, SEC-08, UX-03 (this domain), RT-01 (presence, cited by WF-1.6).

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed, `CompanyProfile` with `LicenseKey`/`PurchaseCode`, locations L1, L2); Tenant B (isolation checks, user `buser`); Tenant C (exists but **deactivated** — for SEC-08 cases).
- Users: `admin` (all claims, incl. `ROLES_ADD_ROLE`, `USR_ADD_USER`, `SETT_UPDATE_COM_PROFILE`, `POS_POS`), `manager` (only `USR_VIEW_USER`), `cashier` (only `POS_POS`, `IsAllLocations=false`, `UserLocation` → L1). `admin` has `IsSuperAdmin=true`.
- Roles: R-ADMIN (`IsSuperRole=true`, all claims), R-MANAGER (`USR_VIEW_USER`), R-CASHIER (`POS_POS`).
- MenuItems: parent "Users" + child "Users List" (path `/users`) seeded twice — once global (`TenantId=null`) and once tenant-owned — plus a POS menu item. `RoleMenuItem` rows per role.
- SMTP: one `EmailSMTPSetting` with `IsDefault=true` (a case removes it). Mock `IEmailRepository`/SMTP capture at IT layer.
- JWT test config: `JwtSettings` Key/Issuer/Audience per appsettings, `minutesToExpiration=720` (desktop default; cloud = 60 — see Discrepancy notes).
- TestWebApplicationFactory (SQLite, seeding disabled) + seed builders; SignalR tested with a real `HubConnection` against the factory and a mock `IHubClient` where noted.

---

## WF-1.1 — Login Workflow (Credential → JWT → Angular Session → Guards)

### TC-D01.001 — Login with valid credentials returns 200 UserAuthDto with JWT, Success audit, and presence broadcast
- **Layers:** IT · PM · E2E
- **Priority:** P0   **Category:** Happy
- **Source:** WF-1.1 (steps 1–3); `POS.API/Controllers/Authentication/AuthenticationController.cs:26-34`, `POS.MediatR/User/Handlers/UserLoginCommandHandler.cs:64-106`, `POS.Repository/User/UserRepository.cs:92-160`
- **Arrange:** Tenant A active; user `admin` (IsActive=true) with password `admin@123`, roles [R-ADMIN], CompanyProfile with LicenseKey/PurchaseCode set.
- **Act:** `POST /api/authentication` body `{ userName: "admin", password: "admin@123", latitude: 39.75, longitude: -84.19 }` with header `CF-Connecting-IP: 203.0.113.7`.
- **Assert (IT):** HTTP 200 · body `UserAuthDto` with `bearerToken` = 3-segment JWT, `isAuthenticated=true`, `userName="admin"`, `menus` non-empty tree, `licensekey`/`purchasecode` echo CompanyProfile values · `LoginAudit` row exists: `UserName="admin"`, `Status="Success"`, `RemoteIP="203.0.113.7"` (header wins over connection IP), `Latitude=39.75`, `Longitude=-84.19` · mock `IHubClient.Joined` received with `SignlarUser{Id=userId, Email}` · alias route `POST /api/authentication/login` with same body returns HTTP 200 and an equivalent `UserAuthDto`.
- **Assert (PM):** response schema has `bearerToken`, `menus[]`, `claims[]`; test script stores `bearerToken` → `{{token}}`; follow-up `GET /api/User` with `Authorization: Bearer {{token}}` returns 200.
- **Assert (E2E):** login form submit → `localStorage` contains `access_token` (raw JWT) and `auth_obj`; `localStorage['userMenus']` is a JSON array; toast "LOGIN_SUCCESSFULLY"; URL lands per TC-D01.022.

### TC-D01.002 — Login with wrong password returns 401 with generic message and Error audit row
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Validation
- **Source:** WF-1.1 (step 2); `UserLoginCommandHandler.cs:88,171-175`
- **Arrange:** `admin` exists with password `admin@123`.
- **Act:** `POST /api/authentication` `{ userName: "admin", password: "wrong-pass" }`.
- **Assert (IT):** HTTP 401 · error message exactly `"UserName Or Password is InCorrect."` · `LoginAudit` row with `Status="Error"`, `UserName="admin"` · no JWT issued, no `Joined` broadcast.
- **Assert (PM):** 401; `{{token}}` variable unchanged.

### TC-D01.003 — Login with unknown username returns the identical 401 message and an Error audit row
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.1 (step 2); `UserLoginCommandHandler.cs:74-86`
- **Arrange:** no user named `ghost`.
- **Act:** `POST /api/authentication` `{ userName: "ghost", password: "whatever" }`.
- **Assert (IT):** HTTP 401 · message exactly `"UserName Or Password is InCorrect."` (identical to wrong-password case — no user enumeration) · `LoginAudit` row `Status="Error"` persisted even though no user exists.

### TC-D01.004 — Inactive user with correct password is rejected with 401 (current behavior guard)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [SEC-08]
- **Source:** WF-1.1 (step 2) ± SEC-08; `UserLoginCommandHandler.cs:92-96`
- **Arrange:** user `exmanager` in Tenant A, password valid, `IsActive=false`. Characterization guard: this check must keep working while the SEC-08 fix refactors the login lookup path.
- **Act:** `POST /api/authentication` with correct credentials for `exmanager`.
- **Assert (IT):** HTTP 401 · message exactly `"UserName Or Password is InCorrect."` · `LoginAudit` row `Status="Error"` · no JWT · password verification DID succeed (assert via the same user re-activated logging in fine, or by `CheckPasswordSignInAsync` success in a UT harness) — rejection is solely `IsActive=false`.

### TC-D01.005 — User of a deactivated tenant can still authenticate (current behavior characterization)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [SEC-08]
- **Source:** WF-1.1 ⚠ GAP + SEC-08; `UserLoginCommandHandler.cs:74-81` (`IgnoreQueryFilters()`), `UserRepository.cs:94-130` (`IgnoreQueryFilters()` on CompanyProfile/Tenant loads)
- **Arrange:** Tenant C deactivated (IsActive=false) with user `colduser` (IsActive=true, valid password, role + UserLocation rows).
- **Act:** `POST /api/authentication` with correct `colduser` credentials.
- **Assert (IT):** HTTP 200 with a valid JWT — the login pipeline never consults tenant-active state (only the cloud middleware does, per doc) · JWT contains `TenantId=<Tenant C id>` · LoginAudit row `Status="Success"`.

### TC-D01.006 — Post-auth tenant-active check rejects users of deactivated tenants
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [SEC-08]
- **Source:** SEC-08 (enhancement direction: post-auth tenant-active check); WF-1.1
- **Arrange:** same as TC-D01.005. **RED by definition** until the enhancement lands.
- **Act:** `POST /api/authentication` with correct `colduser` credentials.
- **Assert (IT):** HTTP 401 with an explicit tenant-inactive message (defined by the enhancement, e.g. `"Tenant is inactive."`) · `LoginAudit` row `Status="Error"` · no JWT issued · active-tenant logins (Tenant A) still return 200 — no false rejection.

### TC-D01.007 — Login falls back to NormalizedEmail when the username does not match
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-1.1 (step 2); `UserLoginCommandHandler.cs:77-81`
- **Arrange:** `admin` with Email `admin@milpos.test`.
- **Act:** `POST /api/authentication` `{ userName: "admin@milpos.test", password: "admin@123" }`.
- **Assert (IT):** HTTP 200 · `UserAuthDto.userName=="admin"` · valid JWT with `sub=<admin id>`.

### TC-D01.008 — Issued JWT contains the exact claim set, HS256 signing, and configured expiry
- **Layers:** UT · IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-1.1 (step 3); `UserRepository.cs:137-157,197-218`
- **Arrange:** `admin` in Tenant A (LicenseKey `LIC-123`, PurchaseCode `PC-456`, no tenant ApiKey), roles [R-ADMIN] with RoleClaim `POS_POS`.
- **Act:** login (IT) → decode `bearerToken`; UT: `UserRepository.BuildJwtToken` with fixed `JwtSettings` (720 min) and a known claim list, then parse.
- **Assert (UT):** parsed token has exactly one claim per merged ClaimType, each with value `"true"` · plus `licensekey="LIC-123"`, `purchasecode="PC-456"`, `isSuperAdmin="true"`, `sub=<user id>`, `Email`, `locationIds` (comma-joined), `TenantId=<guid>` · `alg=HS256` · `exp − iat = 720 min` · `iss`/`aud` = settings values · no `ApiKey` claim when tenant has none.
- **Assert (IT):** same claim set on the real response token; `licensekey`/`purchasecode` are URL-encoded copies of the CompanyProfile values.

### TC-D01.009 — locationIds claim reflects IsAllLocations scope versus UserLocation rows
- **Layers:** UT · IT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-1.1 (step 3); `UserRepository.cs:95-104,203`
- **Arrange:** user `all-loc` (`IsAllLocations=true`) in Tenant A with L1+L2; user `cashier` (`IsAllLocations=false`, `UserLocation` → L1 only).
- **Act:** login each; UT: location-resolution logic given the two user shapes and fixed repo results.
- **Assert (UT):** `IsAllLocations=true` → set = all tenant location IDs; false → exactly the `UserLocation` IDs, no others.
- **Assert (IT):** `all-loc` JWT `locationIds == "<L1>,<L2>"` (tenant Location rows); `cashier` JWT `locationIds == "<L1>"`.

### TC-D01.010 — Claim merge builds the deduplicated union of UserClaim and RoleClaim types
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.1 (step 3); `UserRepository.cs:162-195` (`GetUserAndRoleClaims`)
- **Arrange:** user with RoleClaims [`POS_POS`, `USR_VIEW_USER`] via R-MANAGER and UserClaims [`USR_VIEW_USER`, `INV_GAIN`] (overlap + user-only).
- **Act:** run the merge logic (extracted helper or repository against SQLite seed).
- **Assert (UT):** result == exactly [`POS_POS`, `USR_VIEW_USER`, `INV_GAIN`] — duplicates collapsed, role claims and user claims both present · every merged type becomes `Claim(type, "true")` in the token claim list.

### TC-D01.011 — Per-user UserClaim exception grants endpoint access after re-login
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.1 (step 3) + WF-1.3 (step 4); `UpdateUserClaimCommandHandler.cs:35-52`, `POS.API/Helpers/ClaimCheckAttribute.cs`
- **Arrange:** `manager` (no `USR_ADD_USER` anywhere). Via `UpdateUserClaim` endpoint (admin JWT) add UserClaim `USR_ADD_USER` to `manager`.
- **Act:** `manager` logs in **again** (old JWT kept aside) → `POST /api/User` with the **new** JWT.
- **Assert (IT):** login JWT contains claim `USR_ADD_USER=true` · `POST /api/User` returns 200 (not 403) · the pre-change JWT still yields 403 for the same call (claims are baked into the token).

### TC-D01.012 — ClaimCheck rejects requests whose JWT lacks the required claim with value "true"
- **Layers:** UT · IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-1.1 (step 10); `POS.API/Helpers/ClaimCheckAttribute.cs:27-68`
- **Arrange:** `cashier` JWT (has only `POS_POS`).
- **Act:** `POST /api/Role` with cashier JWT; UT: invoke `ClaimCheck("X").OnActionExecuting` with forged tokens (valid signature, claim `X` value `"false"`, value `"True"`, claim absent).
- **Assert (IT):** HTTP 403 with empty body · handler never executed (no Role row created) · same request with admin JWT → 200.
- **Assert (UT):** missing claim → 403 result; claim value `"false"` → 403; value `"True"` (case) → 403 (comparison requires exactly `"true"`); value `"true"` → passes through (`context.Result == null`).
- **Assert (PM):** 403 status asserted in collection test; response body empty.

### TC-D01.013 — ClaimCheck rejects requests without an Authorization header
- **Layers:** IT
- **Priority:** P1   **Category:** Permission
- **Source:** WF-1.1 (step 10); `ClaimCheckAttribute.cs:29-35`
- **Arrange:** none (anonymous request).
- **Act:** `POST /api/Role` with no `Authorization` header.
- **Assert (IT):** HTTP 403 (the attribute short-circuits before auth middleware challenges) · no Role row created.

### TC-D01.014 — ClaimCheck any-match overload accepts a JWT holding any one of the listed claims
- **Layers:** IT
- **Priority:** P2   **Category:** Permission
- **Source:** WF-1.1 (step 10); `ClaimCheckAttribute.cs:42-57` (`params string[]`)
- **Arrange:** endpoint guarded by a multi-claim `ClaimCheck("A_CLAIM","B_CLAIM")` (use a real multi-claim endpoint or a test-only controller in the factory); user with only `B_CLAIM` via role.
- **Act:** call the endpoint with that JWT.
- **Assert (IT):** HTTP 200 (any-match semantics) · a JWT with neither claim → 403 · a JWT with both → 200.

### TC-D01.015 — Expired JWT is still accepted within the ClockSkew window (current behavior characterization)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [SEC-05]
- **Source:** WF-1.1 ⚠ GAP + SEC-05; `POS.API/Helpers/JwtConfigurationExtension.cs:41-43` — `ClockSkew = TimeSpan.FromMinutes(MinutesToExpiration)`
- **Arrange:** mint an access token with the configured signing key where `iat=now`, `exp=now−1min` (desktop profile: `minutesToExpiration=720`).
- **Act:** `GET /api/User` with that expired token.
- **Assert (IT):** HTTP 200 — the token is accepted because ClockSkew equals the full token lifetime, so "expiry" is effectively `2 × MinutesToExpiration` · a second token with `exp=now−721min` → HTTP 401. Characterizes the leniency that SEC-05 must remove.

### TC-D01.016 — Refresh-token flow reissues a JWT without re-login and rejects dead tokens without refresh
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Gap-Target [SEC-05]
- **Source:** SEC-05 (enhancement: refresh-token or sliding session for POS); WF-1.1 ⚠ GAP
- **Arrange:** login normally to obtain access + refresh token (refresh endpoint per enhancement design). **RED by definition** until the enhancement lands.
- **Act:** `POST /api/authentication/refresh` `{ refreshToken }` with a valid (non-expired) refresh token and no access token; then with an **expired** access token + valid refresh; then an expired access token + expired/absent refresh.
- **Assert (IT):** valid refresh → 200 with a new access JWT (new `exp`, same `sub`/`TenantId`/claims) and a rotated refresh token · expired access + valid refresh → 200 · expired access without refresh → 401 · refresh-token reuse (rotated token replayed) → 401 · ClockSkew no longer masks expiry (TC-D01.015's `exp=now−1min` token now 401s).
- **Assert (PM):** runner flow: login → shift simulation (advance test clock) → refresh → protected call 200.

### TC-D01.017 — Angular login clears the session and throws when locationIds claim is empty
- **Layers:** UT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.1 (step 6); `Angular/src/app/core/security/security.service.ts:279-296`, `wr-license.service.ts:65-75`
- **Arrange:** Karma testbed with a mocked `UserAuth` response whose decoded JWT has `locationIds=""` (user with `IsAllLocations=false` and no `UserLocation` rows — server still issues a token).
- **Act:** call `securityService.login(...)`.
- **Assert (UT):** `wr-licenseService.removeToken()` called (localStorage `access_token` removed) · observable errors with `'No location assigned to user.'` · `localStorage['userMenus']` not set · with `locationIds="<L1>"`, first location is persisted as selected via `updateSelectedLocation`.

### TC-D01.018 — SecurityService.hasClaim implements string, colon-value, and array any-match semantics
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.1 (step 8); `Angular/src/app/core/security/security.service.ts:400-449`
- **Arrange:** decoded token fixture with claims `POS_POS="true"`, `LOC_1="L1"`, and cached Claims array from `auth_obj`.
- **Act/Assert (UT):** `hasClaim('POS_POS')` → true · `hasClaim('NOPE')` → false · `hasClaim('LOC_1:L1')` → true (value comparison) · `hasClaim('LOC_1:L2')` → false · `hasClaim(['NOPE','POS_POS'])` → true (array any-match, short-circuits) · `hasClaim(['NOPE1','NOPE2'])` → false.

### TC-D01.019 — Menu deduplication merges duplicate global/tenant rows preferring tenant-specific permissions
- **Layers:** UT · IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-1.1 (step 4); `MenuItemRepository.cs:37-78` (`ProcessMenuDeduplication`), `UserLoginCommandHandler.cs:120-167`
- **Arrange:** MenuItem "Users List" (path `/users`) seeded twice: global (`TenantId=null`, RoleMenuItem CanView for R-MANAGER) and tenant-owned (same Title+Path, RoleMenuItem CanView+CanEdit for R-MANAGER); SuperAdmin sees both candidates pre-merge.
- **Act:** login as `manager`; UT: `ProcessMenuDeduplication` over the two rows.
- **Assert (UT):** exactly 1 merged row keyed by (Title, Path); tenant-specific row wins; permissions merged per role (CanView=true from global, CanEdit=true from tenant row).
- **Assert (IT):** login response `menus` contains exactly one `/users` node with `canView=true, canEdit=true, canDelete=false`.

### TC-D01.020 — Menu tree Can* flags OR-aggregate across the user's roles
- **Layers:** UT · IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-1.1 (step 4); `UserLoginCommandHandler.cs:151-165`
- **Arrange:** user with two roles: R-X (RoleMenuItem CanView=true, others false) and R-Y (CanView+CanDelete=true) on the same item.
- **Act:** login; UT: aggregation over the two roles' RoleMenuItem rows.
- **Assert (UT):** `CanView=true, CanDelete=true, CanCreate=false, CanEdit=false` (OR across roles).
- **Assert (IT):** login tree node for that item shows `canView=true, canDelete=true, canCreate=false, canEdit=false`; hierarchy: child attached under its `ParentId` parent, orphans become roots (`BuildTree`, lines 178-195).

### TC-D01.021 — Sidebar renders the menu tree and hides items without CanView
- **Layers:** E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.1 (steps 4, 6) + WF-1.4 pipeline; sidebar component + `localStorage['userMenus']`
- **Arrange:** Playwright: login as `manager` (has Users menu CanView, no POS menu view).
- **Act:** land on dashboard; inspect sidebar DOM.
- **Assert (E2E):** sidebar contains the "Users" parent and "Users List" child link to `/users` · POS menu item absent · item with `canView=false` for this user is absent · navigating to `/users` succeeds (guard claim `USR_VIEW_USER` passes).

### TC-D01.022 — Cashier-only login lands on /pos; other users land on the dashboard
- **Layers:** E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.1 (step 5); `Angular/src/app/login/login.component.ts:70-96`, `security.service.ts:118` (`isPOSPermissionOnly`)
- **Arrange:** Playwright: `cashier` (only `POS_POS` claim) and `manager`.
- **Act:** submit login form for each; geolocation permission granted (latitude/longitude attached to payload — assert via request body interception).
- **Assert (E2E):** cashier → URL `/pos`, manager → URL `/` · invalid form (empty password) shows validation and does NOT call `POST /api/authentication` (loginFormGroup invalid path, lines 92-94).

### TC-D01.023 — Unauthenticated deep-link redirects to /login
- **Layers:** E2E
- **Priority:** P1   **Category:** Negative
- **Source:** WF-1.1 (step 8); `Angular/src/app/core/security/auth.guard.ts:26-46,66-73`
- **Arrange:** fresh browser context, no localStorage session.
- **Act:** navigate directly to `/users` (canActivate route) and to a lazy `canLoad` route.
- **Assert (E2E):** redirected to `/login` for both · no permission toast (session-missing branch does not toast) · after login the guard lets the same route through.

### TC-D01.024 — Route without the required claim shows a permission toast and redirects to /login
- **Layers:** E2E
- **Priority:** P1   **Category:** Permission
- **Source:** WF-1.1 (step 8); `auth.guard.ts:30-40` — `data.claimType` via `SecurityService.hasClaim`
- **Arrange:** Playwright: logged in as `cashier` (no `USR_VIEW_USER`).
- **Act:** navigate to `/users` (route `data: { claimType: 'USR_VIEW_USER' }`).
- **Assert (E2E):** toast with `UI_PERMISSION_ERROR` text appears · redirected to `/login` · `canActivateChild` variant (child route claim) blocks without full redirect-toast duplicate.

---

## WF-1.2 — Password Reset Workflow

### TC-D01.025 — Forgot-password persists a Base64(GUID) reset code and dispatches the reset email
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.2 (step 1); `ForgetPasswordCommandHandler.cs:25-78`
- **Arrange:** `admin@milpos.test` exists; default `EmailSMTPSetting` present; `wwwroot/reset-password-template.html` exists; SMTP/email sender mocked with capture.
- **Act:** `POST /api/forgotpassword` `{ email: "admin@milpos.test", hostUrl: "https://app.milpos.test" }`.
- **Assert (IT):** HTTP 200 · `Users.ResetPasswordCode` for admin == 48-char Base64 matching `^[A-Za-z0-9+/]{48}$` and decodable to a 36-char GUID string · captured email body contains `https://app.milpos.test/reset-password/<the exact persisted code>` (placeholder `##RESET_LINK##` replaced) · `SendEmail` row persisted with `Subject="Reset Password"`, `ToAddress="admin@milpos.test"` · `Users` row `ModifiedDate` bumped.
- **Assert (PM):** 200 and schema `{ isSuccess: true }`.

### TC-D01.026 — Forgot-password with an unknown email returns 404
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.2 (step 1); `ForgetPasswordCommandHandler.cs:27-31`
- **Arrange:** no user with email `nobody@milpos.test`.
- **Act:** `POST /api/forgotpassword` `{ email: "nobody@milpos.test" }`.
- **Assert (IT):** HTTP 404 · message exactly `"User not found."` · no email sent, no SendEmail row, no User row modified.

### TC-D01.027 — Forgot-password without a default SMTP setting returns 404
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.2 (step 1) ⚠ GAP (A-05: reset depends on SMTP); `ForgetPasswordCommandHandler.cs:33-37`
- **Arrange:** all `EmailSMTPSetting` rows `IsDefault=false` (or none).
- **Act:** `POST /api/forgotpassword` for a valid user.
- **Assert (IT):** HTTP 404 · message exactly `"Email SMTP setting not found."` · `Users.ResetPasswordCode` unchanged · no email dispatched.

### TC-D01.028 — Reset-code generator produces a 48-character Base64 encoding of a fresh GUID
- **Layers:** UT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-1.2 (step 1); `ForgetPasswordCommandHandler.cs:38-39`
- **Arrange:** pure unit harness for the `Encoding.UTF8.GetBytes(Guid.NewGuid().ToString())` → `Convert.ToBase64String` pipeline.
- **Act:** generate 100 codes.
- **Assert (UT):** every code matches `^[A-Za-z0-9+/]{48}$` (36 UTF-8 bytes → 48 chars, no padding) · decodes back to a parseable GUID string · all 100 codes distinct.

### TC-D01.029 — GET resetpassword/{valid token} resolves the user for the Angular recovery screen
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.2 (step 2); `GetResetPasswordInfoCommandHandler.cs:21-31`
- **Arrange:** admin with `ResetPasswordCode=<code>` (from TC-D01.025 flow).
- **Act:** `GET /api/resetpassword/<code>`.
- **Assert (IT):** HTTP 200 · `UserDto` with `email="admin@milpos.test"`, `firstName`, `id` — and **without** `passwordHash`/`resetPasswordCode` values leaked in the payload.
- **Assert (PM):** 200, schema has `email` + `id`.

### TC-D01.030 — GET resetpassword/{unknown token} returns 404 "User not found"
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.2 (step 2); `GetResetPasswordInfoCommandHandler.cs:23-27`
- **Arrange:** no user holds code `deadbeef-token`.
- **Act:** `GET /api/resetpassword/deadbeef-token`.
- **Assert (IT):** HTTP 404 · message exactly `"User not found"` (no trailing period — distinct from the reset handler's wording).

### TC-D01.031 — Recover-password sets the new hash, invalidates the old password, and clears the code
- **Layers:** IT · E2E
- **Priority:** P0   **Category:** Happy
- **Source:** WF-1.2 (step 3); `RecoverPasswordCommandHandler.cs:25-42`, `ResetPasswordCommandHandler.cs:27-44`
- **Arrange:** admin with `ResetPasswordCode=<code>`; old password `admin@123`.
- **Act:** `POST /api/recoverpassword/<code>` `{ userName: "admin@milpos.test", password: "N3w-Secret!" }`.
- **Assert (IT):** HTTP 200 · `Users.PasswordHash` changed · login with `admin@123` → 401 · login with `N3w-Secret!` → 200 · `Users.ResetPasswordCode` is NULL afterwards · replaying the same `<code>` (`GET /api/resetpassword/<code>`) → 404 (single-use).
- **Assert (E2E):** open the email link route `/reset-password/<code>` → recovery form submits → success toast → login with the new password lands on dashboard.

### TC-D01.032 — Recover-password with a mismatched token returns 404 "User not Found."
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.2 (step 3); `ResetPasswordCommandHandler.cs:29-34`
- **Arrange:** admin exists with `ResetPasswordCode=<codeA>`; request carries `<codeB>` (well-formed but not theirs); the email `admin@milpos.test` resolves a user.
- **Act:** `POST /api/recoverpassword/<codeB>` `{ userName: "admin@milpos.test", password: "X" }`.
- **Assert (IT):** HTTP 404 · message exactly `"User not Found."` (period; the `&&` condition treats mismatch as not-found) · `PasswordHash` unchanged · `ResetPasswordCode` still `<codeA>`.

### TC-D01.033 — Reset codes never expire (current behavior characterization)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [SEC-04]
- **Source:** WF-1.2 ⚠ GAP + SEC-04 ("code has no expiry"); `ForgetPasswordCommandHandler.cs:38-39` (no timestamp stored), `ResetPasswordCommandHandler.cs` (no TTL check)
- **Arrange:** admin with `ResetPasswordCode=<oldCode>`, backdated so the code was issued 30 days ago (no expiry field exists — backdate `ModifiedDate` as proxy).
- **Act:** `POST /api/recoverpassword/<oldCode>` with a new password.
- **Assert (IT):** HTTP 200 — the month-old code still resets the password · login with the new password → 200 · `ResetPasswordCode` NULL. Characterizes the unbounded-validity gap that SEC-04 must close.

### TC-D01.034 — Reset codes expire after the TTL and cannot reset the password
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [SEC-04]
- **Source:** SEC-04 (enhancement: code TTL); WF-1.2 ⚠ GAP
- **Arrange:** TTL enhancement (e.g. 15 min) implemented; code aged 16 minutes. **RED by definition** until the enhancement lands.
- **Act:** `POST /api/recoverpassword/<expiredCode>` with a new password.
- **Assert (IT):** non-2xx rejection (404/410 per enhancement spec) with an expired-code message · `PasswordHash` unchanged · old password still authenticates (login 200) · a fresh code (age < TTL) still resets successfully — TTL does not break the happy path · code issuance timestamp persisted on the User row.

### TC-D01.035 — Unknown email in recover-password crashes with NullReferenceException (current behavior characterization)
- **Layers:** UT · IT
- **Priority:** P1   **Category:** Gap-Char [SEC-04]
- **Source:** WF-1.2 ⚠ GAP + SEC-04 (null-check bug); `ResetPasswordCommandHandler.cs:30` — `if (entity == null && entity.ResetPasswordCode != request.Token)`
- **Arrange:** no user with email `ghost@milpos.test`.
- **Act:** `POST /api/recoverpassword/<any-token>` `{ userName: "ghost@milpos.test", password: "X" }`; UT: handler invoked with `FindByEmailAsync` → null.
- **Assert (UT):** `NullReferenceException` thrown at the `&&` condition (right operand dereferences the null entity) — not the intended `ReturnFailed(404)`.
- **Assert (IT):** HTTP 500 (NRE surfaces through the pipeline) — a garbage email+token pair yields a 500 instead of a 404, and `RecoverPasswordCommandHandler.cs:36-39` flattens any inner failure to 500 `"Internal Server Error"`.

### TC-D01.036 — Reset handler rejects a null user and a mismatched token explicitly, without NRE
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Target [SEC-04]
- **Source:** SEC-04 (fix condition to `||` semantics); WF-1.2 ⚠ GAP
- **Arrange:** fixed condition `entity == null || entity.ResetPasswordCode != request.Token`. **RED by definition** until the fix lands.
- **Act:** exercise the handler for: (a) email with no user, (b) user with different code, (c) user with matching code.
- **Assert (UT):** (a) → `ServiceResponse` 404 `"User not Found."`, no exception · (b) → 404, `ResetPasswordAsync` never invoked · (c) → proceeds to `GeneratePasswordResetTokenAsync` + `ResetPasswordAsync`, success result, `ResetPasswordCode` cleared · regression guard: `ResetPasswordCode` must be cleared only after `passwordResult.Succeeded` (current code clears first — see Discrepancy notes).

---

## WF-1.3 — User Management Workflow (Add/Edit Users)

### TC-D01.037 — Add user creates User, UserRole, and UserLocation rows with Identity hash and default-password fallback
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.3 (step 1); `AddUserCommandHandler.cs:62-158`
- **Arrange:** admin JWT with `USR_ADD_USER`; role R-MANAGER; location L1.
- **Act:** `POST /api/User` `{ email: "newuser@milpos.test", userName: "newuser@milpos.test", firstName: "New", roleIds: [<R-MANAGER>], locationIds: [<L1>] }` — password omitted.
- **Assert (IT):** HTTP 200 · `Users` row with `UserName="newuser@milpos.test"`, `NormalizedUserName` set, `TenantId=Tenant A`, `IsSuperAdmin=false`, audit `CreatedBy/ModifiedBy == <admin id>` · `PasswordHash` verifies against `"admin@123"` (default `AppConstants.Seeding.DefaultPassword`, `POS.Common/AppConstants.cs:26`) · one `UserRole` row (userId, R-MANAGER) · one `UserLocation` row (L1) · login as the new user with `admin@123` → 200 and JWT claim `USR_VIEW_USER=true`.

### TC-D01.038 — Duplicate user returns 409 "Email already exist for another user."
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.3 (step 1); `AddUserCommandHandler.cs:64-78` (`FindByNameAsync(request.Email)`)
- **Arrange:** `newuser@milpos.test` already exists (from TC-D01.037).
- **Act:** `POST /api/User` with the same email/userName again.
- **Assert (IT):** HTTP 409 · message exactly `"Email already exist for another user."` · still exactly 1 `Users` row for that name (uniqueness is global via `FindByNameAsync` — see Discrepancy notes) · a second tenant attempting the same username also gets 409.

### TC-D01.039 — POST /api/User without USR_ADD_USER claim returns 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-1.3 (step 1); `[ClaimCheck("USR_ADD_USER")]` on `UserController`
- **Arrange:** cashier JWT (only `POS_POS`).
- **Act:** `POST /api/User` with a valid payload and cashier JWT.
- **Assert (IT):** HTTP 403 · no `Users`/`UserRole`/`UserLocation` rows created.
- **Assert (PM):** 403 asserted; request/body schema valid so a claim fix flips the case to 200.

### TC-D01.040 — Another tenant's user id is invisible and returns 409 "User does not exist."
- **Layers:** IT
- **Priority:** P1   **Category:** Tenant-Isolation
- **Source:** WF-1.3 (step 2); `UpdateUserCommandHandler.cs:70-80` (409 on missing), `DeleteUserCommandHandler.cs:48`
- **Arrange:** user `buser` belongs to Tenant B; admin JWT from Tenant A.
- **Act:** `PUT /api/User/<buser id>` with any payload.
- **Assert (IT):** HTTP 409 · message exactly `"User does not exist."` (note: code returns 409, not the template-default 404 — see Discrepancy notes) · `buser` row untouched · the response reveals no data about the other tenant.

### TC-D01.041 — Update user diffs roles and locations and pushes OnUserPermissionChange to the online user
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.3 (steps 1–2); `UpdateUserCommandHandler.cs` (diff + SignalR at line 150)
- **Arrange:** `manager` currently roles [R-MANAGER], location L1; `manager` connected to SignalR hub (connection registered in the in-memory map).
- **Act:** admin JWT `PUT /api/User/<manager id>` with roleIds [R-MANAGER, R-CASHIER], locationIds [L1, L2].
- **Assert (IT):** HTTP 200 · `UserRole` rows now exactly {R-MANAGER, R-CASHIER} (none added duplicate, none left stale) · `UserLocation` rows {L1, L2} · mock `IHubClient.OnUserPermissionChange(<manager id>)` received on `manager`'s connection · name-only update (no role/location change) triggers no SignalR call.

### TC-D01.042 — Update user claims diffs UserClaim rows add/remove
- **Layers:** UT · IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.3 (step 4); `UpdateUserClaimCommandHandler.cs:35-52`
- **Arrange:** `manager` has UserClaims [`INV_GAIN`].
- **Act:** admin JWT `POST` user-claims update with claims [`INV_GAIN`, `USR_ADD_USER`].
- **Assert (UT):** diff algorithm output = add [`USR_ADD_USER`], remove [] (and for input [`SETT_UPDATE_COM_PROFILE`] = remove [`INV_GAIN`], add [`SETT_UPDATE_COM_PROFILE`]).
- **Assert (IT):** `UserClaim` rows for manager == exactly the requested set · next login JWT reflects the diff (see TC-D01.011 chain).

### TC-D01.043 — Change-password verifies the old password and rehashes the new one
- **Layers:** UT · IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.3 (step 3); `UserController.cs:198-199`, `ChangePasswordCommandHandler.cs:28-51`
- **Arrange:** `manager` with current password `manager@123`.
- **Act:** `POST /api/User/changepassword` `{ userName: "manager", oldPassword: "wrong", newPassword: "M@nager456" }` then repeat with correct old password.
- **Assert (IT):** wrong old password → HTTP 422 · message exactly `"Old Password does not match."` · hash unchanged · unknown userName → 404 `"UserName not found."` · correct old password → HTTP 200 · old password no longer logs in (401), new password logs in (200) · success does not touch `ResetPasswordCode`.
- **Assert (UT):** `PasswordHasher<User>` hash of the same password twice yields different hashes (salted) and `VerifyHashedPassword` succeeds for the right password, fails for the wrong one — hashing/verification behavior pinned independently of the handler.

### TC-D01.044 — Restricted locationIds force SalesPersonId to the logged-in user on order creation
- **Layers:** IT
- **Priority:** P1   **Category:** Permission
- **Source:** WF-1.3 (location-restriction behavior) → WF-3.2/WF-4.1; order-creation handlers force-set `SalesPersonId`
- **Arrange:** `cashier` (JWT `locationIds=<L1>`, i.e. restricted) logged in; another user `manager` exists; product P-SIMPLE in stock at L1.
- **Act:** `POST` a sales order with `salesPersonId = <manager id>` using cashier's JWT.
- **Assert (IT):** HTTP 200/201 · stored `SalesOrder.SalesPersonId == <cashier id>` (anti-spoofing override, not the spoofed id) · a user with `IsAllLocations` JWT is NOT overridden — provided `salesPersonId` is stored as-is.

---

## WF-1.4 — Role & Claim Management Workflow

### TC-D01.045 — Add role creates Role and RoleClaim rows with underscore-normalized claim types
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.4 (step 1); `AddRoleCommandHandler.cs:42-96`
- **Arrange:** admin JWT with `ROLES_ADD_ROLE`; claim names `"INV Gain"` and `"POS_POS"`.
- **Act:** `POST /api/Role` `{ name: "Stock Clerk", isSuperRole: false, roleClaims: [{ claimType: "INV Gain" }, { claimType: "POS_POS" }] }`.
- **Assert (IT):** HTTP 200 · `Roles` row `Name="Stock Clerk"`, `TenantId=Tenant A`, `IsSuperRole=false` · `RoleClaim` rows with ClaimType `"INV_Gain"` (space → underscore, trimmed) and `"POS_POS"` · user assigned this role then logging in carries JWT claim `INV_Gain=true` (normalized type reaches the token).

### TC-D01.046 — Duplicate role name returns 409 "Role Name already exist."
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-1.4 (step 1); `AddRoleCommandHandler.cs:53-64`
- **Arrange:** role "Stock Clerk" exists (any tenant — `RoleExistsAsync` checks NormalizedName globally).
- **Act:** `POST /api/Role` with `name: "Stock Clerk"` again.
- **Assert (IT):** HTTP 409 · message exactly `"Role Name already exist."` · no new `Roles` row · no orphan `RoleClaim` rows.

### TC-D01.047 — POST /api/Role without ROLES_ADD_ROLE claim returns 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-1.4 (step 1); `[ClaimCheck("ROLES_ADD_ROLE")]` on `RoleController`
- **Arrange:** cashier JWT.
- **Act:** `POST /api/Role` valid payload with cashier JWT.
- **Assert (IT):** HTTP 403 · no `Roles` row created.
- **Assert (PM):** 403; collection marks request as permission-negative.

### TC-D01.048 — Updating a super-role is blocked with 409 "Super admin Role can not be updated."
- **Layers:** IT
- **Priority:** P1   **Category:** Negative
- **Source:** WF-1.4 (step 2); `UpdateRoleCommandHandler.cs:72-76`
- **Arrange:** R-ADMIN with `IsSuperRole=true`.
- **Act:** admin JWT `PUT /api/Role/<R-ADMIN id>` with any claim diff.
- **Assert (IT):** HTTP 409 · message exactly `"Super admin Role can not be updated."` · R-ADMIN's `RoleClaim` rows unchanged · no SignalR broadcast.

### TC-D01.049 — Role-claim diff persists and pushes OnUserPermissionChange to online role holders
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-1.4 (step 2 + permission pipeline); `UpdateRoleCommandHandler.cs:83-124`
- **Arrange:** R-CASHIER has claims [`POS_POS`]; `cashier` user online via SignalR; `manager` online but NOT in R-CASHIER.
- **Act:** admin JWT `PUT /api/Role/<R-CASHIER>` roleClaims [`POS_POS`, `INV_GAIN`].
- **Assert (IT):** HTTP 200 · `RoleClaim` rows for R-CASHIER == {`POS_POS`, `INV_GAIN`} · mock hub: `OnUserPermissionChange` fired exactly once, for `cashier`'s connection — not for `manager` (filter: online ∩ role holders, lines 103-117) · update with an identical claim set (no diff) fires no broadcast · if SaveAsync fails (≤0 rows) → HTTP 500 and no partial claim state.

### TC-D01.050 — Assigning a claim to a role reaches the API after the user's next login (master chain, assign)
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-1.4 permission pipeline (Admin UI → RoleClaim → login merge → ClaimCheck); `UserRepository.cs:162-185`, `ClaimCheckAttribute.cs`
- **Arrange:** `manager` currently lacks `INV_GAIN` everywhere; `POST /api/inventory/gain` guarded by `INV_GAIN` (per WF-5.1 seeding).
- **Act:** admin assigns `INV_GAIN` to R-MANAGER → `manager` logs out & logs in → `POST /api/inventory/gain` with the fresh JWT.
- **Assert (IT):** new JWT contains claim `INV_GAIN=true` · inventory-gain call returns 200/201 (not 403) · the pre-change JWT returns 403 for the same call.

### TC-D01.051 — Revoking a role claim locks the user out of the endpoint after re-login
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-1.4 permission pipeline; `UpdateRoleCommandHandler.cs:92-97`, `ClaimCheckAttribute.cs`
- **Arrange:** inverse of TC-D01.050 — `manager` has `INV_GAIN` via R-MANAGER and a valid JWT.
- **Act:** admin removes `INV_GAIN` from R-MANAGER → `manager` re-logs in → repeat the inventory-gain call.
- **Assert (IT):** new JWT lacks `INV_GAIN` · call returns 403 · `RoleClaim` row gone from DB.

### TC-D01.052 — Un-refreshed JWT keeps working after server-side claim revocation until expiry
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-1.4 (stateless-JWT consequence; mitigation = SignalR push per pipeline); `ClaimCheckAttribute.cs:46` (reads raw JWT, no DB lookup)
- **Arrange:** `manager` holds a pre-revocation JWT containing `INV_GAIN` (from before TC-D01.051's revoke).
- **Act:** immediately repeat the inventory-gain call with the old JWT (no re-login).
- **Assert (IT):** HTTP 200 — the server validates claims from the token only; there is no server-side revocation list · the mitigation is the `OnUserPermissionChange` push (TC-D01.049) prompting the client to re-auth; until then the stale claim grants access for up to the token lifetime.

### TC-D01.053 — Update user-role membership diffs UserRole rows and pushes permission change
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.4 (step 3); `UpdateUserRoleCommandHandler.cs:47-99` (broadcast at line 82)
- **Arrange:** `manager` in roles [R-MANAGER], online via SignalR.
- **Act:** admin JWT user-role membership update → roles [R-MANAGER, R-STOCK] (R-STOCK pre-created).
- **Assert (IT):** HTTP 200 · `UserRole` rows for manager == {R-MANAGER, R-STOCK} · removing a role in a follow-up call deletes exactly that `UserRole` row · mock hub receives `OnUserPermissionChange(<manager id>)` on the membership change.

### TC-D01.054 — SuperAdminPolicy requires isSuperAdmin == "true"
- **Layers:** IT
- **Priority:** P0   **Category:** Permission
- **Source:** WF-1.1 (step 9) + WF-1.4 pipeline; `JwtConfigurationExtension.cs:67-72`
- **Arrange:** endpoint guarded by `[Authorize(Policy = "SuperAdminPolicy")]` (test-only controller or real super-admin-only endpoint); `manager` JWT has `isSuperAdmin="false"`.
- **Act:** call with manager JWT, then with admin JWT (`IsSuperAdmin=true` → claim `isSuperAdmin="true"`, `UserRepository.cs:150`).
- **Assert (IT):** manager → HTTP 403 · admin → HTTP 200 · a forged token with `isSuperAdmin="True"` → 403 (policy compares exactly `"true"`).

### TC-D01.055 — No admin endpoint exists to edit RoleMenuItem rows post-seeding (current behavior characterization)
- **Layers:** IT
- **Priority:** P2   **Category:** Gap-Char [UX-03]
- **Source:** WF-1.4 ⚠ GAP + UX-03/A-03; no `RoleMenuItem` write endpoint exists (rows written only at seeding/cloning, WF-2.1)
- **Arrange:** admin JWT (all claims); R-STOCK role; menu item "Users List".
- **Act:** attempt `POST /api/RoleMenuItem`, `PUT /api/RoleMenuItem/<id>`, `PATCH /api/menuItem/<id>/permissions` (any plausible admin route).
- **Assert (IT):** all return 404 (no route) or 405 — no endpoint mutates `RoleMenuItem` · `RoleMenuItem` rows for the item are byte-identical before/after · login tree `Can*` flags therefore unchanged — characterizes the static-after-provisioning gap.

### TC-D01.056 — Menu-permission management endpoint updates RoleMenuItem and the next login's tree
- **Layers:** IT
- **Priority:** P2   **Category:** Gap-Target [UX-03]
- **Source:** UX-03 (enhancement: menu-permission management screen); WF-1.4 ⚠ GAP. **RED by definition** until the enhancement lands.
- **Arrange:** enhancement endpoint (e.g. `PUT /api/role/{roleId}/menu-permissions`) implemented.
- **Act:** admin grants `CanDelete=true` on "Users List" for R-MANAGER → `manager` re-logs in.
- **Assert (IT):** `RoleMenuItem` row (R-MANAGER, item) has `CanDelete=true` persisted · new login tree node shows `canDelete=true` · SignalR `OnUserPermissionChange` fired to online R-MANAGER holders · unauthorized caller (no admin claim) → 403.

---

## WF-1.5 — Company Profile / Settings Workflow

### TC-D01.057 — GET CompanyProfile anonymously returns the profile (or bootstrap default) with navigation data
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.5 (step 1); `CompanyProfileController.cs:34` (`[AllowAnonymous]`), `GetCompanyProfileQueryHandler.cs:36-77`
- **Arrange:** Tenant A has a CompanyProfile with Locations L1/L2, open FinancialYear FY2026, Languages seeded; second factory context with a tenant that has **no** CompanyProfile row.
- **Act:** `GET /api/CompanyProfile` with **no** Authorization header (both tenants).
- **Assert (IT):** HTTP 200 anonymously · Tenant A: `title`, `currencyCode`, `licenseKey`, `purchaseCode`, `locations[]` (2), `financialYears[]` (1, FY2026), `languages[]` non-empty · no-profile tenant: defaults exactly `title="Point of Sale"`, `currencyCode="USD"`, `address="3822 Crim Lane Dayton, OH 45407"` (bootstrap mode, lines 52-63) · `logoUrl` rewritten to a servable relative path (`<CompanyLogo path>/<filename>`, lines 69-73).
- **Assert (PM):** 200; schema fields present; no auth header required.

### TC-D01.058 — CompanyProfile cache serves 24h and is evicted by an update
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-1.5 (steps 1–2); `GetCompanyProfileQueryHandler.cs:39-44,75`, `UpdateCompanyProfileCommandHandler` (cache eviction)
- **Arrange:** Tenant A profile title "ACME Retail".
- **Act:** `GET /api/CompanyProfile` twice (second must hit cache — assert via query-count telemetry or replacing the underlying row directly in SQLite between calls), then `POST /api/CompanyProfile` title "ACME Retail v2" with admin JWT, then `GET` again.
- **Assert (IT):** second GET returns the stale cached title even though the DB row was changed underneath (cache TTL 24h, key `CompanyProfile_<tenantId>`) · after POST the third GET returns `"ACME Retail v2"` (eviction) · cache keys are per-tenant: Tenant B's GET never returns Tenant A's cached payload.

### TC-D01.059 — Update CompanyProfile persists fields, swaps the logo file, and rehydrates navigation data
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.5 (step 2); `UpdateCompanyProfileCommandHandler.cs:73-159`
- **Arrange:** admin JWT with `SETT_UPDATE_COM_PROFILE`; existing profile with old logo file present on storage.
- **Act:** `POST /api/CompanyProfile` `{ title, address, phone, email, currencyCode: "PKR", taxNumber, imageData: <valid base64 PNG> }`.
- **Assert (IT):** HTTP 200 · `CompanyProfile` row updated (Title/Address/Phone/Email/CurrencyCode="PKR"/TaxNumber) · new logo file exists under the tenant-scoped storage path (`Tenants/<tenantId>/...`) with a fresh generated filename · the old logo file is deleted · response rehydrated with `languages[]`, `locations[]`, `financialYears[]` · a save returning ≤0 rows (fault-injected `IUnitOfWork`) → HTTP 500 and no partial file swap.

### TC-D01.060 — POST /api/CompanyProfile without SETT_UPDATE_COM_PROFILE claim returns 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-1.5 (step 2); `CompanyProfileController.cs:49,63` — `[ClaimCheck("SETT_UPDATE_COM_PROFILE")]`
- **Arrange:** cashier JWT.
- **Act:** `POST /api/CompanyProfile` valid payload with cashier JWT.
- **Assert (IT):** HTTP 403 · `CompanyProfile` row and logo storage unchanged.
- **Assert (PM):** 403; GET remains anonymous-200 (read path unaffected).

---

## WF-1.6 — Session Lifecycle & Online Presence (SignalR)

### TC-D01.061 — UserHub Join registers presence and broadcasts newOnlineUser and onlineUsers
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.6 (step 2); `POS.Repository/Hub/UserHub.cs:10-98`, `IConnectionMappingRepository`
- **Arrange:** factory with `userHub` mapped; two SignalR test clients: A (user `manager`), B (user `cashier`).
- **Act:** A connects and invokes `Join(<manager id>)`; then B connects and invokes `Join(<cashier id>)`.
- **Assert (IT):** connection map contains A→manager and B→cashier · on A's Join all clients receive `Joined`/`newOnlineUser` with the SignlarUser payload; on B's Join clients receive `onlineUsers` containing both user ids · joining twice with the same user does not duplicate map entries.

### TC-D01.062 — ForceLogout pushes targeted logout and the client clears its session
- **Layers:** IT · E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.6 (step 2); `UserHub.ForceLogout`
- **Arrange:** A (manager) and B (cashier) connected; Playwright session for the cashier in a second harness (or IT-only hub verification).
- **Act:** server (admin action or `UserHub` invocation) triggers `ForceLogout(<cashier id>)`.
- **Assert (IT):** only B's connection receives the `ForceLogout` event; A receives nothing (targeted send via `Clients.Client(connectionId)`).
- **Assert (E2E):** cashier client clears `access_token`/`auth_obj` on the push and lands on `/login`; a subsequent guarded navigation redirects to `/login` (session gone).

### TC-D01.063 — Disconnect removes the connection from the presence map
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-1.6 (step 2); `UserHub.OnDisconnectedAsync`
- **Arrange:** A (manager) connected and joined; presence map contains A.
- **Act:** A disconnects (dispose `HubConnection`).
- **Assert (IT):** `OnDisconnectedAsync` removed the connectionId→userId entry (map empty for manager) · remaining users' `onlineUsers` no longer list manager · other connections unaffected.

### TC-D01.064 — Presence map is lost on server restart (current behavior characterization)
- **Layers:** IT
- **Priority:** P2   **Category:** Gap-Char [RT-01]
- **Source:** WF-1.6 ⚠ GAP + RT-01/A-04 (in-memory `IConnectionMappingRepository`); `UserHub.cs`
- **Arrange:** factory instance 1: two users joined and present.
- **Act:** dispose factory 1 (server restart), boot factory 2 on the same SQLite DB, reconnect one client and `Join`.
- **Assert (IT):** factory 2's map starts empty — previous presence is gone (no persistence/backplane) · only the re-joined user is online · characterizes the restart-loss and no-scale-out gap (two live instances would each hold partial maps).

---

## Cross-Workflow Postman Runner Case

### TC-D01.065 — Postman runner chains the login token into authenticated requests and flags bad tokens
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-1.1 (steps 1, 7) → WF-1.3 (GET user); Postman collection plan (environment chaining)
- **Arrange:** environment `local-cloud` with `baseUrl`; no pre-set `token`.
- **Act:** runner sequence: (1) `POST /api/authentication` (admin) → test script stores `bearerToken` to `token` and `TenantId` claim to `tenantId`; (2) `GET /api/User?pageNumber=1&pageSize=10` with `Bearer {{token}}`; (3) replay request (2) with `Authorization: Bearer garbage.token.value`; (4) request (2) with no auth header.
- **Assert (PM):** (1) 200 + `token` variable populated + response contract fields (`bearerToken`, `menus`, `claims`); (2) 200 with paging envelope (`items`, `pageNumber`, `pageSize`, `totalCount`); (3) 401; (4) 401 (ClaimCheck short-circuit on guarded endpoints) — proves the whole auth chain a QA can run without an IDE.

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case (WF-1.1: 001/007/008; WF-1.2: 025/029/031; WF-1.3: 037/041; WF-1.4: 045/049/050; WF-1.5: 057/059; WF-1.6: 061/062)
- [x] Every write endpoint has: Validation case (bad input → 400/409), Permission case (missing claim → 403), Tenant-Isolation case (other tenant's id → 404/409-per-code) (Validation: 002/003/026/027/030/032/038/046/048; Permission: 012/013/039/047/060; Tenant-Isolation: 005/006/040)
- [x] Every money/stock mutation has DB-state assertions (mutations in this domain are auth/metadata: user/role/claim/profile rows asserted — 037/045/049/053/059; stock mutation reachable via the WF-1.4 chain case 050 which asserts the guarded endpoint succeeds)
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case (SEC-04: 033/034/035/036; SEC-05: 015/016; SEC-08: 004/005/006; UX-03: 055/056; RT-01 [WF-1.6 ⚠ GAP]: 064)
- [x] Gap-Char assertions describe CURRENT behavior; Gap-Target describes DESIRED behavior (RED now) — 004/005/015/033/035/055/064 characterize observed code (file/line cited in each); 006/016/034/036/056 are marked RED-by-definition
- [x] Concurrency case for sequential-number generation where the doc flags it (INT-11) — INT-11 cites WF-3.2/WF-4.1 (sales/purchase numbering), owned by TC-D03/TC-D04; no D01 sequence generation exists (JWT/reset codes are GUID-based, no collision surface: 028 asserts uniqueness)
- [x] Edge/boundary cases: zero/negative quantities, max values, rounding — N/A to D01 math; domain boundaries covered: empty locationIds (017), expired-vs-within-skew token boundary (015), TTL boundary (034), code-format boundary 48-char/100-unique (028), global-vs-tenant menu duplicate merge (019), OR-aggregation across roles (020), any-match claim overload (014), exact-`"true"` claim value (012)

---

## Discrepancy notes (doc-vs-code observations during verification)

1. **ClockSkew equals the token lifetime** — `JwtConfigurationExtension.cs:42-43` sets `ClockSkew = TimeSpan.FromMinutes(settings.MinutesToExpiration)`. With `exp = iat + MinutesToExpiration`, an "expired" JWT remains valid up to **2× the nominal lifetime** (24h desktop / 2h cloud). Doc WF-1.1's "re-login required after expiry" understates the window, and the SEC-05 Gap-Target (TC-D01.016) must fix the skew too, or TC-D01.015's leniency persists even after refresh tokens land.
2. **Cloud token lifetime is 60 min, not 720** — `appsettings.Cloud.json:55` sets `minutesToExpiration: "60"` (desktop/dev/base = 720). Doc's "default 720 min = 12h" is the non-cloud profile; the SEC-05 mid-shift expiry (TC-D01.015/016) bites hourly for cloud tenants.
3. **"Username uniqueness" is actually email-as-username, globally scoped** — `AddUserCommandHandler.cs:64` checks `FindByNameAsync(request.Email)` → 409 `"Email already exist for another user."`. WF-1.3 says "Username uniqueness check"; the effective unique key is UserName==Email and the check is global across tenants (`RoleExistsAsync`-style NormalizedName match), so two tenants cannot both have "admin".
4. **User update/delete of a missing or other-tenant id returns 409, not 404** — `UpdateUserCommandHandler.cs:76` and `DeleteUserCommandHandler.cs:48` return 409 `"User does not exist."`. The template checklist's default "other tenant's id → 404" does not hold here (TC-D01.040 asserts the observed 409).
5. **Recover-password flattens all failures to 500** — `RecoverPasswordCommandHandler.cs:36-39` converts any `ResetPasswordCommand` failure (including 404 user-not-found / token mismatch) into 500 `"Internal Server Error"`. Clients cannot distinguish mismatch from outage on `POST /api/recoverpassword/{token}`.
6. **Reset code is cleared before the password result is checked** — `ResetPasswordCommandHandler.cs:37-38` sets `ResetPasswordCode = null` and saves **before** the `passwordResult.Succeeded` check at line 39; a policy-failed reset still burns the single-use code (code then 404s on retry). TC-D01.036's regression guard covers the fixed ordering.
7. **UpdateRole NRE risk (not in doc 11)** — `UpdateRoleCommandHandler.cs:70-76` dereferences `entityExist.IsSuperRole` without a null check after `FindByInclude`; an unknown/other-tenant role id yields a NullReferenceException (500) instead of a 404/409. Candidate signal for the next revision of doc 11.
8. **Reset email dispatched before persistence** — `ForgetPasswordCommandHandler.cs:52-74` sends the email, then `SaveAsync`; an SMTP send can succeed for a code that is never persisted (save failure), and the template file missing yields 404 `"Error while sending email"` after the User entity was already modified in memory. Minor atomicity smell; INT-class, not user-visible today.
9. **Cosmetic message drift** — login/reset 401/404 strings differ subtly: `"User not found."` (ForgetPassword, period) vs `"User not found"` (GetResetPasswordInfo, no period) vs `"User not Found."` (ResetPassword, capital F). Tests pin each exact string to catch accidental normalization.
10. **Doc line citations verified accurate** — `AuthenticationController.cs:26-34`, `UserLoginCommandHandler.cs:64-106`, `UserRepository.cs:92-160/162-185/197-218`, `ClaimCheckAttribute.cs:27-68`, `JwtConfigurationExtension.cs:22-72`, `ForgetPasswordCommandHandler.cs:25-78`, `ResetPasswordCommandHandler.cs:27-44`, `AddRoleCommandHandler.cs:42-96`, `UpdateRoleCommandHandler.cs:58-132`, `GetCompanyProfileQueryHandler.cs:36-77` all match the cited behavior.
