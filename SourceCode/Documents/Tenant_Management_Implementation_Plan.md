# Tenant Management Implementation Plan

## Goal Description
Implement a comprehensive Tenant Management system accessible exclusively to Super Admin users. This system will allow the Super Admin to oversee all tenants, manage their subscription status, control access, and provide direct support through tenant impersonation.

## User Review Required
> [!IMPORTANT]
> **Security Critical:** The "Switch Tenant" feature generates a new authentication token for the target tenant. This must be strictly guarded by `IsSuperAdmin` checks.
> **Impact:** Shutting down a tenant will immediately revoke access for all users within that tenant.

## Requirements Analysis
1.  **Listing**: Display all tenants in a grid.
2.  **Creation**: Allow Super Admin to add new tenants.
3.  **License Management**: Upgrade/Downgrade licenses (e.g., Trial to Full) to remove restrictions.
4.  **Status Management**: Shutdown (deactivate) tenants to block login access.
5.  **Impersonation**: "Switch" to any tenant's context to view their data and perform support actions.
6.  **Access Control**: All features restricted to Super Admin only.

## Proposed Changes

### Backend Implementation

#### [MODIFY] [TenantsController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/TenantsController.cs)
- **Attribute**: Apply `[Authorize(Policy = "SuperAdminOnly")]` to the entire controller or specific actions.
- **Endpoints**:
    - `GET /api/tenants`: Returns a list of all tenants with details (Name, Host, License, Status).
    - `POST /api/tenants`: Creates a new tenant.
    - `PUT /api/tenants/{id}`: Updates basic tenant info.
    - `PUT /api/tenants/{id}/status`: Toggles `IsActive` (Shutdown/Activate).
    - `PUT /api/tenants/{id}/license`: Updates `LicenseType` (e.g., Trial, Pro, Enterprise).
    - `POST /api/tenants/{id}/switch`: Generates a JWT for the current Super Admin but scoped to the target `TenantId`.
    - `POST /api/tenants/{id}/license/generate`: Generates a new License Key and Purchase Code, updates the target Tenant's `CompanyProfile`, and marks it for synchronization.

#### [MODIFY] [TenantsController.cs] (Logic Detail)
- **Generate License**:
  1. Generate unique `LicenseKey` and `PurchaseCode`.
  2. Connect to the target Tenant's database context.
  3. Update or Insert the `CompanyProfile` record.
  4. Ensure `ModifiedDate` is updated to trigger the Sync Engine's dirty check.

#### [CHECK] [SyncEngine.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Sync/SyncEngine.cs)
- Verify `CompanyProfile` is included in the list of synced entities.
- If not, register it in the Sync Configuration to ensure the Desktop/SQLite client receives the new license info.

#### [MODIFY] [Tenant.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Entities/Tenant/Tenant.cs)
- Verify existence of `IsActive`, `LicenseType`, and `TrialExpiryDate` properties. Add if missing.

### Frontend Implementation

#### [NEW] [TenantModule](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/tenant/tenant.module.ts)
- Create a lazy-loaded module `TenantModule` with routing.

#### [NEW] [TenantListComponent](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/tenant/tenant-list/tenant-list.component.ts)
- **Route**: `/tenants`
- **UI**: detailed Data Grid.
- **Columns**: ID, Name, Database Name, License Type, Status (Active/Inactive), Actions.
- **Actions**:
    - **Edit**: Open Modal.
    - **Toggle Status**: Button to Shutdown/Activate.
    - **Upgrade License**: Button/Menu to set license type.
    - **Generate Keys**: Button to generate/refresh License Key & Purchase Code.
    - **Switch Tenant**: Button to impersonate.

#### [NEW] [TenantAddUpdateComponent](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/tenant/tenant-add-update/tenant-add-update.component.ts)
- Dialog/Page for creating or editing a tenant.
- Fields: Name, Subdomain/Host, Admin Email, Password (for creation).

#### [MODIFY] [header.component.html](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/core/header/header.component.html)
- Add a "Tenants" button (icon: `domain` or `business`).
- **Condition**: Visible only if `currentUser.isSuperAdmin` is true.

#### [NEW] [TenantService](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Angular/src/app/tenant/tenant.service.ts)
- Methods to consume the new API endpoints.
- `switchTenant(tenantId)`: Handles the API call and updates the local storage token/user info effectively reloading the app context.

## Verification Plan

### Manual Verification Steps
1.  **Access Control**:
    - Login as a regular user. Verify "Tenants" button is missing and `/tenants` route is inaccessible.
    - Login as Super Admin. Verify button and route access.
2.  **CRUD**:
    - Create a new tenant.
    - Check database for new record.
3.  **Status**:
    - "Shutdown" a tenant.
    - Attempt to login as a user of that tenant. Expect failure.
    - "Activate" the tenant.
    - Verify login works.
4.  **License**:
    - Change license from "Trial" to "Full".
    - Verify restrictions (e.g., transaction limits) are lifted for that tenant.
5.  **Switching**:
    - Click "Switch Tenant" for a target tenant.
    - Verify the dashboard reloads and displays data for the *target* tenant.
    - Verify a "Switch Back" option (optional, or just logout/login) or visual indicator of impersonation.
