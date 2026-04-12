# Performance Optimization Implementation Plan (Phase 2)

## 1. Executive Summary
This document outlines the strategic implementation plan to resolve the performance bottlenecks identified in the Phase 2 analysis document (`03-PerformanceAnalysis-Phase2.md`). The plan provides actionable steps to optimize the `CompanyProfile`, `Supplier`, `Customer`, `ProductCategories`, and `Brands` APIs via caching, query refactoring, and database indexing.

## 2. Optimization Strategies

### 2.1. Caching & Threading Strategy (CompanyProfile, Categories, Brands)
**Objective:** Reduce database roundtrips and eliminate unnecessary thread pool overhead.
**Action Items:**
1. **Refactor `GetCompanyProfileQueryHandler`**: Remove the `Task.Run` parallelization. Given these queries are simple read operations, executing them sequentially with `.AsNoTracking()` within the same `DbContext` scope is faster and prevents thread starvation. The existing caching mechanism (`IMemoryCache`) will be preserved but simplified.
2. **Implement Caching via Pipeline Behaviors**: Integrate the `ICacheableQuery` interface into `GetAllProductCategoriesQuery` and `GetAllBrandCommand`. This will leverage the `CachingBehavior` pipeline to cache dropdown data, drastically reducing latency.

### 2.2. Query Refactoring Strategy
**Objective:** Eliminate EF Core Change Tracker overhead.
**Action Items:**
1. **Add `.AsNoTracking()`**: Ensure all read-only list endpoints (Brands, Categories, Suppliers, Customers) utilize `.AsNoTracking()` before executing `.ToListAsync()`.
2. **Refactor Repositories**: Update `SupplierRepository.GetSuppliers()` and `CustomerRepository.GetCustomers()` to ensure they use `.AsNoTracking()` and that the projection to DTOs happens *before* executing the database query.

### 2.3. Database Indexing Strategy
**Objective:** Optimize text-based searching and sorting for master data.
**Action Items:**
1. **Customer Table:** Add indexes on `CustomerName`, `Email`, and `MobileNo`.
2. **Supplier Table:** Add indexes on `SupplierName`, `Email`, and `MobileNo`.
3. **ProductCategory Table:** Add index on `ParentId`.

## 3. Prioritized Action Items & Estimated Effort

| Phase | Task | Handler/Component | Estimated Effort | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Thread Pool Optimization** | `GetCompanyProfileQueryHandler` | 1 Hour | **Critical** |
| **Phase 2** | **Caching Implementation** | `GetAllProductCategoriesQuery`, `GetAllBrandCommand` | 2 Hours | **High** |
| **Phase 3** | **Query Refactoring (.AsNoTracking)** | `GetAllBrandCommandHandler`, `GetAllProductCategoriesQueryHandler` | 1 Hour | **High** |
| **Phase 4** | **Database Indexing** | EF Core Migrations (Customer, Supplier) | 2 Hours | **Medium** |

## 4. Success Metrics & Validation Criteria
1. **Target Response Times:**
   - `/api/companyProfile`: < 50ms (Cached), < 200ms (Uncached).
   - `/api/ProductCategories` & `/api/Brands`: < 50ms (Cached).
   - `/api/supplier` & `/api/customer`: < 300ms (Uncached).
2. **Uptime:** Maintain 99.9% uptime by ensuring no breaking changes to the DTO contracts or request parameters.
3. **Validation:** Post-deployment, the `ApiAndQueriesProfiler` will be monitored to confirm the targeted latency reductions.
