# Walkthrough - Missing Tenant Seed Data Fix

I have resolved the issue where new tenants (specifically "Retail" ones) were not getting seeded with products, categories, or brands.

## The Issues

1.  **Product Filtering**: The `SeedProductsAsync` method was filtering products by prefix.
    -   Pharmacy -> `PH*`
    -   Petrol -> `PT*`
    -   **Retail** -> `RT*`
    -   **Problem**: The `Products.csv` seed file **does not contain any products with the 'RT' prefix**. It only has `PH` (Pharmacy) and `PT` (Petrol) items. Consequently, "Retail" tenants got **zero products**.

2.  **CSV Parsing**: The CSV parser in `TenantRegistrationService` was too simple and could break on:
    -   Quoted fields containing commas (e.g., "Product, Name").
    -   Quoted fields containing newlines.
    -   This likely caused auxiliary data (Brands, Categories) to fail loading if descriptions contained commas.

## The Fix

### [TenantRegistrationService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Repository/Tenant/TenantRegistrationService.cs)

1.  **Updated `SeedProductsAsync`**:
    -   Modified logic to **disable filtering** for "Retail" tenants.
    -   Now, Retail tenants will receive **ALL** seed products (Pharmacy + Petrol items) as a starting point, instead of nothing.

2.  **Robust `ParseCsvLine`**:
    -   Replaced the simple string split logic with a **proper state-machine parser** that handles quotes, escaped quotes, and commas correctly.
    -   Enhanced `ReadCsv` to trim values and handle nullable types more gracefully.

## Verification
1.  **Action**: Register a new Tenant with "Retail" business type.
2.  **Expectation**:
    -   The tenant should now have Sample Products (mix of PH and PT items).
    -   Categories and Brands associated with these products should also be present.
