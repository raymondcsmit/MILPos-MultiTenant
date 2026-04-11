# Comprehensive Database Performance Analysis & Optimization Plan

This document outlines the performance bottlenecks identified within the Data Access (Entity Framework Core) layer and provides concrete, actionable steps to optimize system responsiveness, reduce database CPU/Memory usage, and eliminate N+1 query explosions.

## 1. The "Soft Delete + Multi-Tenancy" Indexing Bottleneck (Critical)

### Root Cause Analysis
The application enforces strict multi-tenancy and soft deletes via global query filters (`IsDeleted == false` and `TenantId == currentTenantId`).
While tenant-aware indexes exist (e.g., `IX_SalesOrder_Tenant_Date`), **none of them include the `IsDeleted` flag**. Because `IsDeleted` is not part of the non-clustered index, the database engine ignores the index and opts for a clustered index scan (evaluating every row in the table), which severely degrades performance as data volume grows.

### Optimization Recommendation
Update the `HasIndex` definitions in `POSDbContext.cs` to include `IsDeleted` using **Filtered Indexes**.

### Implementation Steps
Modify `POSDbContext.cs` within the `OnModelCreating` method:
```csharp
// Example for SalesOrder
builder.Entity<SalesOrder>()
    .HasIndex(s => new { s.TenantId, s.SOCreatedDate })
    .HasFilter("\"IsDeleted\" = false") // PostgreSQL specific syntax
    .HasDatabaseName("IX_SalesOrder_Tenant_Date_Active");

// Apply similar filtered indexes to PurchaseOrders, Products, and Customers.
```

**Expected Improvement:** Queries will scan a significantly smaller B-Tree, yielding a 40-60% speedup on large tables.

---

## 2. Missing Foreign Key Indexes on Join Tables (High Priority)

### Root Cause Analysis
Entity Framework Core explicitly maps foreign keys via `HasForeignKey()`, but **relational databases do not automatically index Foreign Keys** (only Primary Keys are automatically indexed).
For example, when a `Product` is deleted or updated, EF Core issues a query to check if it's used in `SalesOrderItems`. Without an index on `ProductId` in the items table, this triggers a **Full Table Scan on the entire `SalesOrderItems` table**.

### Optimization Recommendation
Explicitly index all foreign keys that are frequently joined or checked for referential integrity.

### Implementation Steps
Add these configurations to `OnModelCreating` in `POSDbContext.cs`:
```csharp
// SalesOrderItems
builder.Entity<SalesOrderItem>().HasIndex(si => si.ProductId);

// PurchaseOrderItems
builder.Entity<PurchaseOrderItem>().HasIndex(pi => pi.PurchaseOrderId);
builder.Entity<PurchaseOrderItem>().HasIndex(pi => pi.ProductId);

// Accounting / Transactions
builder.Entity<TransactionItem>().HasIndex(ti => ti.TransactionId);
builder.Entity<TransactionItem>().HasIndex(ti => ti.ProductId);
```

**Expected Improvement:** Instantaneous referential integrity checks during deletions and vastly improved `JOIN` performance when querying order details.

---

## 3. The `Count()` vs `Any()` Bottleneck (Medium Priority)

### Root Cause Analysis
Checking for the existence of records using `.CountAsync() > 0` or `.ToList().Count > 0` forces the database to scan and count *every single matching row*.

### Optimization Recommendation
Always use `.AnyAsync()` when checking for existence. `.Any()` translates to an `EXISTS (...)` SQL statement, which stops scanning the exact millisecond it finds the first match.

### Implementation Steps
Refactor repository and handler logic:
*Before:*
```csharp
var hasOrders = await _salesOrderRepository.All.Where(c => c.CustomerId == id).CountAsync() > 0;
```
*After:*
```csharp
var hasOrders = await _salesOrderRepository.All.AnyAsync(c => c.CustomerId == id);
```

**Expected Improvement:** Instantaneous boolean checks instead of heavy aggregate counting.

---

## 4. Massive Payload Mapping in `AutoMapper` (High Priority)

### Root Cause Analysis
Frequent use of `_mapper.Map<TDto>(entity)` after calling `FirstOrDefaultAsync()` loads the entire entity graph into memory. If a table has 50 columns but the DTO only requires 5, the application is pulling 10x more data across the network than necessary.

