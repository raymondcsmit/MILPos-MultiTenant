# Implementation Plan: Security Hardening & Payment Data Integrity Fixes (BUG-15 through BUG-18)

**Document Version:** 1.0  
**Target Solution:** MILPOS Multi-Tenant (.NET 10 Web API & SQLite Database)  
**Location:** `SourceCode/SQLAPI/Document/Security_And_Data_Integrity_Bug_Fixing_Implementation_Plan.md`  
**Date:** September 2026  

---

## 1. Goal Description

Continuing our systematic QA defect detection and remediation process, this implementation tackles four critical bugs discovered from our defect catalog (`Documentation/QA/11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md`):

1. **BUG-15 (`N-08`): `UpdateRoleCommandHandler` 500 Crash on Unknown Role**
   - When updating a role with a non-existent ID, `_roleRepository.FindByInclude` returns `null`.
   - Accessing `entityExist.IsSuperRole` throws an unhandled `NullReferenceException`, returning HTTP 500 rather than `404 Not Found`.

2. **BUG-16 (`N-05`): Double-Subtraction in Payment Deletion Handlers**
   - Both `DeleteSalesOrderPaymentCommandHandler.cs` and `DeletePurchaseOrderPaymentCommandHandler.cs` decrement `TotalPaidAmount` by the deleted payment amount (`TotalPaidAmount = TotalPaidAmount - Amount`).
   - Immediately following this, the `PaymentStatus` recheck condition subtracts `Amount` a *second* time:
     `else if (order.TotalAmount <= order.TotalPaidAmount - payment.Amount)`.
   - On an overpaid or settled order, this double-subtraction causes a fully paid order (`TotalPaidAmount >= TotalAmount`) to be erroneously flipped to `PaymentStatus.Partial`.

3. **BUG-17 (`N-02`): Unclaimed Email Dispatch in `EmailController`**
   - `EmailController.SendSalesOrdPurchase` (`POST /api/Email/salesOrPurchase`) lacks a `[ClaimCheck]` attribute, allowing any authenticated user (regardless of whether they have `EMAIL_SEND_EMAIL` claims) to dispatch sales and purchase order emails.

4. **BUG-18 (`N-03` & `N-07`): Missing `[Authorize]` and Claim Gates in `ReportsController` and `CustomerLedgerController`**
   - `ReportsController.cs` has `//[Authorize]` commented out at the class level, and `GetAllPaymentEntryReport` (`GET /api/Reports/Paymentreport`) has no claim check, allowing anonymous public users to inspect confidential payment records.
   - `CustomerLedgerController.cs` lacks `[Authorize]` at the class level, and mutations/queries (`DELETE /api/CustomerLedger/{id}`, `GET {id}/overdue`, `GET {id}`) lack `[ClaimCheck]` enforcement.

---

## 2. Proposed Changes

### Component 1: Roles & Identity (`POS.MediatR`)
#### [MODIFY] [`UpdateRoleCommandHandler.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Role/Handlers/UpdateRoleCommandHandler.cs)
- Add null check after fetching `entityExist`.
- If `entityExist == null`, log warning and return `ServiceResponse<RoleDto>.Return404("Role not found.")`.

---

### Component 2: Order Payments (`POS.MediatR`)
#### [MODIFY] [`DeleteSalesOrderPaymentCommandHandler.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/SalesOrderPayment/Handler/DeleteSalesOrderPaymentCommandHandler.cs)
- Fix line 66: replace `else if (salesOrder.TotalAmount <= salesOrder.TotalPaidAmount - salesOrderPayment.Amount)` with:
  `else if (salesOrder.TotalAmount <= salesOrder.TotalPaidAmount)`.
- Update error logging message from "Purchase Order Payment" copy-paste typo to "Sales Order Payment".

#### [MODIFY] [`DeletePurchaseOrderPaymentCommandHandler.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/PurchaseOrderPayment/Handler/DeletePurchaseOrderPaymentCommandHandler.cs)
- Fix line 67: replace `else if (purchaseOrder.TotalAmount <= purchaseOrder.TotalPaidAmount - purchaseOrderPayment.Amount)` with:
  `else if (purchaseOrder.TotalAmount <= purchaseOrder.TotalPaidAmount)`.

