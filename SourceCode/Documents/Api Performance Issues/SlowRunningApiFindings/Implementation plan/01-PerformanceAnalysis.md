# API Performance Analysis Report

## 1. Executive Summary
This document details the performance investigation of the 10 slowest API endpoints identified by the `ApiAndQueriesProfiler` add-on. The analysis uncovers root causes ranging from inefficient Entity Framework Core (EF Core) LINQ queries (N+1, cartesian explosions, missing indexes) to missing caching mechanisms. The API endpoints analyzed span across Dashboard Statistics, Notifications, Sales Orders, and Purchase Orders. The goal is to provide deep insights into these bottlenecks to drive the optimization strategy.

## 2. Methodology
The `ApiAndQueriesProfiler` logged HTTP requests with durations exceeding acceptable thresholds (> 500ms). Each identified endpoint was mapped to its respective MediatR Handler and the underlying EF Core query was analyzed for execution plan inefficiencies, memory consumption, and network latency.

## 3. Technical Deep-Dive: Identified Bottlenecks

### 3.1. Dashboard Statistics
**Endpoints:** `/api/dashboard/statistics`, `/api/dashboard/income-comparison`, `/api/dashboard/sales-comparison`, `/api/dashboard/bestsellingproduct`, `/api/dashboard/product-sales-comparison`
**Handlers:** `GetDashbordAccountQueryCommandHandler`, `GetIncomeComparisonQueryHandler`, `GetSalesComparisonQueryHandler`, `GetBestSellingProductCommandHandler`, `GetProductSalesComparisonQueryHandler`

**Bottlenecks:**
1. **Client-Side Evaluation & In-Memory Processing:** In `GetDashbordAccountQueryCommandHandler`, the query fetches raw transaction records via `.ToListAsync()` before performing `.Where` and `.Sum` aggregations in memory. This transfers massive amounts of data from the database to the application server.
2. **N+1 Queries in Loops:** In `GetIncomeComparisonQueryHandler` and `GetSalesComparisonQueryHandler`, queries to get monthly sums are executed individually in a loop (or sequentially via multiple await calls), leading to excessive database roundtrips.
3. **Inefficient Grouping:** Grouping and summing are performed without leveraging database indexes effectively, forcing full table scans on `TransactionDate`, `SOCreatedDate`, and `POCreatedDate`.
4. **Missing AsNoTracking:** Read-only queries in some handlers are missing `.AsNoTracking()`, causing unnecessary overhead in the EF Core change tracker.

### 3.2. Notification Count & Top 10
**Endpoints:** `/api/notification/count`, `/api/notification/top10`
**Handlers:** `GetUserNotificationCountQueryHandler`, `GetTop10ReminderNotificationQueryHandler`

**Bottlenecks:**
1. **Missing Indexes:** Queries heavily filter on `IsRead`, `IsActive`, and `UserId`. Without a composite index on these columns, the database performs full table or index scans for every request.
2. **Frequency of Calls:** These endpoints are likely polled frequently by the client application (e.g., SignalR or timers), amplifying the impact of the missing index and causing database CPU spikes.

### 3.3. Sales Order & Purchase Order Recent Activity
**Endpoints:** `/api/salesOrder/recentshipment`, `/api/purchaseOrder/recentdelivery`
**Handlers:** `GetSalesOrderRecentShipmentDateQueryHandler`, `GetPurchaseOrderRecentDeliveryScheduleQueryHandler`

**Bottlenecks:**
1. **Cartesian Explosion:** The use of `.AllIncluding(c => c.Customer, cs => cs.SalesOrderItems)` without `.AsSplitQuery()` generates a massive Cartesian product, returning redundant customer and order data for every single order item.
2. **Complex Server-Side Filtering:** The condition `d.SalesOrderItems.Sum(...) > 0` within the `.Where` clause forces EF Core to either generate extremely complex SQL subqueries or, worse, evaluate the condition on the client side after fetching all data.
3. **Sorting on Unindexed Columns:** Ordering by `DeliveryDate` without a supporting index causes expensive sort operations in the database memory.

## 4. Infrastructure Constraints & Benchmarking Data
- **Average Slow Duration:** 1200ms - 1900ms.
- **Database Overhead:** The lack of indexes and cartesian explosions are causing high CPU and Memory usage on the database server.
- **Network Overhead:** Transferring thousands of raw records for in-memory aggregation is saturating the network bandwidth between the API and the Database.

## 5. Risk Assessment
- **High Risk:** If left unoptimized, the dashboard queries will degrade exponentially as the data volume grows, potentially causing database timeouts and application crashes.
- **Medium Risk:** The notification polling without indexes causes unnecessary sustained load on the database.

## 6. Post-Implementation Monitoring
After implementing the optimizations, the `ApiAndQueriesProfiler` will be used to benchmark the new execution times against the baseline data provided in `SlowRunningApi.csv` to ensure all endpoints perform consistently under 200ms.
