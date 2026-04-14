# Cross-Database Dapper Strategy
**Supporting PostgreSQL, SQL Server, and SQLite**

## The Problem
While migrating slow-running API endpoints to Dapper, the raw SQL queries were predominantly written with PostgreSQL in mind. This introduces several critical compatibility issues when the application runs on SQLite or SQL Server:

1. **Quoted Identifiers**: The queries use `""ColumnName""`. While PostgreSQL requires double quotes for case-sensitivity, SQL Server prefers `[ColumnName]` (though it supports `""` if `QUOTED_IDENTIFIER` is ON), and SQLite supports `""`, `[]`, or ``` `` ```.
2. **Boolean Literals**: PostgreSQL supports `true`/`false` in raw SQL (e.g., `IsDeleted = false`). SQL Server does **not**; it requires `1`/`0`.
3. **Pagination Syntax**: PostgreSQL and SQLite use `LIMIT X OFFSET Y`. SQL Server uses `OFFSET Y ROWS FETCH NEXT X ROWS ONLY`.
4. **Date Functions**: Extracting parts of a date uses `EXTRACT(MONTH FROM Date)` in PostgreSQL, `MONTH(Date)` in SQL Server, and `strftime('%m', Date)` in SQLite.
5. **String Concatenation**: PostgreSQL and SQLite use `||`, whereas SQL Server uses `+` or `CONCAT()`.
6. **Case-Insensitive Search**: PostgreSQL uses `ILIKE` or `LOWER(Col) LIKE LOWER(Val)`. SQL Server `LIKE` is generally case-insensitive by default depending on collation.

Relying on `connection.GetType().Name` `switch` statements inside MediatR handlers (as currently implemented for pagination and dates) violates the **Open-Closed Principle**, clutters the business logic, and becomes unmaintainable as queries grow.

---

## Proposed Mechanisms

To achieve true multi-database support with Dapper, we need to abstract the SQL generation. Here are three viable mechanisms, ordered from simplest to most robust.

### Mechanism 1: The `ISqlDialect` Provider (Recommended for current architecture)
Extract all database-specific syntax into an injected interface (`ISqlDialect`). The implementation is resolved at runtime based on the active `DatabaseProvider` configuration.

**1. Create the Abstraction:**
```csharp
public interface ISqlDialect
{
    string QuoteIdentifier(string identifier);
    string GetLimitOffset(int limit, int offset);
    string GetMonthExtraction(string columnName);
    string GetBooleanLiteral(bool value);
    string StringConcatenate(params string[] columns);
}
```

**2. Create Implementations:**
```csharp
// PostgreSQL
public class PostgresDialect : ISqlDialect
{
    public string QuoteIdentifier(string identifier) => $@"""{identifier}""";
    public string GetLimitOffset(int limit, int offset) => $"LIMIT {limit} OFFSET {offset}";
    public string GetMonthExtraction(string columnName) => $"EXTRACT(MONTH FROM {QuoteIdentifier(columnName)})";
    public string GetBooleanLiteral(bool value) => value ? "true" : "false";
    public string StringConcatenate(params string[] columns) => string.Join(" || ", columns);
}

// SQL Server
public class SqlServerDialect : ISqlDialect
{
    public string QuoteIdentifier(string identifier) => $"[{identifier}]";
    public string GetLimitOffset(int limit, int offset) => $"OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY";
    public string GetMonthExtraction(string columnName) => $"MONTH({QuoteIdentifier(columnName)})";
    public string GetBooleanLiteral(bool value) => value ? "1" : "0";
    public string StringConcatenate(params string[] columns) => string.Join(" + ", columns);
}
```

**3. Usage in MediatR Handlers:**
Instead of hardcoding `false` or `LIMIT`, you inject `ISqlDialect` and use it:
```csharp
var limitClause = _sqlDialect.GetLimitOffset(request.PageSize, request.Skip);
var isDeletedFalse = _sqlDialect.GetBooleanLiteral(false);

var sql = $@"
    SELECT {_sqlDialect.QuoteIdentifier("Id")}, {_sqlDialect.QuoteIdentifier("Name")}
    FROM {tableName}
    WHERE {_sqlDialect.QuoteIdentifier("IsDeleted")} = {isDeletedFalse}
    ORDER BY {_sqlDialect.QuoteIdentifier("Name")}
    {limitClause}";
```

---

### Mechanism 2: Abstract Query Repositories (For complex, highly divergent queries)
When queries differ significantly (e.g., using CTEs, Window Functions, or complex Joins that vary heavily between dialects), a simple `ISqlDialect` isn't enough.

Instead of writing SQL in the MediatR handler, move the Dapper execution entirely into a repository layer designed specifically for queries.

**1. The Interface:**
```csharp
public interface IDashboardQueries
{
    Task<List<ProductSalesComparisonDto>> GetProductSalesComparisonAsync(Guid? locationId, int count);
}
```

**2. The Implementations:**
- `DashboardQueriesPg.cs` (Contains pure PostgreSQL optimized Dapper queries)
- `DashboardQueriesSql.cs` (Contains pure SQL Server optimized Dapper queries)
- `DashboardQueriesSqlite.cs` (Contains pure SQLite optimized Dapper queries)

**3. Dependency Injection:**
In `Startup.cs`, register the appropriate repository based on `appsettings.json`:
```csharp
if (databaseProvider == "PostgreSQL")
    services.AddScoped<IDashboardQueries, DashboardQueriesPg>();
else if (databaseProvider == "SqlServer")
    services.AddScoped<IDashboardQueries, DashboardQueriesSql>();
```

---

### Mechanism 3: SqlKata (Query Builder Library)
If you want to stop writing raw SQL strings entirely while keeping the performance of Dapper, you can use **SqlKata**. SqlKata allows you to write C# fluent queries and compiles them into raw SQL strings tailored to the specific database provider (PostgresCompiler, SqlServerCompiler, SqliteCompiler), which you then execute with Dapper.

**Example:**
```csharp
var query = new Query("SalesOrder AS so")
    .Select("so.Id", "so.TotalAmount")
    .Where("so.TenantId", tenantId)
    .WhereFalse("so.IsDeleted")
    .WhereIn("so.LocationId", locationIds)
    .Limit(10).Offset(20);

// _compiler is injected as PostgresCompiler, SqlServerCompiler, etc.
SqlResult result = _compiler.Compile(query);

var data = await connection.QueryAsync<SalesOrderDto>(result.Sql, result.NamedBindings);
```
*Pros*: Extremely clean, completely eliminates SQL dialect issues, prevents SQL injection automatically.
*Cons*: Requires adding a new dependency (`SqlKata`), slight learning curve.

---

## Immediate Action Plan (Implementation Path)

To fix the immediate threat of failing queries on SQL Server and SQLite without rewriting the entire architecture:

1. **Parameterize Booleans**: Stop using hardcoded `false` or `true` in raw SQL. Instead of `IsDeleted = false`, use `IsDeleted = @IsDeleted` and pass `IsDeleted = false` in the Dapper parameters object. Dapper automatically translates the C# `bool` to `0/1` for SQL Server and `true/false` for Postgres.
2. **Implement `ISqlDialect`**: Create the `ISqlDialect` interface and its three implementations in `POS.Common.DapperInfrastructure`.
3. **Register in DI**: Update `Startup.cs` to resolve the correct `ISqlDialect` singleton based on the `DatabaseProvider` setting.
4. **Refactor Handlers**: Update the MediatR QueryHandlers modified in Phase 3-6 to consume `ISqlDialect` for quoting identifiers, limits, and date extractions, removing the messy `connection.GetType().Name` switches.