# Seed Data Implementation Plan: Database-First Strategy

This plan addresses the issue of missing seed data files in the cloud environment by transitioning from a **File-Based Seeding Strategy** to a **Database-First Seeding Strategy**. This approach eliminates the dependency on physical files during runtime, ensuring robustness across all deployment environments (Cloud, Docker, Desktop).

## 1. Problem Analysis
*   **Root Cause**: The `TenantRegistrationService` relies on physical `.csv` files in a `SeedData` directory. In cloud/container deployments, these files are often not copied to the output directory or the path resolution logic fails.
*   **Current Failure**: When `Directory.Exists(_seedDataPath)` returns false, the seeding process silently skips or fails, resulting in empty tenants.
*   **Target Solution**: Store "Master Seed Data" in the database under a "System Tenant" (`Guid.Empty`) and clone this data when creating new tenants.

---

## 2. Implementation Steps

### Phase 1: Secure Data Availability (Embedded Resources)
Move the seed data into the application assembly to guarantee it is always present.

1.  **Embed CSV Files**:
    *   Modify the `POS.Repository.csproj` file to include all `.csv` files from `SourceCode\SeedData` as **Embedded Resources**.
    *   This compiles the data directly into the DLL, making it impossible to "miss" files during deployment.
    *   *Action*: Update `.csproj` to use `<EmbeddedResource Include="..\..\SeedData\**\*.csv" />`.

2.  **Resource Access Utility**:
    *   Create a helper method `GetEmbeddedCsvStream(string fileName)` in `POS.Common` or `POS.Repository`.
    *   This method reads the manifest resource stream from the assembly instead of `File.ReadAllText`.
    *   **Error Handling**: Throw a specific `FileNotFoundException` if the resource stream is null, ensuring missing data is detected immediately.

### Phase 2: Establish "System Tenant" (Database Initialization)
Create a mechanism to populate the database with the "Master Data" on application startup.

1.  **Create `SystemSeedingService`**:
    *   Implement a new service (e.g., `ISystemSeedingService`) that runs during the application startup (in `Program.cs` after database migration).
    *   **Logic**:
        *   Check if the "System Tenant" (`TenantId = Guid.Empty`) has data in key tables (e.g., `FinancialYears`, `Locations`).
        *   If data is missing, read the **Embedded CSV Resources**.
        *   Insert the data into the database with `TenantId = Guid.Empty`.
        *   Preserve the IDs from the CSVs (don't generate new ones) to maintain referential integrity within the System Tenant.

2.  **Startup Integration**:
    *   Register this service in the DI container.
    *   Invoke `InitializeSystemDataAsync()` in the HTTP request pipeline configuration phase.

### Phase 3: Refactor Tenant Registration (Clone Pattern)
Modify `TenantRegistrationService.cs` to copy data from the "System Tenant" instead of reading files.

1.  **Refactor `SeedTenantTableAsync`**:
    *   Rename to `CloneSystemDataAsync<T>`.
    *   **New Logic**:
        *   Query the database for entities of type `T` where `TenantId == Guid.Empty`. **Important**: Use `.IgnoreQueryFilters()` to access this data.
        *   Iterate through the fetched system entities.
        *   **Deep Clone**: Create new instances of `T` for the new tenant.
        *   **ID Regeneration**: Generate new `Guid`s for the new entities and map `SystemId -> NewTenantId` (using the existing `globalIdMap` pattern).
        *   **FK Fixup**: Update Foreign Keys to point to the newly created tenant entities (not the system entities).
        *   Insert the new entities with `TenantId = NewTenantId`.

2.  **Handle Specialized Logic**:
    *   **Products**: Update `SeedProductsAsync` to filter system products by `Code` prefix (e.g., Pharmacy/Petrol) before cloning.
    *   **Roles & MenuItems**: Update logic to look for `Guid.Empty` roles/items first (as currently partially implemented) and clone them.

### Phase 4: Refactor Export Functionality
Update `ExportTenantToSqliteCommandHandler.cs` to prevent data duplication.

1.  **Filter Logic Adjustment**:
    *   Currently, the export logic may include `TenantId == Guid.Empty` rows.
    *   **Issue**: If we clone `Guid.Empty` data to `NewTenantId`, the database will contain *both* copies.
    *   **Fix**: Modify the `CopyEntity` expression tree logic.
        *   For **Tenant-Specific Entities** (e.g., `Location`, `Product`): Export **ONLY** `TenantId == TargetTenantId`. Exclude `Guid.Empty`.
        *   For **Global Entities** (e.g., `Country`, `Language` inheriting `SharedBaseEntity`): Continue to export `TenantId == Guid.Empty` as these are not cloned.

### Phase 5: Verification & Testing

1.  **Deployment Verification Test**:
    *   Create a simple Health Check endpoint `/api/health/seed-data`.
    *   This endpoint queries the database: `_context.Locations.IgnoreQueryFilters().Any(x => x.TenantId == Guid.Empty)`.
    *   Returns `200 OK` if system data exists, `500 Error` if missing.

2.  **Logging Strategy**:
    *   Log a **Critical Error** if `SystemSeedingService` fails to find embedded resources.
    *   Log a **Warning** if `TenantRegistrationService` finds 0 rows for a specific table in the System Tenant (implying the new tenant will have that table empty).

---

## 3. Workflow Comparison

| Feature | Current Workflow (File-Based) | New Workflow (Database-First) |
| :--- | :--- | :--- |
| **Data Source** | Physical CSV files in `wwwroot` or `bin` | Embedded Resources in DLL |
| **Startup** | No action | `SystemSeedingService` populates `TenantId=Empty` rows |
| **Tenant Creation** | Reads CSV -> Inserts New Rows | Reads DB (`TenantId=Empty`) -> Clones -> Inserts New Rows |
| **Export** | Reads DB (`TenantId=Target`) | Reads DB (`TenantId=Target`), ignores `TenantId=Empty` for cloned tables |
| **Deployment** | Requires file copy scripts | **Zero config** (Data is inside the code) |
