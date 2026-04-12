# Step-by-Step Implementation Plan

## Phase 1: Project Setup
1. Create a new .NET Core Class Library project named `ApiAndQueriesProfiler`.
2. Add necessary NuGet packages:
   - `Microsoft.AspNetCore.Http.Abstractions`
   - `Microsoft.EntityFrameworkCore`
   - `Microsoft.EntityFrameworkCore.Relational`
   - `Microsoft.Extensions.Hosting.Abstractions`
   - `System.Threading.Channels`
3. Define the telemetry entity models: `ApiRequestLog` and `EfQueryLog`.

## Phase 2: Core Profiling Logic
1. Create the `ProfilerContext` using `AsyncLocal<string>` to store a `CorrelationId` for tracing EF queries back to their originating HTTP requests.
2. Implement `ProfilerLogChannel` using `System.Threading.Channels` to hold pending logs.
3. Implement `ProfilerMiddleware` to intercept HTTP requests, measure execution time, and push `ApiRequestLog` to the channel.
4. Implement `ProfilerCommandInterceptor` inheriting from `DbCommandInterceptor` to intercept EF Core commands, measure execution time, and push `EfQueryLog` to the channel.

## Phase 3: Data Persistence
1. Implement `ProfilerDbContext` containing `DbSets` for the logs.
2. Implement `ProfilerBackgroundService` inheriting from `BackgroundService`.
   - In `ExecuteAsync`, ensure the database tables are created (`EnsureCreatedAsync`).
   - Continuously read from the `ProfilerLogChannel`.
   - Batch save logs to the database using `ProfilerDbContext`.

## Phase 4: Packaging and DI Extensions
1. Create `ProfilerOptions` to hold the connection string and database provider type.
2. Create an extension method `AddApiAndQueriesProfiler` on `IServiceCollection` to register the necessary services and `ProfilerDbContext`.
3. Create an extension method `UseApiAndQueriesProfiler` on `IApplicationBuilder` to register the middleware.

## Phase 5: Integration and Testing
1. Integrate the `ApiAndQueriesProfiler` into the main `POS.API` project.
2. Register the profiler in `Startup.cs` / `Program.cs`.
3. Inject the `ProfilerCommandInterceptor` into the main `POSDbContext`.
4. Run the application and execute HTTP requests.
5. Verify that `ApiRequestLogs` and `EfQueryLogs` tables are created and populated correctly in the selected database.