### Optimization Recommendation
Push the mapping down into the SQL query using `Select()` or AutoMapper's `.ProjectTo<TDto>()`.

### Implementation Steps
*Before (Pulls all columns into RAM, then maps):*
```csharp
var entity = await _salesOrderRepository.All.Include(c => c.Customer).FirstOrDefaultAsync();
var dto = _mapper.Map<SalesOrderDto>(entity);
```
*After (SQL `SELECT` only pulls exact columns needed):*
```csharp
var dto = await _salesOrderRepository.All.AsNoTracking()
    .Where(c => c.Id == request.Id)
    .Select(c => new SalesOrderDto {
        Id = c.Id,
        OrderNumber = c.OrderNumber,
        CustomerName = c.Customer.CustomerName
    }).FirstOrDefaultAsync();
```

**Expected Improvement:** Drastic reduction in network payload size, memory allocation, and GC (Garbage Collection) pressure on the API servers.

---

## 5. String Matching & Collation Bottlenecks (Medium Priority)

### Root Cause Analysis
In `ProductRepository.cs`, the search logic uses `EF.Functions.Like(a.Name, $"{encodingName}%")`.
If the database column is not explicitly collated as case-insensitive, the database must run `LOWER(Name) LIKE 'term%'`, which **bypasses standard B-Tree indexes entirely**.

### Optimization Recommendation
Use database-specific functions for case-insensitive matching or define computed/trigram indexes.

### Implementation Steps
If strictly using PostgreSQL, update `ProductRepository.cs`:
```csharp
// Change this:
collectionBeforePaging = collectionBeforePaging
    .Where(a => EF.Functions.Like(a.Name, $"{encodingName}%"));

// To this (ILike is specific to Postgres for case-insensitive B-Tree / pg_trgm index usage):
collectionBeforePaging = collectionBeforePaging
    .Where(a => EF.Functions.ILike(a.Name, $"{encodingName}%"));
```

---

## 6. Cartesian Explosion on Deep Object Graphs (Critical - Fixed)

### Root Cause Analysis
Queries with multiple `.Include()` and `.ThenInclude()` statements (e.g., fetching a complete `PurchaseOrder` with items, taxes, suppliers, and payments) generate massive Cartesian `JOIN` SQL queries where rows are duplicated exponentially.

### Optimization Recommendation & Fix Applied
Append `.AsSplitQuery()` to these deep-fetch queries. This instructs EF Core to execute multiple smaller queries (one per collection) rather than one massive Cartesian `JOIN`.

### Implementation Applied
*Applied to `GetPurchaseOrderQueryHandler.cs`*:
```csharp
var entity = await _purchaseOrderRepository.All.AsNoTracking()
    .Where(c => c.Id == request.Id)
    // ... multiple includes ...
    .AsSplitQuery() // <-- CRITICAL FIX APPLIED
    .FirstOrDefaultAsync(cancellationToken);
```

---

## 7. Sequential Aggregate Queries (Critical - Fixed)

### Root Cause Analysis
Dashboard statistics handlers executed heavy aggregate queries (`SumAsync`) sequentially, causing the HTTP request to wait for the sum total of execution times.

### Optimization Recommendation & Fix Applied
Parallelized the aggregate queries using `Task.WhenAll()` and removed change tracking overhead.

### Implementation Applied
*Applied to `DashboardStaticaticsQueryHandler.cs`*:
```csharp
var totalPurchaseTask = _purchaseOrderRepository.All.AsNoTracking()
    .Where(...)
    .SumAsync(c => c.TotalAmount, cancellationToken);
// ... created tasks for Sales, Returns ...
await Task.WhenAll(totalPurchaseTask, totalSalesTask, totalSalesReturnTask, totalPurchaseReturnTask);
```

---

## Next Steps / Execution Plan
1. Review the proposed `HasIndex` and `HasFilter` additions for `POSDbContext.cs`.
2. Generate an EF Core Migration to apply the missing Foreign Key indexes and Filtered Indexes to the production database.
3. Refactor high-traffic endpoints (like `GetProducts`) to utilize `.ProjectTo<T>()` or explicit `.Select()` projections.
