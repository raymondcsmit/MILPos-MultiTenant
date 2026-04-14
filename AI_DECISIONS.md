# AI Decisions Log

This file captures durable technical decisions and trade-offs so the project stays consistent across AI-assisted iterations.

## Template

### YYYY-MM-DD — Title

- Context:
- Decision:
- Alternatives considered:
- Consequences:
- Verification:
- Rollback plan:

## Entries

### 2026-04-14 — Dapper Optimization with SqlKata for Multi-Database Support

- **Context**: When optimizing slow-running Entity Framework Core queries using Dapper, raw SQL strings were causing multi-database compatibility issues (PostgreSQL vs. SQL Server vs. SQLite) due to differences in identifier quoting (`""` vs `[]`), boolean literals (`true`/`false` vs `1`/`0`), pagination syntax (`LIMIT`/`OFFSET` vs `OFFSET FETCH NEXT`), and array parameter binding.
- **Decision**: **MANDATORY PROJECT RULE**: All future Query Handler optimizations and migrations from EF Core to Dapper MUST use the **SqlKata** Query Builder Library instead of raw SQL strings. 
- **Implementation Rules**:
  - Do NOT write raw SQL strings (e.g., `SELECT * FROM...`).
  - Inject the `SqlKata.Compilers.Compiler` interface via DI into the MediatR handler.
  - Build the query using `new SqlKata.Query(tableName).Select(...).Where(...)`.
  - Compile the query dynamically using `_compiler.Compile(query)`.
  - Execute using Dapper: `connection.QueryAsync<T>(compiled.Sql, compiled.NamedBindings, currentTransaction)`.
- **Alternatives considered**:
  - `ISqlDialect` abstraction (rejected as it still required manual string concatenation and didn't solve parameter binding elegantly).
  - Multiple Repository implementations per database (rejected due to code duplication).
- **Consequences**: Queries are now fully database-agnostic. The `appsettings.json` `DatabaseProvider` configuration will automatically inject the correct SqlKata compiler (`PostgresCompiler`, `SqlServerCompiler`, or `SqliteCompiler`), ensuring seamless cross-database compatibility.
- **Verification**: Ensure no `providerName == "SqlConnection"` switch statements exist in Dapper handlers.
- **Rollback plan**: N/A - Standardized across the application.