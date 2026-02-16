# Work Document - Store Page Global View and Tenant Filtering

## Summary of Changes
Implemented the ability to view all products in the Store page when no tenant slug is provided, while maintaining tenant-specific filtering when a slug is present in the route.

## Detailed Changes

### Backend Changes

#### 1. POS.Data - ProductResource
- Added `IgnoreTenantFilter` boolean property to `ProductResource` class to support bypassing global tenant filters.

#### 2. POS.Repository - ProductRepository
- Updated `GetProducts` method to check for `IgnoreTenantFilter`.
- If set to `true`, the query bypasses global filters using `IgnoreQueryFilters()` and applies a manual filter for `!IsDeleted`.
- **Fixed Build Error CS0266**: Explicitly typed the collection variable as `IQueryable<Product>` to prevent implicitly casting errors when switching between `IIncludableQueryable` and `IQueryable`.

#### 3. POS.API - StoreTenantAttribute
- Modified the filter to allow execution when `tenantName` is missing from the route.
- If `tenantName` is null or empty, it now skips tenant resolution and proceeds to the next action.

#### 4. POS.API - StoreController
- Added `[Route("store")]` attribute to support the global store URL.
- Updated the `Index` action to determine if it's in "Global" mode based on the presence of `tenantName` in the route.
- Sets `IgnoreTenantFilter = true` and `ViewBag.TenantName = "All Products"` when in Global mode.

## Verification Results

### Code Review
- The routing configuration correctly handles both `/store` and `/store/{tenantName}`.
- The `StoreTenantAttribute` change prevents the 404 error previously encountered when accessing `/store`.
- The `ProductRepository` update correctly utilizes EF Core's `IgnoreQueryFilters()` to retrieve products from all tenants.
- Global Soft-Delete filter is preserved manually in `ProductRepository` when ignoring query filters.

### Manual Verification (Instructions for User)
1. **Access Global Store**: Go to `/store`. You should see products from all tenants and "All Products" in the header.
2. **Access Tenant Store**: Go to `/store/{tenant-slug}`. You should see only products for that specific tenant.
3. **Cart & Checkout**: Cart functionality should work in both modes, redirecting appropriately back to the store.
