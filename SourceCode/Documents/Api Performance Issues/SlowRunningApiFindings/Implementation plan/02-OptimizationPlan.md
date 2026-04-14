# Performance Optimization Implementation Plan

## 1. Executive Summary
This document outlines the strategic implementation plan to resolve the performance bottlenecks identified in the `SlowRunningApi.csv` and detailed in the `01-PerformanceAnalysis.md` document. The plan provides actionable steps, code-level strategies, database optimizations, and a phased rollout timeline to ensure minimal disruption to the existing POS system.

## 2. Optimization Strategies

### 2.1. Database Indexing Strategy
**Objective:** Eliminate full table scans and reduce index scan latency for heavily queried tables.
**Action Items:**
1. **Transactions Table:** Add a composite index on `(TransactionDate, TransactionType, BranchId)` to optimize `GetDashbordAccountQueryCommandHandler`.
2. **SalesOrder & PurchaseOrder Tables:** Add indexes on `(SOCreatedDate, LocationId, IsSalesOrderRequest)` and `(POCreatedDate, LocationId, IsPurchaseOrderRequest)`. Add indexes on `DeliveryDate` and `DeliveryStatus`.
3. **ReminderScheduler (Notifications) Table:** Add a highly selective composite index on `(UserId, IsRead, IsActive)` to optimize the polling queries `GetUserNotificationCountQueryHandler` and `GetTop10ReminderNotificationQueryHandler`.
4. **SalesOrderItem & PurchaseOrderItem Tables:** Add indexes on `ProductId` and `Status` to support the best-selling products aggregations.

### 2.2. Code-Level Query Optimization Strategy
**Objective:** Push data aggregation to the database server (SQL Server/PostgreSQL/SQLite) instead of the web server (In-Memory).
**Action Items:**
1. **Refactor In-Memory Aggregation:** Update `GetDashbordAccountQueryCommandHandler` to use `.GroupBy()` and `.Select(new { ... Sum() })` *before* calling `.ToListAsync()`.
2. **Implement `.AsNoTracking()`:** Add `.AsNoTracking()` to all dashboard, notification, and recent activity queries since the entities are strictly read-only.
3. **Resolve Cartesian Explosions:** Introduce `.AsSplitQuery()` in `GetSalesOrderRecentShipmentDateQueryHandler` and `GetPurchaseOrderRecentDeliveryScheduleQueryHandler` where multiple collections (`Customer`, `SalesOrderItems`) are included.
4. **Simplify Subqueries:** Optimize the `.Where(d => d.SalesOrderItems.Sum(...) > 0)` clause in recent activity handlers to avoid complex SQL evaluation.

### 2.3. Caching Strategy
**Objective:** Reduce database roundtrips for relatively static dashboard data.
**Action Items:**
1. Implement `IMemoryCache` or Redis (via MediatR Pipeline Behaviors) for `GetBestSellingProductCommand`, `GetProductSalesComparisonQuery`, `GetIncomeComparisonQuery`, and `GetSalesComparisonQuery`.
2. Cache duration: 5-15 minutes (configurable), with cache invalidation triggers on new sales/purchases if required.

## 3. Prioritized Action Items & Estimated Effort

| Phase | Task | Handler/Component | Estimated Effort | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Database Indexing** | EF Core Migrations (Transactions, Orders, Reminders) | 4 Hours | **Critical** |
| **Phase 1** | **Query Refactoring (In-Memory Aggs)** | `GetDashbordAccountQueryCommandHandler` | 2 Hours | **Critical** |
| **Phase 2** | **Query Refactoring (Cartesian & NoTracking)** | `GetSalesOrderRecentShipmentDateQueryHandler`, `GetPurchaseOrderRecentDeliveryScheduleQueryHandler` | 3 Hours | **High** |
| **Phase 2** | **Query Refactoring (Comparison Loops)** | `GetIncomeComparisonQueryHandler`, `GetSalesComparisonQueryHandler` | 4 Hours | **High** |
| **Phase 3** | **Caching Implementation** | Dashboard Handlers & `CachingBehavior` | 6 Hours | **Medium** |

## 4. Resource Allocation
- **Senior Backend Developer:** 1 (Assigned to Query Refactoring & EF Core Migrations).
- **Database Administrator (DBA) / Reviewer:** 1 (Assigned to review generated SQL Migration scripts before deployment).
- **QA Engineer:** 1 (Assigned to verify data accuracy post-optimization).

## 5. Testing Procedures & Success Metrics
1. **Data Accuracy Testing:** Ensure the financial sums and counts returned by the optimized dashboard handlers exactly match the results from the unoptimized (legacy) handlers. Use the existing test suite `08_Reports_Dashboard_Tests.md`.
2. **Performance Profiling:** Utilize the `ApiAndQueriesProfiler` to capture the new `DurationMs` for the targeted endpoints.
3. **Success Metrics:**
   - 100% data accuracy maintained.
   - All targeted endpoints execute in **< 200ms** (a 80-90% reduction from the baseline 1100-1900ms).
   - Database CPU utilization during dashboard load drops by at least 50%.

## 6. Phased Rollout Timeline
- **Day 1:** Execute Phase 1 (Database Indexes & In-Memory Aggregation Fixes). Deploy to Staging and verify performance gains.
- **Day 2:** Execute Phase 2 (Cartesian Explosion Fixes & Loop Optimizations). Deploy to Staging.
- **Day 3:** Execute Phase 3 (Caching Implementation). Complete QA regression testing.
- **Day 4:** Production Deployment during off-peak hours.
- **Day 5:** Post-Implementation Monitoring via `ApiAndQueriesProfiler` telemetry logs.

## 7. Post-Implementation Monitoring Requirements
- Monitor the `ApiRequestLogs` table daily for the first week post-deployment.
- Set up an alert if any of the targeted paths (e.g., `/api/dashboard/statistics`) exceed 500ms.
- Monitor database storage size to ensure the new indexes do not cause unexpected bloat.
