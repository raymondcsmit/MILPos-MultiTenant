# Workflow Document 07 — Reporting Workflows

**Scope:** Financial statements (Trial Balance, Balance Sheet, P&L, Cash Flow, Cash & Bank, General Journal, Ledger Balances, GST), operational reports (sales, purchase, payments, stock, tax-item), and dashboard widgets. All reports read committed data only — none mutate state.

**Report data foundation:** financial reports read **`AccountingEntry` rows** (the double-entry journal); operational reports read business documents (orders/payments/stock). FY scoping and date filtering differ per report (see quirks).

---

## WF-7.1 — Financial Reports (AccountingEntry-based)

All handlers live under `POS.MediatR/Accouting/Report/`; all accept optional `BranchId` (location) filters; controller surface under `POS.API/Controllers/Accounting/`.

### Trial Balance — `Report/TrialBalance/GetTrialBalanceCommandHandler.cs` (23-88)
- **Date-range filtered** (`EntryDate` from 00:00:00 to 23:59:59), optional branch (30-45). **No FY scope, no opening-balance consideration.**
- Group entries by `DebitLedgerAccountId` → debit sums (55-57); by `CreditLedgerAccountId` → credit sums (59-61).
- Per account in the union: DebitAmount, CreditAmount (66-71); grand totals (74-79).
- Because every entry is self-balancing (both legs in one row), **DebitTotal always equals CreditTotal** — the report is structurally guaranteed to balance.

### Balance Sheet — `Report/BalanceSheet/GetBalanceSheetReportCommandHandler.cs` (23-109)
- **FY-scoped** (27-40), optional branch.
- Per ledger account: debit total, credit total; **signed balance by AccountType** (52-68): Asset = Dr−Cr; Liability/Equity/Income = Cr−Dr; Expense = Dr−Cr.
- Buckets (79-93): Assets = Asset accounts; Liabilities = Liability accounts; **Equity list = Equity + Income + Expense accounts**.
- Totals (98-108): `TotalEquity = equityAccounts + incomeTotal − expenseTotal` (implicit P&L close); `TotalAssets`, `TotalLiabilities` sums. Equation holds because entries are self-balancing.

### Profit & Loss — `Report/ProfitLoss/GetProfitLossReportCommandHandler.cs` (24-96)
- **Hard-coded accounts: 4100 Sales, 5100 COGS, 5300 Expense** (35-41); FY-scoped (44-49).
- `SalesRevenue` = credits to 4100 (57-59); `SalesReturn` = debits to 4100 (61-63); `COGS` = debits to 5100 (67-69); `COGSReturn` = credits to 5100 (71-73); `Expense` = debits to **5300 only** (76-78).
- `GrossProfit = (SalesRevenue − SalesReturn) − (COGS − COGSReturn)` (81); `NetResult = GrossProfit − Expense` (82); label Profit/Loss/Break-even (84-89).
- **⚠ Payroll (6xxx), discounts (5200), stock losses (5400), round-off (5900) are NOT in the Expense line** — the report's NetResult overstates profit relative to the Balance Sheet's implied close.

### Cash Flow — `Report/CashFlow/GetCashFlowReportCommandHandler.cs` (19-101)
- Cash accounts = codes **1050 & 1060** (23); date-range + optional branch (27-36).
- Selects entries touching cash/bank (39-53), grouped by (DebitId, CreditId) pair.
- **Cash received** = Σ debits to cash accounts grouped by the **credit (counter) account** (58-71); **cash paid** = Σ credits from cash accounts grouped by the **debit (counter) account** (73-87).
- Output: per-counter-account in/out lists, `TotalCashRecived`, `TotalCashPaid`, `NetTotalMovement` (89-98).
- **⚠ No operating/investing/financing classification** — a movement report, not a statement of cash flows.

### Cash & Bank — `Report/CashBank/GetCashBankReportCommandHandler.cs` (24-74)
- FY-scoped (28-42). For 1050: `CashTotal = debits − credits` (55-60); for 1060: `BankTotal` (62-67). Current balances only, no movement detail.

### General Journal listing — `Report/GeneralEntry/GetGeneralEntryCommandHandler.cs` (19-23)
- Delegates to `AccountingEntryRepository.GetAccountingEntryList` (POS.Repository/Accouting/AccountingEntryRepository.cs:78-122): filters by FY, branch, transaction type (via Transaction.TransactionType, 91-94), created-date range, transaction number; paged list showing Dr/Cr account names + amounts.
- Payment listing companion: `Report/Payment/GetPaymentEntryListCommandHandler.cs`.

