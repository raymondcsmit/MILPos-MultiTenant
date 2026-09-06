# 11 — QA Defect Catalog & Bug-Hunting Playbook

**Module:** Consolidated Master Defect Repository, Edge-Case Exception Reproduction & Bug-Hunting Scripts  
**Location:** `Documentation/QA/11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Coverage:** All 45+ Discovered Findings (N-01 to N-45), Architectural Gaps (INT, ACC, SEC, BIZ, REP, RT, SYN, UX)

---

## 1. Executive Bug-Hunting Charter

This document provides QA engineers, SDETs, and penetration testers with a concrete, executable defect-reproduction catalog. It isolates the exact payloads, query parameters, HTTP headers, and environmental conditions required to trigger, reproduce, and verify resolution of every documented defect, runtime exception, race condition, and data corruption scenario in MILPOS.

### Primary Defect Categories:
1. **Unhandled Runtime Crashes (500 Internal Server Error & NullReferenceExceptions):** Requests that crash the backend due to missing null guards, missing ledger accounts, or unhandled database constraints.
2. **Double-Operations & False Rollbacks:** Logic errors that double-subtract balances or trigger false transaction rollbacks due to double-save patterns.
3. **Financial & Accounting Distortions:** Journal generation flaws that corrupt balance sheets, inflate net income, or violate debit/credit parity.
4. **Inventory & Stock Desynchronizations:** Operations that drive physical or database inventory negative, bypass journals, or miscalculate unit conversions.
5. **Open Security Gates & Missing Authorization:** Endpoints exposed to unauthenticated public callers or lacking claim enforcement.
6. **Concurrency Race Conditions:** High-volume simultaneous transactions generating database collisions and locking storms.

---

## 2. Master Defect Cross-Reference Matrix

| Defect ID | Severity | Module / Domain | Flaw Description | Root Cause File & Line | Target Status |
|---|---|---|---|---|---|
| **N-01** | 🔴 Critical | Desktop / Sync | `SyncController` has NO `[Authorize]` attribute | `SyncController.cs:12` | Unauthenticated Sync |
| **N-02** | 🔴 Critical | Email / Jobs | `EmailController.salesOrPurchase` has no auth/claims | `EmailController.cs:35` | Open Email Dispatch |
| **N-03** | 🔴 Critical | Reporting | `Paymentreport` has `[Authorize]` commented out | `PaymentreportController.cs:18`| Open Payment Audit |
| **N-04** | 🟠 High | Sales Orders | Sales returns allow returns > original sold quantity | `UpdateSalesOrderCommandReturnHandler.cs`| Over-Return Accepted |
| **N-05** | 🟠 High | Sales Orders | Payment delete double-subtracts amount on overpaid order | `DeleteSalesOrderPaymentCommandHandler.cs`| Double-Subtraction |
| **N-06** | 🟠 High | Desktop / Sync | Push sync never advances `LastPushSync` timestamp | `SyncEngine.cs:88` | Rescans From Epoch |
| **N-07** | 🟠 High | Accounting | Customer Ledger DELETE & Overdue endpoints lack claims | `CustomerLedgerController.cs:45`| Unclaimed Ledger Mutate |
| **N-08** | 🟠 High | Users & Roles | `UpdateRoleCommandHandler` throws NRE on unknown role | `UpdateRoleCommandHandler.cs:34`| Unhandled 500 Crash |
| **N-09** | 🟠 High | Security | JWT `ClockSkew` set to full token lifetime (up to 2×) | `Startup.cs` / `JwtBearer` | Expired Token Valid |
| **N-10** | 🟡 Medium | Purchasing | POR→PO conversion never posts stock or accounting | `UpdatePurchaseOrderCommandHandler.cs` | Missing Stock Posting |
| **N-11** | 🟡 Medium | Reporting | Dashboard cache TTL 15 min; payment operator bug | `GetDashboardStatisticsQueryHandler.cs`| Stale / All-Time Sum |
| **N-12** | 🟡 Medium | Inventory | Stock transfer delete uses type-flip, hard-deletes GL | `DeleteStockTransferCommandHandler.cs` | Unaudited Reversal |
| **N-13** | 🟡 Medium | Sales Orders | Order numbering replaces `9` with `10` erroneously | `GetNewSalesOrderNumberQueryHandler.cs` | `SO#00009` → `SO#000010` |
| **N-14** | 🟡 Medium | POS Screen | POS screen never floors totals; submits decimals | `pos.component.ts` | Unfloored Total Sent |
| **N-15** | ⚪ Low | FBR Tax | FBR backoff retry wait is 120s vs documented 60s | `FBRInvoiceService.cs` | Timing Mismatch |
| **N-16/20**| 🔴 Critical | Purchasing | PO return with refund 500s due to double-save | `UpdatePurchaseOrderReturnCommandHandler.cs` | **FIXED in Wave 1** |
| **N-17** | 🟠 High | Diagnostics | Profiler writes query traces into operational SQLite | `ProfilerDrainWriter.cs` | SQLite Lock Storms |
| **N-18** | 🟡 Medium | FBR Tax | NTN/CNIC persisted for non-FBR locations | `SalesOrderProfile.cs` | Unnecessary Data |
| **N-19** | 🔴 Critical | Auth / Reset | Password reset code validation used `&&` instead of `\|\|` | `ResetPasswordCommandHandler.cs` | **FIXED in Wave 1** |
| **N-21** | 🔴 Critical | Licensing | Tenant license mutation dropped on NoTracking context | `ValidateLicenseCommandHandler.cs` | **FIXED in Wave 1** |
| **N-22** | 🟠 High | Sales Orders | Back-office PENDING sales orders deduct stock at create | `AddSalesOrderCommandHandler.cs` | Premature Stock Drop |
| **N-23** | 🟡 Medium | Accounting | Transaction PaidAmount/BalanceAmount unmaintained | `PaymentService.cs` | Fields Remain Zero |
| **N-24** | 🟡 Medium | Sales Orders | Race on OrderNumber causes unhandled 500 instead of 409 | `AddSalesOrderCommandHandler.cs` | Loser Gets 500 Error |
| **N-25** | 🟡 Medium | Security | ApiKeyLastUsedDate never persists (NoTracking context) | `ApiKeyAuthenticationMiddleware.cs` | Silent No-Op Update |
| **N-26** | 🟠 High | Multi-Tenancy | Tenant registration CSV fallback hits SQLite FK 19 error| `TenantRegistrationService.cs` | Registration 400s |
| **N-27** | 🟡 Medium | Suppliers | Supplier duplicate returns 422 vs 409; Address FKs req | `AddSupplierCommandHandler.cs` | Status Inconsistency |
| **N-28** | 🟡 Medium | Locations | AddLocation flattens 409 into HTTP 400 BadRequest | `LocationController.cs:32` | Misleading HTTP 400 |
| **N-29** | 🟠 High | CRM / Cust | Duplicate MobileNo hits unhandled unique index 500 | `AddCustomerCommandHandler.cs` | Unguarded 500 Crash |
| **N-30** | 🔴 Critical | Inventory | `AddProductCommandHandler` NRE if productVariants null | `AddProductCommandHandler.cs:89` | **FIXED in Wave 3** |
| **N-31** | 🔴 Critical | Inventory | `UpdateProductCommandHandler` NRE if productTaxes null | `UpdateProductCommandHandler.cs` | **FIXED in Wave 3** |
| **N-32** | 🔴 Critical | Desktop | Stale template `POSDb.db` fails export with missing cols | `ExportTenantToSqliteCommandHandler.cs`| **FIXED in Wave 3** |
| **N-34** | 🔴 Critical | FBR Tax | `FBRController` completely unclaimed | `FBRController.cs:18` | Open Tax Submission |
| **N-35** | 🟠 High | Inventory | `ProductStockController` mutation routes lack ClaimCheck| `ProductStockController.cs:30` | Open Stock Alteration |
| **N-36** | 🟠 High | Inventory | Damaged stock decrements CurrentStock without 0-clamp | `AddDamagedStockCommandHandler.cs` | Negative Stock Driven |
| **N-37** | 🟠 High | Accounting | `CustomerLedger` list 500s on OrderBy accountDate | `PropertyMappingService.cs` | **FIXED in Wave 3** |
| **N-39** | 🟡 Medium | Accounting | Direct entry ReferenceNumber stored in TransactionNo | `AddGeneralEntryCommandHandler.cs` | Column Misalignment |
| **N-40** | 🔴 Critical | Data Gov | `ImportExportController` completely open (all 10 actions)| `ImportExportController.cs:15` | Public DB Download |
| **N-41** | 🔴 Critical | Lookups | AddCountry/City/Variant 500 on SQLite FK (Guid.Empty) | `AddCountryCommandHandler.cs` | **FIXED in Wave 3** |
| **N-42** | 🔴 Critical | CRM / Contact| `ContactUsController` completely open (CRUD actions) | `ContactUsController.cs:14` | Public Message Leak |
| **N-43** | 🔴 Critical | Licensing | `WrLicenseController` open & validate gives dummy token | `WrLicenseController.cs:20` | Dummy Auth Handout |
| **N-44** | 🟠 High | Frontend UI | CustomerSalesOrderList filter used `:` instead of `#` | `customer-sales-order.component.ts`| **FIXED in Wave 4** |
| **N-45** | 🔴 Critical | Frontend UI | PosComponent `createSalesOrder` form build order NRE | `pos.component.ts` | **FIXED in Wave 4** |
| **ACC-01** | 🔴 Critical | Accounting | Loan interest entry posts LoanAmount instead of Interest | `AddLoanPaymentCommandHandler.cs` | Severe P&L Distortion |
| **ACC-02** | 🟠 High | Accounting | Expense GST computed on total; dictionary overwrites | `ExpenseStrategy.cs` | Multi-Tax Collapse |
| **ACC-03** | 🟠 High | Accounting | Sale discount booked Dr Discount / Cr Sales (not AR) | `SaleStrategy.cs` | AR Ledger Mismatch |
| **INT-01** | 🔴 Critical | Architecture | Order + Accounting + Stock non-atomic; errors swallowed | Handlers across SO, PO, Stock | Data Desync on Error |
| **INT-05** | 🔴 Critical | Inventory | Absolute stock correction (`bulk-adjust`) bypasses GL | `ProductStockController.cs` | Silent GL Divergence |
| **REP-01** | 🔴 Critical | Reporting | P&L expenses query account 5300 only; excludes others | `GetProfitLossReportQueryHandler.cs` | Misleading Net Profit |
| **UX-01** | 🟠 High | Frontend UI | Tenant switch token key mismatch `auth_token` vs `access`| `security.service.ts` | Session Broken Switch|
| **UX-02** | 🔴 Critical | Frontend UI | POS unit price operator bug (`??` precedence) | `pos.component.ts:280` | Pricing Broken (Dozen)|

