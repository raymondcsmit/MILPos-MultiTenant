# Hybrid Data Access Strategy: EF Core & Dapper Integration Plan

## 1. Executive Summary
This document provides a comprehensive analysis and implementation roadmap for adopting a hybrid data access strategy within the POS & Inventory Management system. The objective is to utilize **Dapper** (a high-performance micro-ORM) strictly for read-heavy Query Handlers, while retaining **Entity Framework Core (EF Core)** for Create, Update, and Delete (CUD) operations. This architectural shift addresses the severe performance bottlenecks identified during recent API profiling (e.g., 14-second dashboard queries) by bypassing EF Core's heavy abstraction and translation layers for complex reads.

---

## 2. Technical Analysis Section

### 2.1. Performance Benchmarks: EF Core vs. Dapper
- **Entity Framework Core (Read):** While `.AsNoTracking()` improves EF Core read performance, it still suffers from SQL translation overhead. For complex aggregations (e.g., grouping by date parts), EF Core often fails to translate the LINQ expression into native SQL across different providers (SQLite/PostgreSQL), resulting in catastrophic client-side evaluation (pulling entire tables into RAM).
- **Dapper (Read):** Operates extremely close to the metal (ADO.NET). It executes raw, highly optimized SQL queries directly against the database and maps the `IDataReader` results to POCOs dynamically. Benchmarks consistently show Dapper executing complex read operations **2x to 5x faster** than EF Core and consuming significantly less memory.

### 2.2. Connection Management & Transaction Coordination
- **Connection Sharing:** Dapper extends the native `IDbConnection`. To prevent connection pool exhaustion and distributed transaction issues, Dapper will share the exact same `DbConnection` initialized by the `POSDbContext`.
- **Transaction Coordination:** If a MediatR command requires both reading and writing within a single transaction, Dapper will utilize the `DbTransaction` obtained via `dbContext.Database.CurrentTransaction.GetDbTransaction()`. This ensures atomic consistency across both ORMs.

---

## 3. Implementation Architecture

### 3.1. CQRS Separation Strategy
The current architecture already employs CQRS via MediatR. This separation makes the hybrid approach highly feasible.
- **Commands (Write):** Will continue to use the existing generic `IRepository<T>` and `POSDbContext`.
- **Queries (Read):** Will bypass `IRepository<T>` entirely. They will inject a new `ISqlConnectionFactory` to execute Dapper queries directly, mapping results instantly to DTOs.

### 3.2. Architecture Components
1. **`ISqlConnectionFactory`**: An abstraction in the Application/Infrastructure layer responsible for providing the active `IDbConnection`.
2. **Dapper Query Services**: Dedicated service classes (e.g., `IDashboardQueryService`) that contain the raw SQL queries and Dapper execution logic, injected directly into MediatR `IRequestHandler` classes.

---

## 4. Multi-Database Support Requirements

The system currently supports SQL Server, PostgreSQL, and SQLite. Dapper requires raw SQL, meaning SQL dialects will differ.

### 4.1. Dialect Management
We will implement an `ISqlDialectProvider` that serves the correct SQL strings based on the active provider.
- **SQL Server:** Uses `YEAR()`, `MONTH()`, `ISNULL()`.
- **PostgreSQL:** Uses `EXTRACT(YEAR FROM ...)`, `COALESCE()`.
- **SQLite:** Uses `strftime('%Y', ...)`, `IFNULL()`.

### 4.2. Factory Implementation
The `SqlConnectionFactory` will inspect the `IConfiguration` ("DatabaseProvider") and return either `SqlConnection`, `NpgsqlConnection`, or `SqliteConnection`.

---

## 5. Effort Estimation Matrix

| Phase | Task Description | Estimated Effort | Resources Required |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Core Infrastructure Setup (`ISqlConnectionFactory`, `ISqlDialectProvider`, Dapper package installation). | 1 Day | 1 Senior Backend Dev |
| **Phase 2** | Dialect Implementation (Writing provider-specific SQL strings for existing slow queries). | 2 Days | 1 Senior Backend Dev |
| **Phase 3** | Migration of Top 5 Slowest Read Handlers (e.g., Dashboard Statistics, Income Comparison). | 3 Days | 1 Senior Backend Dev |
| **Phase 4** | Unit & Integration Testing across all 3 Database Providers. | 2 Days | 1 QA / 1 Backend Dev |
| **Phase 5** | Staging Deployment, Profiling, and Load Testing. | 1 Day | DevOps / QA |
| **Total** | **End-to-End Implementation** | **9 Days** | |

