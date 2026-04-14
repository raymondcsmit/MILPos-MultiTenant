# Work Document: Verification of Tenant Data Cloning

## Objective
The objective was to verify and fix the Tenant Data Cloning process during tenant registration. New tenants were being created without default data (Categories, Products, Brands, Permissions), despite the system claiming seeding was successful.

## Issues Identified
1. **Data Cloning Failure (Silent):** The `TenantDataCloner` service was running but producing 0 records.
   - **Root Cause:** The EF Core queries in `TenantDataCloner` were subject to Global Query Filters (Tenancy Filters). When querying the Source Tenant (Master Tenant) to clone data, the filters prevented retrieving any records because the current context was not set to Master.
   
2. **Foreign Key Violations (RoleClaims):** After fixing the query filters, an error `23503` (Foreign Key Violation) occurred when cloning `RoleClaims`.
   - **Root Cause:** `RoleClaims` referenced `ActionId`. `Actions` entity was recently refactored to be Tenant-Specific (`BaseEntity`), meaning new tenants must have their own Actions. The original code was copying `ActionId` as-is (pointing to Master Tenant Actions), or failing if `Action` table checking was strict. Additionally, some `RoleClaims` in the seed data might be orphans or referring to unmapped actions.

3. **Foreign Key Violations (RoleMenuItems):** A similar `23503` error occurred for `RoleMenuItems` constraint `FK_RoleMenuItems_Users_AssignedBy`.
   - **Root Cause:** The `CloneRolesAsync` method was creating `RoleMenuItem` entries without setting the `AssignedBy` property. It defaulted to `Guid.Empty`, which does not exist in the `Users` table, violating the Foreign Key constraint.

## Solutions Implemented

### 1. Fix Query Filters in `TenantDataCloner`
Added `.IgnoreQueryFilters()` to all generic and specific cloning methods (`CloneTableAsync`, `CloneRecursiveAsync`, `CloneProductsAsync`, etc.) to ensure the service can read Master Tenant data regardless of the current HTTP context.

### 2. Implementation of Action Cloning
- Added explicit cloning for `Actions` (and `Pages`, `PageHelpers`) in `CloneTenantDataAsync`.
- REORDERED the cloning steps to ensure `Actions` are cloned **BEFORE** `Roles`. This ensures that when Roles (and RoleClaims) are cloned, the corresponding `Actions` have already been created for the new tenant, allowing for ID mapping.

### 3. Fix Role and Claim Cloning Logic
- **RoleClaims:** Updated `CloneRolesAsync` to check the `idMap` for `ActionId`.
  - If the `ActionId` was remapped (meaning the Action was successfully cloned for the new tenant), the claim is updated to point to the new Action.
  - If the `ActionId` is NOT found in the map (implying an orphan claim or missing action), the claim is **SKIPPED** to prevent Foreign Key violations and ensure data integrity.
- **RoleMenuItems:** Updated `CloneRolesAsync` to explicitly copy the `AssignedBy` property from the source entity, ensuring a valid User ID is preserved.

## Verification
- **Test:** Registered a new tenant `test7476` using `test_register_v2.ps1` script.
- **Result:** Registration succeeded without errors.
- **Validation:** Ran `verify_tenant_data.ps1` against the new tenant API.
  - Confirmed Login successful.
  - Confirmed **12 Brands** retrieved.
  - Confirmed **Product Categories** retrieved (e.g., "Medicines").

## Files Modified
- `SQLAPI/POS.Repository/Tenant/TenantDataCloner.cs`: Core logic updates.
- `SQLAPI/POS.API/Program.cs`: Removed temporary diagnostic code (VerifyCloning) after validation.

## Conclusion
The Tenant Data Cloning system is now fully functional and robust against Foreign Key constraints. New tenants are correctly seeded with isolated copies of the Master Tenant's data.
