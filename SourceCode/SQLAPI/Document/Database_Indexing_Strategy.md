# Database Indexing Strategy & Implementation Plan

## Overview
This document outlines the detailed plan for optimizing database performance through strategic indexing, with a specific focus on Multi-Tenancy (`TenantId`) and Offline-Sync capabilities.

Since the application uses a **Shared Database, Multi-Tenant** architecture (where all tenants share tables), almost every query includes a `WHERE TenantId = '...'` clause. Without proper indexing on `TenantId` combined with other columns, performance will degrade significantly as data volume grows.

## 1. Global Indexing Policy

### A. BaseEntity Descendants (Tenant Data)
All entities inheriting from `BaseEntity` **MUST** have an index on `TenantId`.

**Strategy**:
1.  **Baseline Index**: Non-unique, non-clustered index on `TenantId`.
    *   *Why*: Ensures basic filtering speed for "Get All for Tenant" queries.
2.  **Composite Indexes**: For frequent search/sort fields, creating composite indexes starting with `TenantId` is far more efficient than separate indexes.
    *   *Pattern*: `(TenantId, [SearchColumn])`
    *   *Example*: `(TenantId, Email)` is better than just `(Email)` because it narrows down to the tenant first.

### B. SharedBaseEntity Descendants (Global Data)
Entities inheriting from `SharedBaseEntity` (e.g., `Country`, `City`, `Language`) do not have `TenantId`.
*   **Strategy**: Standard indexing on `Name`, `Code`, or `Id` as required.

---

## 2. Detailed Indexing Plan by Module

### 2.1. Authentication & Users (Identity)

| Entity | Index Columns | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **User** | `TenantId`, `Email` | **Unique** | Prevent duplicate emails within a tenant (if email is tenant-scoped) or globally. |
| **User** | `TenantId`, `UserName` | **Unique** | Fast login lookup per tenant. |
| **User** | `TenantId`, `PhoneNumber` | Non-Unique | Search users by phone. |
| **Role** | `TenantId`, `Name` | **Unique** | Prevent duplicate role names in a tenant. |
| **UserClaim** | `UserId`, `ClaimType` | Non-Unique | Fast claim lookup. |

### 2.2. Master Data (Products & Inventory)

| Entity | Index Columns | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Product** | `TenantId`, `Name` | Non-Unique | Product search by name (AutoComplete). |
| **Product** | `TenantId`, `Code` | **Unique** | **Critical**: Ensure SKUs/Barcodes are unique *per tenant*. |
| **Product** | `TenantId`, `Barcode` | Non-Unique | Fast barcode scanning lookup. |
| **Product** | `TenantId`, `CategoryId` | Non-Unique | Filter products by category. |
| **ProductCategory**| `TenantId`, `Name` | Non-Unique | Category list sorting/searching. |
| **Brand** | `TenantId`, `Name` | Non-Unique | Brand lookup. |
| **Unit** | `TenantId`, `Name` | Non-Unique | Unit lookup. |
| **ProductStock** | `TenantId`, `ProductId`, `LocationId` | **Unique** | Ensure only one stock record per product per location. |

### 2.3. Sales & Purchasing (Transactions)

| Entity | Index Columns | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **SalesOrder** | `TenantId`, `OrderNumber` | **Unique** | Lookup order by number. |
| **SalesOrder** | `TenantId`, `OrderDate` | Non-Unique | Reporting: "Get sales for this month". |
| **SalesOrder** | `TenantId`, `CustomerId` | Non-Unique | "View Customer History". |
| **SalesOrder** | `TenantId`, `Status` | Non-Unique | "View Pending Orders". |
| **SalesOrderItem** | `SalesOrderId` | Non-Unique | **Critical**: Loading items for an order (FK). |
| **PurchaseOrder**| `TenantId`, `OrderNumber` | **Unique** | Lookup PO by number. |
| **PurchaseOrder**| `TenantId`, `Date` | Non-Unique | Reporting. |
| **PurchaseOrder**| `TenantId`, `SupplierId` | Non-Unique | "View Supplier History". |

