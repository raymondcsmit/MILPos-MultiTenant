# Cross-Database Dapper Strategy Implementation (SqlKata)

## Context
Following the analysis of the Dapper multi-database compatibility issues, we selected **Mechanism 3: SqlKata (Query Builder Library)** to resolve all SQL dialect incompatibilities across SQLite, SQL Server, and PostgreSQL.

## What Was Implemented

### 1. Dependency Injection setup
- Added `SqlKata` NuGet package to `POS.MediatR` and `POS.API`.
- Updated `Startup.cs` to inject the correct `SqlKata.Compilers.Compiler` based on the active `DatabaseProvider`:
  - `PostgreSql` -> `PostgresCompiler`
  - `SqlServer` -> `SqlServerCompiler`
  - `Sqlite` -> `SqliteCompiler`

### 2. Refactored Handlers
The following handlers were completely rewritten to use `SqlKata`'s `Query` builder instead of raw SQL strings:

1. **`GetAllCustomerQueryHandler`**
   - Eliminated the `connection.GetType().Name` switch for `LIMIT/OFFSET`.
   - Used `query.WhereRaw(@"LOWER(""CustomerName"") LIKE ?", ...)` which `SqlKata` safely compiles and binds for all dialects.

2. **`GetSalesOrderRecentShipmentDateQueryHandler` & `GetPurchaseOrderRecentDeliveryScheduleQueryHandler`**
   - Replaced complex raw SQL strings with `SqlKata` fluent syntax (`Select`, `Join`, `Where`, `GroupBy`, `HavingRaw`, `Limit`).
   - Replaced the PostgreSQL specific array binding `ANY(@LocationIds)` with SqlKata's `WhereIn("LocationId", locationIds)`, which translates natively to SQL Server and SQLite parameter arrays.

3. **`GetAllSupplierQueryHandler`**
   - Refactored the dynamic search string builder into SqlKata's `Where` and `OrWhereRaw` conditions.
   - Used `Clone().AsCount()` to easily generate the total count query without manually parsing string components.

4. **`GetAllUnitConversationCommandHandlers`**
   - Removed the raw SQL string concatenation (`||`) that was crashing on SQL Server.
   - Re-architected the query to return `ParentName` and `ParentCode` separately via `SqlKata`, and combined them dynamically in C# (`$"{u.ParentName}({u.ParentCode})"`) to guarantee 100% database agnosticism.

5. **`GetAllBrandCommandHandler`**
   - Replaced basic raw SQL with a simple SqlKata query to enforce identifier quoting across dialects.

## Benefits Achieved
- **Zero Raw SQL String Building**: We no longer manually concatenate `WHERE` clauses or use `StringBuilder` to build SQL dynamically.
- **Open-Closed Principle Restored**: The ugly `switch` statements checking the provider name (`providerName == "SqlConnection" ? ... : ...`) are gone.
- **Automatic Parameter Binding**: `SqlKata` safely translates C# values (like `bool`) to the database's expected format (`1/0` for SQL Server, `true/false` for Postgres) automatically.
- **Future-Proof**: Adding support for a new database engine (e.g., MySQL or Oracle) simply requires injecting a different SqlKata compiler in `Startup.cs` without changing any business logic in the handlers.