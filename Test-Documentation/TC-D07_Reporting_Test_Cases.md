# TC-D07 — Reporting Test Cases

**Source:** `New-Documents/07_Reporting_Workflows.md` (WF-7.1, WF-7.2, WF-7.3) + `New-Documents/11_Workflow_Gaps_Enhancement_Signals.md` §5 (REP-01…REP-04) and §3 (BIZ-03 touches group reporting).
**Scope:** read-only correctness of financial reports, operational reports, and dashboard widgets — exact figures, scoping, invariants, isolation, and gap behavior.
**Workflows covered:** WF-7.1 (Trial Balance, Balance Sheet, P&L, Cash Flow, Cash & Bank, General Journal, Ledger Balances, GST/Tax), WF-7.2 (sales/purchase/payment/stock/tax-item operational + daily reports + comparative), WF-7.3 (dashboard widgets).
**Gap signals referenced:** REP-01, REP-02, REP-03, REP-04 (doc-11 §5); BIZ-03 (doc-11 §3 — inter-branch transfer inflates group reports). REP-05/BIZ-09 (aged AR/AP, stock valuation, custom builder) are roadmap-only — no current behavior to characterize (see Discrepancy notes). RT-01…RT-05 and UX-01…UX-06 do **not** touch reporting — no cases.

