# Work Document: Inventory Security, Stock Availability Guard & Order Numbering Fixes (BUG-19 through BUG-22)

**Document Reference:** `SourceCode/SQLAPI/Document/Inventory_And_Order_Numbering_Fixes_WorkDocument.md`  
**Target Environment:** .NET 10 Web API, SQLite (`POSDb.db`), Automated Tests  
**Defect Playbook Reference:** `Documentation/QA/11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md` (`N-40`, `N-35`, `N-36`, `N-13`)  
**Status:** **Completed & Verified (19/19 Automated Tests Passing — 100% Green)**  

---

## 1. Executive Summary

This work package successfully remediated four critical and high-severity defects identified in our master QA defect catalog:

1. **BUG-19 (`N-40` / Critical Blocker):** `ImportExportController` completely open without `[Authorize]` or `[ClaimCheck]` across all 10 actions, allowing unauthenticated public callers to export full product, customer, and supplier databases or upload unverified records.
2. **BUG-20 (`N-35` / High Severity):** `ProductStockController` inventory mutation routes (`[HttpPost]`, `bulk-update`, `bulk-adjust`) had `[ClaimCheck("INVE_MANAGE_INVENTORY")]` commented out and lacked `[Authorize]`.
3. **BUG-21 (`N-36` / High Severity):** `AddDamagedStockCommandHandler` decremented stock without checking available quantity, driving physical stock negative (e.g., from 0 to -2).
4. **BUG-22 (`N-13` / Medium Severity):** `GetNewSalesOrderNumberQueryHandler` and `GetNewPurchaseOrderNumberQueryHandler` string replacement (`.Replace(number.ToString(), "")`) corrupted zero-padded sequences on decade boundaries (`SO#00009` -> `SO#000010`, expanding 5 digits to 6 digits).

---

## 2. Detailed Technical Changes

### Component 1: Data Governance & Route Protection (BUG-19 & BUG-20)
- **`POS.API/Controllers/ImportExportController.cs`**:
  - Added `[Authorize]` attribute at the class level.
  - Decorated all 10 endpoints with module-specific permissions:
    - `products/import`, `products/validate`: `[ClaimCheck("PRO_ADD_PRODUCT")]`
    - `products/export`, `products/template`: `[ClaimCheck("PRO_VIEW_PRODUCTS")]`
    - `customers/import`, `customers/validate`: `[ClaimCheck("CUST_ADD_CUSTOMER")]`
    - `customers/export`, `customers/template`: `[ClaimCheck("CUST_VIEW_CUSTOMERS")]`
    - `suppliers/import`, `suppliers/validate`: `[ClaimCheck("SUPP_ADD_SUPPLIER")]`
    - `suppliers/export`, `suppliers/template`: `[ClaimCheck("SUPP_VIEW_SUPPLIERS")]`
- **`POS.API/Controllers/ProductStock/ProductStockController.cs`**:
  - Added `[Authorize]` at class level.
  - Uncommented and enabled `[ClaimCheck("INVE_MANAGE_INVENTORY")]` on:
    - `[HttpPost]` (`AddProductStock`)
    - `[HttpPost("bulk-update")]` (`BulkUpdateProductStock`)
    - `[HttpPost("bulk-adjust")]` (`BulkAdjustProductStock`)

### Component 2: Stock Availability Guard & Zero-Clamp (BUG-21)
- **`POS.MediatR/Stock/Handlers/AddDamagedStockCommandHandler.cs`**:
  - Added input validation ensuring at least one damaged item is specified.
  - Queried existing stock levels at `request.LocationId` for all requested product IDs.
  - Added pre-write availability check:
    ```csharp
    foreach (var item in request.DamagedStockItems)
    {
        var productStock = stockList.FirstOrDefault(s => s.ProductId == item.ProductId);
        if (productStock == null || productStock.CurrentStock < item.DamagedQuantity)
        {
            return ServiceResponse<List<DamagedStockDto>>.Return422(
                $"Insufficient stock to write off damage. Available: {(productStock?.CurrentStock ?? 0)}, Requested: {item.DamagedQuantity}");
        }
    }
    ```
  - Reused the pre-fetched `stockList` for creating the accounting transaction items, avoiding redundant queries.

