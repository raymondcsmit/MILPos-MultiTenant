# MILPOS Defects, Bugs & Exceptions Catalog

**Document Reference:** `Documentation/Bugs-Issues/00_BUGS_AND_ISSUES_INDEX.md`  
**Execution Environment:** .NET 10 Web API (`http://localhost:5000`), Angular 20 SPA (`http://localhost:4200`), Electron Desktop Shell, SQLite (`POSDb.db`)  
**Status:** In Progress / Active Resolution  
**Verified in Live Browser & Electron:** Yes

---

## 1. Executive Summary

During comprehensive end-to-end testing of the MILPOS Multi-Tenant application against local SQLite storage, live browser execution, and Electron desktop shell architecture, a total of **14 defects** spanning UI arithmetic, financial double-entry accounting, input validation exceptions, asset delivery, routing, desktop shell security, cloud synchronization, and background service lifecycle were identified, documented, and cataloged.

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
| **BUG-08** | `N-01` / `SEC-09` | Backend / Sync API | **CRITICAL** | `SyncController` has no `[Authorize]` attribute; unauthenticated callers can trigger sync or probe telemetry. | Documented & Fixed |
| **BUG-09** | `N-06` / `DATA-02` | Backend / Domain | **HIGH** | `SyncEngine.PushChangesAsync` never updates `LastPushSync`, causing exhaustive rescans; status endpoint is a stub. | Documented & Fixed |
| **BUG-10** | `SEC-02` / `DESK-01` | Desktop / Security | **HIGH** | Electron `createMainWindow` disables context isolation (`nodeIntegration: true`); unconditional detached DevTools in login. | Documented & Fixed |
| **BUG-11** | `UX-03` / `DESK-02` | Desktop / Init | **CRITICAL** | In `main.js`, bundled database copy is unreachable due to early return on missing DB, forcing cloud login. | Documented & Fixed |
| **BUG-12** | `CONF-01` / `DESK-03` | Backend / Config | **MEDIUM** | Config path mismatch in `appsettings.Desktop.json` disables `ScheduledSyncService` with "not in Desktop mode". | Documented & Fixed |
| **BUG-13** | `CONF-02` / `DESK-04` | Desktop / Config | **LOW** | Hardcoded production cloud URL (`http://208.110.72.211`) in `main.js` prevents targeting local/test environments. | Documented & Fixed |
| **BUG-14** | `SYN-02` / `SYNC-01` | Backend / Sync | **HIGH** | Push sync 409 conflict silently skips record without conflict audit or resolution, causing permanent divergence. | Documented & Fixed |
| **BUG-15** | `N-08` / `IDENTITY-01` | Backend / Identity | **HIGH** | `UpdateRoleCommandHandler` throws NullReferenceException on non-existent role ID, crashing with HTTP 500 instead of 404. | Documented & Fixed |
| **BUG-16** | `N-05` / `INT-07` | Backend / Payments | **HIGH** | Payment deletion handlers double-subtract amount on overpaid order, erroneously downgrading settled orders from Paid to Partial. | Documented & Fixed |
| **BUG-17** | `N-02` / `SEC-10` | Backend / Security | **HIGH** | `EmailController.SendSalesOrdPurchase` lacks `[ClaimCheck]`, allowing users without email claims to dispatch emails. | Documented & Fixed |
| **BUG-18** | `N-03` / `SEC-11` | Backend / Security | **CRITICAL** | `ReportsController` has `[Authorize]` commented out and Paymentreport is open; `CustomerLedgerController` missing `[Authorize]`. | Documented & Fixed |
| **BUG-19** | `N-40` / `DATA-GOV-01` | Backend / Security | **CRITICAL** | `ImportExportController` completely open without `[Authorize]` or `[ClaimCheck]`, leaking full product, customer, and supplier databases. | Documented & Fixed |
| **BUG-20** | `N-35` / `INT-05` | Backend / Inventory | **HIGH** | `ProductStockController` inventory mutation routes have `[ClaimCheck("INVE_MANAGE_INVENTORY")]` commented out and lack `[Authorize]`. | Documented & Fixed |
| **BUG-21** | `N-36` / `INVE-02` | Backend / Inventory | **HIGH** | `AddDamagedStockCommandHandler` decrements stock without checking available quantity, driving physical stock negative. | Documented & Fixed |
| **BUG-22** | `N-13` / `BIZ-01` | Backend / Orders | **MEDIUM** | `GetNewSalesOrderNumberQueryHandler` and `GetNewPurchaseOrderNumberQueryHandler` order numbering string replacement corrupts padded sequences (`SO#00009` -> `SO#000010`). | Documented & Fixed |

