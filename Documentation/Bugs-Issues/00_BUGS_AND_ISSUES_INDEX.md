# MILPOS Defects, Bugs & Exceptions Catalog

**Document Reference:** `Documentation/Bugs-Issues/00_BUGS_AND_ISSUES_INDEX.md`  
**Execution Environment:** .NET 10 Web API (`http://localhost:5000`), Angular 20 SPA (`http://localhost:4200`), SQLite (`POSDb.db`)  
**Status:** In Progress / Active Resolution  
**Verified in Live Browser:** Yes (via Playwright / Chrome DevTools MCP)

---

## 1. Executive Summary

During comprehensive end-to-end testing of the MILPOS Multi-Tenant application against local SQLite storage and live browser execution, a total of **7 defects** spanning UI arithmetic, financial double-entry accounting, input validation exceptions, asset delivery, and routing were identified, documented, and queued for remediation.

---

## 2. Bug & Defect Index Table

| Bug ID | Code / TC Ref | Category | Severity | Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | `UX-02` / `TC-D03.011` | Frontend / POS | **CRITICAL** | POS unit price operator precedence error ignores unit multipliers (e.g., Dozen sold at single-item price). | Documented & Fixed |
| **BUG-02** | `ASSET-01` / `TC-D01.020` | Frontend / UI | **MEDIUM** | Missing language flag SVG/PNG image assets in `LanguageImages/` causing 404 console errors. | Documented & Fixed |
| **BUG-03** | `SEC-08` / `TC-D02.008` | Frontend / API | **MEDIUM** | Header company logo blocked by Cross-Origin Read Blocking (ORB/CORB) from port 5000 to 4200. | Documented & Fixed |
| **BUG-04** | `N-04` / `TC-D03.045` | Backend / Sales | **HIGH** | Sales order return lacks over-return guard, allowing return of more items than originally purchased. | Documented & Fixed |
| **BUG-05** | `N-29` / `TC-D08.005` | Backend / Customer | **HIGH** | Customer creation with duplicate mobile number throws SQLite constraint error 500 instead of 422/409. | Documented & Fixed |
| **BUG-06** | `ACC-01` / `TC-D06.035` | Backend / Finance | **CRITICAL** | Loan repayment journal entry books full `LoanAmount` instead of `InterestAmount` for interest debit. | Documented & Fixed |
| **BUG-07** | `NAV-01` / `TC-D05.002` | Frontend / Routing | **MEDIUM** | Feature modules (`damaged-stock`, `sales-order`) lack empty path redirect, showing blank purple screen. | Documented & Fixed |

---

## 3. Detailed Bug Documentation Files

1. [BUG-01: POS Unit Price Operator Precedence Error (UX-02)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-01-POS-UnitPrice-Operator-Precedence.md)
2. [BUG-02: Missing Language Flag Image Assets](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-02-Missing-Language-Flag-Assets.md)
3. [BUG-03: Company Logo Cross-Origin Blocking](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-03-CompanyLogo-CORB-Blocking.md)
4. [BUG-04: Sales Return Over-Return Validation Gap (N-04)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-04-Sales-Return-Over-Return.md)
5. [BUG-05: Duplicate Customer Mobile Number Unhandled 500 Exception (N-29)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-05-AddCustomer-Duplicate-Mobile-500.md)
6. [BUG-06: Loan Repayment Journal Entry Debits Full Principal for Interest (ACC-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-06-LoanPayment-Wrong-Interest-Amount.md)
7. [BUG-07: Feature Module Missing Default Route Redirects (NAV-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-07-Feature-Routes-Missing-Default-Redirect.md)

---

## 4. Evidence Artifacts & Screenshots

- `Documentation/Bugs-Issues/dashboard_screenshot.png` — Live authenticated dashboard with metrics and charts.
- `Documentation/Bugs-Issues/pos_screen.png` — POS screen with cart and product selection.
- `Documentation/Bugs-Issues/pos_receipt_ux02_bug.png` — Live invoice demonstrating `UX-02`: Dozen sold at $3.50 instead of $42.00.
- `Documentation/Bugs-Issues/products_screen.png` — Products catalog list table.
- `Documentation/Bugs-Issues/sales_order_screen.png` — Sales orders list table showing `SO#00001`.
- `Documentation/Bugs-Issues/damaged_stock_screen.png` — Damaged stock list table.
- `Documentation/Bugs-Issues/purchase_order_screen.png` — Purchase orders list table.
