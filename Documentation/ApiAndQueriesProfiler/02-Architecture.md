# Profiler Architecture Design

## 1. Goal
Design a database-agnostic profiling add-on that captures HTTP request telemetry and Entity Framework (EF) Core queries, persisting them into PostgreSQL, SQL Server, or SQLite. The profiler must be self-contained and easily integrated into any .NET Core application.

## 2. Core Components

### 2.1 Telemetry Models
- **`ApiRequestLog`**: Captures HTTP Request details (Method, Path, QueryString, StatusCode, DurationMs, Timestamp, IpAddress, UserAgent, CorrelationId).
- **`EfQueryLog`**: Captures EF Core Query details (CommandText, Parameters, DurationMs, Timestamp, CorrelationId).

### 2.2 Profiler Middleware (`ProfilerMiddleware`)
- Intercepts incoming HTTP requests.
- Starts a `Stopwatch`.
- Generates a unique `CorrelationId` for the request.
- On request completion, populates the `ApiRequestLog` and enqueues it for asynchronous persistence to prevent blocking the response.

### 2.3 EF Core Command Interceptor (`ProfilerCommandInterceptor`)
- Implements `DbCommandInterceptor`.
- Intercepts `ReaderExecuting`, `NonQueryExecuting`, and `ScalarExecuting` (and their async counterparts).
- Starts a `Stopwatch` before execution and stops it after execution.
- Captures the SQL command text, parameters, and execution time.
- Associates the query with the current HTTP request via an `AsyncLocal<string>` holding the `CorrelationId`.
- Enqueues the `EfQueryLog` for asynchronous persistence.

### 2.4 Asynchronous Persistence (Background Service)
- **`ProfilerLogChannel`**: A thread-safe bounded `Channel<object>` that queues `ApiRequestLog` and `EfQueryLog` entries.
- **`ProfilerBackgroundService`**: An `IHostedService` that continuously reads from the channel and batches inserts into the database. This ensures profiling has near-zero overhead on the main application thread.

### 2.5 Database Persistence (`ProfilerDbContext`)
- A dedicated EF Core `DbContext` specifically for the profiler.
- Crucially, this context does **not** have the `ProfilerCommandInterceptor` registered, preventing infinite recursive logging.
- Contains `DbSet<ApiRequestLog>` and `DbSet<EfQueryLog>`.
- Configured dynamically based on the provided `DatabaseProvider` (SQL Server, SQLite, PostgreSQL).

### 2.6 Dependency Injection Extensions
- `IServiceCollection.AddApiAndQueriesProfiler(...)`: Registers the background service, the channel, the `ProfilerDbContext`, and the `ProfilerCommandInterceptor`.
- `IApplicationBuilder.UseApiAndQueriesProfiler()`: Adds the `ProfilerMiddleware` to the HTTP pipeline.

## 3. Database-Agnostic Design
To support dropping this into any future project without modification, the library will include migrations or ensure schema creation at runtime:
- Upon startup, the `ProfilerBackgroundService` will execute `context.Database.EnsureCreatedAsync()` to automatically generate the required tables (`ApiRequestLogs` and `EfQueryLogs`) in the target database.
- It leverages the underlying EF Core provider capabilities (PostgreSQL, SQL Server, SQLite) to generate the correct SQL dialects for the tables.

## 4. Integration Workflow
1. Add the `ApiAndQueriesProfiler` project reference (or NuGet package).
2. In `Program.cs` or `Startup.cs`, call `services.AddApiAndQueriesProfiler(options)`.
3. In `DbContext` configuration, add `.AddInterceptors(serviceProvider.GetRequiredService<ProfilerCommandInterceptor>())`.
4. In the HTTP pipeline, call `app.UseApiAndQueriesProfiler()`.