### Ledger Account Balances — `Report/LeadgerAccountBalance/GetLedgerAccountBalancesCommandHandler.cs` (24-68)
- FY + optional branch (37-41). Unfolds every entry into two legs (43-48), groups per account → DebitTotals/CreditTotals (50-67). **Raw totals, no sign normalization, no opening balances** (unlike Balance Sheet).

### GST / Tax Report — `Report/Tax/GetTaxReportCommandHandler.cs` (21-138)
- Resolves parents **1150 (Input)** and **2150 (Output)** and their **children by `ParentAccountId`** (38-60) — children are the per-tax GST accounts mapped by `Tax.In/OutPutAccountCode`.
- FY + branch scoped entries touching any child (62-73):
  - `InputPurchases` = debits to input children (75-82); `InputReturns` = credits (84-88); `inputNet` (90-92).
  - `OutputSales` = credits to output children (94-101); `OutputReturns` = debits (103-107); `outputNet` (109-111).
  - `NetTaxPayable = outputNet − inputNet` (119); status **Payable / Refund / Settled** (124-129).
- Companion detail records: TaxEntry rows written at transaction time (WF-6.1 step 8).

---

## WF-7.2 — Operational Reports (Document-based)

**Controllers:** SalesOrderController report endpoints + PurchaseOrderController report endpoints + dedicated report controllers. Angular `reports/` module hosts 17 report components, each with a MatTable datasource, date-range + location filters, CSV/Excel export, print.

| Report (Angular component) | Backend source | Notes |
|---|---|---|
| Sales Order Report (`sales-order-report`) | `GET salesOrder/items/reports` (SalesOrderController 228-253, claim `REP_PRO_SO_REPORT`) | Item-level, date/location filtered |
| Sales Order Items (`sales-order-items`) | same family | Drill into lines |
| Purchase Order Report (`purchase-order-report`) | `GET PurchaseOrder/items/reports` (213-233, `REP_PRO_PP_REP`) | Item-level |
| Purchase Order Items (`purchase-order-item`) | same family | — |
| Sales Payment Report (`sales-payment-report`) | `GET SalesOrderPayment/report` (SalesOrderPaymentController 85+, `REP_SO_PAYMENT_REP`) | Paged |
| Purchase Payment Report (`purchase-payment-report`) | `GET PurchaseOrderPayment/report` (54-77, `REP_PO_PAYMENT_REP`) | Paged |
| Customer Payment Report (`customer-payment-report`) | Customer payments aggregation (`GetCustomerPaymentsQueryHandler`) | Per-customer receipts |
| Supplier Payments (`supplier-payments`) | Purchase payments aggregation | Per-supplier |
| Product Sales Report (`product-sales-report`) | Sales items aggregation | Top/trend by product |
| Product Purchase Report (`product-purchase-report`) | Purchase items aggregation | — |
| Profit & Loss (`profit-loss-report`) | `GET salesOrder/items/profitLoss` + `PurchaseOrder/items/profitLoss` (claims `REP_VIEW_PRO_LOSS_REP`) | Document-level P&L (distinct from the ledger P&L in WF-7.1) |
| Expense Report (`expense-report`) | Expense queries | With category/tax splits |
| Expense Tax Report (`expense-tax-report(-item)`) | Expense tax aggregation | Input-tax view of expenses |
| Input Tax Report (`input-tax-report(-item)`) | `salesOrder/tax-item-total` family (input side) | GST input detail |
| Output Tax Report (`out-tax-report(-item)`) | `salesOrder/tax-item-total` family (output side) | GST output detail |
| Stock Report (`stock-report`) | ProductStock queries | Per-location quantities |
| Inventory History (`inventory-history-list`) | Inventory history + batch datasource | Movement trail |

**Sales/Purchase comparative report** (`sales-purchase-report` + `GetSalesVsPurchaseReportCommandHandler`): groups sales orders and purchase orders separately by calendar day, merges on Date in memory → two-series time series (EF, no Dapper).

**Daily operational reports** (`Accouting/Report/DailyReport/` — GetDailySaleReport, GetDailyPurchaseReport, GetDailyPaymentBreakdown): aggregate **Transaction** rows by type/date rather than ledger entries.

**Totals/tax endpoints:** `salesOrder/total`, `salesOrder/tax-item-total`, `salesOrder/{id}/tax-item` (and PO equivalents) power the tax-item reports; claims `REP_VIEW_OUTPUT_TAX_REP` / `REP_VIEW_INPUT_TAX_REP`.

---

## WF-7.3 — Dashboard Widget Workflows

All handlers under `POS.MediatR/Dashboard/Handlers/`; all accept `LocationId?` (falls back to `_userInfoToken.LocationIds`), `FromDate`, `ToDate` (+1 day inclusive).

