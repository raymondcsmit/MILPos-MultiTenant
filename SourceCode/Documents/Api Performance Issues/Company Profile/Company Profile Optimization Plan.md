# Goal: Optimize Company Profile API Performance

The `api/companyProfile` is currently taking ~15 seconds to execute. This is primarily caused by four separate database queries (Locations, Financial Years, Language, and Company Profile) being executed sequentially against the same EF Core `DbContext`. Because of network latency to the remote database, these roundtrips stack up and result in a huge delay for the first request of every tenant.

## Proposed Changes

We will fix the sequential bottleneck by parallelizing the database queries, and then optionally introduce caching to eliminate the delay entirely on subsequent requests.

### 1. Parallelize Database Queries using Separate Scopes

Entity Framework Core does not support concurrent execution using the same `DbContext` instance. However, we can bypass this by injecting an `IServiceScopeFactory` to spin up separate, lightweight DI scopes for each query. This allows us to instantiate multiple `DbContext` instances and run the queries concurrently using `Task.WhenAll`.

#### [MODIFY] GetCompanyProfileQueryHandler.cs
- Inject `IServiceScopeFactory`.
- Change the `await locationRepository.All...`, `await financialYearRepository...`, etc. into local async functions that create a new DI scope (`using var scope = _scopeFactory.CreateScope();`) and resolve their respective repositories.
- Execute these functions asynchronously and `await Task.WhenAll(...)` to run all four database roundtrips concurrently.
- This will reduce the 4x network latency penalty to just 1x (the time of the longest single query).

### 2. Tenant-Aware Caching (Optional but Recommended)

In addition to speeding up the first request by parallelizing the queries, we can still cache the assembled DTO per-tenant to drop the response time down to sub-milliseconds for all subsequent requests.

#### [MODIFY] GetCompanyProfileQueryHandler.cs
- Inject `IMemoryCache` and `ITenantProvider` to check for cached values using `"CompanyProfile_" + TenantId`.
- Add caching absolute expiration of 24 hours.

#### [MODIFY] UpdateCompanyProfileCommandHandler.cs & UpdateActivatedLicenseCommandHandler.cs
- Clear the `"CompanyProfile_" + TenantId` cache key when a tenant updates their profile or license.

## Verification Plan
- Use curl/Postman to fetch the profile and ensure the first request response time drops from ~15 seconds to ~3-4 seconds (the cost of 1 concurrent roundtrip).
- Ensure subsequent requests take < 10ms. 
- Trigger an update into the Company Profile and re-fetch to verify cache is properly invalidated.
