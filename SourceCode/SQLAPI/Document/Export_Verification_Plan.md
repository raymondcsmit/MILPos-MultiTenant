# Verification Plan: Export Tenant to SQLite (Global Data Handling)

## 1. Objective
Verify that the `ExportTenantToSqliteCommandHandler.cs` correctly identifies, filters, and exports "Global Data" (shared across tenants) along with strict "Tenant Data" (isolated to a specific tenant) to the offline SQLite database.

## 2. Analysis of Current Implementation
Based on code review of `ExportTenantToSqliteCommandHandler.cs` and entity definitions:

### 2.1 Logic Flows
The exporter uses a prioritized strategy to determine what to export:
1.  **Tenant Entity**: Explicitly exports the `Tenant` record itself.
2.  **Multi-Tenant Entities** (Entities with `TenantId` property):
    -   Exports records where `TenantId == CurrentTenantId`.
    -   **Crucially**, it also exports records where `TenantId == NULL` or `TenantId == Guid.Empty`.
    -   *Result:* "Mixed" entities (like `MenuItem` which has nullable `TenantId`) will basically export both the Tenant's specific items AND Common/Global items.
3.  **Dependent Entities** (`HasParentWithTenantId`):
    -   Exports records if the parent belongs to the Tenant (or is Global).
4.  **Shared Entities** (`SharedBaseEntity`):
    -   If an entity inherits from `SharedBaseEntity` and does *not* have a `TenantId` property (or fell through earlier checks), it exports **ALL** records.
    -   *Examples:* `City`, `Country`, `Currency`, `Language`.
5.  **User/Role Dependent Entities**:
    -   Exports records linked to Users/Roles that are associated with the Tenant (including the "Global" Admin or System roles/users if mapped).
    -   *Examples:* `RoleClaim` (exports claims for Tenant Roles + Global Roles).

### 2.2 Entity Specifics
-   **Actions (`POS.Data.Action`):** Inherit `BaseEntity`. They are Tenant-Specific. Currently, the system seeds Actions per tenant. The export will correctly include only the tenant's actions.
-   **Global Lookups (`City`, `Country`):** Inherit `SharedBaseEntity`. They are fully exported.
-   **Lookups (`Brand`, `ProductCategory`):** Inherit `BaseEntity` (Tenant Specific). They are exported only for the tenant.

## 3. Verification Steps

### 3.1 Automated/Manual Test Case
To validate the logic without relying solely on code review, perform the following test:

**Phase 1: Setup Data**
1.  Ensure you have a **Global/Shared** `MenuItem` (TenantId is NULL).
2.  Ensure you have a **Tenant-Specific** `MenuItem` (TenantId = Target Tenant).
3.  Ensure you have a **Global** `Country` (e.g., "Pakistan").
4.  Ensure you have a **Tenant-Specific** `Product` (e.g., "Test Product").

**Phase 2: Execute Export**
1.  Trigger the `ExportTenantToSqliteCommand` for the Target Tenant.
    -   *API Hook:* Usually triggered via the "Download Offline DB" feature in the Admin Panel.

**Phase 3: Inspect Output**
1.  Download/Extract the generated `.zip` file.
2.  Open `POSDb.db` using a SQLite browser (e.g., *DB Browser for SQLite*).
3.  **Run SQL Queries on SQLite DB:**

```sql
-- Check Global Lookups
SELECT COUNT(*) FROM Country; 
-- Expect: > 0 (All countries)

-- Check Mixed Entity (Global + Tenant)
SELECT * FROM MenuItem;
-- Expect: 
-- 1. Rows where TenantId IS NULL (Global Items)
-- 2. Rows where TenantId = 'YOUR_TENANT_ID' (Tenant Items)
-- 3. Ensure NO items from OTHER tenants exist.

-- Check Tenant Entity
SELECT COUNT(*) FROM Product;
-- Expect: Only products for your tenant.

-- Check Role Claims
SELECT * FROM RoleClaim;
-- Expect: Claims associated with your tenant's roles.
```

## 4. Conclusion & Advice
The current implementation **ALIGNS** with the requirement to store Global Data.
-   **Global Data** defined as `SharedBaseEntity` is fully included.
-   **Mixed Data** defined as entities with Nullable `TenantId` includes the Global (Null) subset.

**Recommendation:**
No code changes are required for the logic. The logic correctly handles the "Hybrid" data model (partially shared, partially isolated) used by the application.
