# API Performance Analysis Report (Phase 2)

## 1. Executive Summary
This document details the performance investigation of the newly identified slow API endpoints in `SlowRunningApi.csv` (Phase 2). The analysis reveals bottlenecks in core master data endpoints (Suppliers, Customers, Product Categories, Brands) and the `CompanyProfile` endpoint. The primary causes of performance degradation are missing database indexes on text search fields, excessive threading overhead for caching, missing query projections (causing over-fetching), and the lack of `.AsNoTracking()` in read-only endpoints.

## 2. Technical Deep-Dive: Identified Bottlenecks

### 2.1. Master Data Endpoints (Supplier, Customer)
**Endpoints:** `/api/supplier`, `/api/customer`
**Handlers:** `GetAllSupplierQueryHandler`, `GetAllCustomerQueryHandler` (via `SupplierRepository`, `CustomerRepository`)
**Bottlenecks:**
1. **Inefficient Search/Filtering:** These endpoints support text-based search (e.g., `CustomerName`, `Email`, `MobileNo`). The underlying repositories typically perform `.Where(c => c.Name.Contains(searchQuery))` which forces full table scans.
2. **Missing Database Indexes:** The `Supplier` and `Customer` tables lack indexes on frequently filtered/sorted columns like `SupplierName`, `CustomerName`, `Email`, and `MobileNo`.

### 2.2. Lookup Endpoints (ProductCategories, Brands, Locations)
**Endpoints:** `/api/ProductCategories`, `/api/Brands`, `/api/location`
**Handlers:** `GetAllProductCategoriesQueryHandler`, `GetAllBrandCommandHandler`
**Bottlenecks:**
1. **Over-fetching / Missing AsNoTracking:** In `GetAllProductCategoriesQueryHandler` and `GetAllBrandCommandHandler`, the queries do not use `.AsNoTracking()`. EF Core is forced to attach all retrieved entities to its Change Tracker, causing unnecessary memory allocations and CPU overhead, especially since these are pure read operations.
2. **Missing Caching:** These tables (Categories, Brands, Locations) rarely change but are queried constantly by dropdowns in the frontend. Fetching them from the database on every request is highly inefficient.

### 2.3. Company Profile
**Endpoint:** `/api/companyProfile`
**Handler:** `GetCompanyProfileQueryHandler`
**Bottlenecks:**
1. **Excessive Threading Overhead:** The handler attempts to parallelize database queries by spawning 4 separate `Task.Run` background threads, each creating its own `IServiceScope` and `DbContext`. The overhead of creating threads, resolving scoped dependencies, and context switching often outweighs the benefits of parallel execution for simple, fast queries.

## 3. Infrastructure Constraints & Risk Assessment
- **High Risk:** The lack of caching on dropdown APIs (Categories, Brands, Locations) will cause the database connection pool to exhaust quickly under high concurrent user load.
- **Medium Risk:** The `Task.Run` implementation in `CompanyProfile` can lead to Thread Pool starvation in high-throughput environments, causing a cascading failure across the entire application.

## 4. Post-Implementation Monitoring
After implementing the Phase 2 optimizations, the `ApiAndQueriesProfiler` will be used to benchmark the new execution times to ensure these foundational endpoints perform under 100ms.
