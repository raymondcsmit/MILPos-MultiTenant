# Workflow Document 01 — Authentication & Authorization Workflows

**Scope:** Login, session lifecycle, password reset, user management, role/claim management, the full permission pipeline, and company profile settings.

---

## WF-1.1 — Login Workflow (Credential → JWT → Angular Session → Guards)

### Backend sequence

1. **HTTP entry** — `POST /api/authentication` (alias `/api/authentication/login`)
   - `POS.API/Controllers/Authentication/AuthenticationController.cs:26-34`
   - Captures client IP from `CF-Connecting-IP` header (falling back to `Connection.RemoteIpAddress`), passes it into `UserLoginCommand` along with optional latitude/longitude from the client.

2. **Credential validation** — `POS.MediatR/User/Handlers/UserLoginCommandHandler.cs:64-106`
   - Builds a `LoginAuditDto` with Status=Error (default), UserName, RemoteIP, geo.
   - Looks up user by `NormalizedUserName` **with `IgnoreQueryFilters()`** (bypasses tenant filter — login must work before tenant context exists), falls back to `NormalizedEmail`.
   - User not found → persist `LoginAudit` (failed attempt) → 401 "UserName Or Password is InCorrect."
   - `_signInManager.CheckPasswordSignInAsync(user, password, false)` — ASP.NET Identity hash verification.
   - Password OK but `user.IsActive == false` → audit + 401.
   - Success → audit Status=Success persisted; broadcasts SignalR `Joined(onlineUser)` to all connected clients (presence).

3. **Claims + JWT construction** — `POS.Repository/User/UserRepository.cs`
   - `BuildUserAuthObject` (lines 92-160):
     - Loads **CompanyProfile** for the user's TenantId (LicenseKey/PurchaseCode embedded in token).
     - Resolves location scope: `IsAllLocations` → all tenant **Location** IDs; else from **UserLocation** rows.
     - `GetUserAndRoleClaims` (162-185): merges **UserClaim** ClaimTypes + all **RoleClaim** ClaimTypes from the user's **UserRole** roles, deduplicated. Every claim becomes `new Claim(type, "true")`.
     - Adds claims: `licensekey`, `purchasecode`, `isSuperAdmin`, `ApiKey` (if tenant has one), `sub` (user Id), `Email`, `locationIds` (comma-joined), **`TenantId`** (line 204).
   - `BuildJwtToken` (197-218): HS256 symmetric signing; expiry = `JwtSettings.MinutesToExpiration` (default 720 min = 12h).

4. **Dynamic menu tree** — `UserLoginCommandHandler.cs:120-169`
   - Loads active **MenuItem**s with **RoleMenuItem** includes (SuperAdmin: tenant-owned or global rows).
   - `MenuItemRepository.ProcessMenuDeduplication` (MenuItemRepository.cs:37-78) merges duplicate global/tenant menu rows by (Title, Path), preferring tenant-specific; merges permissions per role.
   - Per menu item: aggregates `CanView/CanCreate/CanEdit/CanDelete` from the user's roles' RoleMenuItem rows.
   - `BuildTree` assembles parent/child hierarchy by `ParentId`; returned inside `UserAuthDto` alongside the BearerToken.

### Angular sequence

5. **Login component** — `Angular/src/app/login/login.component.ts:52-96`
   - Captures browser geolocation (best-effort) before submit.
   - `securityService.login(userObject)` → on success navigates to `/pos` if the user's only claim is `pos_pos` (cashier-only UX), else to dashboard `/`.

6. **Session persistence** — `Angular/src/app/core/security/security.service.ts:279-324` + `core/services/wr-license.service.ts:65-75`
   - Stores `access_token` (raw JWT) and `auth_obj` (user JSON) in **localStorage**.
   - Decodes token; if `locationIds` empty → clears token, throws "No location assigned to user."
   - Sets first location as selected (persisted in `auth_obj` via `updateSelectedLocation`).
   - Stores menus in `localStorage['userMenus']`.
   - `forkJoin` pre-loads `getLocations()` + `getCompanyProfile()` → caches in sessionStorage (`LOCATION_CACHE`, `COMPANY_PROFILE`) and syncs IndexedDB via `cacheSyncService.syncMasterData()`.

7. **Per-request token attachment** — `Angular/src/app/http-request-interceptor.ts:25-66`
   - Every request gets `Authorization: Bearer <jwt>`.
   - 401 → redirect `/login`.
   - 403 with body `isTrialExpired` → redirect `/subscription`.

8. **Route guarding** — `Angular/src/app/core/security/auth.guard.ts:26-73`
   - `canActivate/canActivateChild/canLoad`: session exists? then route `data.claimType` checked via `SecurityService.hasClaim` (decodes JWT, keeps keys whose value == "true"); failure → permission toast + redirect `/login`.
   - Claim checks support arrays (any-match semantics, e.g., dashboard accepts any of the `DB_*` claims) and `claimType:value` pairs.

### Server-side enforcement (mirror)

