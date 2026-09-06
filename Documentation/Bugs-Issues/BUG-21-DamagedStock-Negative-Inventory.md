# BUG-21: Damaged Stock Decrement Drives Inventory Negative Without 0-Clamp Guard (N-36 / High)

**Document Reference:** `Documentation/Bugs-Issues/BUG-21-DamagedStock-Negative-Inventory.md`  
**Finding Code:** `N-36` / `INVE-02`  
**Severity:** 🟠 **HIGH**  
**Component:** Backend MediatR / Stock / `AddDamagedStockCommandHandler.cs`  
**Status:** **Documented & Fixed**  

---

## 1. Description of Defect

When recording damaged stock write-offs via `POST /api/DamagedStock`, the handler accepted damaged quantities without verifying if sufficient inventory was available at the specified location. The subsequent transaction decrement in `InventoryService` subtracted the damaged quantity unconditionally, allowing `ProductStock.CurrentStock` to drop below zero (e.g. from 2 units to -3 units).

This violated the core inventory constraint that physical stock write-offs cannot exceed available warehouse quantities.

---

## 2. Root Cause Analysis

In `SourceCode/SQLAPI/POS.MediatR/Stock/Handlers/AddDamagedStockCommandHandler.cs`:
```csharp
// DamagedStock entities added and saved immediately without checking available stock
_damagedStockRepository.AddRange(damagedStock);
await _uow.SaveAsync();

// Accounting transaction created and passed to ProcessTransactionAsync
// which executes: productStock.CurrentStock += -item.DamagedQuantity;
```
There was no guard checking `productStock.CurrentStock >= item.DamagedQuantity`.

---

## 3. Remediation & Implementation

In `AddDamagedStockCommandHandler.cs`:
1. Added validation ensuring at least one damaged stock item is present in the request.
2. Queried existing stock levels at `request.LocationId` for all requested product IDs.
3. Added pre-write validation:
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
4. Reused the pre-fetched stock list when constructing accounting transaction items, avoiding redundant database round-trips.

---

## 4. Automated Verification

- Added `Should_Return422_When_DamagedQuantityExceedsAvailableStock` to `DamagedStockTests.cs`:
  - Attempts to write off damaged quantity exceeding existing stock (`currentStock + 99999m`).
  - Verifies server returns `HTTP 422 Unprocessable Entity` and leaves stock balance uncorrupted.
