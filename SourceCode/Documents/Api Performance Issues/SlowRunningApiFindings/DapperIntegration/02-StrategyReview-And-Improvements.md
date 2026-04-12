# Strategy Review and Improvements for Hybrid EF Core + Dapper Adoption

## Executive Summary

Your strategy is directionally strong: using Dapper for read-heavy CQRS query handlers and keeping EF Core for CUD operations is a good fit for this codebase, especially for the dashboard-style aggregations that are currently struggling. The document is already solid on the high-level rationale, phased rollout, and multi-database awareness.

The main improvements needed are not conceptual; they are architectural and operational:

1. The strategy should explicitly preserve the current tenant and soft-delete guarantees that EF Core provides automatically.
2. The strategy should distinguish between two connection modes: normal read-only Dapper access and transaction-bound Dapper access inside an EF Core unit of work.
3. The provider and connection-string handling in the code sample should match the current application configuration.
4. The rollout plan should be more granular than a single global flag.
5. The testing and SQL management approach should be strengthened so the solution remains maintainable across SQLite, SQL Server, and PostgreSQL.

## What Is Already Good

- The CQRS split is a natural fit for the current MediatR-based architecture and aligns with the existing pipeline pattern in [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs#L60-L64).
- Keeping EF Core for writes is the right choice because the project already has unit-of-work and repository infrastructure in place through [DependencyInjectionExtension.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Helpers/DependencyInjectionExtension.cs#L16-L40) and [UnitOfWork.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Common/UnitOfWork/UnitOfWork.cs#L29-L48).
- The document correctly recognizes multi-database SQL dialect differences in [01-HybridDataAccessStrategy.md](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/Api%20Performance%20Issues/SlowRunningApiFindings/DapperIntegration/01-HybridDataAccessStrategy.md#L33-L44).
- Starting with read-heavy dashboard endpoints is the right migration order because the current [GetIncomeComparisonQueryHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Dashboard/Handlers/GetIncomeComparisonQueryHandler.cs#L30-L61) is exactly the type of aggregation where Dapper can help.

## Key Gaps in the Current Strategy

### 1. Tenant and Soft-Delete Safety Is Underspecified

This is the biggest architectural gap.

EF Core currently protects the application through global query filters in [POSDbContext.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Context/POSDbContext.cs#L1375-L1434). Every `BaseEntity` query automatically applies:

- `TenantId == CurrentTenantId`
- `!IsDeleted`

Dapper bypasses those protections completely. Your current strategy does not yet define a hard rule for enforcing tenant and soft-delete predicates in raw SQL.

### Improvement

Add a mandatory abstraction such as:

- `ITenantSqlContext`
- `ISqlQueryPolicy`
- `ISqlPredicateBuilder`

It should inject the current tenant ID from [ITenantProvider.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/ITenantProvider.cs#L7-L12) and provide reusable SQL fragments like:

```sql
WHERE TenantId = @TenantId AND IsDeleted = 0
```

For shared entities that are not tenant-scoped, the strategy should explicitly list exceptions.

Without this, Dapper adoption creates a serious cross-tenant data leakage risk.

### 2. Connection Strategy Needs Two Explicit Modes

The strategy currently says Dapper should share EF Core’s connection in [01-HybridDataAccessStrategy.md](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/Api%20Performance%20Issues/SlowRunningApiFindings/DapperIntegration/01-HybridDataAccessStrategy.md#L14-L16), but the sample factory later creates a brand new connection from configuration in [01-HybridDataAccessStrategy.md](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/Api%20Performance%20Issues/SlowRunningApiFindings/DapperIntegration/01-HybridDataAccessStrategy.md#L87-L116). Those two ideas conflict.

### Improvement

Define two paths clearly:

- **Standalone read path:** Dapper opens its own read-only connection for query handlers.
- **Transactional path:** Dapper reuses `POSDbContext.Database.GetDbConnection()` and `CurrentTransaction.GetDbTransaction()` when invoked from a write workflow coordinated by [IUnitOfWork.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Common/UnitOfWork/IUnitOfWork.cs#L7-L17).

Recommended abstraction:

```csharp
public interface ISqlConnectionAccessor
{
    DbConnection GetOpenConnection();
    DbTransaction? GetCurrentTransaction();
}
```

This is safer and more precise than a single `CreateConnection()` API.

### 3. The Factory Sample Does Not Match the Current App Configuration

The current application chooses providers and connection strings like this in [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs#L115-L157):

- `Sqlite` → `SqliteConnectionString`
- `PostgreSql` → `PostgresConnectionString`
- else → `DbConnectionString`

But the strategy sample uses only `DbConnectionString` and checks `"postgresql"` in lowercase. That will drift from the real startup behavior.

### Improvement

Update the strategy to mirror the existing application contract exactly:

- use the actual provider values already used by startup
- reuse the same configuration keys
- support the same timeout and resiliency expectations where applicable

Also document that PostgreSQL currently has provider-specific behavior enabled in [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs#L142-L150), which should be reflected in Dapper command configuration where needed.

### 4. The Strategy Understates the Existing EF Core Baseline

The document says EF Core reads suffer from tracking overhead, which is true in general, but this codebase already sets global no-tracking behavior in [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs#L162-L165).

That means the business case for Dapper here is not “replace all EF reads because EF is tracking too much.”  
It is:

- replace hotspot aggregate queries
- replace provider-sensitive translations
- replace high-cardinality reporting endpoints

### Improvement

Adjust the technical analysis to say:

- EF Core remains acceptable for simple CRUD reads and paginated lookup endpoints
- Dapper should be reserved for high-cost analytical reads, multi-join reporting, and provider-sensitive grouping/aggregation queries

This makes the strategy more credible and prevents premature over-migration.

### 5. Caching Should Remain in the Existing MediatR Pipeline

The codebase already has a reusable caching pipeline through [CachingBehavior.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/PipeLineBehavior/CachingBehavior.cs#L22-L49) and `ICacheableQuery` in [ICacheableQuery.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/PipeLineBehavior/ICacheableQuery.cs#L5-L10). The current `GetIncomeComparisonQuery` already participates in it via [GetIncomeComparisonQuery.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Dashboard/Commands/GetIncomeComparisonQuery.cs#L9-L15).

### Improvement

State explicitly that Dapper handlers must preserve the current MediatR query contract:

- keep `IRequest<T>`
- keep `ICacheableQuery` where relevant
- only change the data access implementation behind the handler

This avoids duplicating caching logic in Dapper services.

### 6. Feature Flags Need to Be Per-Query, Not Global

The strategy currently proposes one flag, `UseDapperForReads`, in [01-HybridDataAccessStrategy.md](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/Api%20Performance%20Issues/SlowRunningApiFindings/DapperIntegration/01-HybridDataAccessStrategy.md#L63-L69). That is too coarse.

If one provider-specific SQL script fails for one endpoint, you do not want to disable every Dapper query in the application.

### Improvement

Introduce targeted flags such as:

- `Features:Dapper:DashboardIncomeComparison`
- `Features:Dapper:DashboardStatistics`
- `Features:Dapper:NotificationTop10`

And use a selector service:

```csharp
public interface IReadStrategySelector
{
    bool UseDapper<TQuery>();
}
```

This enables precise rollback and safer rollout.

### 7. SQL Organization Needs a Stronger Maintainability Story

`ISqlDialectProvider` is a good start, but a single provider interface that returns raw SQL strings will become hard to maintain once you migrate more than a handful of handlers.

### Improvement

Use named query objects or embedded SQL files per provider, for example:

- `Queries/SqlServer/Dashboard/GetIncomeComparison.sql`
- `Queries/PostgreSql/Dashboard/GetIncomeComparison.sql`
- `Queries/Sqlite/Dashboard/GetIncomeComparison.sql`

Then expose them through typed query definitions:

```csharp
public interface ISqlQueryTextProvider
{
    string GetQuery(SqlQueryKey key);
}
```

This keeps SQL reviewable, testable, and versionable.

### 8. Dapper Command Execution Should Use CommandDefinition

The current sample handler uses `QueryAsync<T>(sql, new { ... })` in [01-HybridDataAccessStrategy.md](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/Api%20Performance%20Issues/SlowRunningApiFindings/DapperIntegration/01-HybridDataAccessStrategy.md#L131-L141). That does not show:

- cancellation token usage
- command timeout control
- transaction passing

### Improvement

Use `CommandDefinition` consistently:

```csharp
var command = new CommandDefinition(
    sql,
    parameters,
    transaction: currentTransaction,
    commandTimeout: 60,
    cancellationToken: cancellationToken);

var result = await connection.QueryAsync<IncomeComparisonDto>(command);
```

This is a better production template.

### 9. The Effort Estimate Is Optimistic

The current 9-day total in [01-HybridDataAccessStrategy.md](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/Documents/Api%20Performance%20Issues/SlowRunningApiFindings/DapperIntegration/01-HybridDataAccessStrategy.md#L48-L57) is achievable only for a narrow pilot, not for a robust multi-database rollout with feature flags, observability, tenant safety, and fallback support.

### Improvement

Split the estimate into:

- **Pilot scope:** 7–10 working days for 2–3 dashboard endpoints
- **Production-ready foundation:** 12–18 working days
- **Full dashboard and read-heavy migration:** 3–6 weeks depending on query count

This makes the plan more realistic for stakeholder review.

### 10. The Strategy Should Explicitly Fit the Existing Project Conventions

This repository already has a centralized DI composition root in [DependencyInjectionExtension.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Helpers/DependencyInjectionExtension.cs#L16-L40). The hybrid strategy should say where the new Dapper abstractions live and how they are registered there.

Also, in this project the layer naming is not conventional: infrastructure concerns live under `POS.Domain`, while entities and DTOs are under `POS.Data`. The document should respect that naming reality when proposing folder placement.

### Improvement

Document the concrete placement:

- `POS.Domain` for Dapper connection access, provider selection, and SQL execution infrastructure
- `POS.MediatR` for Dapper-backed query handlers
- `POS.Data.Dto` for read models
- `POS.API.Helpers.DependencyInjectionExtension` for service registration

## Recommended Revised Architecture

### Minimal Viable Design

1. Keep current MediatR request/handler contracts unchanged.
2. Add `ISqlConnectionAccessor` for safe connection and transaction reuse.
3. Add `ISqlQueryTextProvider` with per-provider SQL files.
4. Add `ITenantSqlContext` that always supplies `TenantId` and standard predicates.
5. Add `IReadStrategySelector` for per-query rollout flags.
6. Keep `ICacheableQuery` and current caching pipeline unchanged.
7. Start with only 2–3 critical reporting handlers.

### Suggested Query Handler Flow

1. Handler receives query request.
2. Strategy selector decides EF Core or Dapper.
3. If Dapper:
   - resolve tenant context
   - resolve provider-specific SQL
   - create `CommandDefinition`
   - execute with connection accessor
   - return DTOs
4. MediatR caching behavior applies exactly as it does today.

## Suggested Additions to the Strategy Document

Add these sections to the original strategy:

### A. Security and Tenant Isolation Rules

- Every Dapper query must include explicit tenant and soft-delete predicates unless the entity is documented as global.
- Every Dapper handler must obtain tenant context from `ITenantProvider`.
- Every query must use parameterized SQL only.

### B. Query Classification Matrix

Define which reads stay on EF Core and which move to Dapper:

- **Stay on EF Core:** simple lookups, one-table paging, low-volume dropdowns, standard CRUD reads
- **Move to Dapper:** dashboards, aggregates, cross-table reports, provider-sensitive groupings, high-cardinality exports

### C. Operational Standards

- mandatory profiler comparison before/after migration
- query timeout policy per provider
- command logging for failed Dapper queries
- rollback-by-endpoint feature flag

### D. SQL Review Checklist

- tenant-safe
- soft-delete-safe
- parameterized
- explain plan reviewed
- tested on SQLite, SQL Server, PostgreSQL
- benchmarked against current EF Core handler

## Priority Improvements

If you revise the strategy now, I recommend prioritizing these five changes first:

1. Replace the single global feature flag with per-query flags.
2. Define tenant and soft-delete enforcement for all Dapper SQL.
3. Replace the current connection-factory sample with a connection accessor that supports both standalone and transactional use.
4. Align provider naming and connection-string selection with [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs#L115-L157).
5. Move from inline SQL provider methods to named SQL files or typed query definitions.

## Conclusion

Your strategy is a strong starting point and is technically feasible for this project. The main risk is not Dapper itself; it is bypassing important protections and conventions that EF Core currently gives you for free.

If you incorporate the improvements above, the strategy becomes much safer, easier to roll out gradually, and better aligned with the existing codebase. The result will be a focused hybrid architecture where:

- EF Core remains the system of record for writes and standard reads
- Dapper is used surgically for the small set of high-impact reporting queries
- caching, tenant safety, transactions, and observability remain consistent across both access paths