### 2.4. CRM (Customers & Suppliers)

| Entity | Index Columns | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Customer** | `TenantId`, `Email` | **Unique** | Avoid duplicate customers. |
| **Customer** | `TenantId`, `MobileNo` | **Unique** | Avoid duplicate customers. |
| **Customer** | `TenantId`, `Name` | Non-Unique | Customer search. |
| **Supplier** | `TenantId`, `Email` | Non-Unique | Supplier lookup. |
| **Supplier** | `TenantId`, `MobileNo` | Non-Unique | Supplier lookup. |

### 2.5. Financials

| Entity | Index Columns | Type | Purpose |
| :--- | :--- | :--- | :--- |
| **Expense** | `TenantId`, `ExpenseDate` | Non-Unique | Expense reports. |
| **Expense** | `TenantId`, `ExpenseCategoryId`| Non-Unique | Filter by category. |
| **Transaction** | `TenantId`, `TransactionDate` | Non-Unique | Financial reporting (Ledgers). |

---

## 3. Implementation Steps

### Step 1: Define Indexes in `OnModelCreating`
Modify `POSDbContext.cs` to apply these indexes using the Fluent API.

**Code Example:**
```csharp
protected override void OnModelCreating(ModelBuilder builder)
{
    base.OnModelCreating(builder);

    // --- Product Indexes ---
    builder.Entity<Product>()
        .HasIndex(p => new { p.TenantId, p.Name })
        .HasDatabaseName("IX_Product_Tenant_Name");

    builder.Entity<Product>()
        .HasIndex(p => new { p.TenantId, p.Code })
        .IsUnique()
        .HasDatabaseName("IX_Product_Tenant_Code");

    // --- SalesOrder Indexes ---
    builder.Entity<SalesOrder>()
        .HasIndex(s => new { s.TenantId, s.OrderNumber })
        .IsUnique()
        .HasDatabaseName("IX_SalesOrder_Tenant_Number");

    builder.Entity<SalesOrder>()
        .HasIndex(s => new { s.TenantId, s.OrderDate })
        .HasDatabaseName("IX_SalesOrder_Tenant_Date");

    // --- Customer Indexes ---
    builder.Entity<Customer>()
        .HasIndex(c => new { c.TenantId, c.MobileNo })
        .IsUnique()
        .HasDatabaseName("IX_Customer_Tenant_Mobile");
    
    // ... Apply for all entities listed in Section 2
}
```

### Step 2: Global "TenantId" Index Automation (Optional but Recommended)
Instead of manually adding `HasIndex(e => e.TenantId)` for every entity, we can automate it for all `BaseEntity` types.

```csharp
foreach (var entityType in builder.Model.GetEntityTypes())
{
    if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
    {
        // Add a basic index on TenantId if one doesn't exist starting with TenantId
        // Note: This needs careful implementation to not conflict with composite indexes manually defined.
        // A safer approach is to define them manually for key entities and rely on FK indexes for others.
    }
}
```
*Recommendation*: Stick to manual definition for critical tables to control naming and composition.

### Step 3: Migration
1.  Run `Add-Migration AddTenantIndexes`.
2.  Review the generated migration file to ensure `CREATE INDEX` statements are correct.
3.  Run `Update-Database`.

## 4. SQLite Considerations (Offline Mode)
The same indexes will be created in the SQLite database during the `EnsureCreated()` or migration process.
*   **Performance**: SQLite benefits greatly from these indexes, especially for search operations on mobile/desktop devices.
*   **File Size**: Indexes increase the `.db` file size. This is acceptable for the performance gain.

## 5. Maintenance
*   **Periodic Review**: Use SQL Server Query Store or Performance Dashboard to identify missing indexes based on actual usage.
*   **Fragment**: Indexes may fragment over time; setup a maintenance plan to Rebuild/Reorganize indexes weekly.
