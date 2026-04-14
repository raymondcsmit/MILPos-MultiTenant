# Implementation Plan - Store Page Global View and Tenant Filtering

This plan addresses the issue where the Store page (`Store/Index.cshtml`) is not opening without a tenant slug and implements the logic to show all products or tenant-specific products based on the route.

## Proposed Changes

### [POS.API] - Backend Routing and Filtering

#### [MODIFY] [ProductResource.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Resources/ProductResource.cs)
- Add `public bool IgnoreTenantFilter { get; set; }` to support bypassing global multi-tenant filters.

#### [MODIFY] [ProductRepository.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Product/ProductRepository.cs)
- Update `GetProducts` method to check for `IgnoreTenantFilter`.
- If true, call `IgnoreQueryFilters()` on the collection and manually add `.Where(c => !c.IsDeleted)`.

#### [MODIFY] [StoreTenantAttribute.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Filters/StoreTenantAttribute.cs)
- Update `OnActionExecutionAsync` to allow null `tenantName`.
- Remove the `NotFoundResult` when `tenantName` is missing.
- Only resolve tenant and set `ITenantProvider` context if `tenantName` is provided.

#### [MODIFY] [StoreController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/StoreController.cs)
- Add `[Route("store")]` in addition to `[Route("store/{tenantName}")]` to allow opening the store without a slug.
- In `Index`, if no tenant is resolved, set `productResource.IgnoreTenantFilter = true`.
- Set `ViewBag.TenantName` to "All Products" if no tenant is found.

## Verification Plan

### Manual Verification
1.  **Global View**: Navigate to `/store`.
    - Verify that the page opens without error.
    - Verify that products from different tenants are displayed.
    - Verify header shows "All Products" (or similar).
2.  **Tenant View**: Navigate to `/store/{valid-tenant-slug}`.
    - Verify that the page opens.
    - Verify that only products belonging to that tenant are displayed.
    - Verify header shows the specific tenant name.
3.  **Invalid Tenant**: Navigate to `/store/{invalid-slug}`.
    - Verify that it returns "Store not found" (the existing logic in `StoreTenantAttribute` handles this).
