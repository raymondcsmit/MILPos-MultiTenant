# BUG-16: Payment Deletion Handlers Double-Subtract Amount, Erroneously Downgrading Settled Orders to Partial

**Defect ID:** BUG-16 (`N-05` / `INT-07`)  
**Severity:** 🟠 High  
**Subsystem:** Sales & Purchase Order Payments (`POS.MediatR`)  
**Status:** **FIXED & VERIFIED**  
**Root Cause Files:**
- [`SourceCode/SQLAPI/POS.MediatR/SalesOrderPayment/Handler/DeleteSalesOrderPaymentCommandHandler.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/SalesOrderPayment/Handler/DeleteSalesOrderPaymentCommandHandler.cs#L60-L66)
- [`SourceCode/SQLAPI/POS.MediatR/PurchaseOrderPayment/Handler/DeletePurchaseOrderPaymentCommandHandler.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/PurchaseOrderPayment/Handler/DeletePurchaseOrderPaymentCommandHandler.cs#L61-L67)

---

## 1. Description & Impact

When deleting a payment for a Sales Order or Purchase Order:
1. `salesOrder.TotalPaidAmount` is decremented by `salesOrderPayment.Amount`:
   ```csharp
   salesOrder.TotalPaidAmount = salesOrder.TotalPaidAmount - salesOrderPayment.Amount;
   ```
2. Immediately following this, the recheck logic to determine whether the order remains `Paid` evaluated:
   ```csharp
   else if (salesOrder.TotalAmount <= salesOrder.TotalPaidAmount - salesOrderPayment.Amount)
   {
       salesOrder.PaymentStatus = PaymentStatus.Paid;
   }
   ```
Because `TotalPaidAmount` was already decremented on the preceding line, subtracting `salesOrderPayment.Amount` a second time caused the comparison to test against `TotalPaidAmount - 2 * Amount`.

### Failure Scenario:
- An order of $100.00 has two payments of $100.00 applied (TotalPaidAmount = $200.00, overpaid or multiple payments).
- One $100.00 payment is deleted.
- Correct remainder: $200.00 - $100.00 = $100.00 paid. Since $100.00 TotalAmount <= $100.00 TotalPaidAmount, the order should remain **`PaymentStatus.Paid`**.
- Defective behavior: Evaluated `100.00 <= 100.00 - 100.00` (100.00 <= 0.00) which evaluates to `false`.
- The order was erroneously demoted to **`PaymentStatus.Partial`**!

The exact same defect was mirrored in `DeletePurchaseOrderPaymentCommandHandler.cs:67`.

---

## 2. Remediation

In both `DeleteSalesOrderPaymentCommandHandler.cs` and `DeletePurchaseOrderPaymentCommandHandler.cs`:
```csharp
if (order.TotalPaidAmount == 0)
{
    order.PaymentStatus = PaymentStatus.Pending;
}
else if (order.TotalAmount <= order.TotalPaidAmount)
{
    order.PaymentStatus = PaymentStatus.Paid;
}
else
{
    order.PaymentStatus = PaymentStatus.Partial;
}
```

---

## 3. Verification

- **Automated Integration Test:** `SalesOrderGapCharacterizationTests.Should_MaintainPaidStatus_When_DeletingPaymentOnOverpaidOrder_GapTargetFixed`
- **Result:** **PASSED** (asserts that after deleting the second payment, `order.TotalPaidAmount == 100.00m` and `order.PaymentStatus == PaymentStatus.Paid`).
