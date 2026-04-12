# Phase 4: Performance Analysis & Optimization Plan (Master Data & Cache Leaks)

## 1. Executive Summary
This analysis targets the remaining performance bottlenecks identified in `SlowRunningApi.csv` and `EfQueryLogs.csv`. While previous Dapper migrations successfully stabilized dashboard widgets to sub-100ms, master data endpoints (`/api/Brands`, `/api/customer`, `/api/supplier`) are exhibiting latency ranging from 1.3 seconds to a massive **15.09 seconds**. 

A critical security vulnerability was also discovered during this analysis: The caching implementation for `/api/Brands` uses a static cache key (`"GetAllBrandCommand"`), which results in **Cross-Tenant Data Leaks**. The first tenant to request the brands caches their specific database view, and subsequent tenants receive the first tenant's data.

The optimization strategy focuses on resolving the cross-tenant cache leak, eliminating EF Core client-side evaluation, and migrating heavy master-data grids to Dapper to bypass Entity-to-DTO mapping overhead.

---

## 2. Detailed Analysis per API

### A. `/api/Brands` (GET)
- **Current Latency:** 15,098 ms
- **Root Cause:** 
  1. **Cross-Tenant Cache Leak:** `GetAllBrandCommand` implements `ICacheableQuery` with a hardcoded `CacheKey => "GetAllBrandCommand"`. It does not factor in the `TenantId`.
  2. **Client-Side Evaluation & Missing Pagination:** The EF Core projection uses `Path.Combine(_pathHelper.BrandImagePath, c.ImageUrl)` inside the `.Select()` clause. EF Core cannot translate `Path.Combine` to SQL, potentially forcing the entire `Brands` table into memory. Additionally, the endpoint lacks pagination, causing massive JSON payloads to be serialized and transferred over the network.
- **Impact:** Severe performance degradation and a critical data privacy violation.

### B. `/api/customer` & `/api/supplier` (GET)
- **Current Latency:** ~1,309 ms and ~1,408 ms
- **Database Time:** 17 ms total (14 ms for `COUNT(*)`, 3 ms for `LIMIT 100 OFFSET 0` as seen in `EfQueryLogs.csv`).
- **Root Cause:** The database queries are heavily optimized, but the application layer introduces ~1,300 ms of latency. This overhead is caused by EF Core entity materialization and the subsequent ASP.NET Core JSON serialization of the `CustomerList` and `SupplierList` objects. The client requests `pageSize=10000`, which is clamped to `100` by the server, but the structural overhead of mapping deep entity graphs to DTOs remains high.
- **Impact:** Sluggish UI data grid rendering.

### C. `/api/ProductStock/stock-alert` (GET)
- **Current Latency:** 717 ms
- **Database Time:** 70 ms
- **Root Cause:** The query executes a complex `INNER JOIN` between `ProductStocks` and `Products` to evaluate `CurrentStock <= AlertQuantity`. EF Core generates a sub-optimal execution plan. The remaining ~640 ms is lost in AutoMapper and list materialization overhead.
- **Impact:** Moderate latency affecting inventory management UX.

---

## 3. Recommended Optimization Strategies

| Priority | API | Strategy | Effort | Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Critical** | `/api/Brands` | **Fix Cross-Tenant Cache Leak & Add Dapper:** Inject `ITenantProvider` into `GetAllBrandCommand` to make the cache key tenant-specific. Migrate the handler to Dapper to avoid EF Core client-side evaluation of `Path.Combine`. | Low | High (Security) |
| **High** | `/api/customer` | **Dapper Migration for Data Grids:** Replace the EF Core `CustomerList` pagination logic with a highly optimized Dapper multi-query (`SELECT COUNT(*); SELECT ... LIMIT`). | Medium | Low |
| **High** | `/api/supplier` | **Dapper Migration for Data Grids:** Apply the same Dapper pagination pattern used for Customers to Suppliers. | Medium | Low |
| **Medium** | `/api/ProductStock` | **Dapper Migration:** Rewrite the stock alert query using raw SQL to force a better execution plan and eliminate AutoMapper overhead. | Low | Low |

---

## 4. Step-by-Step Implementation Roadmap

### Milestone 1: Resolve Cross-Tenant Cache Leaks (Immediate)
1. Update `GetAllBrandCommand.cs` to accept `TenantId` and append it to the `CacheKey` (e.g., `$"GetAllBrandCommand_{TenantId}"`).
2. Audit all other commands implementing `ICacheableQuery` to ensure `TenantId` or `UserId` is present in the cache key.

### Milestone 2: Dapper Migration for Master Data Grids (Sprint 1)
1. Use the `// MIGRATE-TO-DAPPER` snippet to scaffold Dapper implementations for `GetAllCustomerQueryHandler` and `GetAllSupplierQueryHandler`.
2. Implement Dapper `QueryMultipleAsync` to execute the `COUNT(*)` and the data retrieval in a single database round-trip, halving network latency to the DB server.
3. Feature flag the new handlers (`Features:Dapper:GetAllCustomerQueryHandler`).

### Milestone 3: Optimize Stock Alerts (Sprint 1)
1. Migrate `GetProductStockAlertCommandHandler` to Dapper.
2. Write an optimized raw SQL query that directly filters `ps.CurrentStock <= p.AlertQuantity` without unnecessary nested sub-queries.

---

## 5. Success Criteria
- **Security:** Zero cross-tenant data bleed in `/api/Brands`.
- **Performance:** 
  - `/api/Brands`: P95 response time drops below **200 ms**.
  - `/api/customer` & `/api/supplier`: P95 response time drops below **150 ms**.
  - `/api/ProductStock/stock-alert`: P95 response time drops below **100 ms**.

---

## 6. Rollback Plans
- **Cache Fix:** The cache key modification is a forward-only fix. If memory usage spikes due to per-tenant caching, the `AbsoluteExpiration` will be reduced from 15 minutes to 5 minutes via Hotfix.
- **Dapper Migrations:** All grid endpoints will use the established **Feature Flag Pattern**. 
  - **Trigger:** Error rates > 0.5% or missing data in UI grids.
  - **Action:** Toggle `"Features:Dapper:[HandlerName]": false` in `appsettings.json` to instantly revert to EF Core logic.

---

## 7. Load-Testing Scenarios
1. **Cache Leak Validation:** Send concurrent requests for `/api/Brands` using two different API keys belonging to different tenants. Assert that Tenant B does not receive Tenant A's brands.
2. **Pagination Throughput:** Execute 50 concurrent requests against `/api/customer?pageSize=100` and verify the API sustains > 500 req/sec without spiking CPU over 70%.

---

## 8. Monitoring Setup
1. **Cache Hit/Miss Ratios:** Enhance `CachingBehavior` to log Cache Hits vs. Cache Misses with `TenantId` tags to Grafana/Application Insights.
2. **Payload Size Tracking:** Add a middleware logger to track `Content-Length` of the response body for `/api/Brands` to ensure the lack of pagination isn't overwhelming the network interface.