---

## 3. Targeted Bug-Hunting & Reproduction Scripts

### BUG-SCRIPT-01 — Reproducing Loan Interest Severe Accounting Defect (ACC-01)
- **Target Finding:** `ACC-01` (Severity: 🔴 Critical Blocker)
- **Objective:** Prove that paying a loan installment records the entire loan principal as an interest expense, destroying P&L accuracy.
- **Execution Payload:**
  - **POST** `/api/Loan/payment`
  - **Headers:** `Authorization: Bearer {{token_accountant_alpha}}`
  ```json
  {
    "loanId": "LOAN-TEST-PRINCIPAL-500K",
    "paymentDate": "2026-09-06T12:00:00Z",
    "principalAmount": 10000.00,
    "interestAmount": 1500.00,
    "totalAmount": 11500.00,
    "paymentAccount": "1060"
  }
  ```
- **Bug Verification Assertion:**
  - Query `AccountingEntries`:
    `SELECT Amount, DebitLedgerAccountId FROM AccountingEntries WHERE TransactionId = '{{returned_txn_id}}';`
  - **Defect Present If:** An entry exists with `Amount = 500000.00` (Loan Principal) debited to the Interest Expense account.
  - **Expected Correct State:** Entry must strictly have `Amount = 1500.00`.

---

