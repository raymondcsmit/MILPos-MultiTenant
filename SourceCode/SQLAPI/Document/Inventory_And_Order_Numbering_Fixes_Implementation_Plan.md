# Implementation Plan: Inventory Security, Stock Availability Guard & Order Numbering Fixes (BUG-19 through BUG-22)

**Document Reference:** `SourceCode/SQLAPI/Document/Inventory_And_Order_Numbering_Fixes_Implementation_Plan.md`  
**Target Environment:** .NET 10 Web API, SQLite (`POSDb.db`), Automated Tests  
**Defect Playbook Reference:** `Documentation/QA/11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md` (`N-40`, `N-35`, `N-36`, `N-13`)

---

## 1. Executive Summary & Goals

This plan targets four critical and high-severity defects identified in our QA defect catalog:

1. **BUG-19 (`N-40` / Critical Blocker):** `ImportExportController` completely open without `[Authorize]` or `[ClaimCheck]` across all 10 actions. Unauthenticated public clients can download the full customer, product, and supplier databases, or upload arbitrary records without credentials.
2. **BUG-20 (`N-35` / High Severity):** `ProductStockController` inventory modification endpoints (`[HttpPost]`, `bulk-update`, `bulk-adjust`) have `[ClaimCheck("INVE_MANAGE_INVENTORY")]` commented out and lack class-level `[Authorize]`, allowing unauthenticated or unclaimed users to alter stock.
3. **BUG-21 (`N-36` / High Severity):** `AddDamagedStockCommandHandler` decrements stock without checking available quantity, driving physical and database stock negative (e.g., stock = -5.0) instead of rejecting with HTTP 422.
4. **BUG-22 (`N-13` / Medium Severity):** `GetNewSalesOrderNumberQueryHandler` and `GetNewPurchaseOrderNumberQueryHandler` use `lastNumber.Replace(number.ToString(), "")`, corrupting padded sequence formatting (e.g., `SO#00009` -> `SO#000010`, expanding 5 digits to 6 digits).

---

## 2. Proposed Changes

### Component 1: Data Governance & Security Gates (BUG-19 & BUG-20)

#### [MODIFY] [ImportExportController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/ImportExportController.cs)
- Add `[Authorize]` attribute to `ImportExportController`.
- Decorate endpoints with module-specific claims:
  - `products/import`, `products/validate`: `[ClaimCheck("PRO_ADD_PRODUCT")]`
  - `products/export`, `products/template`: `[ClaimCheck("PRO_VIEW_PRODUCTS")]`
  - `customers/import`, `customers/validate`: `[ClaimCheck("CUST_ADD_CUSTOMER")]`
  - `customers/export`, `customers/template`: `[ClaimCheck("CUST_VIEW_CUSTOMERS")]`
  - `suppliers/import`, `suppliers/validate`: `[ClaimCheck("SUPP_ADD_SUPPLIER")]`
  - `suppliers/export`, `suppliers/template`: `[ClaimCheck("SUPP_VIEW_SUPPLIERS")]`

#### [MODIFY] [ProductStockController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/ProductStock/ProductStockController.cs)
- Add `[Authorize]` attribute at class level.
- Uncomment `[ClaimCheck("INVE_MANAGE_INVENTORY")]` on:
  - `[HttpPost]` (`AddProductStock`)
  - `[HttpPost("bulk-update")]` (`BulkUpdateProductStock`)
  - `[HttpPost("bulk-adjust")]` (`BulkAdjustProductStock`)

---

### Component 2: Inventory Availability & 0-Clamp Guard (BUG-21)

#### [MODIFY] [AddDamagedStockCommandHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Stock/Handlers/AddDamagedStockCommandHandler.cs)
- Before creating damaged stock records or booking accounting stock loss, query current stock for each product at `request.LocationId`.
- If `productStock == null || productStock.CurrentStock < item.DamagedQuantity`:
  - Return `ServiceResponse<List<DamagedStockDto>>.Return422($"Insufficient stock to write off damage. Available: {(productStock?.CurrentStock ?? 0)}, Requested: {item.DamagedQuantity}")`.
- This ensures stock cannot be driven negative, upholding inventory non-negativity invariants.

---

### Component 3: Sequential Order Number Generation (BUG-22)

#### [MODIFY] [GetNewSalesOrderNumberQueryHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/SalesOrder/Get/GetNewSalesOrderNumberQueryHandler.cs)
- Replace naive `lastSoNumber.Replace(soNumber.ToString(), "")` with robust regex decomposition:
  - Match prefix and numeric groups: `^([^\d]+)(\d+)$`.
  - Parse number, increment by 1, and format using `PadLeft(originalLength, '0')`.
  - Ensures `SO#00009` cleanly increments to `SO#00010` (5 digits preserved).

#### [MODIFY] [GetNewPurchaseOrderNumberQueryHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/PurchaseOrder/Get/GetNewPurchaseOrderNumberQueryHandler.cs)
- Apply the identical regex decomposition and zero-padding logic for purchase order numbers (`PO#00009` -> `PO#00010`).

---

### Component 4: Tests & QA Bug Reports

#### [NEW] [BUG-19-ImportExport-Open-Endpoints.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-19-ImportExport-Open-Endpoints.md)
#### [NEW] [BUG-20-ProductStock-Missing-ClaimChecks.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-20-ProductStock-Missing-ClaimChecks.md)
#### [NEW] [BUG-21-DamagedStock-Negative-Inventory.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-21-DamagedStock-Negative-Inventory.md)
#### [NEW] [BUG-22-OrderNumber-Digit-Expansion.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-22-OrderNumber-Digit-Expansion.md)
#### [MODIFY] [00_BUGS_AND_ISSUES_INDEX.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/00_BUGS_AND_ISSUES_INDEX.md)

#### [MODIFY] [ImportExportTests.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/Tests/POS.API.Tests/D09ImportExport/ImportExportTests.cs)
- Update Gap-Characterization tests into Gap-Target tests asserting HTTP 401 when unauthenticated and HTTP 200 when authenticated with proper claims.

#### [MODIFY] [ImportRoundTripTests.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/Tests/POS.API.Tests/D09ImportExport/ImportRoundTripTests.cs)
- Update to use authorized client with `PRO_ADD_PRODUCT` and `PRO_VIEW_PRODUCTS` claims.

#### [MODIFY] [DamagedStockTests.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/Tests/POS.API.Tests/Inventory/DamagedStockTests.cs)
- Flip `Should_AllowStockAdjustment_WithoutInventoryClaim_GapCharacterization` to verify HTTP 403 Forbidden for unclaimed users.
- Add `Should_Return422_When_DamagedQuantityExceedsAvailableStock`.

#### [NEW] [OrderNumberGenerationTests.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/Tests/POS.MediatR.Tests/SalesOrder/OrderNumberGenerationTests.cs)
- Verify `SO#00009` -> `SO#00010`, `PO#00009` -> `PO#00010`, and boundary increments (`00099` -> `00100`).

---

## 3. Verification Plan

### Automated Tests
```bash
# 1. Verify ImportExport auth gates
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~D09ImportExport"

# 2. Verify ProductStock & DamagedStock claims and 0-clamp guard
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~DamagedStockTests"

# 3. Verify Order Numbering generation
dotnet test Tests\POS.MediatR.Tests\POS.MediatR.Tests.csproj --filter "FullyQualifiedName~OrderNumberGenerationTests"
```

### Safety Guarantees
- `POS.API/POSDb.db` SQLite database preserved with existing test transactions.
- Zero weakened assertions; all characterization tests flipped to green gap-target tests.
