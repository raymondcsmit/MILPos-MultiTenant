# Detailed QA Test Cases with Data & Defect Hunting — Work Document

## 1. Task Summary & Objectives Completed
In accordance with the client's directive and `<RULE[user_global]>`, a comprehensive, in-depth architectural and quality assurance analysis of the MILPOS Point of Sale and Inventory Management system was conducted. An enterprise-grade, actionable QA Test Suite with concrete execution data (payloads, headers, form values, database assertions, and accounting validations) was developed and deployed to:
`f:\MIllyass\pos-with-inventory-management\Documentation\QA\`

The suite specifically targets known and latent defects, runtime exceptions (`NullReferenceExceptions`, SQLite constraint failures, foreign key locks), arithmetic discrepancies, and financial desynchronizations across both Cloud (.NET 10 Web API + PostgreSQL / SQL Server + Angular 20) and Desktop (.NET 10 Embedded API + SQLite + Electron) operational modes.

---

## 2. Directory Structure & Inventory of Deliverables

All 12 documents have been authored and verified in `Documentation\QA\`:

| Document Name | Size | Scope & Domain Coverage |
|---|---|---|
| [00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md) | 17.0 KB | QA Charter, Cloud vs Desktop Environment Topology, Master Test Data Fixtures (Tenants, Users, Locations, COA, Units, Taxes, Products, Customers, Suppliers), Defect Severity Rubric (P0–P3). |
| [01_QA_AUTH_USERS_ROLES_SECURITY_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/01_QA_AUTH_USERS_ROLES_SECURITY_TESTS.md) | 15.8 KB | Login flows, password reset code integrity (SEC-04 / N-19), inactive tenant login guard (SEC-08), `[ClaimCheck]` route protection, unprotected endpoint audits (N-02, N-40, N-42, N-43), UpdateRole NRE guard (N-08), SignalR `UserHub` presence. |
| [02_QA_TENANT_LICENSING_COMPANY_PROFILE_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/02_QA_TENANT_LICENSING_COMPANY_PROFILE_TESTS.md) | 13.5 KB | Master tenant cloning (N-26), duplicate tenant conflict, cross-tenant data leakage probing, tenant switching token key bug (UX-01 `auth_token` vs `access_token`), license activation NoTracking fix (N-21), API key authentication (N-25 / SEC-07), company profile receipt customization. |
| [03_QA_POS_TERMINAL_AND_SALES_ORDERS_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/03_QA_POS_TERMINAL_AND_SALES_ORDERS_TESTS.md) | 14.0 KB | POS real-time checkout, multi-tax non-compounding math, unit price operator precedence bug (UX-02), over-return vulnerability guard (N-04), payment delete double-subtraction (N-05), split tenders (Cash + Card), order number concurrency collisions (INT-11 / N-24), pending order stock deduction timing (N-22). |
| [04_QA_PURCHASING_SUPPLIERS_SUPPLY_CHAIN_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/04_QA_PURCHASING_SUPPLIERS_SUPPLY_CHAIN_TESTS.md) | 12.4 KB | Purchase order lifecycle, stock increment timing, PO return with refund double-save fix (N-16 / N-20), supplier address mandatory FK validation (N-27), duplicate supplier status consistency, supplier overpayment guard (INT-06), payment delete recheck logic (INT-07). |
| [05_QA_INVENTORY_STOCK_TRANSFERS_DAMAGED_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/05_QA_INVENTORY_STOCK_TRANSFERS_DAMAGED_TESTS.md) | 12.9 KB | Product catalog CRUD, null guard verification on variants/taxes (N-30 / N-31), damaged stock negative balance anomaly (N-36), inter-branch stock transfers (L1 store to L2 warehouse), transfer delete stock reversal (N-12), unclaimed stock mutation endpoints (SEC-01 / N-35), batch expiry (FEFO) alerts (BIZ-02). |
| [06_QA_DOUBLE_ENTRY_ACCOUNTING_FINANCIALS_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/06_QA_DOUBLE_ENTRY_ACCOUNTING_FINANCIALS_TESTS.md) | 11.0 KB | Opening balance posting & partner account "5555" requirement, direct general entry data structure (N-39), loan interest calculation severe bug (ACC-01), customer ledger date sort mapping crash fix (N-37), customer ledger delete claims & negative amounts (N-07), fiscal year-end book closing & retained earnings (ACC-10). |
| [07_QA_REPORTING_ANALYTICS_DASHBOARDS_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/07_QA_REPORTING_ANALYTICS_DASHBOARDS_TESTS.md) | 9.8 KB | Profit & Loss expense account 5300 truncation audit (REP-01), daily purchase report 2100 & 4200 account dependency crash, daily sales report midnight UTC window & metrics, GST tax report rollup via `ParentAccountId` hierarchy, payment report open security gate (N-03), dashboard caching & TTL (N-11 / REP-04). |
| [08_QA_CRM_INQUIRIES_REMINDERS_NOTIFICATIONS_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/08_QA_CRM_INQUIRIES_REMINDERS_NOTIFICATIONS_TESTS.md) | 9.3 KB | Duplicate customer mobile unique index crash (N-29), customer credit limit validation at POS (BIZ-07), inquiry pipeline progression & quote conversion, Hangfire reminder scheduler batch cap & day-clamping bug (RT-02), ContactUs public authorization vulnerability (N-42). |
| [09_QA_INTEGRATIONS_FBR_EMAIL_JOBS_IMPORTEXPORT_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/09_QA_INTEGRATIONS_FBR_EMAIL_JOBS_IMPORTEXPORT_TESTS.md) | 10.0 KB | Unauthenticated CSV export probe (N-40), bulk product import with spaced CSV headers, FBR fiscal invoice submission & QR code generation, FBRController unclaimed audit (N-34), default SMTP account selection (RT-04), profiler SQLite lock storm prevention (N-17). |
| [10_QA_DESKTOP_ELECTRON_OFFLINE_SYNC_TESTS.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/10_QA_DESKTOP_ELECTRON_OFFLINE_SYNC_TESTS.md) | 10.1 KB | Desktop database export & stale template schema reconciliation (N-32), unauthenticated SyncController probe (N-01), offline POS transaction persistence, cloud push sync & `LastPushSync` timestamp advancement (N-06), push sync 409 conflict handling (SYN-02), Electron security configuration (SEC-02). |
| [11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md](file:///f:/MIllyass/pos-with-inventory-management/Documentation/QA/11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md) | 15.3 KB | Master Defect Cross-Reference Matrix (all 45+ findings N-01 to N-45, ACC, INT, SEC, BIZ, REP, RT, SYN, UX), targeted reproduction scripts with exact JSON payloads, and QA triage sign-off checklist. |

**Total Content Delivered:** 12 Markdown files, ~151 KB of production-grade QA test specifications.

---

## 3. High-Value Defects & Exceptions Targeted

The QA suite specifically isolates and provides executable reproduction data for:
1. **Critical Financial Errors:**
   - `ACC-01`: Loan repayment posting entire loan principal (`500,000`) instead of interest (`1,500`) to expense.
   - `REP-01`: Profit & Loss statement querying only account `5300`, omitting COGS (`5100`), sales discounts (`5200`), and damage losses (`5400`).
   - `N-16 / N-20`: PO return with refund triggering double-save false rollback 500 error.
2. **Unhandled Backend Runtime Crashes (500 Internal Server Errors):**
   - `N-29`: Duplicate customer `MobileNo` triggering an unhandled SQLite/PostgreSQL unique constraint exception.
   - `N-30 / N-31`: Missing null guards on `ProductVariants` and `ProductTaxes` dereferencing null lists.
   - `N-37`: `CustomerLedger` list crashing with `Key mapping for accountDate is missing`.
   - `OpeningBalance`: Missing partner account `5555` causing unhandled NRE.
   - `DailyPurchase`: Missing ledger accounts `2100` or `4200` crashing EF expression-tree parser.
3. **Open Security Gates & Missing Authorization:**
   - `N-40`: `ImportExportController` open to unauthenticated public download of customer and product CSVs.
   - `N-42`: `ContactUsController` open for public listing and deletion of contact messages.
   - `N-01`: `SyncController` allowing anonymous sync triggers.
   - `N-03`: `Paymentreport` endpoint with commented-out `[Authorize]`.
   - `N-34`: `FBRController` allowing unauthorized tax submissions.
   - `SEC-01 / N-35`: `ProductStockController` bulk-adjust routes lacking ClaimCheck.
4. **Data Integrity & Stock Desynchronization:**
   - `N-36`: Damaged stock write-off driving `ProductStock.CurrentStock` into negative numbers.
   - `INT-05`: Absolute stock adjustments (`bulk-adjust`) rewriting inventory with zero double-entry journal postings.
   - `N-04`: Sales returns accepting quantities exceeding original sold volume.
   - `N-05`: Deleting a payment from an overpaid order double-subtracting the payment amount.
5. **Frontend Client Discrepancies:**
   - `UX-02`: Unit price operator precedence bug in Angular cart (`product?.salesPrice ?? 0 * 12`) breaking Dozen multiplier.
   - `UX-01`: Tenant switch storing token in `auth_token` while interceptor reads `access_token`.

---

## 4. Verification & Validation Performed
- **Path & Directory Existence:** Verified all files reside in `Documentation/QA/`.
- **Schema & Model Consistency:** All entity names, controller routes, DTO properties, and ledger account codes cross-referenced against active `SourceCode/SQLAPI` and `SourceCode/Angular` codebases.
- **Rule Compliance:** Verified adherence to `<RULE[user_global]>` (Implementation Plan and Work Document stored in solution Document folder).