---

### Component 3: API Security & Claims (`POS.API`)
#### [MODIFY] [`EmailController.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/Email/EmailController.cs)
- Add `[ClaimCheck("EMAIL_SEND_EMAIL")]` to `SendSalesOrdPurchase`.

#### [MODIFY] [`ReportsController.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/Accounting/ReportsController.cs)
- Uncomment `[Authorize]` on `ReportsController`.
- Add `[ClaimCheck("ACCOUNTING_VIEW_GENERAL_ENTRY_REPORT")]` (or `ACCOUNTING_VIEW_TRANSACTIONS`) to `GetAllPaymentEntryReport`.

#### [MODIFY] [`CustomerLedgerController.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/CustomerLedger/CustomerLedgerController.cs)
- Add `[Authorize]` attribute to class declaration.
- Add `[ClaimCheck("CUST_MANAGE_CUSTOMER_LADGER")]` to `DeleteAccountLedger` (`DELETE /api/CustomerLedger/{id}`).
- Add `[ClaimCheck("CUST_VIEW_CUSTOMER_LADGERS")]` to `GetCustomerLedger` (`GET /api/CustomerLedger/{id}`), `LedgerSearch`, and `GetSalesOrderOverdueByCustomerId`.

---

### Component 4: Defect Documentation & Testing
#### [NEW] [`Documentation/Bugs-Issues/BUG-15-UpdateRole-UnknownRole-500-NRE.md`](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-15-UpdateRole-UnknownRole-500-NRE.md)
#### [NEW] [`Documentation/Bugs-Issues/BUG-16-Payment-Delete-Double-Subtraction.md`](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-16-Payment-Delete-Double-Subtraction.md)
#### [NEW] [`Documentation/Bugs-Issues/BUG-17-Email-SalesOrPurchase-Missing-ClaimCheck.md`](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-17-Email-SalesOrPurchase-Missing-ClaimCheck.md)
#### [NEW] [`Documentation/Bugs-Issues/BUG-18-Reports-And-CustomerLedger-Open-Endpoints.md`](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-18-Reports-And-CustomerLedger-Open-Endpoints.md)
#### [MODIFY] [`Documentation/Bugs-Issues/00_BUGS_AND_ISSUES_INDEX.md`](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/00_BUGS_AND_ISSUES_INDEX.md)

#### [MODIFY] [`Tests/POS.API.Tests/SalesOrders/SalesOrderGapCharacterizationTests.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/Tests/POS.API.Tests/SalesOrders/SalesOrderGapCharacterizationTests.cs)
- Flip characterization test `Should_DoubleSubtractPaymentAmount_When_DeletingOnOverpaidOrder` to Gap-Target test `Should_MaintainPaidStatus_When_DeletingPaymentOnOverpaidOrder_GapTargetFixed`, asserting `order.PaymentStatus == PaymentStatus.Paid`.

#### [NEW] [`Tests/POS.API.Tests/D09SysAdmin/RoleUpdateUnknownIdTests.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/Tests/POS.API.Tests/D09SysAdmin/RoleUpdateUnknownIdTests.cs)
- Verify `PUT /api/Role/{unknownGuid}` returns `HTTP 404 Not Found` rather than `HTTP 500`.

---

## 3. Verification Plan

### Automated Tests
Run integration tests for the repaired behaviors:
```bash
# Verify Role 404 on unknown ID
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~RoleUpdateUnknownIdTests"

# Verify Payment Delete maintains Paid status on overpaid order
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~SalesOrderGapCharacterizationTests.Should_MaintainPaidStatus_When_DeletingPaymentOnOverpaidOrder_GapTargetFixed"

# Verify Customer Ledger & Reports security gates
dotnet test Tests\POS.API.Tests\POS.API.Tests.csproj --filter "FullyQualifiedName~CustomerLedgerTests"
```

### Manual Verification
- Verify that sending `PUT /api/Role/00000000-0000-0000-0000-000000009999` with admin token returns HTTP 404.
- Verify anonymous request to `GET /api/Reports/Paymentreport` returns HTTP 401 Unauthorized.
- Verify SQLite database `POSDb.db` remains intact with all historical test data.
