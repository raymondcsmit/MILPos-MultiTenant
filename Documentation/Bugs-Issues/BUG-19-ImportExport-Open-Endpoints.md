# BUG-19: Unauthenticated Public Access to ImportExportController (N-40 / Critical Blocker)

**Document Reference:** `Documentation/Bugs-Issues/BUG-19-ImportExport-Open-Endpoints.md`  
**Finding Code:** `N-40` / `DATA-GOV-01`  
**Severity:** 🔴 **CRITICAL BLOCKER**  
**Component:** Backend API / Data Governance / `ImportExportController.cs`  
**Status:** **Documented & Fixed**  

---

## 1. Description of Defect

The `ImportExportController` handles sensitive batch data operations including:
- Product export, template generation, validation, and batch CSV/Excel import.
- Customer database export, template generation, and batch customer import.
- Supplier database export, template generation, and batch supplier import.

However, the controller had NO `[Authorize]` attribute at the class level and NO `[ClaimCheck]` attributes on any of its 10 HTTP action methods. Consequently, any anonymous internet caller could query `/api/ImportExport/products/export`, `/api/ImportExport/customers/export`, and `/api/ImportExport/suppliers/export` and exfiltrate the company's full commercial data catalog, customer directory, and vendor details in CSV/XLSX formats without credentials.

---

## 2. Root Cause Analysis

In `SourceCode/SQLAPI/POS.API/Controllers/ImportExportController.cs`:
```csharp
[ApiController]
[Route("api/[controller]")]
public class ImportExportController : BaseController // Missing [Authorize]
{
    [HttpPost("products/import")] // Missing [ClaimCheck("PRO_ADD_PRODUCT")]
    public async Task<IActionResult> ImportProducts(...)

    [HttpGet("products/export")] // Missing [ClaimCheck("PRO_VIEW_PRODUCTS")]
    public async Task<IActionResult> ExportProducts(...)
}
```
None of the endpoints performed claims verification or identity validation, bypassing all tenant and role governance barriers.

---

## 3. Remediation & Implementation

1. Added `[Authorize]` attribute to `ImportExportController` class.
2. Decorated each endpoint with granular, module-specific claim checks:
   - `products/import`, `products/validate`: `[ClaimCheck("PRO_ADD_PRODUCT")]`
   - `products/export`, `products/template`: `[ClaimCheck("PRO_VIEW_PRODUCTS")]`
   - `customers/import`, `customers/validate`: `[ClaimCheck("CUST_ADD_CUSTOMER")]`
   - `customers/export`, `customers/template`: `[ClaimCheck("CUST_VIEW_CUSTOMERS")]`
   - `suppliers/import`, `suppliers/validate`: `[ClaimCheck("SUPP_ADD_SUPPLIER")]`
   - `suppliers/export`, `suppliers/template`: `[ClaimCheck("SUPP_VIEW_SUPPLIERS")]`

---

## 4. Automated Verification

- Updated `ImportExportTests.cs`:
  - `Should_Return401_When_ExportingProducts_Unauthenticated` (asserts HTTP 401).
  - `Should_Return401_When_ReachingExportsAndTemplates_Unauthenticated` (asserts HTTP 401 across routes).
  - `Should_Return401_When_ReachingImportRoute_Unauthenticated` (asserts HTTP 401).
  - `Should_Return403_When_ReachingExport_WithoutClaims` (asserts HTTP 403).
  - `Should_ExportProducts_Csv_When_Authorized` (asserts HTTP 200).
- Updated `ImportRoundTripTests.cs`:
  - `Should_ServeTemplate_And_ValidateProductCsv_When_Authorized` (asserts HTTP 200).