---

## 6. Migration Strategy

### 6.1. Phased Rollout
1. **Target Identification:** Start exclusively with the `/api/dashboard/*` endpoints, as they suffer from the highest latency (14,000ms+).
2. **Feature Toggling:** Introduce a configuration flag (`UseDapperForReads: true`). If set to `false`, the MediatR handler falls back to the legacy EF Core repository implementation.
3. **Monitoring:** Deploy to production with the flag enabled. Monitor the `ApiAndQueriesProfiler` telemetry tables closely.

### 6.2. Rollback Procedure
If unexpected SQL exceptions occur due to dialect mismatches in production, immediately switch `UseDapperForReads` to `false` in `appsettings.json` and restart the application pool. No database schema changes or data loss will occur since Dapper is read-only.

---

## 7. Testing Requirements

### 7.1. Unit & Integration Tests
- **Query Handler Tests:** Mock the `ISqlConnectionFactory` using an in-memory SQLite connection to verify Dapper POCO mapping.
- **Multi-Database Integration Tests:** The CI/CD pipeline must spin up Docker containers for PostgreSQL and SQL Server to execute the Dapper queries against real schemas to catch dialect errors.

### 7.2. Performance Benchmarks
- Execute load tests using Apache JMeter or k6 against the `/api/dashboard/income-comparison` endpoint.
- **Success Criteria:** 95th percentile response time must drop below 150ms (from the current 14,000ms) under a load of 100 concurrent users.

---

## 8. Code Samples and Templates

### 8.1. SQL Connection Factory
```csharp
public interface ISqlConnectionFactory
{
    IDbConnection CreateConnection();
}

public class SqlConnectionFactory : ISqlConnectionFactory
{
    private readonly string _connectionString;
    private readonly string _provider;

    public SqlConnectionFactory(IConfiguration config)
    {
        _provider = config.GetValue<string>("DatabaseProvider") ?? "Sqlite";
        _connectionString = config.GetConnectionString("DbConnectionString");
    }

    public IDbConnection CreateConnection()
    {
        return _provider.ToLower() switch
        {
            "postgresql" => new NpgsqlConnection(_connectionString),
            "sqlserver" => new SqlConnection(_connectionString),
            "sqlite" => new SqliteConnection(_connectionString),
            _ => throw new NotSupportedException($"Provider {_provider} is not supported.")
        };
    }
}
```

### 8.2. Dapper Query Handler Example
```csharp
public class GetIncomeComparisonQueryHandler : IRequestHandler<GetIncomeComparisonQuery, List<IncomeComparisonDto>>
{
    private readonly ISqlConnectionFactory _sqlConnectionFactory;
    private readonly ISqlDialectProvider _dialectProvider;

    public GetIncomeComparisonQueryHandler(ISqlConnectionFactory sqlConnectionFactory, ISqlDialectProvider dialectProvider)
    {
        _sqlConnectionFactory = sqlConnectionFactory;
        _dialectProvider = dialectProvider;
    }

    public async Task<List<IncomeComparisonDto>> Handle(GetIncomeComparisonQuery request, CancellationToken cancellationToken)
    {
        var sql = _dialectProvider.GetIncomeComparisonSql();
        
        using var connection = _sqlConnectionFactory.CreateConnection();
        var result = await connection.QueryAsync<IncomeComparisonDto>(
            sql, 
            new { Year = DateTime.Now.Year, LocationId = request.LocationId }
        );
        
        return result.ToList();
    }
}
```

---

## 9. Risk Assessment and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **SQL Injection** | High | Low | Strictly mandate the use of parameterized queries (`@ParamName`) in Dapper. Never concatenate strings into the SQL text. |
| **Dialect Mismatches** | High | Medium | Implement comprehensive integration tests that execute the raw SQL against all three database engines during the CI build process. |
| **Connection Pool Exhaustion** | High | Low | Ensure the `using var connection = ...` pattern is strictly enforced in all handlers to guarantee connections are closed and returned to the pool immediately. |
| **Transaction Conflicts** | Medium | Low | For queries that must read uncommitted data inside a write command, pass the active `IDbTransaction` from EF Core into the Dapper `QueryAsync` method. |