9. **JWT validation** — `POS.API/Helpers/JwtConfigurationExtension.cs:22-72`
   - Validates signing key/issuer/audience/lifetime; `OnTokenValidated` extracts `sub`, `Email`, `locationIds` into scoped **`UserInfoToken`** (available for DI injection into handlers).
   - Policy `SuperAdminPolicy` = claim `isSuperAdmin == "true"`.

10. **Claim enforcement** — `POS.API/Helpers/ClaimCheckAttribute.cs:27-68`
    - Action filter reads the raw JWT from the Authorization header; requires named claim with value `"true"` else **403**.
    - Applied per-endpoint, e.g. `[ClaimCheck("ROLES_ADD_ROLE")]`, `[ClaimCheck("POS_POS")]`.

**Entities touched:** LoginAudit (insert), User, CompanyProfile, Tenant, UserLocation, Location, UserRole, RoleClaim, UserClaim, MenuItem, RoleMenuItem (all read).

**⚠ GAPS:**
- JWT is not refreshable — 12h token, re-login required after expiry (no refresh-token workflow exists).
- Login audit records geo only if the browser supplies it (no server-side geolocation).
- `IgnoreQueryFilters()` on login user lookup means a deactivated tenant's users can still authenticate (tenant-active check happens only at middleware level for cloud).

---

## WF-1.2 — Password Reset Workflow

1. **Request reset** — `POST /api/forgotpassword` (AuthenticationController.cs:41-46) → `ForgetPasswordCommandHandler` (POS.MediatR/User/Handlers/ForgetPasswordCommandHandler.cs:25-78)
   - Find User by Email → 404 if none.
   - Requires default **EmailSMTPSetting** (`IsDefault`) → 404 if missing (email must be configured).
   - `user.ResetPasswordCode = Base64(Guid.NewGuid())` (User modified).
   - Reads `wwwroot/reset-password-template.html`, injects `{HostUrl}/reset-password/{code}` as `##RESET_LINK##`.
   - Sends email via `IEmailRepository.SendEmail` (MailKit); logs **SendEmail** row.
2. **Resolve token** — `GET /api/resetpassword/{token}` → `GetResetPasswordInfoCommandHandler` (lines 21-31): finds User by `ResetPasswordCode == token`, returns UserDto (consumed by Angular `RecoverPasswordResolver` on route `reset-password/:link`).
3. **Perform reset** — `POST /api/recoverpassword/{token}` → `RecoverPasswordCommandHandler` (delegates) → `ResetPasswordCommandHandler` (lines 27-44):
   - `GeneratePasswordResetTokenAsync` + `ResetPasswordAsync` (Identity updates password hash).
   - Clears `ResetPasswordCode = null`.

**⚠ GAPS:**
- `ResetPasswordCommandHandler.cs:30` — `if (entity == null && entity.ResetPasswordCode != request.Token)` uses `&&` on a possibly-null entity (NRE risk) instead of `||`; token-mismatch cases fall through as "User not Found."
- Reset code has no expiry timestamp — a code remains valid indefinitely until used.
- Single default SMTP requirement makes password reset impossible until SMTP is configured.

---

## WF-1.3 — User Management Workflow (Add/Edit Users)

1. **Create user** — `POST /api/User` `[ClaimCheck("USR_ADD_USER")]` → `AddUserCommandHandler` (POS.MediatR/User/Handlers/AddUserCommandHandler.cs:62-158):
   1. Username uniqueness check → 409 on conflict.
   2. Map **User**; honor seeded Id/Normalized values; set audit fields; `IsSuperAdmin` flag; optional TenantId override (used by tenant registration to bind the new admin to the new tenant).
   3. `_userManager.CreateAsync(entity, password ?? "admin@123")` — creates User with Identity hash.
   4. For each RoleIds → `RoleManager.FindByIdAsync` → `AddToRoleAsync` (**UserRole** rows).
   5. Create **UserLocation** rows for selected locations.
   6. Save profile photo via file storage.
2. **Update user** — mirrors create with uniqueness guard excluding self; role diff add/remove; location diff.
3. **Change password / profile photo** — dedicated endpoints on `UserController` (`changepassword`, `UpdateUserProfilePhoto`).
4. **User claims** — `UpdateUserClaimCommandHandler` (POS.MediatR/User/Handlers/UpdateUserClaimCommandHandler.cs:35-52): diffs **UserClaim** rows for a user (add/remove by ClaimType).

**Location restriction behavior:** if a user has restricted `locationIds` (in JWT), every order-creation handler force-sets `SalesPersonId` to the logged-in user (anti-spoofing) — see WF-3.2 and WF-4.1.

---

## WF-1.4 — Role & Claim Management Workflow

1. **Create role** — `POST /api/Role` `[ClaimCheck("ROLES_ADD_ROLE")]` → `AddRoleCommandHandler` (POS.MediatR/Role/Handlers/AddRoleCommandHandler.cs:42-96):
   - Name uniqueness via `RoleExistsAsync` → 409.
   - Normalizes claim types (spaces → underscores).
   - Creates **Role** (TenantId, IsSuperRole) then `_roleManager.AddClaimAsync` per claim → **RoleClaim** rows.