### BUG-SCRIPT-02 — Reproducing Damaged Stock Negative Inventory Anomaly (N-36)
- **Target Finding:** `N-36` (Severity: 🟠 High)
- **Objective:** Prove that recording damaged stock drives inventory below zero.
- **Execution Payload:**
  - Given `PROD-004` stock = 0 at L1.
  - **POST** `/api/DamagedStock`
  - **Headers:** `Authorization: Bearer {{token_inventory_clerk}}`
  ```json
  {
    "damagedStockNumber": "DMG-CRASH-01",
    "locationId": "L1",
    "damagedDate": "2026-09-06T12:00:00Z",
    "damagedStockItems": [
      {
        "productId": "PROD-004-GUID",
        "quantity": 5,
        "unitPrice": 90.00,
        "totalCost": 450.00
      }
    ]
  }
  ```
- **Bug Verification Assertion:**
  - Query `ProductStocks`:
    `SELECT CurrentStock FROM ProductStocks WHERE ProductId = 'PROD-004-GUID' AND LocationId = 'L1';`
  - **Defect Present If:** `CurrentStock = -5.0` (Negative stock created without warning or clamp).
  - **Expected Correct State:** Request rejected with HTTP 422 ("Insufficient stock to write off damage").

---

### BUG-SCRIPT-03 — Reproducing Customer Duplicate Mobile 500 Crash (N-29)
- **Target Finding:** `N-29` (Severity: 🟠 High)
- **Objective:** Trigger an unhandled database unique constraint exception on customer creation.
- **Execution Payload:**
  - Customer with mobile `03001234567` already exists.
  - **POST** `/api/Customer`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
  ```json
  {
    "customerName": "Unique Name But Duplicate Mobile",
    "mobileNo": "03001234567",
    "isWalkIn": false
  }
  ```
