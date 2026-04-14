# Performance Analysis & Optimization Plan - Phase 6

## Context
Analysis of the `SlowRequests.csv` log revealed several dashboard and listing APIs exhibiting extremely poor performance, with execution times ranging from 22,000ms to 29,000ms. 

While Dapper migrations were previously enabled for many of these endpoints, they silently failed and fell back to EF Core. The root causes of these failures were:
1. **Unquoted Identifiers**: EF Core creates tables in PostgreSQL with quoted, case-sensitive columns (e.g., `"TenantId"`). Dapper queries using unquoted `TenantId` throw syntax errors in PostgreSQL, triggering the EF Core fallback.
2. **Database-Specific Syntax**: The Dapper queries used PostgreSQL-specific array operations (`ANY(@LocationIds)`) and date extractions (`date_part`), which break multi-database compatibility.

This phase implements a robust, cross-database Dapper strategy supporting **SQLite, SQL Server, and PostgreSQL**.

## Target Endpoints & Performance Baselines
1. `/api/dashboard/bestsellingproduct` - 22,571 ms
2. `/api/dashboard/income-comparison` - 29,324 ms
3. `/api/dashboard/sales-comparison` - 29,582 ms
4. `/api/dashboard/statistics` - 22,225 ms
5. `/api/dashboard/product-sales-comparison` - 28,727 ms (EF Core only)
6. `/api/supplier` - 27,994 ms

## Implementation Plan

### 1. Cross-Database Identifiers
- **Strategy**: Wrap all column names in double quotes (`""TenantId""`) using C# verbatim string literals (`$@""`).
- **Why**: Double quotes are the ANSI SQL standard for escaping identifiers. They work natively in PostgreSQL (enforcing case-sensitivity), SQLite, and SQL Server (since `QUOTED_IDENTIFIER` is ON by default in ADO.NET).

### 2. Dynamic Pagination (LIMIT / OFFSET)
- **Strategy**: SQL Server does not support the `LIMIT` keyword. We will read the connection type (`connection.GetType().Name`) to inject the correct pagination syntax dynamically.
- **Implementation**:
  - `NpgsqlConnection` (PostgreSQL) & `SqliteConnection` (SQLite): `LIMIT @PageSize OFFSET @Skip`
  - `SqlConnection` (SQL Server): `OFFSET @Skip ROWS FETCH NEXT @PageSize ROWS ONLY`

### 3. Dynamic Date Extraction & Grouping
- **Strategy**: Instead of pulling all records into memory to group them by month/year (which defeats the purpose of Dapper), or using database-specific functions, we will dynamically build the grouping function based on the connection type.
- **Implementation**:
  - `NpgsqlConnection`: `EXTRACT(MONTH FROM ""SOCreatedDate"")`
  - `SqlConnection`: `MONTH(""SOCreatedDate"")`
  - `SqliteConnection`: `CAST(strftime('%m', ""SOCreatedDate"") AS INTEGER)`

### 4. Dapper Array Expansion (`IN` Clauses)
- **Strategy**: Replace all instances of `ANY(@LocationIds)` with `IN @LocationIds`.
- **Why**: Dapper natively handles expanding `IN @LocationIds` to `IN (@p1, @p2)` across all ADO.NET providers, making it fully cross-database compatible, whereas `ANY()` is exclusive to PostgreSQL.

### 5. `GetProductSalesComparisonQueryHandler` Migration
- **Strategy**: This handler currently relies entirely on heavy EF Core joins and `.Take()` logic. It will be completely rewritten using a highly optimized Dapper `QueryMultipleAsync` execution that pulls aggregated sales quantities and revenues directly from the database for both the current year and the previous year in a single round-trip.