---

## 3. Detailed Bug Documentation Files

1. [BUG-01: POS Unit Price Operator Precedence Error (UX-02)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-01-POS-UnitPrice-Operator-Precedence.md)
2. [BUG-02: Missing Language Flag Image Assets](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-02-Missing-Language-Flag-Assets.md)
3. [BUG-03: Company Logo Cross-Origin Blocking](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-03-CompanyLogo-CORB-Blocking.md)
4. [BUG-04: Sales Return Over-Return Validation Gap (N-04)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-04-Sales-Return-Over-Return.md)
5. [BUG-05: Duplicate Customer Mobile Number Unhandled 500 Exception (N-29)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-05-AddCustomer-Duplicate-Mobile-500.md)
6. [BUG-06: Loan Repayment Journal Entry Debits Full Principal for Interest (ACC-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-06-LoanPayment-Wrong-Interest-Amount.md)
7. [BUG-07: Feature Module Missing Default Route Redirects (NAV-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-07-Feature-Routes-Missing-Default-Redirect.md)
8. [BUG-08: SyncController Unauthenticated Access (N-01 / SEC-09)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-08-SyncController-Unauthenticated-Access.md)
9. [BUG-09: SyncEngine Stale LastPushSync & Stub Sync Status (N-06 / DATA-02)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-09-SyncEngine-Stale-LastPushSync-Stub-Status.md)
10. [BUG-10: Electron Context Isolation & Detached DevTools (SEC-02 / DESK-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-10-Electron-Context-Isolation-DevTools.md)
11. [BUG-11: Electron Bundled Database Copy Unreachable (UX-03 / DESK-02)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-11-Electron-Bundled-Database-Copy-Unreachable.md)
12. [BUG-12: Desktop ScheduledSyncService Configuration Mismatch (CONF-01 / DESK-03)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-12-Desktop-ScheduledSyncService-Config-Mismatch.md)
13. [BUG-13: Hardcoded Cloud URL in Electron Shell (CONF-02 / DESK-04)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-13-Electron-Hardcoded-Cloud-URL.md)
14. [BUG-14: Push Sync Conflict Silent Drop (SYN-02 / SYNC-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-14-SyncEngine-Push-Conflict-Silent-Drop.md)
15. [BUG-15: UpdateRoleCommandHandler 500 NRE on Unknown Role (N-08 / IDENTITY-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-15-UpdateRole-UnknownRole-500-NRE.md)
16. [BUG-16: Payment Deletion Double-Subtraction (N-05 / INT-07)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-16-Payment-Delete-Double-Subtraction.md)
17. [BUG-17: EmailController SendSalesOrdPurchase Missing ClaimCheck (N-02 / SEC-10)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-17-Email-SalesOrPurchase-Missing-ClaimCheck.md)
18. [BUG-18: Reports and CustomerLedger Controller Open Endpoints (N-03 / SEC-11)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-18-Reports-And-CustomerLedger-Open-Endpoints.md)
19. [BUG-19: ImportExportController Open Endpoints (N-40 / DATA-GOV-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-19-ImportExport-Open-Endpoints.md)
20. [BUG-20: ProductStockController Missing ClaimChecks (N-35 / INT-05)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-20-ProductStock-Missing-ClaimChecks.md)
21. [BUG-21: Damaged Stock Negative Inventory Without Clamp (N-36 / INVE-02)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-21-DamagedStock-Negative-Inventory.md)
22. [BUG-22: Order Number Sequential Generation Corrupts Padded Sequence (N-13 / BIZ-01)](file:///f:/MIllyass/pos-with-inventory-management/Documentation/Bugs-Issues/BUG-22-OrderNumber-Digit-Expansion.md)

---

## 4. Evidence Artifacts & Screenshots

- `Documentation/Bugs-Issues/dashboard_screenshot.png` — Live authenticated dashboard with metrics and charts.
- `Documentation/Bugs-Issues/pos_screen.png` — POS screen with cart and product selection.
- `Documentation/Bugs-Issues/pos_receipt_ux02_bug.png` — Live invoice demonstrating `UX-02`: Dozen sold at $3.50 instead of $42.00.
- `Documentation/Bugs-Issues/products_screen.png` — Products catalog list table.
- `Documentation/Bugs-Issues/sales_order_screen.png` — Sales orders list table showing `SO#00001`.
- `Documentation/Bugs-Issues/damaged_stock_screen.png` — Damaged stock list table.
- `Documentation/Bugs-Issues/purchase_order_screen.png` — Purchase orders list table.