**Code reality-check basis (verified 2026-08-28):**
- `POS.MediatR/Accouting/Report/TrialBalance/GetTrialBalanceCommandHandler.cs:27-79` — date-range 00:00:00–23:59:59, no FY, debit/credit dict union, structurally balanced.
- `POS.MediatR/Accouting/Report/BalanceSheet/GetBalanceSheetReportCommandHandler.cs:27-108` — FY scope, signed balances by `AccountType`, Equity bucket = Equity+Income+Expense, `TotalEquity = equity + income − expense`.
- `POS.MediatR/Accouting/Report/ProfitLoss/GetProfitLossReportCommandHandler.cs:35-89` — hard-coded 4100/5100/**5300-only** expense; `GrossProfit`/`NetResult`/label switch.
- `POS.MediatR/Accouting/Report/CashFlow/GetCashFlowReportCommandHandler.cs:23-98` — 1050/1060, counter-account attribution, `TotalCashRecived/TotalCashPaid/NetTotalMovement`, **no O/I/F classification**.
- `POS.MediatR/Accouting/Report/CashBank/GetCashBankReportCommandHandler.cs:34-73` — FY, 1050/1060 net (Dr−Cr).
- `POS.MediatR/Accouting/Report/Tax/GetTaxReportCommandHandler.cs:38-129` — 1150/2150 children by `ParentAccountId`, nets, `NetTaxPayable`, Payable/Refund/Settled.
- `POS.MediatR/Accouting/Report/GeneralEntry/GetGeneralEntryCommandHandler.cs:19-23` + `POS.Repository/Accouting/AccountingEntryRepository.cs:78-122` — FY/branch/TransactionType/CreatedDate/TransactionNumber filters, paged.
- `POS.API/Controllers/Accounting/ReportsController.cs:26-163` — claims `ACCOUNTING_VIEW_*`; **`Paymentreport` (144-163) has no ClaimCheck and class `[Authorize]` is commented out (18)**.
- `POS.MediatR/Dashboard/Handlers/GetDashbordAccountQueryCommandHandler.cs:26-70` — ledger-tile aggregates; `Narration.Contains("PAYMENT")` filter applied **only to return sums** (52-53, 60-62), not to purchase/sales totals (48-51, 56-58).
- `POS.MediatR/Dashboard/Handlers/GetSalesVsPurchaseReportCommandHandler.cs:43-81`, `GetBestSellingProductCommandHandler.cs:122-135` (EF fallback: signed qty, top 10), `GetIncomeComparisonQueryHandler.cs:180-222` (order-based, month 1–12, `DateTime.Now` at :62).
- `POS.MediatR/PipeLineBehavior/CachingBehavior.cs:27-52` — cache key `{CacheKey}_{tenantId}`, TTL `AbsoluteExpiration ?? 24h`; **all five dashboard cached queries override TTL to 15 min** (e.g. `Dashboard/Commands/GetDashbordAccountQueryCommand.cs:16`); **no eviction on writes** (only license/company keys are evicted anywhere).
- `POS.MediatR/Accouting/DailyReport/GetDailySaleReportCommandHandler.cs:87-135` (AR 1100 + Discount 5200 based, `EntryType` Regular/Tax, PAYMENT narration excluded); `GetDailyPurchaseReportCommandHandler.cs:82-131` (AP **2100** + Discount-Received 4200 based); `GetDailyPaymentBreakdownReportCommandHandler.cs:53-72` (**operator-precedence bug**: date filter binds only to the bank-credit clause).
- Operational claims (grep-verified): `salesOrder/items/reports`→`REP_PRO_SO_REPORT` (SalesOrderController.cs:228-229), `PurchaseOrder/items/reports`→`REP_PRO_PP_REP` (PurchaseOrderController.cs:213-214), `SalesOrderPayment/report`→`REP_SO_PAYMENT_REP` (SalesOrderPaymentController.cs:85-86), `PurchaseOrderPayment/report`→`REP_PO_PAYMENT_REP` (PurchaseOrderPaymentController.cs:54-55), `*/items/profitLoss`→`REP_VIEW_PRO_LOSS_REP`, `salesOrder/tax-item-total`→`REP_VIEW_OUTPUT_TAX_REP`, `PurchaseOrder/tax-item-total`→`REP_VIEW_INPUT_TAX_REP`, dashboard `DB_STATISTICS`/`DB_BEST_SELLING_PROS`/`REP_SALES_VS_PURCHASE_REP` (DashboardController.cs:143-216).

---

## Test data prerequisites (canonical shared seed)

All numeric expectations in this catalog derive from **this one fixture**. Seeded via shared builders (`TestTenant`, `TestChartOfAccounts`, …) into SQLite per-factory; report endpoints never mutate state. Entries are `AccountingEntry` rows — **each row is self-balancing (one debit account, one credit account, one amount)**; `EntryDate` on the row; `FinancialYearId` = FY; `BranchId` on the row.

**Tenants / users / locations**
- **Tenant A** (active, licensed), locations **L1** (Main) and **L2** (Warehouse). All seeded activity at **L1**; **L2 is empty** (used for branch-filter zero cases).
- **Tenant B** (active, licensed): one admin user, **no locations with data, no FY, no entries** (isolation checks).
- Users (Tenant A): `admin` (all claims, `IsAllLocations=true`), `manager` (no `ACCOUNTING_*`/`REP_*`/`DB_*` claims), `cashier` (POS claims only).
- Customer **C-1** "John Traders"; Supplier **S-1** "Acme Supplies".

**Product**
- **P-SIMPLE**: salePrice 200, purchasePrice 100, tax 17%, minStockLevel 20. ProductStock: L1 = **7**, L2 = 0.

**FinancialYear & Chart of Accounts (Tenant A)**
- **FY2026** = 2026-01-01 … 2026-12-31 (open). Tenant B has no FY.

| Code | Name | Type | Notes |
|---|---|---|---|
| 1050 | Cash | Asset | |
| 1060 | Bank | Asset | |
| 1100 | Accounts Receivable | Asset | |
| 1150 | GST Input (parent) | Asset | no direct entries |
| 1151 | GST 17% Input (child of 1150) | Asset | `Tax.InPutAccountCode` target |
| 1200 | Inventory | Asset | |
| 2100 | Accounts Payable | Asset-type ledger (AP) | used by Daily Purchase report |
| 2150 | GST Output (parent) | Liability | no direct entries |
| 2151 | GST 17% Output (child of 2150) | Liability | `Tax.OutPutAccountCode` target |
| 3900 | Owner's Equity | Equity | |
| 4100 | Sales | Income | |
| 4900 | Gain | Income | zero in fixture |
| 5100 | COGS | Expense | |
| 5200 | Discount Given | Expense | |
| 5300 | Expense (operating) | Expense | |
| 5400 | Stock Loss | Expense | |
| 5900 | Round Off | Expense | |
| 5950 | Loss | Expense | zero in fixture |
| 6100 | Payroll | Expense | |
| 5555 | Opening/Closing | Equity | exists; unused numerically |

**Transactions / orders (document layer)**
- `TRX-PO-1` Purchase 1170 → **PO-1** (2026-03-10, L1, Paid, Bank payment): item P-SIMPLE qty 10 @ 100, tax 170.
- `TRX-SO-1` Sale 468 → **SO-1** (2026-03-10, L1, C-1, cash, Paid): P-SIMPLE qty 2 @ 200, tax 68.
- `TRX-SO-2` Sale 234 → **SO-2** (2026-03-11, L1, C-1, **credit**, balance 134 after payment): P-SIMPLE qty 1 @ 200, tax 34.
- `TRX-SR-1` SaleReturn 234 → **SR-1** (2026-03-12, L1, return of 1 unit of SO-1, cash refund, stored as SalesOrder `Status=Return`, `IsSalesOrderRequest=false`).
- `TRX-PAY-1` **Sale-type** transaction, TotalAmount 100, Narration **"PAYMENT RECEIPT against SO-2"** → **PAY-1** (2026-03-13, Bank) — the fixture's 1 customer payment.
- `TRX-EXP-1` Expense 100 → **EXP-1** (2026-03-11, category "Rent", no tax) — the fixture's 1 expense document.
- `TRX-PR-1` Payroll 300 (2026-03-14), `TRX-SL-1` StockLoss 100 (2026-03-14), `TRX-RO-1` RoundOff 1 (2026-03-14), `TRX-OPEN` Journal 3000 (2026-01-01).

**AccountingEntry rows (18 rows, the journal)** — `EntryType=Regular` except where noted; narration "PAYMENT…" only on E7.

| # | EntryDate | Debit → Credit | Amount | Transaction | EntryType |
|---|---|---|---|---|---|
| E1 | 2026-01-01 | 1060 Bank → 3900 Equity | 3000 | TRX-OPEN | Regular |
| E2a | 2026-03-10 | 1200 Inventory → 1060 Bank | 1000 | TRX-PO-1 | Regular |
| E2b | 2026-03-10 | 1151 GST-In → 1060 Bank | 170 | TRX-PO-1 | Regular |
| E3a | 2026-03-10 | 1050 Cash → 4100 Sales | 400 | TRX-SO-1 | Regular |
| E3b | 2026-03-10 | 1050 Cash → 2151 GST-Out | 68 | TRX-SO-1 | **Tax** |
| E3c | 2026-03-10 | 5100 COGS → 1200 Inventory | 200 | TRX-SO-1 | Regular |
| E4a | 2026-03-11 | 1100 AR → 4100 Sales | 200 | TRX-SO-2 | Regular |
| E4b | 2026-03-11 | 1100 AR → 2151 GST-Out | 34 | TRX-SO-2 | **Tax** |
| E4c | 2026-03-11 | 5100 COGS → 1200 Inventory | 100 | TRX-SO-2 | Regular |
| E5a | 2026-03-12 | 4100 Sales → 1050 Cash | 200 | TRX-SR-1 | Regular |
| E5b | 2026-03-12 | 2151 GST-Out → 1050 Cash | 34 | TRX-SR-1 | Regular |
| E5c | 2026-03-12 | 1200 Inventory → 5100 COGS | 100 | TRX-SR-1 | Regular |
| E6 | 2026-03-11 | 5300 Expense → 1050 Cash | 100 | TRX-EXP-1 | Regular |
| E7 | 2026-03-13 | 1060 Bank → 1100 AR | 100 | TRX-PAY-1 | Regular (narration "PAYMENT RECEIPT against SO-2") |
| E8 | 2026-03-14 | 6100 Payroll → 1060 Bank | 300 | TRX-PR-1 | Regular |
| E9 | 2026-03-14 | 5200 Discount → 1100 AR | 50 | TRX-SO-2 | Regular (narration "Discount SO-2") |
| E10 | 2026-03-14 | 5400 StockLoss → 1200 Inventory | 100 | TRX-SL-1 | Regular |
| E11 | 2026-03-14 | 5900 RoundOff → 1050 Cash | 1 | TRX-RO-1 | Regular |

**Hand-computed per-account totals (whole FY)** — recompute in tests from these constants, never from production formulas (Quality Charter §2):

| Account | Σ Dr | Σ Cr | Signed (BS rule) |
|---|---|---|---|
| 1050 Cash | 468 | 335 | **133** |
| 1060 Bank | 3100 | 1470 | **1630** |
| 1100 AR | 234 | 150 | **84** |
| 1151 GST-In | 170 | 0 | **170** |
| 1200 Inventory | 1100 | 400 | **700** |
| 2151 GST-Out | 34 | 102 | **68** (Cr−Dr) |
| 3900 Equity | 0 | 3000 | **3000** |
| 4100 Sales | 200 | 600 | **400** (Cr−Dr) |
| 5100 COGS | 300 | 100 | **200** |
| 5200 Discount | 50 | 0 | **50** |
| 5300 Expense | 100 | 0 | **100** |
| 5400 StockLoss | 100 | 0 | **100** |
| 5900 RoundOff | 1 | 0 | **1** |
| 6100 Payroll | 300 | 0 | **300** |
| **Σ** | **6157** | **6157** | |

**Derived expected report values (all hand-computed from the tables above):**
- **Trial Balance, window 2026-03-01…03-31** (E1 excluded): 13 rows, `DebitTotalAmount == CreditTotalAmount == 3157`.
- **Trial Balance, window 2026-01-01…01-01**: 2 rows (Bank 3000/0, Equity 0/3000), totals 3000/3000.
- **Balance Sheet FY2026**: Assets = 133+1630+84+700+170 = **2717**; Liabilities = **68**; Equity bucket rows {3900:3000, 4100:400, 5100:200, 5200:50, 5300:100, 5400:100, 5900:1, 5950:0, 6100:300}; `TotalEquity = 3000 + 400 − 751 = 2649`; identity **2717 == 68 + 2649**.
- **P&L FY2026 (current code)**: SalesRevenue 600, SalesReturn 200, COGS 300, COGSReturn 100, GrossProfit 200, **Expense 100**, NetResult **100** → "Profit". Full-expense target: Expense = 100+300+50+100+1 = **551**, NetResult **−351** → "Loss" (== BS implied close 400 − 751).
- **Cash Flow, 03-01…03-31**: received {4100:400, 2151:68, 1100:100} = **568**; paid {1200:1000, 1151:170, 4100:200, 2151:34, 5300:100, 6100:300, 5900:1} = **1805**; `NetTotalMovement` **−1237** (= ΔCash 133 + ΔBank −1370).
- **Cash & Bank FY2026**: CashTotal **133**, BankTotal **1630**.
- **GST FY2026**: Input 170/0 → net 170; Output 102/34 → net 68; `NetTaxPayable` **−102** → "Refund".
- **Dashboard ledger tiles (statistics), window 03-10…03-12**: {TotalPurchase 1170, TotalSales 702, TotalSalesReturn 234, TotalPurchaseReturn 0}; full window 03-10…03-14: TotalSales **802** (payment-narrated Sale row counted — see TC-D07.054).
- **Stock**: P-SIMPLE @L1 qty **7** (10 − 2 − 1 + 1 − 1); valuation 7 × 100 = **700** == Inventory 1200 signed balance.

---

## WF-7.1 — Financial Reports (AccountingEntry-based)

### TC-D07.001 — Trial Balance returns balanced per-account sums for a date window
- **Layers:** IT · PM · E2E
- **Priority:** P0   **Category:** Happy
- **Source:** WF-7.1 (Trial Balance; `GetTrialBalanceCommandHandler.cs:27-79`)
- **Arrange:** canonical seed; JWT for admin (claim `ACCOUNTING_VIEW_TRIAL_BALANCE_REPORT`); window FromDate=2026-03-01, ToDate=2026-03-31
- **Act:** `GET /api/reports/trialbalancereport?FromDate=2026-03-01&ToDate=2026-03-31`
- **Assert (IT):** 200 · 13 account rows · `DebitTotalAmount == CreditTotalAmount == 3157` · row Cash {Dr 468, Cr 335}, Bank {Dr 100, Cr 1470}, AR {Dr 234, Cr 150}, Inventory {Dr 1100, Cr 400}, Sales {Dr 200, Cr 600}, COGS {Dr 300, Cr 100} · **no Equity row** (opening entry outside window)
- **Assert (PM):** body matches `TrialBalanceDto` schema (`debitTotalAmount`, `creditTotalAmount`, `trialBalanceAccounts[]`); environment var `fyId`/`l1Id` chained from seed requests
- **Assert (E2E):** Reports → Trial Balance renders with ΣDr == ΣCr == 3,157.00 displayed and 13 rows in the grid

### TC-D07.002 — Trial-balance grouping model unions debit/credit dicts and structurally balances
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.1 (grouping logic at `GetTrialBalanceCommandHandler.cs:55-79`, expressed as a pure helper)
- **Arrange:** in-memory entry list: {(A→B, 10), (A→C, 5), (D→A, 7), (B→A, 3)} and account-name map
- **Act:** run the extracted group-by-debit / group-by-credit / union / zero-fill / total pipeline
- **Assert:** rows: A {Dr 17, Cr 3}, B {Dr 10, Cr 10}, C {Dr 5, Cr 0}, D {Dr 0, Cr 7} · ΣDr == ΣCr == 32 · unknown-id rows fall back to name "Unknown"

### TC-D07.003 — Trial Balance with no entries in window returns zero totals and empty list
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Edge (empty data)
- **Source:** WF-7.1
- **Arrange:** canonical seed; window 2025-01-01…2025-12-31 (no entries)
- **Act:** `GET /api/reports/trialbalancereport?FromDate=2025-01-01&ToDate=2025-12-31`
- **Assert:** 200 · `DebitTotalAmount == 0 && CreditTotalAmount == 0` · `trialBalanceAccounts` empty array · (PM) schema still valid for empty list

### TC-D07.004 — Trial Balance scoped to location L2 returns zeros (branch filter)
- **Layers:** IT
- **Priority:** P1   **Category:** Edge (branch filter)
- **Source:** WF-7.1 (`LocationId` filter, `GetTrialBalanceCommandHandler.cs:34-37`)
- **Arrange:** canonical seed (all entries `BranchId = L1`)
- **Act:** `GET /api/reports/trialbalancereport?FromDate=2026-03-01&ToDate=2026-03-31&LocationId={L2}`
- **Assert:** 200 · totals 0/0 · empty row list

### TC-D07.005 — Trial Balance (date-range, no opening) and Balance Sheet (FY) disagree for the same data — current scoping characterized
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [REP-02]
- **Source:** WF-7.1 + doc-11 REP-02 (`GetTrialBalanceCommandHandler.cs:27-45` has no FY/opening logic; Balance Sheet is FY-scoped)
- **Arrange:** canonical seed
- **Act:** (a) `GET /api/reports/trialbalancereport?FromDate=2026-01-01&ToDate=2026-01-01`; (b) same with window 2026-03-01…03-31; (c) `GET /api/reports/balancesheetreport?FinancialYearId={FY2026}`
- **Assert:** (a) 2 rows, totals 3000/3000 (opening leg visible); (b) 13 rows, totals 3157/3157, **no Equity row** — the same FY's data viewed through different windows yields different account sets and totals; (c) Balance Sheet FY totals {2717, 68, 2649} — a statement scope the Trial Balance cannot express. All three responses are 200 — no mechanism flags the scope mismatch to the user (this inconsistency is the current, documented behavior).

### TC-D07.006 — Trial Balance unified with FY scoping and opening balances agrees with Balance Sheet — desired behavior
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [REP-02] (RED until fix)
- **Source:** doc-11 REP-02 enhancement ("Unify scoping; opening-balance integration")
- **Arrange:** canonical seed
- **Act:** `GET /api/reports/trialbalancereport` FY-scoped (per post-fix contract: `FinancialYearId={FY2026}`)
- **Assert:** 200 · 14 rows (incl. Equity {0, 3000} opening) · totals 6157/6157 · same-day cross-check: Balance Sheet FY account set ⊆ Trial Balance FY account set and per-account signed balances reconcile (Asset 133/1630/84/700/170; Sales raw Dr 200/Cr 600) · **RED by definition** until scoping unification lands

### TC-D07.007 — Balance Sheet buckets signed balances and satisfies Assets == Liabilities + Equity
- **Layers:** IT · PM · E2E
- **Priority:** P0   **Category:** Happy
- **Source:** WF-7.1 (`GetBalanceSheetReportCommandHandler.cs:27-108`)
- **Arrange:** canonical seed; JWT admin (`ACCOUNTING_VIEW_BALANCE_SHEET_REPORT`)
- **Act:** `GET /api/reports/balancesheetreport?FinancialYearId={FY2026}`
- **Assert:** 200 · Assets rows include Cash 133, Bank 1630, AR 84, Inventory 700, GST-In-1151 170 · `TotalAssets == 2717` · Liabilities rows: GST-Out-2151 = 68 · `TotalLiabilities == 68` · Equity list contains Equity **and** Income **and** Expense accounts (4100:400; 5100:200; 5300:100; 5400:100; 6100:300; 5200:50; 5900:1) · `TotalEquity == 2649` (3000 + 400 − 751) · **invariant: TotalAssets (2717) == TotalLiabilities + TotalEquity (68 + 2649)**
- **Assert (PM):** schema `assets[]/liabilities[]/equity[]` with `accountCode`, `balance`; totals numeric
- **Assert (E2E):** Reports → Balance Sheet displays Total Assets 2,717.00, Total Liabilities 68.00, Total Equity 2,649.00 and the rendered identity holds

### TC-D07.008 — Balance-sheet rollup model signs by AccountType and buckets Equity+Income+Expense
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.1 (sign/bucket logic at `GetBalanceSheetReportCommandHandler.cs:52-108`, expressed as pure helper)
- **Arrange:** accounts: A1 Asset {Dr 100, Cr 30}, L1 Liability {Dr 10, Cr 90}, E1 Equity {Dr 0, Cr 200}, I1 Income {Dr 20, Cr 120}, X1 Expense {Dr 55, Cr 5}
- **Act:** run signed-balance + bucket + totals model
- **Assert:** A1 → 70 (Asset bucket); L1 → 80 (Liability bucket); Equity bucket = {E1 200, I1 100, X1 50} · TotalEquity = 200 + 100 − 50 = 250 · TotalAssets 70, TotalLiabilities 80 · identity 70 == 80 + (−10) holds for a balanced input set (add balancing Asset 0 row set as needed to keep ΣDr == ΣCr)

### TC-D07.009 — Balance Sheet scoped to empty branch L2 returns all-zero rows and zero totals
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (branch filter)
- **Source:** WF-7.1 (`BranchId` filter at `GetBalanceSheetReportCommandHandler.cs:36-39`)
- **Arrange:** canonical seed
- **Act:** `GET /api/reports/balancesheetreport?FinancialYearId={FY2026}&BranchId={L2}`
- **Assert:** 200 · every account row Balance 0 · `TotalAssets == TotalLiabilities == TotalEquity == 0`

### TC-D07.010 — P&L returns current (5300-only) figures: NetResult 100 "Profit"
- **Layers:** IT · PM · E2E
- **Priority:** P0   **Category:** Happy
- **Source:** WF-7.1 (`GetProfitLossReportCommandHandler.cs:35-96`)
- **Arrange:** canonical seed; JWT admin (`ACCOUNTING_VIEW_PROFIT_LOSS_REPORT`)
- **Act:** `GET /api/reports/ProfitLoss?FinancialYearId={FY2026}`
- **Assert:** 200 · `SalesRevenue == 600`, `SalesReturn == 200`, `COGS == 300`, `COGSReturn == 100`, `GrossProfit == 200`, `Expense == 100`, `NetResult == 100`, `ProfitOrLoss == "Profit"`
- **Assert (PM):** response body exposes exactly the `ProfitLossDataDto` fields above
- **Assert (E2E):** Reports → Profit & Loss renders Net Result 100.00 with label "Profit"

### TC-D07.011 — P&L Expense line contains 5300 only; payroll/discount/stock-loss/round-off silently excluded — current misleading result characterized
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [REP-01]
- **Source:** WF-7.1 ⚠ + doc-11 REP-01 (`GetProfitLossReportCommandHandler.cs:35-41` hard-codes 4100/5100/5300; 76-78 sums 5300 debits only)
- **Arrange:** canonical seed (posts Dr 6100: 300, Dr 5200: 50, Dr 5400: 100, Dr 5900: 1 — none to 5300 beyond E6's 100)
- **Act:** `GET /api/reports/ProfitLoss?FinancialYearId={FY2026}`
- **Assert:** 200 · `Expense == 100` although real expense-class debits in FY total 551 (391 posted to excluded accounts 6100/5200/5400/5900) · `NetResult == 100` ("Profit") while Balance Sheet implied close for the same FY is 400 − 751 = **−351** — assert both numbers in one test to pin the divergence the gap describes

### TC-D07.012 — P&L includes all expense accounts; NetResult ties to Balance Sheet implied close — desired behavior
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [REP-01] (RED until fix)
- **Source:** doc-11 REP-01 enhancement ("Include all expense accounts (or expense-type query)")
- **Arrange:** canonical seed
- **Act:** `GET /api/reports/ProfitLoss?FinancialYearId={FY2026}` (post-fix handler)
- **Assert:** 200 · `Expense == 551` (100 + 300 + 50 + 100 + 1 recomputed from independent constants) · `NetResult == 351 − ... == −351` · `ProfitOrLoss == "Loss"` · NetResult == Balance Sheet `incomeTotal − expenseTotal` (400 − 751) · **RED by definition** until the enhancement lands

### TC-D07.013 — P&L formula and Profit/Loss/Break-even label switch
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.1 (`GetProfitLossReportCommandHandler.cs:81-89`, pure)
- **Arrange:** sum inputs (revenue, salesReturn, cogs, cogsReturn, expense)
- **Act:** run Gross/Net/label model for three input sets
- **Assert:** (600,200,300,100,100) → Gross 200, Net 100, "Profit" · (600,200,300,100,551) → Net −351, "Loss" · (100,0,100,0,0) → Net 0, "Break-even"

### TC-D07.014 — FY-scoped report endpoints return 404 for an unknown FinancialYearId
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-7.1 (404 path e.g. `GetProfitLossReportCommandHandler.cs:28-32`, same in BalanceSheet/CashBank/Tax handlers)
- **Arrange:** canonical seed; `FinancialYearId = Guid.NewGuid()`
- **Act:** GET ProfitLoss, balancesheetreport, cashbankreport, taxreport with the unknown id
- **Assert:** each returns **404** with message "Financial Year Not Found" · no exception/500

### TC-D07.015 — Cash Flow attributes cash/bank movements to counter-accounts and nets to the cash delta
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.1 (`GetCashFlowReportCommandHandler.cs:23-98`)
- **Arrange:** canonical seed; JWT admin (`ACCOUNTING_VIEW_CASH_FLOW_REPORT`); window 2026-03-01…03-31
- **Act:** `GET /api/reports/cashflowreport?FromDate=2026-03-01&ToDate=2026-03-31`
- **Assert:** 200 · `TotalCashRecived == 568` (4100:400, 2151:68, 1100:100) · `TotalCashPaid == 1805` (1200:1000, 1151:170, 4100:200, 2151:34, 5300:100, 6100:300, 5900:1) · `NetTotalMovement == −1237` · `cashFlowAccounts` contains 8 rows; counter 4100 appears as one row {DebitAmount 400, CreditAmount 200} and 2151 as {68, 34} (shared dict per handler 54-87) · **cross-check invariant:** NetTotalMovement == Δ1050 (133) + Δ1060 (−1370) over the same window
- **Assert (PM):** field names exactly `totalCashRecived`, `totalCashPaid`, `netTotalMovement`, `cashFlowAccounts`

### TC-D07.016 — Cash-flow attribution model maps grouped pairs to in/out per counter-account
- **Layers:** UT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-7.1 (attribution at `GetCashFlowReportCommandHandler.cs:56-90`, pure)
- **Arrange:** grouped pairs {(cash→Sales, 100), (Inventory→cash, 40), (cash→cash, 5)}; cash set {cash}
- **Act:** run attribution model
- **Assert:** Sales row DebitAmount 100; Inventory row CreditAmount 40; cash→cash contributes to neither list (counter is itself a cash account per code — its row carries both legs) · totals In 100 / Out 40 / Net 60

### TC-D07.017 — Cash Flow output is an unclassified movement report (no operating/investing/financing) — current behavior characterized
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [REP-03]
- **Source:** WF-7.1 ⚠ + doc-11 REP-03 (`CashFlowDto` exposes only received/paid/net + account list)
- **Arrange:** canonical seed; window 2026-03-01…03-31
- **Act:** `GET /api/reports/cashflowreport?FromDate=2026-03-01&ToDate=2026-03-31`
- **Assert:** 200 · payload contains **only** `TotalCashRecived`, `TotalCashPaid`, `NetTotalMovement`, `cashFlowAccounts` — no operating/investing/financing fields · the 300 payroll outflow (6100) sits in the same undifferentiated paid list as the 100 rent outflow (5300) and the 1000 inventory purchase — assert all three coexist in `cashFlowAccounts` with no class marker

### TC-D07.018 — Cash Flow classifies movements into operating/investing/financing — desired behavior
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [REP-03] (RED until fix)
- **Source:** doc-11 REP-03 enhancement ("Classification mapping")
- **Arrange:** canonical seed; window 2026-03-01…03-31
- **Act:** `GET /api/reports/cashflowreport` (post-fix contract)
- **Assert:** 200 · response exposes `Operating`/`Investing`/`Financing` totals · Operating received ⊇ {4100:400, 1100:100} · Operating paid ⊇ {1200:1000, 5300:100, 6100:300} · Investing == 0 and Financing == 0 for this fixture · **RED by definition** until classification lands

### TC-D07.019 — Cash & Bank returns FY net balances for 1050 and 1060
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.1 (`GetCashBankReportCommandHandler.cs:34-73`)
- **Arrange:** canonical seed; JWT admin (`ACCOUNTING_VIEW_CASH_BANK_REPORT`)
- **Act:** `GET /api/reports/cashbankreport?FinancialYearId={FY2026}`
- **Assert:** 200 · `CashTotal == 133` (468 − 335) · `BankTotal == 1630` (3100 − 1470)
- **Assert (PM):** body has exactly `cashTotal` and `bankTotal`

### TC-D07.020 — Cash & Bank scoped to empty branch L2 returns 0/0
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (branch filter)
- **Source:** WF-7.1 (`BranchId` filter at :43-46)
- **Arrange:** canonical seed
- **Act:** `GET /api/reports/cashbankreport?FinancialYearId={FY2026}&BranchId={L2}`
- **Assert:** 200 · `CashTotal == 0 && BankTotal == 0`

### TC-D07.021 — General Journal listing pages the FY journal with Dr/Cr account names
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.1 (`GetGeneralEntryCommandHandler.cs:19-23` → `AccountingEntryRepository.cs:78-122`)
- **Arrange:** canonical seed; JWT admin (`ACCOUNTING_VIEW_GENERAL_ENTRY_REPORT`); `PageSize=50`
- **Act:** `GET /api/reports?FinancialYearId={FY2026}`
- **Assert:** 200 · 18 rows (E1…E11, 18 legs) · `X-Pagination` header `totalCount == 18` · each row carries debit account name, credit account name, amount, transaction number · row for E7 shows Dr "Bank" 100 / Cr "Accounts Receivable" 100
- **Assert (PM):** paged envelope shape (`totalCount`, `pageSize`, `skip`, `totalPages`) + `X-Pagination` header

### TC-D07.022 — General Journal filters by transaction type, transaction number and created-date range
- **Layers:** IT
- **Priority:** P1   **Category:** Edge (scoping)
- **Source:** WF-7.1 (`AccountingEntryRepository.cs:91-116`)
- **Arrange:** canonical seed
- **Act/Assert:** (a) `?FinancialYearId={FY}&TransactionType=Sale` → **7 rows** (E3a,E3b,E3c,E4a,E4b,E4c,E7); (b) `TransactionType=SaleReturn` → 3 rows; (c) `TransactionType=Purchase` → 2 rows; (d) `?TransactionNumber=TRX-SO-2` → 3 rows; (e) `?FromDate=2026-03-13&ToDate=2026-03-14` (CreatedDate filter) → 5 rows (E7,E8,E9,E10,E11)

### TC-D07.023 — General Journal with filters matching nothing returns an empty paged list
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Edge (empty data)
- **Source:** WF-7.1
- **Arrange:** canonical seed
- **Act:** `GET /api/reports?FinancialYearId={FY}&FromDate=2027-01-01&ToDate=2027-12-31`
- **Assert:** 200 · 0 rows · `totalCount == 0` · (PM) empty-list contract, no error envelope

### TC-D07.024 — Ledger Account Balances returns raw un-signed FY totals per account (contrast with Balance Sheet)
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.1 (`GetLedgerAccountBalancesCommandHandler.cs:24-68`; claims `ACCOUNTING_VIEW_ACCOUNT_BALANCE_REPORT`)
- **Arrange:** canonical seed
- **Act:** `GET /api/reports/AccountBalancereport?FinancialYearId={FY2026}`
- **Assert:** 200 · 14 account rows incl. Equity {Dr 0, Cr 3000} and Sales {Dr 200, Cr 600} · per-account DebitTotals/CreditTotals equal the fixture table · report totals 6157/6157 · **no sign normalization:** Sales row shows raw Dr 200 side-by-side with Cr 600 (whereas Balance Sheet reports the signed 400) — assert both in one test to pin the raw-total semantics

### TC-D07.025 — GST report nets input/output children and reports Refund status
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-7.1 (`GetTaxReportCommandHandler.cs:38-129`)
- **Arrange:** canonical seed; JWT admin (`ACCOUNTING_VIEW_TAX_REPORT`)
- **Act:** `GET /api/reports/taxreport?FinancialYearId={FY2026}`
- **Assert:** 200 · `InputGstTotal == 170` (child 1151), `InputGstReturnTotal == 0`, `OutputGstTotal == 102` (children 2151: E3b 68 + E4b 34), `OutputGstReturnTotal == 34` (E5b), `NetTaxPayable == −102` (68 − 170) · `Status == "Refund"` · `InputTaxes`/`OutputTaxes` lists carry per-child names "GST 17% Input"/"GST 17% Output"
- **Assert (PM):** `TaxReportDto` field names as above

### TC-D07.026 — GST status switch: Payable / Refund / Settled
- **Layers:** UT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-7.1 (`GetTaxReportCommandHandler.cs:124-129`, pure)
- **Arrange:** net inputs (outputNet − inputNet)
- **Act:** run status model
- **Assert:** (50 − 30) → "Payable" · (30 − 50) → "Refund" · (30 − 30) → "Settled"

### TC-D07.027 — GST report scoped to empty branch L2 returns zeros and "Settled"
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (branch filter)
- **Source:** WF-7.1 (`BranchId` filter at :33-36)
- **Arrange:** canonical seed
- **Act:** `GET /api/reports/taxreport?FinancialYearId={FY2026}&BranchId={L2}`
- **Assert:** 200 · all totals 0 · `NetTaxPayable == 0` · `Status == "Settled"` (default switch arm) · empty `InputTaxes`/`OutputTaxes`

### TC-D07.028 — Tenant isolation: other tenant's journal invisible and other tenant's FY unresolvable
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-7.1 + tenancy model (global query filters)
- **Arrange:** canonical seed; JWT for **Tenant B** admin
- **Act/Assert:** (a) `GET /api/reports/trialbalancereport?FromDate=2026-03-01&ToDate=2026-03-31` as Tenant B → 200 with totals 0/0 and empty rows (Tenant A's 18 entries invisible); (b) `GET /api/reports/balancesheetreport?FinancialYearId={TenantA-FY2026-id}` as Tenant B → **404** "Financial Year Not Found"; (c) same ProfitLoss call → 404

### TC-D07.029 — Report claim gates return 403 without the claim; Paymentreport endpoint is unguarded (current behavior)
- **Layers:** IT
- **Priority:** P0   **Category:** Permission
- **Source:** WF-7.1 + `ReportsController.cs:26-163`
- **Arrange:** JWT for `cashier` (no `ACCOUNTING_*` claims)
- **Act/Assert:** GET `trialbalancereport`, `ProfitLoss`, `taxreport`, `cashbankreport`, `balancesheetreport`, `AccountBalancereport`, `GET /api/reports` (general entry), `cashflowreport` → each **403** · contrast: `GET /api/reports/Paymentreport` with the same token → **200** (no `[ClaimCheck]` on :144-163, class `[Authorize]` commented out :18) — characterization of the unguarded endpoint; do not "fix" this test when hardening lands, replace it then (see Discrepancy notes)

---

## WF-7.2 — Operational Reports (Document-based)

### TC-D07.030 — Sales Order Report aggregates item rows with exact totals
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`GET salesOrder/items/reports`, claim `REP_PRO_SO_REPORT`, SalesOrderController.cs:228-253)
- **Arrange:** canonical seed; JWT admin; window 2026-03-10…03-14
- **Act:** `GET /api/salesOrder/items/reports?FromDate=2026-03-10&ToDate=2026-03-14`
- **Assert:** 200 · 2 item rows (SO-1: P-SIMPLE qty 2 @200 tax 68; SO-2: qty 1 @200 tax 34) · Σqty 3, Σnet 600, Σtax 102, Σgross 702
- **Assert (PM):** item-level field contract (`productName`, `quantity`, `unitPrice`, `taxValue`, `total`) and location/date filter params accepted

### TC-D07.031 — Sales Order Report honors date-range scoping and returns empty for out-of-range windows
- **Layers:** IT
- **Priority:** P1   **Category:** Edge (scoping + empty data)
- **Source:** WF-7.2
- **Arrange:** canonical seed
- **Act/Assert:** (a) window 2026-03-10…03-10 → 1 row (qty 2, net 400, tax 68); (b) window 2025-01-01…2025-12-31 → 0 rows, 200 OK

### TC-D07.032 — Sales Order Items drill-down returns SO-2's single line
- **Layers:** IT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-7.2 (`sales-order-items` family, `salesOrder/{id}/items`, SalesOrderController.cs:213-214)
- **Arrange:** canonical seed; SO-2 id chained
- **Act:** `GET /api/salesOrder/{SO-2}/items`
- **Assert:** 200 · 1 item: P-SIMPLE, qty 1, unitPrice 200, taxValue 34, `Status == Not_Return`

### TC-D07.033 — Purchase Order Report aggregates the single purchase
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`GET PurchaseOrder/items/reports`, claim `REP_PRO_PP_REP`, PurchaseOrderController.cs:213-233)
- **Arrange:** canonical seed; window 2026-03-10…03-14
- **Act:** `GET /api/PurchaseOrder/items/reports?FromDate=2026-03-10&ToDate=2026-03-14`
- **Assert:** 200 · 1 row: P-SIMPLE qty 10 @100, tax 170, total 1170 · empty for window 2025 (0 rows)
- **Assert (PM):** contract mirrors TC-D07.030 shapes for the purchase side

### TC-D07.034 — Purchase Order Items drill-down returns PO-1's line
- **Layers:** IT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-7.2 (`purchase-order-item`, `PurchaseOrder/{id}/items`, PurchaseOrderController.cs:185-186)
- **Arrange:** canonical seed; PO-1 id chained
- **Act:** `GET /api/PurchaseOrder/{PO-1}/items`
- **Assert:** 200 · 1 item: P-SIMPLE qty 10 @100, taxValue 170

### TC-D07.035 — Sales Payment Report lists the single customer payment with date scoping
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`GET SalesOrderPayment/report`, claim `REP_SO_PAYMENT_REP`, SalesOrderPaymentController.cs:85+)
- **Arrange:** canonical seed
- **Act/Assert:** (a) window 2026-03-13…03-13 → 1 paged row: amount 100, method Bank, against SO-2, date 2026-03-13; (b) window 2026-03-10…03-12 → 0 rows
- **Assert (PM):** paged contract with `totalCount == 1` in (a)

### TC-D07.036 — Purchase Payment Report returns an empty paged list (no purchase payments seeded)
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Edge (empty data)
- **Source:** WF-7.2 (`GET PurchaseOrderPayment/report`, claim `REP_PO_PAYMENT_REP`, PurchaseOrderPaymentController.cs:54-77)
- **Arrange:** canonical seed (no purchase payment rows)
- **Act:** `GET /api/PurchaseOrderPayment/report?FromDate=2026-03-01&ToDate=2026-03-31`
- **Assert:** 200 · 0 rows · `totalCount == 0`

### TC-D07.037 — Customer Payment aggregation shows C-1 receipts totalling 100
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`GetCustomerPaymentsQueryHandler`, per-customer receipts)
- **Arrange:** canonical seed
- **Act:** customer payments report/query for C-1, window 2026-03-01…03-31
- **Assert:** 200 · 1 receipt row 100 (PAY-1 via Bank) · customer total 100

### TC-D07.038 — Supplier Payments aggregation is empty when no supplier payments exist
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (empty data)
- **Source:** WF-7.2 (supplier payments aggregation)
- **Arrange:** canonical seed
- **Act:** supplier payments report for S-1
- **Assert:** 200 · 0 rows · supplier total 0

### TC-D07.039 — Product Sales Report shows gross, returns and net per product
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (sales items aggregation)
- **Arrange:** canonical seed; window 2026-03-10…03-14
- **Act:** product sales report
- **Assert:** 200 · P-SIMPLE row: gross sold qty 3 / value 600 / tax 102 · returns qty 1 / value 200 / tax 34 · net qty 2 / value 400 / tax 68

### TC-D07.040 — Product Purchase Report shows the single purchase line
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (purchase items aggregation)
- **Arrange:** canonical seed; window 2026-03-10…03-14
- **Act:** product purchase report
- **Assert:** 200 · P-SIMPLE: qty 10, value 1000, tax 170

### TC-D07.041 — Document-level P&L (SO + PO endpoints) differs from ledger P&L by construction
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`salesOrder/items/profitLoss` + `PurchaseOrder/items/profitLoss`, claims `REP_VIEW_PRO_LOSS_REP`, SalesOrderController.cs:282-283 / PurchaseOrderController.cs:255-256)
- **Arrange:** canonical seed
- **Act/Assert:** (a) `GET /api/salesOrder/items/profitLoss?FromDate=2026-03-10&ToDate=2026-03-14` → net sales 400 (600 − 200 returns), net COGS 200 (300 − 100), document gross margin **200**; (b) `GET /api/PurchaseOrder/items/profitLoss` (same window) → purchase value **1000**; (c) contrast note asserted in-test: document P&L contains no expense line at all (ledger P&L TC-D07.010 shows Expense 100; this endpoint shows none)

### TC-D07.042 — Expense Report lists EXP-1 with category and zero input tax
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (expense queries; `expense-report`)
- **Arrange:** canonical seed; window 2026-03-01…03-31
- **Act:** expense report
- **Assert:** 200 · 1 row: EXP-1, amount 100, category "Rent", input tax 0 · total 100 · (payroll/discount/stock-loss postings are Transactions, not Expense documents — they do not appear; assert row count 1)

### TC-D07.043 — Expense Tax Report is empty when no expense carries input tax
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (empty data)
- **Source:** WF-7.2 (expense tax aggregation)
- **Arrange:** canonical seed (EXP-1 tax-free)
- **Act:** expense tax report, window 2026-03-01…03-31
- **Assert:** 200 · 0 rows · total input tax 0

### TC-D07.044 — Input Tax Report (purchase tax-item family) totals 170
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`PurchaseOrder/tax-item-total` + `{id}/tax-item`, claim `REP_VIEW_INPUT_TAX_REP`, PurchaseOrderController.cs:276-314)
- **Arrange:** canonical seed
- **Act:** `GET /api/PurchaseOrder/tax-item-total?FromDate=2026-03-01&ToDate=2026-03-31`
- **Assert:** 200 · input tax total **170** (PO-1's GST 17% row) · per-item detail for PO-1 shows tax 170
- **Assert (PM):** tax-item DTO fields (`taxName`, `taxValue`)

### TC-D07.045 — Output Tax Report (sales tax-item family) totals 102 across both sales
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`salesOrder/tax-item-total`, claim `REP_VIEW_OUTPUT_TAX_REP`, SalesOrderController.cs:295-331)
- **Arrange:** canonical seed
- **Act:** `GET /api/salesOrder/tax-item-total?FromDate=2026-03-01&ToDate=2026-03-31`
- **Assert:** 200 · output tax total **102** (SO-1: 68, SO-2: 34) · `GET /api/salesOrder/{SO-1}/tax-item` → 68
- **Assert (PM):** tax-item contract; note SR-1's 34 debit to 2151 is a ledger event (asserted in TC-D07.025), not part of this document-level total

### TC-D07.046 — Stock Report quantities tie to ProductStock and to the Inventory ledger balance
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (ProductStock queries; `stock-report`)
- **Arrange:** canonical seed (P-SIMPLE @L1 = 7)
- **Act:** stock report for location L1
- **Assert:** 200 · P-SIMPLE row: qty 7 @ L1, qty 0 @ L2 · valuation 7 × 100 = **700** · **cross-ledger invariant:** 700 == Balance Sheet Inventory (1200) signed balance 700 (TC-D07.007)

### TC-D07.047 — Inventory History shows the 5-movement trail with running balance 7
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (inventory history + batch datasource)
- **Arrange:** canonical seed
- **Act:** inventory history for P-SIMPLE @ L1, window 2026-03-01…03-31
- **Assert:** 200 · 5 movement rows in order: +10 (PO-1), −2 (SO-1), −1 (SO-2), +1 (SR-1), −1 (stock loss) · running balance ends at 7

### TC-D07.048 — Sales vs Purchase comparative merges both series per calendar day
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 + WF-7.3 (`GetSalesVsPurchaseReportCommandHandler.cs:43-81`; endpoint `dashboard/salesvspurchase`, claim `REP_SALES_VS_PURCHASE_REP`)
- **Arrange:** canonical seed (SR-1 is a SalesOrder row `Status=Return`, `IsSalesOrderRequest=false`, TotalAmount 234); window 2026-03-10…03-13
- **Act:** `GET /api/dashboard/salesvspurchase?FromDate=2026-03-10&ToDate=2026-03-13`
- **Assert:** 200 · merged rows: 2026-03-10 {TotalSales 468, TotalPurchase 1170}; 2026-03-11 {234, 0}; 2026-03-12 {234, 0} (return order counted into the sales series — characterized); no 2026-03-13 row · request-type orders excluded (`IsSalesOrderRequest=false` / `IsPurchaseOrderRequest=false` filters)
- **Assert (PM):** two-series DTO shape (`date`, `totalSales`, `totalPurchase`)

### TC-D07.049 — Daily Sale Report for the credit-sale day nets AR-based figures exactly
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.2 (`GetDailySaleReportCommandHandler.cs:87-147`)
- **Arrange:** canonical seed; report date 2026-03-11; admin (`IsAllLocations`)
- **Act:** daily sale report for 2026-03-11
- **Assert:** 200 · `TransactionCount == 1` (TRX-SO-2) · `GrossSales == 200` (AR Dr Regular 200 − 0) · `Discounts == 0` · `TaxableAmount == 200` · `TotalTax == 34` (AR Dr Tax 34) · `NetSales == 234` · `AverageSale == 234` · `ItemsSoldCount == 1`, `ItemsReturn == 0`

### TC-D07.050 — Daily Purchase Report is AP(2100)-based: a cash purchase shows count 1 but zero values — current behavior characterized
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (characterization of AP-based math)
- **Source:** WF-7.2 (`GetDailyPurchaseReportCommandHandler.cs:76-131` reads only 2100/4200 entries; doc-07:84 claims Transaction-type aggregation)
- **Arrange:** canonical seed (PO-1 paid from Bank — **no AP leg**); report date 2026-03-10
- **Act:** daily purchase report for 2026-03-10
- **Assert:** 200 · `TransactionCount == 1` (TRX-PO-1) · `GrossPurchase == 0`, `TotalTax == 0`, `NetPurchase == 0`, `AveragePurchase == 0` · `PurchasedItemsCount == 1`, `ItemsReturn == 0` — the day's 1170 cash purchase is invisible in the value columns (current behavior; see Discrepancy notes)

### TC-D07.051 — Daily Payment Breakdown returns all-time cash/bank sums because the date filter binds to one clause only — current bug characterized
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (characterization of operator-precedence bug)
- **Source:** WF-7.2 (`GetDailyPaymentBreakdownReportCommandHandler.cs:53-59`: `a || b || c || d && dateRange` — `&&` binds to the bank-credit clause only)
- **Arrange:** canonical seed; report date 2026-03-13 (only E7 touches cash/bank that day)
- **Act:** daily payment breakdown for 2026-03-13
- **Assert (current behavior):** 200 · `CashReceived == 468` (all-time cash debits E3a+E3b), `BankReceived == 3100` (all-time bank debits E1+E7), `CashGiven == 335` (all-time cash credits), `BankGiven == 0` (only bank-credit clause is date-filtered), `TotalCollected == 3568`, `TotalGiven == 335` · a post-fix behavior would expect `TotalCollected == 100, TotalGiven == 0` — when fixed, rewrite this case as the Happy case with those numbers (never silently keep both)

### TC-D07.052 — Operational report claims gate their endpoints (403 without claim)
- **Layers:** IT
- **Priority:** P0   **Category:** Permission
- **Source:** WF-7.2 (claims grep-verified, see header)
- **Arrange:** JWT for `cashier` (no `REP_*` claims)
- **Act/Assert:** each returns **403**: `GET /api/salesOrder/items/reports` (`REP_PRO_SO_REPORT`), `GET /api/PurchaseOrder/items/reports` (`REP_PRO_PP_REP`), `GET /api/SalesOrderPayment/report` (`REP_SO_PAYMENT_REP`), `GET /api/PurchaseOrderPayment/report` (`REP_PO_PAYMENT_REP`), `GET /api/salesOrder/items/profitLoss` + `GET /api/PurchaseOrder/items/profitLoss` (`REP_VIEW_PRO_LOSS_REP`), `GET /api/salesOrder/tax-item-total` (`REP_VIEW_OUTPUT_TAX_REP`), `GET /api/PurchaseOrder/tax-item-total` (`REP_VIEW_INPUT_TAX_REP`)

---

## WF-7.3 — Dashboard Widget Workflows

### TC-D07.053 — Dashboard statistics tiles (ledger-based) return exact aggregates for the window
- **Layers:** IT · PM · E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.3 (`GET dashboard/statistics` → `GetDashbordAccountQueryCommandHandler.cs:26-70`, claim `DB_STATISTICS`)
- **Arrange:** canonical seed; window FromDate=2026-03-10, ToDate=2026-03-12 (handler adds +1 day inclusive)
- **Act:** `GET /api/dashboard/statistics?FromDate=2026-03-10&ToDate=2026-03-12`
- **Assert:** 200 · `TotalPurchase == 1170`, `TotalSales == 702` (468 + 234), `TotalSalesReturn == 234`, `TotalPurchaseReturn == 0`
- **Assert (PM):** `DashboardStatics` field names as above
- **Assert (E2E):** dashboard tiles render 1,170.00 / 702.00 / 234.00 / 0.00

### TC-D07.054 — Payment-narrated Sale-type transactions are counted inside TotalSales — current quirk characterized
- **Layers:** IT
- **Priority:** P2   **Category:** Edge (characterization; doc-07:99 vs code mismatch)
- **Source:** WF-7.3 (`GetDashbordAccountQueryCommandHandler.cs:48-62` — `!IsPayment` filter applied only to return sums)
- **Arrange:** canonical seed; window 2026-03-10…03-14 (includes TRX-PAY-1, Sale-type, narration "PAYMENT RECEIPT against SO-2", 100)
- **Act:** `GET /api/dashboard/statistics?FromDate=2026-03-10&ToDate=2026-03-14`
- **Assert:** 200 · `TotalSales == 802` (468 + 234 + 100 payment-narrated row included), `TotalPurchase == 1170`, `TotalSalesReturn == 234` (payment filter active here), `TotalPurchaseReturn == 0` (see Discrepancy notes)

### TC-D07.055 — Best sellers widget ranks P-SIMPLE with return-aware net quantity 2
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.3 (`GetBestSellingProductCommandHandler.cs:122-135` EF fallback; Dapper path :83-97; claim `DB_BEST_SELLING_PROS`)
- **Arrange:** canonical seed (SO-1 qty 2, SO-2 qty 1, SR-1 Return qty 1); window 2026-03-10…03-14; run with Dapper flag off (EF path) and on (Dapper path) in separate factories
- **Act:** `GET /api/dashboard/bestsellingproduct?FromDate=2026-03-10&ToDate=2026-03-14`
- **Assert:** 200 · 1 row: `Name == "P-SIMPLE"`, `Count == 2` (2 + 1 − 1) · top-1 ordering

### TC-D07.056 — Income comparison returns 12 monthly rows; current year month 3 nets to −234, last year zeros
- **Layers:** IT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-7.3 (`GetIncomeComparisonQueryHandler.cs:180-222` EF path; Dapper path :65-169; claim `DB_STATISTICS`)
- **Arrange:** seed dates derived from the injected clock's current year (builder parameter) so `DateTime.Now` at :62 is deterministic; orders SO-1 468, SO-2 234, SR-1 234 (return order included by `!IsSalesOrderRequest` filter), PO-1 1170 — all in month 3
- **Act:** `GET /api/dashboard/income-comparison`
- **Assert:** 200 · exactly 12 rows (months 1–12) · month 3: `CurrentYearIncome == 936 − 1170 == −234`, `LastYearIncome == 0` · every other month: 0/0

### TC-D07.057 — Reminder count widgets return seeded counts per frequency
- **Layers:** IT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-7.3 item 5 (WF-8.4 handlers under `Dashboard/Handlers/Get*ReminderQueryHandler.cs`)
- **Arrange:** canonical seed + 2 daily reminders due today, 0 weekly
- **Act:** `GET /api/dashboard/dailyreminder/{month}/{year}` and `GET /api/dashboard/weeklyreminder/{month}/{year}`
- **Assert:** 200 · daily returns **2**, weekly returns **0**

### TC-D07.058 — Stock alert widget flags P-SIMPLE below reorder level
- **Layers:** IT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-7.3 item 7 (WF-5.7 `stock-alert` endpoint)
- **Arrange:** canonical seed (P-SIMPLE stock 7 < minStockLevel 20)
- **Act:** `GET /api/productStock/stock-alert` (stock-alert endpoint)
- **Assert:** 200 · P-SIMPLE present with currentStock 7 and minStockLevel 20

### TC-D07.059 — Recent shipments widget returns an empty list when nothing is delivered
- **Layers:** IT
- **Priority:** P3   **Category:** Edge (empty data)
- **Source:** WF-7.3 item 6 (`salesOrder/recentshipment`, claim `DB_RECENT_SO_SHIPMENT`, SalesOrderController.cs:268-269)
- **Arrange:** canonical seed (no delivery marked)
- **Act:** `GET /api/salesOrder/recentshipment` with admin JWT
- **Assert:** 200 · empty list

### TC-D07.060 — Cached dashboard tiles stay stale after a write (no eviction) — current behavior characterized
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [REP-04]
- **Source:** WF-7.3 ⚠ + doc-11 REP-04 (`CachingBehavior.cs:27-52`; TTL 15 min from `GetDashbordAccountQueryCommand.cs:16` — doc-07:105 claims 24h; no eviction path exists for report/dashboard keys)
- **Arrange:** canonical seed; fresh memory cache per factory; window 2026-03-10…03-12
- **Act:** (1) `GET /api/dashboard/statistics?...` → tiles; (2) `POST /api/salesOrder` creating SO-3 (cash, P-SIMPLE qty 1 @200, tax 34 → TotalAmount 234, within window); (3) repeat the same GET
- **Assert:** both GETs return **identical stale values** {1170, 702, 234, 0} — the second call is served from cache and does not reflect SO-3 · do not assert TTL length (source says 15 min, doc says 24h; the staleness property is the gap)

### TC-D07.061 — Dashboard caches are evicted on write so tiles reflect new data immediately — desired behavior
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [REP-04] (RED until fix)
- **Source:** doc-11 REP-04 enhancement ("Event-based eviction on writes")
- **Arrange:** canonical seed; window 2026-03-10…03-12
- **Act:** (1) statistics GET; (2) create SO-3 (234) as above; (3) statistics GET again
- **Assert:** second call returns **{TotalPurchase 1170, TotalSales 936, TotalSalesReturn 234, TotalPurchaseReturn 0}** · **RED by definition** until write-side eviction lands (see TC-D07.060 — the pair may not both pass; that is the point)

### TC-D07.062 — CachingBehavior keys caches per tenant and honors per-query TTL with 24h default
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-7.3 + `CachingBehavior.cs:27-52`, `ICacheableQuery.cs` (pure pipeline, `IMemoryCache` + stub `ITenantProvider` + spy `next`)
- **Arrange:** two tenant providers (T-A, T-B); query with `CacheKey = "K"`, `AbsoluteExpiration = 15min`; second query with `AbsoluteExpiration = null`
- **Act:** send each query twice per tenant
- **Assert:** handler `next` executed once per (query, tenant) pair · cache entries `K_T-A` and `K_T-B` independent (mutating one tenant's cached response does not leak to the other) · null-TTL query cached with `AbsoluteExpirationRelativeToNow == 24h` · `BypassCache == true` skips the cache entirely (next called twice)

### TC-D07.063 — Dashboard widget claims gate their endpoints (403 without claim)
- **Layers:** IT
- **Priority:** P0   **Category:** Permission
- **Source:** WF-7.3 (`DashboardController.cs:143-216`)
- **Arrange:** JWT for `cashier` (no `DB_*`/`REP_*` claims)
- **Act/Assert:** each returns **403**: `GET /api/dashboard/statistics`, `/sales-comparison`, `/income-comparison` (`DB_STATISTICS`), `/bestsellingproduct`, `/product-sales-comparison` (`DB_BEST_SELLING_PROS`), `/salesvspurchase` (`REP_SALES_VS_PURCHASE_REP`)

### TC-D07.064 — Inter-branch stock transfer inflates group-level sales reporting — current behavior characterized
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [BIZ-03]
- **Source:** doc-11 BIZ-03 (transfers booked as sale/purchase to self; "group reports inflated")
- **Arrange:** canonical seed **plus** one L1→L2 stock transfer posted by the current strategy (Sale-type leg Dr AR 500 / Cr Sales 500 at L1, mirrored purchase leg at L2; entry dates 2026-03-15)
- **Act:** daily sale report for 2026-03-15 and trial balance for 2026-03-15…03-15 (no location filter = group view)
- **Assert:** group-level daily sales show `GrossSales` including the internal 500 (AR-based math) and the trial balance shows Sales credits 500 from a movement that never left the company — group figures inflated by intra-group activity (current, documented behavior)

### TC-D07.065 — Inter-branch transfers are eliminated from group reporting — desired behavior
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [BIZ-03] (RED until fix)
- **Source:** doc-11 BIZ-03 enhancement ("Inter-branch (elimination) accounts or transfer-specific strategy")
- **Arrange:** same as TC-D07.064
- **Act:** group-level daily sale report and trial balance for 2026-03-15
- **Assert:** transfer legs absent from external-facing sales figures (elimination account or transfer-type exclusion) · trial balance still balances (ΣDr == ΣCr) with transfer entries visible under explicit intra-group accounts · **RED by definition** until the enhancement lands

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case — WF-7.1 (TC-D07.001/007/010/015/019/021/024/025), WF-7.2 (TC-D07.030/033/035/037/039/040/041/042/044/045/046/047/048/049), WF-7.3 (TC-D07.053/055/056/057/058)
- [x] Every write endpoint has Validation/Permission/Tenant-Isolation cases — D07 owns **no write endpoints** (all reports are read-only, doc-07:3); read-side Permission (TC-D07.029/052/063), Tenant-Isolation (TC-D07.028), Validation (TC-D07.014) covered
- [x] Every money/stock mutation has DB-state assertions — no mutations in this domain; all report assertions are exact DB-derived numbers
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case — REP-01 (011/012), REP-02 (005/006), REP-03 (017/018), REP-04 (060/061), BIZ-03 (064/065); REP-05/BIZ-09 are roadmap-only (no current behavior to characterize — Discrepancy note 9); RT-01…RT-05, UX-01…UX-06 do not touch reporting
- [x] Gap-Char assertions describe CURRENT behavior; Gap-Target describes DESIRED behavior (RED now) — verified against cited handlers/lines
- [x] Concurrency case for sequential-number generation where the doc flags it — INT-11 is D03/D04 territory; D07 performs no numbering (n/a)
- [x] Edge/boundary cases: zero (003/020/027), negative (025 NetTaxPayable −102, 056 income −234), rounding remainder (011/012 round-off 1), empty sets (023/031/036/038/043/059), branch filtering (004/009/020/027), multi-window scoping (005/022/031/035)

## Discrepancy notes

1. **Cache TTL:** doc-07:105 says dashboard caches are "TTL 24h"; source shows all five dashboard cached queries override to **15 minutes** (`Dashboard/Commands/GetDashbordAccountQueryCommand.cs:16`, likewise `GetSalesComparisonQuery.cs:14`, `GetProductSalesComparisonQuery.cs:15`, `GetIncomeComparisonQuery.cs:14`, `GetBestSellingProductCommand.cs:16`); 24h is only the `CachingBehavior` default when `AbsoluteExpiration` is null (`CachingBehavior.cs:45`). REP-04 cases assert staleness, not TTL length, so they hold under either value.
2. **Dashboard payment exclusion:** doc-07:99 says payments are excluded via `Narration.Contains("PAYMENT")`; code applies the filter **only to PurchaseReturn/SaleReturn sums**, not to `TotalPurchase`/`TotalSales` (`GetDashbordAccountQueryCommandHandler.cs:48-58`). TC-D07.054 characterizes the resulting inflated `TotalSales` (802).
3. **Daily payment breakdown operator precedence:** the date filter binds only to the bank-credit clause (`GetDailyPaymentBreakdownReportCommandHandler.cs:53-59`), so cash/bank debit and cash-credit sums are **all-time**, not daily. TC-D07.051 pins current numbers; rewrite as Happy with {100, 0} when fixed.
4. **Daily purchase report is AP-based:** value columns read accounts 2100/4200 only, so cash-paid purchases (the fixture's PO-1) show zeros despite `TransactionCount == 1` (`GetDailyPurchaseReportCommandHandler.cs:76-131`); doc-07:84's "aggregate Transaction rows by type/date" describes only the count columns.
5. **Unguarded payment listing:** `ReportsController` has class-level `[Authorize]` commented out (:18) and `Paymentreport` (:144-163) carries **no `[ClaimCheck]`** — the payment journal listing is reachable without `ACCOUNTING_VIEW_GENERAL_ENTRY_REPORT` (characterized in TC-D07.029). Security-relevant; candidates for a future SEC- gap ID.
6. **Parameter naming:** Trial Balance/Cash Flow bind `LocationId` while FY-scoped handlers bind `BranchId` — cosmetic inconsistency only; cases use each endpoint's actual parameter.
7. **`DateTime.Now` in income comparison** (`GetIncomeComparisonQueryHandler.cs:62`): TC-D07.056 seeds FY dates from the injected clock to stay deterministic (Quality Charter §4).
8. **Return orders in sales series:** the comparative and income-comparison handlers sum all non-request SalesOrder rows, including `Status=Return` documents, so returns inflate the sales series (TC-D07.048/056 seed this explicitly). Not a doc-11 gap; observation only.
9. **REP-05 / BIZ-09** (no stock-valuation report, no AR/AP aging, no custom builder, client-side exports) are roadmap signals with no current implementation to characterize — intentionally without cases.
10. **Verified-consistent:** Trial Balance structural balance, Balance Sheet identity and Equity+Income+Expense bucketing, P&L 5300-only expense line, Cash Flow counter-account math and `TotalCashRecived` spelling, Cash & Bank FY nets, GST child resolution by `ParentAccountId`, journal filters (type via `Transaction.TransactionType`, `CreatedDate` range, number `Contains`), and the claim names in TC-D07.029/052/063 all match the workflow doc exactly.
