# BUG-20: Missing Authorize & Commented-Out ClaimCheck on ProductStockController (N-35 / High)

**Document Reference:** `Documentation/Bugs-Issues/BUG-20-ProductStock-Missing-ClaimChecks.md`  
**Finding Code:** `N-35` / `INT-05`  
**Severity:** 🟠 **HIGH**  
**Component:** Backend API / Inventory / `ProductStockController.cs`  
**Status:** **Documented & Fixed**  

---

## 1. Description of Defect

In `ProductStockController.cs`, the write and stock adjustment endpoints:
- `POST /api/ProductStock` (`AddProductStock`)
- `POST /api/ProductStock/bulk-update` (`BulkUpdateProductStock`)
- `POST /api/ProductStock/bulk-adjust` (`BulkAdjustProductStock`)

all had their `[ClaimCheck("INVE_MANAGE_INVENTORY")]` attributes commented out, and the controller class itself was missing the `[Authorize]` attribute. As a consequence, authenticated users without inventory management permissions (such as POS cashiers or NoClaims accounts) could submit direct stock alterations and bulk inventory adjustments without authorization.

---

## 2. Root Cause Analysis

In `SourceCode/SQLAPI/POS.API/Controllers/ProductStock/ProductStockController.cs`:
```csharp
[Route("api/[controller]")]
[ApiController]
public class ProductStockController(IMediator _mediator) : BaseController
{
    [HttpPost]
    //[ClaimCheck("INVE_MANAGE_INVENTORY")]
    public async Task<IActionResult> AddProductStock(AddProductStockCommand command)

    [HttpPost("bulk-update")]
    //[ClaimCheck("INVE_MANAGE_INVENTORY")]
    public async Task<IActionResult> BulkUpdateProductStock(...)

    [HttpPost("bulk-adjust")]
    //[ClaimCheck("INVE_MANAGE_INVENTORY")]
    public async Task<IActionResult> BulkAdjustProductStock(...)
}
```
The permission checks were disabled in source code, leaving physical inventory balances unprotected.

---

## 3. Remediation & Implementation

1. Added `[Authorize]` attribute to `ProductStockController` class.
2. Uncommented `[ClaimCheck("INVE_MANAGE_INVENTORY")]` on:
   - `AddProductStock` (`POST /api/ProductStock`)
   - `BulkUpdateProductStock` (`POST /api/ProductStock/bulk-update`)
   - `BulkAdjustProductStock` (`POST /api/ProductStock/bulk-adjust`)

---

## 4. Automated Verification

- Flipped characterization test in `DamagedStockTests.cs` to `Should_Return403_When_StockAdjustmentWithoutInventoryClaim_GapTargetFixed`, asserting HTTP 403 Forbidden when an unauthorized user attempts to adjust product stock.