2. **Update role** — `UpdateRoleCommandHandler` (UpdateRoleCommandHandler.cs:58-132):
   - Blocks Super-role edits.
   - Diffs **RoleClaims** add/remove.
   - On change → SignalR `OnUserPermissionChange` broadcast to every online user holding the role (forces front-ends to refresh claims).
3. **Update user-role membership** — `UpdateUserRoleCommandHandler` (lines 47-99): diffs **UserRole** rows; same SignalR broadcast.
4. **Menu-item permissions (RoleMenuItem)** — currently written only at seeding/cloning time (see WF-2.1). There is **no admin UI endpoint** to edit RoleMenuItem rows post-seeding.

### Full permission pipeline (the master chain)

```
Admin UI: assign RoleClaims + RoleMenuItems (+ per-user UserClaim exceptions)
   ↓
Login: UserRepository.GetUserAndRoleClaims merges all → JWT claims ("true") + menu tree (CanView/Create/Edit/Delete per item)
   ↓
Angular: AuthGuard gates routes (data.claimType); sidebar renders menu tree
   ↓
API: [ClaimCheck] re-decodes JWT per request → 403 if claim != "true"; [Authorize(Policy=SuperAdmin)] for isSuperAdmin
   ↓
Live changes: SignalR OnUserPermissionChange → clients refresh/re-auth
```

**⚠ GAP:** menu-level CRUD permissions (RoleMenuItem) are seed-time only; runtime editing of per-menu permissions is not exposed, so the menu tree's Can* flags are effectively static after provisioning.

---

## WF-1.5 — Company Profile / Settings Workflow

1. **Read** — `GET /api/CompanyProfile` `[AllowAnonymous]` → `GetCompanyProfileQueryHandler` (POS.MediatR/CompanyProfile/Handlers/GetCompanyProfileQueryHandler.cs:36-77):
   - 24h server cache `CompanyProfile_{tenantId}`.
   - Loads Locations + FinancialYears + Languages.
   - No profile → hardcoded default returned (bootstrap/setup mode).
   - Rewrites logo URL to a servable path.
2. **Update** — `POST /api/CompanyProfile` `[ClaimCheck("SETT_UPDATE_COM_PROFILE")]` → `UpdateCompanyProfileCommandHandler` (lines 73-159):
   1. Generate new logo filename if `ImageData` present.
   2. Update-or-create **CompanyProfile** (Title/Address/Phone/Email/CurrencyCode/TaxNumber/LogoUrl).
   3. Save; on ≤0 rows → 500.
   4. Delete old logo file; save new via `IFileStorageService` (tenant-scoped path `Tenants/{tenantId}/...`).
   5. Re-hydrate response with Languages/Locations/FinancialYears.
   6. Evict `CompanyProfile_{tenantId}` cache.
3. **License activation via profile** — `POST /api/CompanyProfile/activate_license` → `UpdateActivatedLicenseCommandHandler` (see WF-2.5).

---

## WF-1.6 — Session Lifecycle & Online Presence (SignalR)

1. Angular `signalr.service.ts` builds `HubConnection` to `{api}/userHub` with auto-reconnect backoff `[0, 2000, 10000, 30000]`; on (re)connect sends `Join` with user id.
2. `UserHub` (POS.Repository/Hub/UserHub.cs:10-98):
   - `Join` registers connectionId → userId in `IConnectionMappingRepository` (in-memory); broadcasts `newOnlineUser` + `onlineUsers`.
   - `SendNotification(userId)` routes to the specific connection.
   - `ForceLogout` / `OnUserPermissionChange` push forced logout / permission refresh.
   - `OnDisconnectedAsync` cleans up the connection map.
3. Login flow broadcasts `Joined(onlineUser)` (WF-1.1 step 2) — feeds the "online users" UI.

**⚠ GAP:** connection map is in-memory only — a server restart loses presence; multiple API instances would each see partial presence (no backplane like Redis).

---

## Workflow Interaction Map

```
        ┌──────────────┐  claims/menu   ┌──────────────────┐
        │ WF-1.1 Login ├───────────────►│ Angular session  │
        └──────┬───────┘                └───────┬──────────┘
               │ audit                          │ guards every route
               ▼                                ▼
        ┌──────────────┐                ┌──────────────────┐
        │ LoginAudit   │                │ WF-3/4/5 domain  │
        └──────────────┘                │   workflows      │
                                        └───────┬──────────┘
 WF-1.3/1.4 admin ops ──► RoleClaim/UserClaim/RoleMenuItem
          │                                    ▲
          └── SignalR permission change ───────┘ (refresh)
```

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| A-01 | Login | No refresh-token flow; 12h hard expiry disrupts POS shifts |
| A-02 | Password reset | No code expiry; null-check bug in ResetPasswordCommandHandler |
| A-03 | Permissions | RoleMenuItem not editable post-seeding (no admin UI) |
| A-04 | Presence | In-memory connection map (no Redis backplane, restart loss) |
| A-05 | Security | Password reset depends on SMTP being configured; no lockout/2FA |
| A-06 | Tenant check | Login user lookup bypasses tenant-active check |

*See document 11 for the consolidated, prioritized catalog.*