### Component 3: Sequential Order Number Generation (BUG-22)
- **`POS.MediatR/SalesOrder/Get/GetNewSalesOrderNumberQueryHandler.cs`**:
  - Replaced naive string replacement with anchored regex decomposition:
    ```csharp
    var match = Regex.Match(lastSoNumber, @"^(.*?)(\d+)$");
    if (match.Success && int.TryParse(match.Groups[2].Value, out int soNumber))
    {
        var prefix = match.Groups[1].Value;
        var digitsLength = match.Groups[2].Value.Length;
        var nextNumber = soNumber + 1;
        return $"{prefix}{nextNumber.ToString().PadLeft(digitsLength, '0')}";
    }
    ```
- **`POS.MediatR/PurchaseOrder/Get/GetNewPurchaseOrderNumberQueryHandler.cs`**:
  - Applied the identical regex decomposition and zero-padding logic for purchase orders.

---

## 3. Automated Test Verification (100% Passing)

### Test Suite 1: `D09ImportExport` (10/10 Passed)
- `Should_Return401_When_ExportingProducts_Unauthenticated` — **PASSED**
- `Should_Return401_When_ReachingExportsAndTemplates_Unauthenticated` (5 data variants) — **PASSED**
- `Should_Return401_When_ReachingImportRoute_Unauthenticated` — **PASSED**
- `Should_Return403_When_ReachingExport_WithoutClaims` — **PASSED**
- `Should_ExportProducts_Csv_When_Authorized` — **PASSED**
- `Should_ServeTemplate_And_ValidateProductCsv_When_Authorized` — **PASSED**

### Test Suite 2: `DamagedStockTests` (6/6 Passed)
- `Should_CreateDamagedStock_And_PersistRows` — **PASSED**
- `Should_ReduceCurrentStock_When_StockIsAvailable` — **PASSED**
- `Should_Return422_When_DamagedStockExceedsAvailableStock_GapTargetN36Fixed` — **PASSED**
- `Should_Return403_When_PostingDamagedStockWithoutManageClaim` — **PASSED**
- `Should_ListDamagedStock_When_Claimed` — **PASSED**
- `Should_Return403_When_StockAdjustmentWithoutInventoryClaim_GapTargetFixed` — **PASSED**

### Test Suite 3: `OrderNumberingTests` (3/3 Passed)
- `Should_IncrementSalesOrderNumber_PreservingFiveDigits_When_LastNumberEndsInNine` (`SO#00009` -> `SO#00010`) — **PASSED**
- `Should_IncrementSalesOrderNumber_When_LastNumberIsDoubleNine` (`SO#00099` -> `SO#00100`) — **PASSED**
- `Should_IncrementPurchaseOrderNumber_PreservingFiveDigits_When_LastNumberEndsInNine` (`PO#00009` -> `PO#00010`) — **PASSED**

---

## 4. Defect Documentation Authored

- [BUG-19-ImportExport-Open-Endpoints.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-19-ImportExport-Open-Endpoints.md)
- [BUG-20-ProductStock-Missing-ClaimChecks.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-20-ProductStock-Missing-ClaimChecks.md)
- [BUG-21-DamagedStock-Negative-Inventory.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-21-DamagedStock-Negative-Inventory.md)
- [BUG-22-OrderNumber-Digit-Expansion.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-22-OrderNumber-Digit-Expansion.md)
- Updated [00_BUGS_AND_ISSUES_INDEX.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/00_BUGS_AND_ISSUES_INDEX.md) (All 22 bugs documented and fixed).

---

## 5. Storage Integrity
- SQLite database `SourceCode/SQLAPI/POS.API/POSDb.db` verified intact (3,502,080 bytes) with all user and transaction data preserved.