1. **Top tiles** — `DashboardStaticaticsQueryHandler` (53-132) → `{ TotalPurchase, TotalSales, TotalSalesReturn, TotalPurchaseReturn }`:
   - **Dapper fast path** gated by `Features:Dapper:DashboardStaticaticsQueryHandler` (55): one `QueryMultipleAsync` batch (73-94) — SUM(TotalAmount) over POs/SOs (excluding request-type) + per-item return sums `(UnitPrice*Qty)+TaxValue−Discount` where `Status=Return`, joined to parent orders for tenant/date/location filters. Table names via `ISqlConnectionAccessor.GetTableName<T>()` (66-69).
   - **EF fallback** (109-131) mirrors the aggregates with `AsNoTracking()`.
2. **Best sellers** — `GetBestSellingProductCommandHandler` (46-136): Dapper GROUP BY product with return-aware signed qty (`CASE WHEN Status=Return THEN −Qty`), provider-aware LIMIT (OFFSET/FETCH vs LIMIT, 79-81), top 10; EF fallback groups in memory (122-135).
3. **Sales vs Purchase trend** — `GetSalesVsPurchaseReportCommandHandler` (30-84): pure EF; two-series daily merge (see WF-7.2).
4. **Accounting-tile variant** — `GetDashbordAccountQueryCommandHandler` (21-72): aggregates from the ledger `Transaction` side instead of orders — filters types {Purchase, PurchaseReturn, Sale, SaleReturn}, excludes payments via `Narration.Contains("PAYMENT")`; `ICacheableQuery` (server memory-cached per tenant).
5. **Reminder cards** — `GetDaily/Weekly/Monthly/Quarterly/HalfYearly/Yearly/OneTimeReminderQuery` handlers count upcoming reminders per frequency (see WF-8.4).
6. **Recent shipments/deliveries** — `salesOrder/recentshipment` (claim `DB_RECENT_SO_SHIPMENT`) + `PurchaseOrder/recentdelivery` (`DB_RECENT_PO_DELIVERY`) feed the recent-activity widgets.
7. **Stock alerts widget** — `stock-alert` endpoint (WF-5.7) feeds the low-stock card.
8. **Income comparison** — `GetIncomeComparisonQueryHandler` (Dapper/EF dual path, feature-flagged); cached (`ICacheableQuery`).

**Caching:** dashboard queries `GetSalesComparisonQuery`, `GetProductSalesComparisonQuery`, `GetIncomeComparisonQuery`, `GetDashbordAccountQueryCommand`, `GetBestSellingProductCommand` implement `ICacheableQuery` → MediatR CachingBehavior caches per tenant, TTL 24h, **no write-side invalidation** (see WF-9.7).

---

## Report Scope & Consistency Matrix

| Report | Scope | Opening balances | Branch filter | Source |
|---|---|---|---|---|
| Trial Balance | Date range only | ✗ | ✓ | AccountingEntry |
| Balance Sheet | FY | implied via 5555 entries | ✓ | AccountingEntry |
| P&L | FY | n/a | ✓ | AccountingEntry (3 accounts only) |
| Cash Flow | Date range | n/a | ✓ | AccountingEntry (1050/1060) |
| Cash & Bank | FY | via 5555 | ✓ | AccountingEntry |
| Ledger Balances | FY | ✗ | ✓ | AccountingEntry |
| GST Report | FY | n/a | ✓ | AccountingEntry (GST children) |
| Operational reports | Date range | n/a | ✓ | Business documents |
| Dashboard tiles | Date range | n/a | ✓ | Documents (Dapper) or Ledger |

**⚠ Consistency caveat:** Trial Balance (date-range) vs Balance Sheet (FY-scoped) can disagree for the same day; document-based P&L vs ledger-based P&L use different expense sets.

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| R-01 | P&L | Expense line = account 5300 only; payroll/discounts/stock-loss excluded → misleading NetResult |
| R-02 | Consistency | Trial Balance not FY-scoped; no opening-balance integration anywhere except Balance Sheet |
| R-03 | Cash Flow | No operating/investing/financing classification |
| R-04 | Coverage | No aged receivables/payables report (AR aging); no stock-valuation report (by cost layer) |
| R-05 | Export | Excel/CSV exports are client-side; no scheduled/automated report delivery |
| R-06 | Dashboard | 24h cache with no invalidation → stale tiles after data entry |
| R-07 | Tax | GST report is ledger-based; no FBR-aligned invoice register report |
| R-08 | Custom | No user-defined/custom report builder |
