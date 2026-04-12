# Income Comparison API Performance Analysis

## 1. Issue Overview
The `/api/dashboard/income-comparison` endpoint is experiencing severe latency, recording response times upwards of **14,817ms** (14.8 seconds) as per the latest profiling data. 

## 2. Root Cause Analysis
The performance bottleneck originates in `GetIncomeComparisonQueryHandler.cs`. The handler executes the following LINQ query pattern for both Sales and Purchases:

```csharp
var currentYearSales = await _salesOrderRepository.All.AsNoTracking()
    .Where(c => c.SOCreatedDate.Year == currentYear && locationIds.Contains(c.LocationId) && !c.IsSalesOrderRequest)
    .GroupBy(c => c.SOCreatedDate.Month)
    .Select(g => new { Month = g.Key, Total = g.Sum(c => c.TotalAmount) })
    .ToDictionaryAsync(x => x.Month, x => x.Total, cancellationToken);
```

**The exact problem:** 
Entity Framework Core struggles to translate `SOCreatedDate.Month` and `SOCreatedDate.Year` into native SQL for certain database providers (like SQLite). When it fails to translate these date-part extractions, EF Core silently triggers **client-side evaluation**. 

This means it executes a `SELECT * FROM SalesOrders WHERE LocationId IN (...)` pulling **the entire table** into the web server's RAM. It then groups by month and sums the totals in C#. For a POS system with thousands of orders, this causes massive network I/O, RAM spikes, and 14+ second execution times.

## 3. Proposed Solution

### 3.1. Code Refactoring (Avoid Date Part Grouping)
Instead of relying on EF Core to translate `.Month` and `.Year` dynamically, we should pre-calculate the start and end dates for the entire year in C#, query the raw filtered records (just the Date and TotalAmount), and aggregate them safely in memory. Because we only `Select` two columns, the memory footprint is minimal.

**Refactored Query Strategy:**
```csharp
// 1. Define boundaries
var currentYearStart = new DateTime(currentYear, 1, 1);
var currentYearEnd = new DateTime(currentYear, 12, 31, 23, 59, 59);

// 2. Fetch ONLY the required columns from DB
var rawSales = await _salesOrderRepository.All.AsNoTracking()
    .Where(c => c.SOCreatedDate >= currentYearStart && c.SOCreatedDate <= currentYearEnd 
             && locationIds.Contains(c.LocationId) && !c.IsSalesOrderRequest)
    .Select(c => new { c.SOCreatedDate, c.TotalAmount })
    .ToListAsync(cancellationToken);

// 3. Group safely in memory (Fast because dataset is just 2 columns)
var currentYearSales = rawSales
    .GroupBy(c => c.SOCreatedDate.Month)
    .ToDictionary(g => g.Key, g => g.Sum(c => c.TotalAmount));
```

### 3.2. Database Indexing
While the composite indexes added in Phase 1 (`IX_SalesOrder_Date_Location_IsRequest`) are correct, they cannot be utilized by the database engine if the query uses `.Year == currentYear` (this makes the index non-sargable). By switching the LINQ query to use `>= currentYearStart` and `<= currentYearEnd`, the SQL engine will finally be able to perform a rapid **Index Seek** instead of a Full Table Scan.

### 3.3. Caching
Ensure that the `GetIncomeComparisonQuery` implements `ICacheableQuery` so the result is cached for 15 minutes, meaning this heavy calculation only happens once periodically.

## 4. Expected Outcome
By switching to range-based filtering (`>=` and `<=`) and fetching only 2 columns for in-memory grouping, the database will utilize the `IX_SalesOrder_Date_Location_IsRequest` index. The response time will drop from ~14,000ms to **< 100ms**.
