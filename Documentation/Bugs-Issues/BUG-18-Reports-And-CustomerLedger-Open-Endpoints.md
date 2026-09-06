# BUG-18: Commented-Out `[Authorize]` and Unclaimed Actions in `ReportsController` and `CustomerLedgerController`

**Defect ID:** BUG-18 (`N-03` & `N-07` / `SEC-11`)  
**Severity:** 🔴 Critical  
**Subsystem:** Financial Reporting & Customer Ledgers (`POS.API`)  
**Status:** **FIXED & VERIFIED**  
**Root Cause Files:**
- [`SourceCode/SQLAPI/POS.API/Controllers/Accounting/ReportsController.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/Accounting/ReportsController.cs#L18)
- [`SourceCode/SQLAPI/POS.API/Controllers/CustomerLedger/CustomerLedgerController.cs`](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/CustomerLedger/CustomerLedgerController.cs#L14)

---

## 1. Description & Vulnerability Analysis

1. **`ReportsController.cs` (N-03):**
   - At class level, line 18 had `//[Authorize]` commented out.
   - Action `GetAllPaymentEntryReport` (`GET /api/Reports/Paymentreport`) had no `[ClaimCheck]` attribute.
   - **Vulnerability:** Any anonymous, unauthenticated public client could query `/api/Reports/Paymentreport` and dump full financial payment records, amounts, references, and customer metadata across the system.

2. **`CustomerLedgerController.cs` (N-07):**
   - Missing `[Authorize]` at the class level.
   - Action `DeleteAccountLedger` (`DELETE /api/CustomerLedger/{id}`) lacked any `[ClaimCheck]`.
   - Actions `GetCustomerLedger`, `LedgerSearch`, and `GetSalesOrderOverdueByCustomerId` lacked `[ClaimCheck]`.
   - **Vulnerability:** Ledger entries could be accessed and permanently deleted by unauthorized callers.

---

## 2. Remediation

1. **`ReportsController.cs`:**
   - Added `using Microsoft.AspNetCore.Authorization;`
   - Uncommented `[Authorize]` attribute at the controller class level.
   - Added `[ClaimCheck("ACCOUNTING_VIEW_GENERAL_ENTRY_REPORT")]` to `GetAllPaymentEntryReport`.

2. **`CustomerLedgerController.cs`:**
   - Added `using Microsoft.AspNetCore.Authorization;`
   - Added `[Authorize]` attribute at the controller class level.
   - Added `[ClaimCheck("CUST_MANAGE_CUSTOMER_LADGER")]` to `DeleteAccountLedger`.
   - Added `[ClaimCheck("CUST_VIEW_CUSTOMER_LADGERS")]` to `GetCustomerLedger`, `LedgerSearch`, and `GetSalesOrderOverdueByCustomerId`.

---

## 3. Verification

- **Automated Integration Tests:**
  - `EmailAndReportsGateTests.Should_Return401_When_PaymentReportRequestedUnauthenticated_GapTargetFixed`
  - `EmailAndReportsGateTests.Should_Return403_When_PaymentReportRequestedWithoutClaim_GapTargetFixed`
  - `EmailAndReportsGateTests.Should_Return401_When_CustomerLedgerMutatedUnauthenticated_GapTargetFixed`
- **Result:** **PASSED** (unauthenticated access rejected with HTTP 401; callers without claims rejected with HTTP 403 Forbidden).
