# Phase 3: Performance Analysis and Optimization Plan

## 1. Executive Summary
The Phase 3 performance analysis of `SlowRunningApi.csv` reveals critical bottlenecks stemming primarily from **Entity Framework Core client-side evaluation**. Complex LINQ projections containing conditional logic (e.g., ternary operators inside `.Sum()`) are failing to translate into native SQL. This forces the application to load massive datasets (entire tables) into application memory to perform grouping and aggregation locally, causing severe latency spikes (up to **14+ seconds** on dashboard endpoints).

Furthermore, the telemetry data is being polluted by SignalR persistent connections (`/userHub`), which the profiler misinterprets as extremely slow HTTP requests.

This document outlines the root causes, quantified impacts, and a prioritized implementation roadmap to resolve these issues, adhering to the newly established Hybrid Data Access (Dapper) strategy.

---

## 2. Detailed Analysis per API

### A. `/api/dashboard/bestsellingproduct`
- **Current Latency:** Highly volatile, ranging from 291 ms to **14,069 ms** (14 seconds).
- **Root Cause:** The `GetBestSellingProductCommandHandler` contains a client-side evaluation trap:
  ```csharp
  .Sum(item => item.Status == PurchaseSaleItemStatusEnum.Return ? (-1) * item.Quantity : item.Quantity)
  ```
  EF Core cannot translate this C# ternary operator into a SQL `SUM(CASE WHEN...)` statement. Consequently, it executes a `SELECT *` on `SalesOrders`, `SalesOrderItems`, and `Products`, pulling thousands of records into RAM to compute the sums.
- **Impact:** Massive memory allocations, high CPU usage on the web server, and unacceptable latency.

### B. `/api/salesOrder/recentshipment` & `/api/purchaseOrder/recentdelivery`
- **Current Latency:** 600 ms – 950 ms.
- **Root Cause:** Identical to the best-selling product issue. `GetSalesOrderRecentShipmentDateQueryHandler` and `GetPurchaseOrderRecentDeliveryScheduleQueryHandler` use conditional `.Sum()` logic for calculating total quantities.
- **Impact:** Unnecessary data transfer and memory overhead. While less severe than the dashboard, it degrades application throughput under load.

### C. `/userHub` (SignalR)
- **Current Latency:** 3,928 ms to 15,278,501 ms (up to 4+ hours).
- **Root Cause:** SignalR uses long-polling, Server-Sent Events, or WebSockets to maintain persistent connections. The `ApiAndQueriesProfiler` middleware tracks the entire connection lifecycle as a single HTTP request duration.
- **Impact:** Telemetry noise. It skews average latency metrics and triggers false alarms.

### D. `/api/customer` & `/api/supplier`
- **Current Latency:** ~1,200 ms.
- **Root Cause:** Despite previous indexing and caching efforts, large payload serialization and lack of strict DTO projection (`.Select()`) at the database level cause slow response times for large tenant datasets.
- **Impact:** Sluggish UI rendering for data grids.

---

## 3. Recommended Optimization Strategies

| Priority | Strategy | Description | Effort | Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Critical** | **Dapper Migration for Aggregates** | Migrate `GetBestSellingProductCommandHandler` to Dapper. Use raw SQL with `SUM(CASE WHEN...)` to push the aggregation entirely to the database engine. | Medium | Low |
| **High** | **Dapper Migration for Recent Widgets** | Migrate `GetSalesOrderRecentShipmentDateQueryHandler` and `GetPurchaseOrderRecentDeliveryScheduleQueryHandler` to Dapper to eliminate client-side evaluation. | Medium | Low |
| **High** | **Profiler Middleware Filtering** | Update `ProfilerMiddleware` to exclude paths containing `/userHub` or requests with WebSocket upgrade headers. | Low | None |
| **Medium** | **Strict DTO Projections** | Refactor `Customer` and `Supplier` queries to project directly to DTOs using `.Select()` before `.ToListAsync()`, minimizing tracked entities. | Medium | Low |

---

## 4. Step-by-Step Implementation Roadmap

### Milestone 1: Telemetry Correction (Day 1)
1. Modify `ApiAndQueriesProfiler/ProfilerMiddleware.cs`.
2. Add an exclusion rule: `if (context.Request.Path.StartsWithSegments("/userHub")) { await _next(context); return; }`.
3. Deploy and verify that new SignalR connections are no longer logged in `api_request_logs`.

### Milestone 2: Dapper Migration for Dashboard Widgets (Day 2)
1. Use the `// MIGRATE-TO-DAPPER` snippet to scaffold Dapper implementations for:
   - `GetBestSellingProductCommandHandler.cs`
   - `GetSalesOrderRecentShipmentDateQueryHandler.cs`
   - `GetPurchaseOrderRecentDeliveryScheduleQueryHandler.cs`
2. Write ANSI SQL compatible with PostgreSQL, SQL Server, and SQLite (e.g., `SUM(CASE WHEN Status = 1 THEN -Quantity ELSE Quantity END)`).
3. Inject the `ISqlConnectionAccessor` and dynamically resolve table names using `_sqlAccessor.GetTableName<T>()`.
4. Wrap the new logic in `appsettings.json` feature flags.

### Milestone 3: Master Data Projection Optimization (Day 3)
1. Review the EF Core queries in the `Customer` and `Supplier` handlers.
2. Ensure queries use `.AsNoTracking()` and strict `.Select()` projections.
3. Validate pagination limits (ensure `pageSize=10000` is restricted or handled efficiently).

---

## 5. Success Criteria
- **Dashboard Widgets (`bestsellingproduct`, `recentshipment`, `recentdelivery`):** P95 response time drops below **100 ms**.
- **Master Data (`customer`, `supplier`):** P95 response time drops below **300 ms**.
- **Telemetry Accuracy:** `userHub` records cease to appear in the slow API logs.
- **Memory Allocation:** Zero client-side evaluation warnings in the EF Core logs.

---

## 6. Rollback Plans
All Dapper migrations will strictly adhere to the established **Feature Flag Pattern**.
- **Trigger:** If error rates exceed 0.5% or latency regresses by >10%.
- **Action:** Update the corresponding feature flag in `appsettings.json` (e.g., `"Features:Dapper:GetBestSellingProductCommandHandler": false`) to instantly route traffic back to the legacy EF Core repository logic without requiring a code deployment or application restart.

---

## 7. Load-Testing Scenarios
Using a tool like k6 or JMeter, execute the following scenarios against a containerized staging environment:
1. **Concurrency Test:** 100 concurrent users hitting `/api/dashboard/bestsellingproduct` for 5 minutes. Verify no thread-pool starvation or `DbContext` concurrency exceptions.
2. **Data Volume Test:** Seed 50,000 `SalesOrderItems` for a single tenant and verify the endpoint responds in < 100 ms.
3. **Multi-Tenant Leak Test:** Execute queries simultaneously for `Tenant A` and `Tenant B` to ensure raw Dapper SQL correctly filters `TenantId` and no cross-contamination occurs.

---

## 8. Monitoring Setup
1. **EF Core Warnings:** Configure `appsettings.json` to throw exceptions on client-side evaluation during development:
   ```json
   "Logging": {
     "LogLevel": {
       "Microsoft.EntityFrameworkCore.Query": "Warning"
     }
   }
   ```
2. **Custom Dashboards:** Build a Grafana/Kibana dashboard reading directly from the `apirequestlogs` table to visualize P50, P90, and P99 latency percentiles for the optimized endpoints.
3. **Alerting:** Set up an alert (via email or Slack webhook) if any `GET` request excluding reports exceeds 1,500 ms in the production environment.