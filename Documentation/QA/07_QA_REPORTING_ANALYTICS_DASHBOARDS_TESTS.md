# 07 — QA Test Suite: Reporting, Analytics & Dashboards

**Module:** Financial Reports, Operational Reports, Tax Rollups, Dashboard Aggregates & Performance Caching  
**Location:** `Documentation/QA/07_QA_REPORTING_ANALYTICS_DASHBOARDS_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** N-03, N-11, REP-01, REP-02, REP-03, REP-04, REP-05

---

## 1. Module Overview & Quality Objectives
The Reporting and Analytics subsystem aggregates high-volume business transactions into executive dashboards, financial statements (Balance Sheet, Profit & Loss, Trial Balance), operational summaries (Daily Sales, Purchase Summaries, Stock Aging), and statutory tax audit statements.

### Primary Risks & Failure Modes:
- **Profit & Loss Expense Truncation (REP-01):** The P&L handler computes total expenses by querying only GL account `5300` ("General Operating Expense"), completely omitting Cost of Goods Sold (`5100`), Sales Discounts (`5200`), Damaged Stock Losses (`5400`), Round-Off variances (`5900`), and Payroll, producing a severely distorted, falsely inflated Net Profit.
- **Daily Purchase Report Dependency Crash:** `GetDailyPurchaseReportCommandHandler` fails with an EF expression-tree 500 error if both ledger codes `2100` (AP) and `4200` (Discount Received) do not exist in the database.
- **GST Child Account Rollup Requirement:** The GST tax report returns zero if child tax accounts (`2150-01`) are not linked to parent account `2150` via `ParentAccountId`.
- **Payment Report Security Gate Missing (N-03):** The `Paymentreport` endpoint has its `[Authorize]` attribute commented out and carries zero `[ClaimCheck]` badges, allowing anonymous callers to extract complete payment records.
- **Dashboard Cache Operator-Precedence Bug (N-11):** Daily payment breakdown sums all-time records instead of the current day due to boolean operator precedence in the query.

---

## 2. Test Cases with Concrete Execution Data

### QA-REP-001 — Profit & Loss Expense Account Inclusion Audit (REP-01 Finding)
- **Aspect / Sub-Module:** Financial Statements & Net Profit Calculation
- **Test Type:** Calculation Integrity & Defect Verification (REP-01)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/Report/Handlers/GetProfitLossReportQueryHandler.cs`
- **Preconditions:**
  - Revenue: Gross Sales (`4100`) = 100,000.00.
  - Recorded Expenses:
    - COGS (`5100`): 60,000.00
    - General Expense (`5300`): 10,000.00
    - Sales Discounts (`5200`): 2,000.00
    - Damaged Stock Loss (`5400`): 1,500.00
    - True Net Profit = 100,000 - (60,000 + 10,000 + 2,000 + 1,500) = **26,500.00**.
- **Concrete Test Data:**
  - **Endpoint:** `GET /api/Report/profit-loss?fromDate=2026-09-01&toDate=2026-09-30`
  - **Headers:** `Authorization: Bearer {{token_accountant_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Call the Profit & Loss API.
  2. Inspect returned `totalRevenue`, `totalExpense`, and `netProfit`.
- **Expected Results (Correct Accounting):**
  - `totalRevenue` = 100,000.00
  - `totalExpense` = 73,500.00
  - `netProfit` = 26,500.00
- **Defect Verification (REP-01 Bug):**
  - In unfixed code, `totalExpense` returns only 10,000.00 (summing account 5300 only), reporting an erroneous `netProfit` of 90,000.00!
- **QA Pass/Fail Checklist:**
  - [ ] Verify if all operating expense accounts are aggregated.
  - [ ] Flag critical defect REP-01 if expenses are restricted to account 5300.

---

### QA-REP-002 — Daily Purchase Report 2100 & 4200 Ledger Account Dependency
- **Aspect / Sub-Module:** Operational Purchasing Report
- **Test Type:** Exception & Robustness
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/Report/Handlers/GetDailyPurchaseReportCommandHandler.cs`
- **Preconditions:**
  - Supplier purchases recorded.
  - Chart of Accounts contains `2100` (AP) and `4200` (Discount Received).
- **Concrete Test Data:**
  - **Endpoint:** `GET /api/Report/daily-purchase?purchaseDate=2026-09-06T00:00:00Z`
  - **Headers:** `Authorization: Bearer {{token_accountant_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Call the daily purchase report endpoint.
  2. Inspect response status code and data structure.
  3. Temporarily deactivate or rename account `4200` in test DB and re-run.
- **Expected Results:**
  - When both accounts exist: HTTP `200 OK` returning total purchases and supplier breakdowns.
  - When account 4200 is missing: Server must handle missing account gracefully (return 0 discount) rather than throwing `500 Internal Server Error (error while geting dailyPurchase report)`.
- **QA Pass/Fail Checklist:**
  - [ ] Daily purchase report returns HTTP 200.
  - [ ] Missing ledger account handled without EF query crash.

---

### QA-REP-003 — Daily Sales Report UTC Window & Metric Semantics
- **Aspect / Sub-Module:** Retail Sales Analytics
- **Test Type:** Boundary & Business Logic
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/Report/Handlers/GetDailySalesReportQueryHandler.cs`
- **Preconditions:**
  - 3 sales orders completed on `2026-09-06`:
    - Order 1: 10:00 UTC, Pre-tax subtotal = 500.00, Tax = 85.00, 2 item rows.
    - Order 2: 18:00 UTC, Pre-tax subtotal = 1,000.00, Tax = 170.00, 3 item rows.
    - Order 3: 23:55 UTC, Pre-tax subtotal = 300.00, Tax = 51.00, 1 item row.
  - Order 4: `2026-09-07 00:05 UTC` (Next day).
