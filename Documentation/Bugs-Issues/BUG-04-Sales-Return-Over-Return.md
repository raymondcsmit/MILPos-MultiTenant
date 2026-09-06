# Defect Report: BUG-04 (N-04)

**Bug ID:** BUG-04  
**Legacy Reference:** N-04 / TC-D03.045  
**Component:** Backend MediatR (`SourceCode/SQLAPI/POS.MediatR/SalesOrder/Handlers/UpdateSalesOrderCommandReturnHandler.cs`)  
**Module:** Sales Order Returns & Inventory Reversal  
**Severity:** **HIGH**  
**Reproducible:** 100% Deterministic  

---

## 1. Description & Impact

When a sales order return (`POST /api/salesorder/return`) is processed, the system lacks validation to check if the return quantity exceeds the original quantity sold (or the remaining unreturned quantity).
An operator or malicious actor can submit a return request for 100 units on an order where only 5 units were purchased.

### Impact:
- **Inventory Inflation:** The return handler restores inventory into `ProductStock` for the returned quantity, creating phantom physical stock out of thin air.
- **Financial Fraud / Over-Refunding:** The payment/refund service issues refunds or accounts receivable credits exceeding the total original order value.

---

## 2. Root Cause Analysis

In `UpdateSalesOrderCommandReturnHandler.cs`:
The handler iterates through `request.SalesOrderItems`, loads the existing order and its items, but does not assert that:
```csharp
returnItem.Quantity <= (originalOrderItem.Quantity - alreadyReturnedQuantity)
```
If `returnItem.Quantity` is greater than `originalOrderItem.Quantity`, the handler proceeds, updates stock, creates accounting journal entries, and persists the return without error.

---

## 3. Remediation Plan

1. In `UpdateSalesOrderCommandReturnHandler.cs` (or an attached FluentValidator `UpdateSalesOrderCommandReturnValidator`):
   - Query the original `SalesOrder` including its `SalesOrderItems`.
   - Calculate previously returned quantities for each item from existing return records or return tracking fields.
   - If any `returnItem.Quantity > (originalItem.Quantity - previousReturns)`, immediately reject the request with `ServiceResponse<SalesOrderDto>.Return409("Return quantity cannot exceed purchased quantity.")` or 422 Unprocessable Entity.
2. Write unit tests in `Tests/POS.MediatR.Tests` and integration tests in `Tests/POS.API.Tests` to verify rejection of over-returns.
