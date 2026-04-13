# Performance Analysis & Optimization Plan - Phase 5

## Context
During the continuous monitoring of API performance using `ApiAndQueriesProfiler`, several new endpoints were identified as slow-running in the `SlowRunningApi.csv` log. This phase focuses on optimizing these endpoints by implementing Dapper-based query handlers, fixing existing Dapper implementations that fell back to EF Core due to PostgreSQL syntax compatibility issues, and resolving memory leaks caused by client-side data filtering.

## Slow APIs Identified
| API Endpoint | HTTP Method | Duration (ms) | Issue Identified |
|---|---|---|---|
| `/api/customer` | GET | 30,161 ms | The Dapper migration was failing due to PostgreSQL case-sensitive column name restrictions (missing double quotes around identifiers like `TenantId` and `IsDeleted`). It fell back to EF Core, which evaluated `LIMIT` clauses efficiently but mapping 10,000 items via AutoMapper was extremely slow. |
| `/api/salesOrder/recentshipment` | GET | 29,998 ms | Existing Dapper implementation fetched ALL records into memory (`.QueryAsync`) and then performed a `.Take(10)` in C# instead of applying a `LIMIT 10` in SQL. |
| `/api/purchaseOrder/recentdelivery` | GET | 15,036 ms | Similar to sales order recent shipments, the Dapper query lacked a `LIMIT 10` clause, loading the entire result set into application memory before filtering. |
| `/api/ProductStock/stock-alert` | GET | 1,035 ms | Used EF Core `AllIncluding` with multiple joins (Product, Unit, Location), causing heavy tracking overhead. |
| `/api/UnitConversations` | GET | 975 ms | Used EF Core `AllIncluding` to fetch and map unit hierarchies recursively. |

## Optimizations Implemented

### 1. `GetAllCustomerQueryHandler` (/api/customer)
- **Fix**: Updated the raw SQL string builder to wrap all column identifiers in double quotes (`"TenantId"`, `"IsDeleted"`, `"SalesPersonId"`, `"LocationId"`, etc.) to ensure compatibility with PostgreSQL. Also corrected the C# string escaping to properly use `@""` and `""` to prevent syntax build errors.
- **Result**: Prevents the query from throwing a "column does not exist" exception, stopping the fallback to the slow EF Core implementation and enabling the highly optimized Dapper `QueryMultipleAsync` pagination.

### 2. `GetSalesOrderRecentShipmentDateQueryHandler` (/api/salesOrder/recentshipment)
- **Fix**: Appended `LIMIT 10` directly to the SQL query. Wrapped all column identifiers in double quotes for PostgreSQL safety.
- **Result**: The database engine now correctly limits the result set to the top 10 recent shipments, reducing network payload and memory allocation drastically.

### 3. `GetPurchaseOrderRecentDeliveryScheduleQueryHandler` (/api/purchaseOrder/recentdelivery)
- **Fix**: Appended `LIMIT 10` directly to the SQL query. Wrapped all column identifiers in double quotes for PostgreSQL safety.
- **Result**: Reduces database CPU cycles, network latency, and memory footprint by discarding unused rows at the database level instead of in the application layer.

### 4. `GetProductStockAlertCommandHandler` (/api/ProductStock/stock-alert)
- **Fix**: Migrated from EF Core repository pattern to a Dapper-based handler. Corrected namespace missing errors (`POS.Data.Entities.ProductStock` and `POS.Data.Entities.Location`).
- **Implementation**: 
  - Constructed a raw SQL query with explicit `INNER JOIN` and `LEFT JOIN` on Products, Locations, and Units.
  - Handled data isolation using `LocationId = ANY(@LocationIds)`.
  - Implemented `QueryMultipleAsync` to execute the `COUNT(*)` query and the data query in a single round-trip.
  - Enforced correct C# verbatim string literals for properly escaped `""` identifiers in PostgreSQL.
- **Result**: Bypasses EF Core tracking, speeding up the dashboard stock alert load time significantly.

### 5. `GetAllUnitConversationCommandHandlers` (/api/UnitConversations)
- **Fix**: Migrated to Dapper.
- **Implementation**:
  - Replaced EF Core projection with a lightweight Dapper query featuring a self-join (`LEFT JOIN` on the same table) to resolve `ParentId` hierarchies and concatenate `BaseUnitName`.
- **Result**: Avoids N+1 query patterns and EF Core object instantiation overhead.

## Deployment Notes
- Verify that `Features:Dapper:GetProductStockAlertCommandHandler` and `Features:Dapper:GetAllUnitConversationCommandHandlers` are set to `true` in `appsettings.json` for production environments to enable the newly implemented Dapper handlers.
- The use of `ANY(@LocationIds)` combined with passing an array (`locationIds.ToArray()`) works safely in PostgreSQL Dapper execution, avoiding empty `IN ()` syntax errors.