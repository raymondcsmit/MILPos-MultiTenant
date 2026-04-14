# Implementation Plan: Export Tenant Data to SQLite

## Overview
This document outlines the plan to implement a feature allowing Super Admins to export a specific Tenant's data into a SQLite database. This SQLite database will be used by the Desktop Application (Offline Mode) and must contain all relevant tenant data, including synchronization logs and metadata, as well as all global configuration data.

## 1. API Design

### New Endpoint
- **Controller**: `TenantsController`
- **Method**: `POST`
- **Route**: `api/Tenants/{id}/export-sqlite`
- **Authorization**: Super Admin (Policy: `TenantsManage` or similar)
- **Input**: `Guid id` (TenantId)
- **Output**: `FileResult` (Downloadable .zip file containing the .db)

### Request Flow
1. Client sends `POST` request with `TenantId`.
2. API validates permissions.
3. API dispatches `ExportTenantToSqliteCommand` via MediatR.
4. Handler generates the SQLite file.
5. API returns the file stream for download.

## 2. Application Layer (MediatR)

### Command
- **Name**: `ExportTenantToSqliteCommand`
- **Properties**: `Guid TenantId`
- **Response**: `ExportTenantToSqliteCommandResponse` (contains File Stream or File Path, and Content Type)

### Handler
- **Name**: `ExportTenantToSqliteCommandHandler`
- **Dependencies**: 
  - `POSDbContext` (Source - SQL Server)
  - `IWebHostEnvironment` (For temp file storage)
  - `IMapper` (If needed)

## 3. Implementation Logic

### Step 1: Initialization & Transaction
- **Timestamp**: Capture `DateTime.UtcNow` at the very start. This will be used for `SyncMetadata` timestamp.
- **Transaction**: Begin a Transaction with `IsolationLevel.Snapshot` on the **Source Context** to ensure data consistency throughout the export.
- **Temp File**: Generate a unique filename: `tenant_{TenantId}_{Timestamp}.db` in a temp directory.
- **SQLite Context**: Initialize `destinationContext` with the temp file connection string and `EnsureCreated()`.

### Step 2: Data Migration (Bulk Insert)
- **Disable FKs**: Execute `PRAGMA foreign_keys = OFF;` on SQLite context to allow flexible insertion order.
- **Change Tracking**: Disable AutoDetectChanges on Destination. Use `AsNoTracking()` on Source.
- **Batching**: Process data in chunks (e.g., 1000 records) to manage memory.
  - `ChangeTracker.Clear()` after every batch save.

#### Data Categories (Same as below)
- **Global Data**: Export all Lookups, Permissions, Global Menu Items.
- **Tenant Data**: Export all Tenant-specific entities.
- **Sync Data**: 
  - Insert `SyncLogs` (filtered).
  - Initialize `SyncMetadata` using the **Start Timestamp**.

### Step 3: Finalization & Compression
- **Re-enable FKs**: Execute `PRAGMA foreign_keys = ON;` (Optional: Check integrity).
- **Optimize**: Run `VACUUM;` command on SQLite.
- **Close Connection**: Dispose contexts.
- **Compression**: Zip the `.db` file to reduces transfer size.
- **Cleanup**: Delete the `.db` file after zipping, and the `.zip` file after download (or via background job).

## 4. Detailed Data Mapping Strategy

### Entities to Export List

#### 1. Global Entities (All Records)
- `Country`
- `City`
- `Currency`
- `Language`
- `Page`
- `Action`
- `MenuItem` (Where `TenantId == null`)

#### 2. Tenant Entities (Filtered by TenantId)
- `Tenant` (The selected one)
- `User`
- `Role`
- `UserRole`
- `UserClaim`
- `RoleClaim`
- `UserLogin`
- `UserToken`
- `RoleMenuItem` (Where `Role.TenantId` == selected Tenant)
- `MenuItem` (Where `TenantId` == selected Tenant)
- `Customer`
- `Supplier`
- `Product`
- `ProductCategory`
- `Brand`
- `UnitConversation`
- `Tax`
- `Location`
- `ExpenseCategory`
- `Expense`
- `CompanyProfile`
- `SalesOrder`
- `SalesOrderItem`
- `PurchaseOrder`
- `PurchaseOrderItem`
- `InventoryBatch`
- `StockTransfer`
- `StockAdjustment`
- `AccountingEntry`
- `Transaction`
- `EmailTemplate`
- `ContactAddress`
- `UserLocation`
- `TableSetting`
- `DamagedStock`
- `LedgerAccount`
- `PaymentEntry`
- `FinancialYear`
- `Payroll`
- `CustomerLedger`
- `LoanDetail`
- `LoanRepayment`
- `DailyProductPrice`

### Handling Identity Columns
- SQLite allows inserting values into `Identity` columns.
- Ensure to preserve original `Id`s (Primary Keys) to maintain referential integrity.

## 5. Technical Challenges & Solutions

### Challenge: Dynamic Context Creation
**Solution**:
```csharp
var optionsBuilder = new DbContextOptionsBuilder<POSDbContext>();
optionsBuilder.UseSqlite($"Data Source={tempFilePath}");
using var destinationContext = new POSDbContext(optionsBuilder.Options, new SingleTenantProvider());
destinationContext.Database.EnsureCreated();
```

### Challenge: Memory Usage for Large Tenants
**Solution**:
- Process tables sequentially.
- For large tables (e.g., `SalesOrderItems`), use pagination or chunking if necessary (though likely not needed for initial implementation unless tenants are huge).
- Use `AsNoTracking()`.

### Challenge: Foreign Key Constraints during Insert
**Solution**:
- **Disable FKs**: `PRAGMA foreign_keys = OFF;` allows inserting tables in any order, removing the need for complex dependency trees.
- Re-enable and check integrity after insertion.
  ```sql
  PRAGMA foreign_keys = OFF;
  ```
  (Then re-enable after).

## 6. Verification Plan
1. **Unit Test**: Mock `POSDbContext` and verify command handler logic.
2. **Integration Test**:
   - Create a dummy tenant with data in SQL Server.
   - Trigger Export.
   - Open generated `.db` file using `DB Browser for SQLite`.
   - Verify row counts match.
   - Verify `TenantId` is correct for all records.
   - Verify **Global Data** exists (Countries, Cities, etc.).
   - Verify `SyncLogs` and `SyncMetadata` are present.
3. **Desktop App Test**: Load the `.db` file in the Desktop Application and ensure it starts up and shows data.

## 7. Next Steps
1. Create `ExportTenantToSqliteCommand` and Handler in `POS.MediatR`.
2. Implement the `TenantsController` endpoint.
3. Test with a sample tenant.