- **Concrete Test Data:**
  - Query parameter `date = 2026-09-06T00:00:00Z` (Midnight UTC).
  - **Endpoint:** `GET /api/Report/daily-sale?date=2026-09-06T00:00:00Z`
- **Step-by-Step Execution Procedure:**
  1. Dispatch daily sale report request.
  2. Validate aggregate figures against golden calculations.
- **Expected Results:**
  - `grossSales` = 1,800.00 (Pre-tax subtotal of Orders 1, 2, 3; Order 4 excluded).
  - `totalTax` = 306.00.
  - `itemsSoldCount` = 6 (Total item ROW count across orders).
  - `averageSale` = 600.00 (1,800 / 3 orders).
  - Window strictly matches `[2026-09-06T00:00:00Z, 2026-09-07T00:00:00Z)`.
- **QA Pass/Fail Checklist:**
  - [ ] Midnight UTC window includes late-night sales and excludes next-day sales.
  - [ ] Pre-tax subtotal and row-count metrics match exact specifications.

---

### QA-REP-004 — GST Tax Report Rollup via ParentAccountId Hierarchy
- **Aspect / Sub-Module:** Statutory Tax Reporting
- **Test Type:** Business Logic & Data Rollup
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/Tax/Handlers/GetTaxReportQueryHandler.cs`
- **Preconditions:**
  - Parent Account `2150` (GST Output Tax) has child accounts:
    - `2150-01` (Federal GST 17%): Total tax collected = 12,500.00.
    - `2150-02` (Provincial PST 5%): Total tax collected = 3,500.00.
  - Parent Account `1150` (GST Input Tax) has child `1150-01` with 8,000.00 paid.
- **Concrete Test Data:**
  - **Endpoint:** `GET /api/Tax/report?fromDate=2026-09-01&toDate=2026-09-30`
  - **Headers:** `Authorization: Bearer {{token_accountant_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Execute Tax Report query.
  2. Inspect returned tax breakdown.
- **Expected Results:**
  - Report groups child accounts under their parents.
  - Total Output Tax = 16,000.00 (12,500 + 3,500).
  - Total Input Tax = 8,000.00.
  - Net Tax Payable to Authority = 8,000.00 (16,000 - 8,000).
  - If `ParentAccountId` hierarchy is broken in COA seed, report returns 0 (QA flags seed prerequisite).
- **QA Pass/Fail Checklist:**
  - [ ] Child tax accounts correctly aggregate into parent totals.
  - [ ] Net tax liability matches input/output tax differential.

---

### QA-REP-005 — Payment Report Security & Open Gate Probe (N-03 Finding)
- **Aspect / Sub-Module:** Report Security & Authorization Audit
- **Test Type:** Security / Access Control Audit (N-03)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/PaymentReport/PaymentreportController.cs`
- **Preconditions:** Unauthenticated client (no Bearer token).
- **Concrete Test Data:**
  - **Endpoint:** `GET /api/Paymentreport`
  - **Query:** `?fromDate=2026-09-01&toDate=2026-09-06`
- **Step-by-Step Execution Procedure:**
  1. Send anonymous HTTP GET request without credentials.
  2. Observe HTTP response status code.
- **Expected Results (Secure Target):**
  - **HTTP Status Code:** `401 Unauthorized`.
- **Defect Verification (N-03 Bug):**
  - In unfixed code, `[Authorize]` is commented out and there is no `[ClaimCheck]`.
  - Anonymous caller receives HTTP 200 with complete financial payment records.
- **QA Pass/Fail Checklist:**
  - [ ] Verify that unauthorized callers are rejected.
  - [ ] Log finding N-03 if endpoint returns payment data without token.

---

### QA-REP-006 — Dashboard Tile Aggregation & Cache Invalidation (N-11 / REP-04)
- **Aspect / Sub-Module:** Executive Dashboard Tiles & Caching Engine
- **Test Type:** Performance & Cache Invalidation
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.MediatR/Dashboard/Handlers/GetDashboardStatisticsQueryHandler.cs`
- **Preconditions:**
  - Dashboard tiles display: Today Sales = 5,000.00.
- **Concrete Test Data:**
  - Complete a new POS cash sale of 2,000.00.
  - Re-query `GET /api/Dashboard/statistics`.
- **Step-by-Step Execution Procedure:**
  1. Record baseline dashboard sales figure.
  2. Execute a new 2,000.00 sale.
  3. Immediately fetch dashboard statistics.
- **Expected Results:**
  - Dashboard tiles should reflect updated sales: `7,000.00`.
  - Defect Check (REP-04 / N-11): Code uses 15-minute memory cache without event-based invalidation. If dashboard continues showing 5,000.00 until 15 minutes elapse, log REP-04 stale cache defect.
- **QA Pass/Fail Checklist:**
  - [ ] Dashboard tiles accurately compute aggregate figures.
  - [ ] Cache invalidation triggers on new transaction writes.
