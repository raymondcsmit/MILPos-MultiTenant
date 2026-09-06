# Detailed QA Test Cases with Concrete Test Data — Implementation Plan

## 1. Executive Summary & Goal
The objective is to conduct an in-depth, rigorous, code-verified quality assurance analysis of the MILPOS Point of Sale and Inventory Management system across both Cloud and Desktop (Electron/SQLite) modalities. We will design, document, and structure an exhaustive suite of actionable QA Test Cases with concrete execution data (payloads, headers, form inputs, database verifications) specifically crafted to identify hidden defects, runtime exceptions, data integrity failures, and logic bugs.

All QA test suites will be placed in the dedicated solution folder:
`f:\MIllyass\pos-with-inventory-management\Documentation\QA\`

## 2. Scope & Architectural Coverage
Every aspect and subsystem of MILPOS will be covered with end-to-end operational test cases, boundary conditions, negative flows, security tests, and exception/bug-hunting scenarios:
1. **Authentication, Authorization & Security**: Login pipeline, password reset token validation, user management, role claims, `[ClaimCheck]` route enforcement, JWT handling, SignalR presence.
2. **Multi-Tenancy, Licensing & Settings**: Tenant onboarding/cloning, global query filters, tenant isolation, tenant switching token handling, license/trial validation, company profile.
3. **POS Terminal & Sales Orders (The Money Path)**: Real-time checkout, barcode scanning, variant auto-expansion, price calculations (fixed vs %, multi-tax non-compounding, flooring/round-off), split tenders, sales returns with refunds, over-return guards.
4. **Purchasing & Supply Chain**: Purchase orders, requisition workflow, goods receipt, stock increment timing, purchase returns with refunds, supplier payment settlement, overpayment checks.
5. **Inventory & Stock Operations**: Multi-location stock tracking, product catalog & variant hierarchy, manual stock adjustments (Gain/Loss), absolute stock corrections, damaged stock decrements & negative balance prevention, inter-branch stock transfers, batch/expiry (FEFO) lifecycle.
6. **Double-Entry Accounting & Financials**: Chart of accounts rollup, direct general entries, automated sales/purchase transaction journals, sub-ledger FIFO allocations, customer ledger statements, year-end closing, payroll and loan interest calculations.
7. **Reporting & Analytics**: Balance Sheet, P&L NetResult calculation, Trial Balance date ranges, Daily Sales pre-tax subtotals, Daily Purchase ledger requirements, GST tax reports, dashboard caching.
8. **CRM, Inquiries & Reminders**: Customer credit controls, inquiry lifecycle & conversion, Hangfire reminder scheduler, SignalR notification alerts.
9. **Integration Services & Compliance**: FBR (Pakistan) tax fiscalization & retry queues, transactional SMTP emails, background recurring jobs, CSV bulk import/export.
10. **Desktop Shell, Offline Operations & Cloud Sync**: Electron lifecycle, local SQLite storage, template database download (`my-database`), delta push/pull sync, conflict resolution.
11. **Comprehensive Defect Catalog & Bug Hunting Playbook**: Reproduction scripts and test data targeting 45+ identified code issues, latent NullReferenceExceptions, concurrency race conditions, and unhandled SQLite foreign key locks.

## 3. QA Test Case Structure & Standard
Each QA test case in every module will adhere to a strict, actionable standard:
- **Test Case ID & Title**: Descriptive unique ID (e.g. `QA-POS-001`, `QA-ACC-015`, `QA-BUG-004`).
- **Aspect / Sub-Feature**: Specific functional or non-functional slice.
- **Test Type**: Functional Happy Path, Boundary Value, Negative / Abuse, Security & Permissions, Concurrency / Race Condition, Exception / Fault Injection, Data Integrity.
- **Priority & Severity**: P0 (Critical/Blocker), P1 (High/Major), P2 (Medium/Normal), P3 (Low/Minor).
- **Preconditions**: Exact state of Tenant, Users, Accounts, Products, and Locations.
- **Concrete Test Data**: Exact values for every form field, JSON payload, query parameter, and HTTP header.
- **Execution Steps**: Numbered, step-by-step user or API actions.
- **Expected Results**: Exact UI feedback, API HTTP status & response JSON schema, Database row state, Accounting ledger balance, Inventory stock delta.
- **Defects & Exceptions Targeted**: Code references, known failure modes, unhandled exceptions, or silent corruptions being actively tested.
- **QA Verification Checklist**: Pass/Fail criteria for testing sign-off.

## 4. Deliverables in `Documentation\QA\`
| # | Document File | Content & Focus |
|---|---|---|
| 00 | `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md` | QA strategy, environment setup, tenant topology, user roles, master data fixtures, defect severity rubric. |
| 01 | `01_QA_AUTH_USERS_ROLES_SECURITY_TESTS.md` | Authentication, password reset, role claims, session timeouts, token decoding, audit logging. |
| 02 | `02_QA_TENANT_LICENSING_COMPANY_PROFILE_TESTS.md` | Registration, cloning, tenant isolation, switching, licensing, company profile. |
| 03 | `03_QA_POS_TERMINAL_AND_SALES_ORDERS_TESTS.md` | POS checkout, barcode scanning, pricing math, payments, sales orders, quotations, returns. |
| 04 | `04_QA_PURCHASING_SUPPLIERS_SUPPLY_CHAIN_TESTS.md` | POs, goods receipt, supplier payments, PO returns, supplier master data. |
| 05 | `05_QA_INVENTORY_STOCK_TRANSFERS_DAMAGED_TESTS.md` | Product catalog, manual adjustments, damaged stock, transfers, batches/FEFO, alerts. |
| 06 | `06_QA_DOUBLE_ENTRY_ACCOUNTING_FINANCIALS_TESTS.md` | COA hierarchy, journal entries, auto-journals, customer/supplier ledgers, closing, payroll. |
| 07 | `07_QA_REPORTING_ANALYTICS_DASHBOARDS_TESTS.md` | Financial statements, operational reports, tax reports, dashboard caching. |
| 08 | `08_QA_CRM_INQUIRIES_REMINDERS_NOTIFICATIONS_TESTS.md` | Customers, credit limits, inquiries, scheduler, SignalR notifications, contact us. |
| 09 | `09_QA_INTEGRATIONS_FBR_EMAIL_JOBS_IMPORTEXPORT_TESTS.md` | FBR tax authority, SMTP emails, Hangfire jobs, CSV import/export. |
| 10 | `10_QA_DESKTOP_ELECTRON_OFFLINE_SYNC_TESTS.md` | Electron shell, local SQLite, database download, cloud sync, auto-update. |
| 11 | `11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md` | Consolidated reproduction scenarios for 45+ documented defects and latent edge cases. |

## 5. Execution & Verification Plan
1. Validate that all 12 QA documents are populated with exhaustive, concrete test data.
2. Verify all API routes, claim names, entity schemas, and table names against active .NET 10 and Angular 20 source code.
3. Generate the post-implementation Work Document in `SourceCode/SQLAPI/Document/QA_Test_Cases_WorkDocument.md` per project governance rules.