- **Bug Verification Assertion:**
  - **Defect Present If:** Server returns `HTTP 500 Internal Server Error` with SQLite error `UNIQUE constraint failed: Customers.TenantId, Customers.MobileNo`.
  - **Expected Correct State:** Server returns `HTTP 422 Unprocessable Entity` or `409 Conflict` with user-friendly validation error.

---

### BUG-SCRIPT-04 — Reproducing Anonymous Public Database Exfiltration (N-40)
- **Target Finding:** `N-40` (Severity: 🔴 Critical Blocker)
- **Objective:** Prove unauthenticated public access to company trade data via `ImportExportController`.
- **Execution Command (CURL / HTTP):**
  ```bash
  curl -X GET "http://localhost:5000/api/ImportExport/export-products" -i
  curl -X GET "http://localhost:5000/api/ImportExport/export-customers" -i
  ```
- **Bug Verification Assertion:**
  - **Defect Present If:** Server returns `HTTP 200 OK` with full product/customer CSV data without requiring any credentials.
  - **Expected Correct State:** Server strictly returns `HTTP 401 Unauthorized`.

---

### BUG-SCRIPT-05 — Reproducing P&L Net Profit False Report Bug (REP-01)
- **Target Finding:** `REP-01` (Severity: 🔴 Critical Blocker)
- **Objective:** Demonstrate that the Profit & Loss statement hides all operational expenses except account 5300.
- **Execution Step:**
  - Record 50,000 in COGS (`5100`), 5,000 in discounts (`5200`), and 10,000 in general expense (`5300`).
  - **GET** `/api/Report/profit-loss?fromDate=2026-09-01&toDate=2026-09-30`
- **Bug Verification Assertion:**
  - Inspect JSON response: `totalExpense`.
  - **Defect Present If:** `totalExpense` equals `10000.00` (COGS and discounts completely ignored).
  - **Expected Correct State:** `totalExpense` equals `65000.00` (50,000 + 5,000 + 10,000).

---

### BUG-SCRIPT-06 — Reproducing POS Unit Price Multiplier Short-Circuit (UX-02)
- **Target Finding:** `UX-02` (Severity: 🔴 Critical Blocker)
- **Objective:** Trigger the Angular UI operator precedence bug that prevents Dozen unit pricing.
- **Execution Step:**
  - In Angular POS client, add an item with salesPrice = 100.00.
  - Change unit to "Dozen" (operator `*`, factor 12).
- **Bug Verification Assertion:**
  - Inspect unit price in cart row.
  - **Defect Present If:** Unit price remains `100.00` because `100.00 ?? 0 * 12` evaluates to 100.00.
  - **Expected Correct State:** Unit price updates to `1200.00`.

---

## 4. QA Triage, Verification & Sign-Off Checklist

When executing regression runs or evaluating hotfixes for findings N-01 through N-45, QA engineers must verify:
- [ ] **No Unhandled 500s:** All client validation failures return 400, 404, 409, or 422; raw 500 errors with DB exceptions are eliminated.
- [ ] **Financial Balance:** Every transaction creates balanced double-entry journals where $\Sigma\text{Debits} = \Sigma\text{Credits}$.
- [ ] **Inventory Non-Negativity:** Stock cannot be driven negative by damage or returns without explicit administrative override.
- [ ] **Route Protection:** All controllers carry `[Authorize]` and `[ClaimCheck]` with zero unauthenticated data leaks.
- [ ] **No Data Loss on Sync:** Desktop offline sales synchronize to cloud with proper timestamp advancement and conflict logging.
