# TC-D06 — Accounting & Finance Test Cases

**Source:** `New-Documents/06_Accounting_Finance_Workflows.md` (WF-6.1 … WF-6.6) — code-verified against `SourceCode/SQLAPI/POS.MediatR/` (verification map below).
**Scope:** Double-entry engine, all strategy journal mappings, payment processing, customer ledger FIFO, financial years, year-end closing, loans, payroll, opening balances.
**Workflows covered:** WF-6.1, WF-6.2, WF-6.3, WF-6.4, WF-6.5, WF-6.6.
**Gap signals referenced:** INT-01, INT-02, INT-03, ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10, ACC-11 (cross-refs: INT-06, INT-11).

**Code verification map (spot-checked 2026-08-28):**

| Component | File (under `SourceCode/SQLAPI/`) | Verified |
|---|---|---|
| Pipeline | `POS.MediatR/Accouting/Services/AccountingService.cs` (L26-134; empty save checks L88-91/106-109/157-160/187-190; reversal engine L209-270) | Yes |
| Sale | `POS.MediatR/Accouting/Strategies/SaleStrategy.cs` (L18-160) | Yes |
| Sale Return | `POS.MediatR/Accouting/Strategies/SaleReturnStrategy.cs` (L18-164) | Yes |
| Purchase | `POS.MediatR/Accouting/Strategies/PurchaseStrategy.cs` (L18-132) | Yes |
| Purchase Return | `POS.MediatR/Accouting/Strategies/PurchaseReturnStrategy.cs` (L17-132) | Yes |
| Expense | `POS.MediatR/Accouting/Strategies/ExpenseStrategy.cs` (L19-88; whole-total GST L59, dictionary overwrite L60-61) | Yes |
| Stock Adjustment | `POS.MediatR/Accouting/Strategies/StockAdjustmentStrategy.cs` (L18-106; narration substring L30) | Yes |
| Payroll | `POS.MediatR/Accouting/Strategies/PayrollStrategy.cs` (L19-113) | Yes |
| Loan | `POS.MediatR/Accouting/Strategies/LoanStrategy.cs` (L21-51; interest bug L48) + `Accouting/LoanDetail/AddLoanDetailCommand.cs`, `AddPartialRePaymentOfLoanCommand.cs` | Yes |
| Payments | `POS.MediatR/Accouting/Services/PaymentService.cs` (Guid.Empty L54; refund call commented L199), `Strategies/FullPaymentStrategy.cs` (L70-164), `Strategies/PartialPaymentStrategy.cs`, `Strategies/IPaymentStrategyFactory.cs` (always-Full L25-40) | Yes |
| Factory | `POS.MediatR/Accouting/Strategies/TransactionStrategyFactory.cs` (L16-30) | Yes |
| Tax | `POS.MediatR/Accouting/Services/TaxService.cs` (L9-38) | Yes |
| Customer Ledger | `POS.MediatR/CustomerLedger/Add/AddCustomerLedgerCommandHandler.cs` (L31-118) | Yes |
| Year-End | `POS.MediatR/Accouting/YearEndClosing/Add/AddYearEndClosingCommandHandler.cs` (L37-228; unfiltered totals L71-78) | Yes |
| General Entry / Opening Balance | `POS.MediatR/Accouting/GeneralEntry/Add/AddGeneralEntryCommandHandler.cs`, `Accouting/LedgerAccount/Add/AddOpeningBalanceCommandHandler.cs` | Yes |
| Transaction numbers | `POS.Repository/Accouting/Transaction/TransactionRepository.cs` (L69-97) | Yes |
| Controllers | `POS.API/Controllers/Accounting/*.cs` (Transaction, Loan, GeneralEntry, YearEndClosing, LedgerAccount, PayRoll, FinancialYear), `POS.API/Controllers/CustomerLedger/CustomerLedgerController.cs`, `POS.API/Controllers/Expense/ExpenseController.cs` | Yes |

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed), branches B1 (location L1), B2 (L2); Tenant B (isolation checks). Users: `admin` (all claims), `manager` (no accounting claims), `cashier` (POS claims only).
- Open FinancialYear **FY2026** (2026-01-01 → 2026-12-31). Chart of Accounts per WF-6.2: Cash 1050, Bank 1060, AR 1100, Input-GST 1150 (parent), Inventory 1200, AP 2100, Output-GST 2150 (parent), Salary Payable 2200, Income Summary 3100, Retained Earnings 3200, Sales 4100, Discount Received 4200, COGS 5100, Sales Discount 5200, General Expense 5300, Stock Adjustment 5400, Opening Balance Equity 5555, Round Off 5900 (seeded AccountType = Income), payroll 6100–6190, loan parent 7000.
- Taxes: **T5** (5%; Output child account 2151 "VAT-5%", Input child 1151 "VAT-5-In"), **T17** (17%; children 2152/1152).
- Products: PS1 (sale price 100, purchase price 60), PS2 (sale 200, purchase 120).
- **Sale fixture S1** (doc-06 worked-example inputs, amounts recomputed from code formulas): 10 × PS1 @ 100, line discount 10%, tax T5, FlatDiscount 50, RoundOffAmount +2 → SubTotal **1000**, header DiscountAmount **150**, TaxAmount **45**, TotalAmount **floor(1000−150+45) = 895**.
- **Purchase fixture PU1**: 10 × PS1 purchased @ 100, line discount 10%, tax T5, no flat discount, RoundOffAmount +1 → SubTotal 1000, Discount 100, Tax 45, Total 945.
- **Payroll fixture PAY1**: Basic 5000, Bonus 500, Commission 300, FestivalBonus 200, Travel 100, Mobile 50, Food 50, Advance 100, Others 200 → TotalSalary **6500**, PaymentMode BANK.
- **Loan fixture LN1**: 100,000 from lender "ACME Bank".
- **Ledger fixture**: customer C1 with open orders SO-A (Total 500, paid 0, oldest), SO-B (Total 300, paid 100 → due 200), SO-C (Total 200, paid 0); overdue = 700.

---

## WF-6.1 — The Central Transaction Pipeline

### TC-D06.001 — Sale posts through the full pipeline with correct stamping, status and effects
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.1
- **Arrange:** tenant A, branch B1, open FY2026, product PS1, fixture S1 payload
- **Act:** POST /api/salesorder (WF-3.2 create endpoint) with admin JWT
- **Assert:** 200/201 · one `Transaction` row: TransactionType = Sale, ReferenceNumber = order number, BranchId = B1, TransactionNumber matches `^SAL-\d{8}-\d{4}$`, FinancialYearId = FY2026.Id, Status = Completed · >=5 AccountingEntry rows exist (strategy ran) · ProductStock for PS1 reduced by 10 · >=1 TaxEntry row exists · response DTO echoes SubTotal 1000, DiscountAmount 150, TaxAmount 45, TotalAmount 895, Status Completed

### TC-D06.002 — Pipeline recomputes header totals from items, ignoring client-supplied totals
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.1 (AccountingService.cs L63-85)
- **Arrange:** items = S1 lines; client sends TotalAmount = 1 (wrong)
- **Act:** call `AccountingService.ProcessTransactionAsync`
- **Assert:** persisted Transaction has SubTotal = 1000 (Sigma qty x price), DiscountAmount = 150 (Sigma line discount 100 + FlatDiscount 50), TaxAmount = 45 (Sigma (line - discount) x 5%), TotalAmount = **895** = Math.Floor(1000-150+45) — recomputed values, not client values · per line: DiscountAmount (fixed vs % branch per DiscountType), TaxAmount = (qty x price - discount) x tax%, LineTotal = after-discount + tax · TransactionItemTaxes rows attached for every TaxId

### TC-D06.003 — Strategy factory dispatches every pipeline-eligible type and rejects the rest
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.1 (TransactionStrategyFactory.cs L16-30)
- **Arrange:** real DI container
- **Act/Assert:** GetStrategy returns PurchaseStrategy / PurchaseReturnStrategy / SaleStrategy / SaleReturnStrategy / ExpenseStrategy / StockAdjustmentStrategy for the 6 core types · **StockTransferFromBranch -> SaleStrategy**, **StockTransferToBranch -> PurchaseStrategy** · for Payment, Payroll, LoanPayable, LoanRepayment, DirectEntry, OpeningBalance, YearEndClosing -> throws `NotSupportedException`

### TC-D06.004 — Transaction numbers follow {PREFIX}-{yyyyMMdd}-{seq:D4} with per-type-per-day counters
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.1 (TransactionRepository.cs L69-97) — cross-ref INT-11
- **Arrange:** open FY, no prior transactions today
- **Act:** create two sales, one purchase, one payment (same day)
- **Assert:** numbers = `SAL-{today}-0001`, `SAL-{today}-0002`, `PUR-{today}-0001`, `PAY-{today}-0001` — sequence is per TransactionType per day · prefix map per code: SAL / PUR / **PRN** (PurchaseReturn) / **SRN** (SaleReturn) / EXP / ADJ / OBL / YEC / PRL / LPA / PAY / LRE / DRE / STF / STT *(doc-06 names "SAL-RET/PUR-RET/STO" do not exist in code — see Discrepancy notes)* · Edge note: counter derives from `CountAsync` (INT-11) — concurrent creation relies on 409 retry, owned by D03/D04 concurrency cases

### TC-D06.005 — No open financial year: pipeline still succeeds but stamps Guid.Empty FY
- **Layers:** IT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-6.1 (AccountingService.cs L31; no guard)
- **Arrange:** close all financial years (`IsClosed = true`)
- **Act:** POST /api/salesorder with fixture S1
- **Assert:** 200/201 · Transaction row persisted with FinancialYearId = `Guid.Empty`, Status Completed; entries/stock/tax still produced (strategies resolve accounts independent of FY) · FY-scoped reports (Balance Sheet, Cash/Bank, Tax) exclude the transaction because AccountingEntry.FinancialYearId is empty (WF-6.6 scoping)

### TC-D06.006 — SaveAsync failure is silently ignored: success response, zero rows (INT-02)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-02]
- **Source:** WF-6.1 (AccountingService.cs L88-91, L106-109 — empty `if (SaveAsync() <= -1) { }` bodies)
- **Arrange:** decorate `IUnitOfWork<POSDbContext>` in the test DI container so `SaveAsync()` returns -1 (and 0 on the second call)
- **Act:** POST /api/salesorder with fixture S1
- **Assert (current behavior):** response returns a success body including a TransactionId · DB contains **no** Transaction row, no AccountingEntry rows, no ProductStock change · no exception, no 500 — persistence failure swallowed; strategy + inventory + tax ran against a phantom header

### TC-D06.007 — Save failure throws after rollback and persists nothing (INT-02)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-02]
- **Source:** WF-6.1 + doc-11 INT-02 ("Handle save failures explicitly; throw after rollback")
- **Arrange:** same failing-UnitOfWork decoration as TC-D06.006
- **Act:** POST /api/salesorder with fixture S1
- **Assert (desired, RED until fix):** request fails (500/503) with an explicit persistence-error problem · single DB transaction rolled back · zero Transaction/AccountingEntry/TaxEntry rows, zero ProductStock delta · error logged with transaction type and reference

### TC-D06.008 — Strategy failure after header save leaves an order without ledger entries (INT-01)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-01]
- **Source:** WF-6.1 (header saved L87-91 **before** strategy dispatch L94-95) + doc-11 INT-01
- **Arrange:** seed tenant without ledger account 4100 (Sales) so `SaleStrategy` throws `InvalidOperationException` at SaleStrategy.cs L29-30
- **Act:** POST /api/salesorder with fixture S1
- **Assert (current behavior):** business order row exists (caller swallows/logs the accounting failure per INT-01) · Transaction(Sale) header row **exists** with Status != Completed (set only at L103) · **zero** AccountingEntry rows · **zero** TaxEntry rows · ProductStock unchanged — order survives without ledger and without stock adjustment

### TC-D06.009 — Pipeline runs in one DB transaction: strategy failure rolls everything back (INT-01)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-01]
- **Source:** WF-6.1 + doc-11 INT-01 ("wrap each business-event pipeline in a single DB transaction; fail the request")
- **Arrange:** same missing-4100 seed as TC-D06.008
- **Act:** POST /api/salesorder with fixture S1
- **Assert (desired, RED until fix):** request fails with an explicit error · **no** SalesOrder row, **no** Transaction row, **no** AccountingEntry/TaxEntry rows, **no** ProductStock delta — the whole event is atomic

### TC-D06.010 — TaxService maps Input/Output per transaction type and emits one row per taxed item
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.1 step 8 (TaxService.cs L9-38)
- **Arrange:** transactions with 2 items each carrying TaxAmount > 0
- **Act:** call `TaxService.ProcessTaxEntriesAsync` per type
- **Assert:** Purchase / Expense / PurchaseReturn -> TaxType **Input**; Sale / SaleReturn -> TaxType **Output**; any other type -> Input (default arm) · exactly one TaxEntry per item with TaxAmount > 0 · TaxableAmount = (Quantity x UnitPrice) - DiscountAmount, TaxAmount = item.TaxAmount, TaxDescription = `{Input|Output} @ {TaxPercentage}%` · items with TaxAmount = 0 produce no row

### TC-D06.011 — Integration: Output TaxEntry rows for sale, Input rows for purchase
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.1 step 8
- **Arrange:** fixtures S1 and PU1
- **Act:** POST sale (S1), then POST purchase (PU1)
- **Assert:** sale transaction has 1 TaxEntry: Output @ 5%, TaxableAmount 900 (1000 - line discount 100), TaxAmount 45 · purchase transaction has 1 TaxEntry: Input @ 5%, TaxableAmount 900, TaxAmount 45 · rows carry BranchId and the transaction's FinancialYearId

---

## WF-6.2 — Chart of Accounts

### TC-D06.012 — Tenant registration seeds the full chart of accounts resolvable by hard-coded code
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.2 (TenantRegistrationService.cs:76, LedgerAccounts.csv; LedgerAccountRepository.GetByAccountCodeAsync per POS.Repository/Accouting/LedgerAccount/LedgerAccountRepository.cs L17-20)
- **Arrange:** register a fresh tenant via the registration endpoint
- **Assert (DB):** LedgerAccount rows exist for codes 1050, 1060, 1100, 1150, 1200, 2100, 2150, 2200, 3100, 3200, 4100, 4200, 5100, 5200, 5300, 5400, 5555, 5900, 6100-6190, 7000 with AccountTypes per the WF-6.2 table (1050/1060/1100/1150/1200 Asset; 2100/2150/2200/7000 Liability; 3100/3200/5555 Equity; 4100/4200 Income; 5100/5200/5300/6xxx Expense) · `GetByAccountCodeAsync("1100")` resolves the tenant's own row — tenant A and tenant B each resolve **their own** account ids

### TC-D06.013 — GST child account resolution returns per-tax ledger account with percentage
- **Layers:** UT, IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.2 (POS.Repository/Tax/TaxRepository.cs L17-36)
- **Arrange:** taxes T5 (children 2151/1151), T17 (children 2152/1152) linked to tenant A's chart
- **Act/Assert:** `GetOutPutGstAccountAsync(T5)` -> child account 2151 with TaxPercantage 5; T17 -> 2152 with 17 · `GetInputGstAccountCodeAsync(T5)` -> 1151; T17 -> 1152 · unknown TaxId -> null (strategies then skip the GST entry) · strategies use the **child** account id, never the parent 1150/2150

### TC-D06.014 — Missing required ledger account aborts the strategy with InvalidOperationException
- **Layers:** IT
- **Priority:** P1   **Category:** Negative
- **Source:** WF-6.2 + WF-6.3 (SaleStrategy.cs L29-30, PurchaseStrategy.cs L27-28, StockAdjustmentStrategy.cs L26-27)
- **Arrange:** tenant without account 1200 (Inventory)
- **Act:** POST /api/purchase (PU1)
- **Assert:** strategy throws `InvalidOperationException("Required ledger accounts not found")` -> request surfaces 500 (or caller-swallowed per TC-D06.008 semantics) · no Inventory debit entry exists · guards: PurchaseStrategy requires 1200 + 2100; SaleStrategy requires 1100 + 4100 (fires before any entry is added)

---

## WF-6.3 — Strategy Journal-Entry Mappings

### Sale (SaleStrategy.cs)

### TC-D06.015 — SaleStrategy posts the exact five-entry set for fixture S1
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Sale (SaleStrategy.cs L18-160)
- **Arrange:** fixture S1 (SubTotal 1000, DiscountAmount 150, TaxAmount 45, RoundOff +2, PurchasePrice 60)
- **Act:** `SaleStrategy.ProcessTransactionAsync`
- **Assert (exact account codes, amounts, EntryType, narration):**
  1. **Dr 1100 AR / Cr 4100 Sales = 1000** — EntryType.Regular, narration `Sale - {narration}` (main entry uses **gross SubTotal**, not net)
  2. **Dr 1100 AR / Cr 2151 VAT-5% = 45** — EntryType.Tax, narration `VAT-5% on Sales - {narration}`; amount = ((1000 - line discount 100) x 5%)
  3. **Dr 5100 COGS / Cr 1200 Inventory = 600** — EntryType.Inventory, narration `COGS for Sale - {narration}`; amount = Sigma (qty 10 x PurchasePrice 60)
  4. **Dr 5200 Sales Discount / Cr 4100 Sales = 150** — EntryType.Discount, narration `Discount on Sale - {narration}`; amount = header DiscountAmount (100 line + 50 flat)
  5. **Dr 1100 AR / Cr 5900 Round Off = 2** — EntryType.RoundOff (positive round-off debits AR)
  SigmaDebit = SigmaCredit = **1797**; all entries carry BranchId, ReferenceNumber, FinancialYearId of the transaction

### TC-D06.016 — SaleStrategy omits conditional entries when tax/COGS/discount/round-off are absent
- **Layers:** UT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-6.3 Sale (guards at L79, L106, L124, L141)
- **Arrange:** 1 item, qty 1 @ 100, no TaxIds, PurchasePrice 0, DiscountPercentage 0, RoundOffAmount 0
- **Assert:** exactly **one** entry (Dr 1100 100 / Cr 4100 100) — no GST entry (no taxes), no COGS entry (totalCogs = 0), no discount entry (DiscountAmount = 0), no round-off entry (RoundOffAmount = 0)

### TC-D06.017 — Same GST child across multiple items aggregates into one tax entry
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Sale (dictionary accumulation L59-69)
- **Arrange:** item1 = 10x100, no discount, T5 -> 50; item2 = 5x200, 10% line discount, T5 -> (1000-100)x5% = 45
- **Assert:** single GST entry **Dr 1100 / Cr 2151 = 95** — per-account accumulation, not per-item entries

### TC-D06.018 — Different GST children produce one entry per child account
- **Layers:** UT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-6.3 Sale + WF-6.2 (children via Tax.OutPutAccountCode)
- **Arrange:** item1 = 10x100 with T5 (-> 50), item2 = 10x100 with T17 (-> 170), no discounts
- **Assert:** two Tax entries: **Dr 1100 / Cr 2151 = 50** and **Dr 1100 / Cr 2152 = 170**; SigmaDr = SigmaCr = 1000+50+170 = 1220

### TC-D06.019 — Sale discount is booked against Sales revenue, not AR (current behavior)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [ACC-03]
- **Source:** WF-6.3 Sale + doc-11 ACC-03 (SaleStrategy.cs L123-138 — comment says "Cr. Accounts Receivable" but the code credits salesAccount)
- **Arrange:** fixture S1 (DiscountAmount 150)
- **Assert (current behavior):** discount entry is **Dr 5200 / Cr 4100 Sales = 150**, EntryType.Discount · consequence asserted on the IT dataset: total AR debits (1000+45+2 = 1047) != TotalAmount 895 — AR does not reconcile to TotalAmount; revenue 4100 carries the discount credit (1150 total credits)

### TC-D06.020 — Sale discount booked against AR reconciles AR to TotalAmount
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Target [ACC-03]
- **Source:** WF-6.3 + doc-11 ACC-03 ("Book discount against AR")
- **Arrange:** fixture S1
- **Assert (desired, RED until fix):** discount entry **Dr 5200 / Cr 1100 AR = 150** · AR debits 1047 - 150 = 897 and reconcile to TotalAmount (895) within the documented round-off · revenue credits stay 1000

### TC-D06.021 — Round-off narrations swapped between Sale and SaleReturn; return direction not mirrored (current behavior)
- **Layers:** UT
- **Priority:** P1   **Category:** Gap-Char [ACC-06]
- **Source:** WF-6.3 Sale/SaleReturn + doc-11 ACC-06 (SaleStrategy.cs L153; SaleReturnStrategy.cs L147-157 copy-paste)
- **Arrange:** S1 with RoundOffAmount +2; and its mirror SaleReturn transaction with RoundOffAmount +2
- **Assert (current behavior):** **Sale** round-off entry narration = `Round Off on Sale Return - {narration}` · **SaleReturn** round-off entry narration = `Round Off on Sale - {narration}` · SaleReturn's positive round-off is **not mirrored**: still **Dr 1100 / Cr 5900** (same direction as Sale)

### TC-D06.022 — Round-off narrations corrected and SaleReturn direction mirrored
- **Layers:** UT
- **Priority:** P1   **Category:** Gap-Target [ACC-06]
- **Source:** WF-6.3 + doc-11 ACC-06 ("Fix narration strings")
- **Arrange:** same two transactions as TC-D06.021
- **Assert (desired, RED until fix):** Sale narration = `Round Off on Sale - {narration}`; SaleReturn narration = `Round Off on Sale Return - {narration}` · SaleReturn positive round-off mirrored: **Dr 5900 / Cr 1100**

### TC-D06.023 — Integration: posted sale persists all five entries balanced with Output tax and stock delta
- **Layers:** IT, PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Sale + WF-6.1
- **Arrange:** fixture S1 via POST /api/salesorder
- **Assert (DB):** Transaction(TransactionType = Sale, ReferenceNumber = order number) with the 5 entries of TC-D06.015 · **SigmaDebit == SigmaCredit == 1797** across the transaction's entries · every entry has DebitLedgerAccountId != CreditLedgerAccountId != Guid.Empty · TaxEntry Output 45 · PS1 stock -10 · narration prefix per entry type as in TC-D06.015 · (PM) follow-up `GET /api/transaction` filtered by the reference returns the same row with TotalAmount 895

### Sale Return (SaleReturnStrategy.cs)

### TC-D06.024 — SaleReturnStrategy posts the exact mirror entry set of Sale
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Sale Return (SaleReturnStrategy.cs L18-164)
- **Arrange:** return of S1 quantities (SubTotal 1000, DiscountAmount 100, T5 -> 45, RoundOff +2)
- **Assert:**
  1. **Dr 4100 Sales / Cr 1100 AR = 1000** — Regular, `Sale Return - {narration}`
  2. **Dr 2151 / Cr 1100 = 45** — Tax, `VAT-5% on Sales Return - {narration}`
  3. **Dr 1200 Inventory / Cr 5100 COGS = 600** — Inventory, `Reverse COGS for Sale Return - {narration}`
  4. **Dr 4100 / Cr 5200 = 100** — Discount, `Discount Reserve on Sale - {narration}`
  5. **Dr 1100 / Cr 5900 = 2** — RoundOff (same direction as Sale — see TC-D06.021)
  SigmaDr = SigmaCr = 1747

### TC-D06.025 — Integration: sale return persists mirrored entries, Output tax row, stock restored
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Sale Return + WF-6.1
- **Arrange:** SO-1 posted and Completed; POST sale-return endpoint (WF-3.6) for 10 x PS1
- **Assert:** Transaction(TransactionType = SaleReturn, TransactionNumber `SRN-{date}-nnnn`, ReferenceNumber = return order number) with the 5 entries of TC-D06.024, **SigmaDr == SigmaCr** · TaxEntry **Output** @ 5% for the returned line (TaxService maps SaleReturn -> Output) · PS1 stock **+10** · entries stamp the open FY

### Purchase (PurchaseStrategy.cs)

### TC-D06.026 — PurchaseStrategy posts the exact four-entry set for fixture PU1
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Purchase (PurchaseStrategy.cs L18-132)
- **Arrange:** fixture PU1 (SubTotal 1000, Discount 100, T5 -> 45, RoundOff +1)
- **Assert:**
  1. **Dr 1200 Inventory / Cr 2100 AP = 1000** — Regular, `Purchase - {narration}`
  2. **Dr 1151 Input-GST child / Cr 2100 = 45** — Tax, `VAT-5-In on Purchase - {narration}` (child via Tax.InPutAccountCode)
  3. **Dr 2100 / Cr 4200 Discount Received = 100** — Discount, `Discount on Purchase - {narration}`
  4. **Dr 2100 / Cr 5900 = 1** — RoundOff, `Round Off on Purchase - {narration}`
  SigmaDr = SigmaCr = 2146

### TC-D06.027 — PurchaseStrategy round-off negative direction and zero-amount guards
- **Layers:** UT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-6.3 Purchase (L113-131)
- **Arrange:** PU1 variants: (a) RoundOffAmount = -3; (b) DiscountAmount 0 and no TaxIds
- **Assert:** (a) round-off flips to **Dr 5900 / Cr 2100 = 3** (negative round-off debits Round Off) · (b) only the main entry Dr 1200 / Cr 2100 = 1000 — no GST entry (totalAmount 0 filtered at L78), no discount entry (L96 guard), no round-off entry

### TC-D06.028 — Integration: posted purchase persists balanced entries with Input tax and stock increase
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Purchase + WF-6.1
- **Arrange:** POST /api/purchase (WF-4.1 endpoint) with PU1
- **Assert:** Transaction(TransactionType = Purchase, TransactionNumber `PUR-{date}-nnnn`) with the 4 entries of TC-D06.026, **SigmaDr == SigmaCr == 2146** · TaxEntry **Input** @ 5% · PS1 stock **+10** · reference = PO number

### Purchase Return (PurchaseReturnStrategy.cs)

### TC-D06.029 — PurchaseReturnStrategy posts the exact mirror entry set of Purchase
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Purchase Return (PurchaseReturnStrategy.cs L17-132)
- **Arrange:** return of PU1 (SubTotal 1000, Discount 100, T5 -> 45, RoundOff +1)
- **Assert:**
  1. **Dr 2100 AP / Cr 1200 Inventory = 1000** — Regular, `Purchase Return - {narration}`
  2. **Dr 2100 / Cr 1151 = 45** — Tax, `VAT-5-In on Purchase return - {narration}`
  3. **Dr 4200 / Cr 2100 = 100** — Discount, `Discount on Purchase - {narration}`
  4. **Dr 2100 / Cr 5900 = 1** — RoundOff, `Round Off on Purchase - {narration}`
  SigmaDr = SigmaCr = 2146

### TC-D06.030 — Integration: purchase return persists balanced entries, Input tax row, stock decrease
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Purchase Return + WF-6.1
- **Arrange:** PO-1 received (stock in); POST purchase-return endpoint (WF-4.4) for 10 x PS1
- **Assert:** Transaction(TransactionType = PurchaseReturn, TransactionNumber `PRN-{date}-nnnn`) with TC-D06.029 entries, **SigmaDr == SigmaCr** · TaxEntry **Input** @ 5% (TaxService maps PurchaseReturn -> Input) · PS1 stock **-10**

### Expense (ExpenseStrategy.cs)

### TC-D06.031 — ExpenseStrategy posts Dr General Expense / Cr Cash with SubTotal = Amount - TotalTax
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Expense (ExpenseStrategy.cs L19-88; AddExpenseCommandHandler.cs L121-141)
- **Arrange:** expense Amount 1000, TotalTax 0, one fake item carrying TaxIds [T5], cash account 1050 present
- **Assert:** main entry **Dr 5300 General Expense / Cr 1050 Cash = 1000** (SubTotal = Amount - TotalTax = 1000), EntryType.Regular, narration `Expense - Expense` · GST entry **Dr 1151 / Cr 1050 = 50** (amount base per TC-D06.033), EntryType.Tax, narration `VAT-5-In on Expense - Expense` · credit account = Cash whenever a 1050 row exists (L31: `cashAccount?.Id ?? creditorAccount?.Id`)

### TC-D06.032 — Expense credit falls back to Accounts Payable only when Cash account is missing
- **Layers:** UT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-6.3 Expense (ExpenseStrategy.cs L31; doc-06 "AP 2100 fallback only if no cash account, L31")
- **Arrange:** chart of accounts without a 1050 row; 2100 present
- **Assert:** main entry **Dr 5300 / Cr 2100 AP** (fallback), GST entry credited to 2100 as well · both 1050 and 2100 missing -> `InvalidOperationException("Payment account not found")`

### TC-D06.033 — Expense GST computed on whole transaction total; multi-tax dictionary overwrites (current behavior)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [ACC-02]
- **Source:** WF-6.3 Expense + doc-11 ACC-02 (ExpenseStrategy.cs L59-61: `taxAmount = transaction.TotalAmount * pct / 100`; `taxTotal[id] = ...` with no ContainsKey accumulation)
- **Arrange:** (a) single tax T5, TotalAmount 1000; (b) two fake items, one with T5 and one with T17, TotalAmount 1000
- **Assert (current behavior):** (a) GST entry **Dr 1151 / Cr 1050 = 50** — computed on the **whole transaction TotalAmount**, not the line basis (double-counts when TotalTax already sits inside TotalAmount) · (b) **only one** GST entry exists — the T17 entry **Dr 1152 / Cr 1050 = 170**; the T5 entry is **lost** (dictionary assignment overwrites the earlier T5 row)

### TC-D06.034 — Expense GST computed per line and aggregated per input account
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Target [ACC-02]
- **Source:** WF-6.3 + doc-11 ACC-02 ("Compute per line-item, aggregate per account")
- **Arrange:** item1 (gross 1000, T5 -> 50), item2 (gross 2000, T17 -> 340)
- **Assert (desired, RED until fix):** two entries: **Dr 1151 / Cr 1050 = 50** AND **Dr 1152 / Cr 1050 = 340**; amounts derived from line bases, never from transaction.TotalAmount

### TC-D06.035 — Integration: expense round trip persists balanced entries and bypasses TaxService entirely
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Expense (AddExpenseCommandHandler.cs L114-166)
- **Arrange:** POST /api/expense with Amount 1070, TotalTax 70, ExpenseTaxIds [T5]
- **Assert:** 200/201 · Expense row saved · Transaction(TransactionType = Expense, TransactionNumber `EXP-{date}-nnnn`, SubTotal = 1000, TotalAmount = 1070, ReferenceNumber = request reference) · entries: **Dr 5300 / Cr 1050 = 1000** (Regular) + **Dr 1151 / Cr 1050 = 74.90** (1070 x 5%, Tax) — SigmaDr == SigmaCr == 1074.90 · **zero TaxEntry rows** (handler calls the strategy directly, never `TaxService.ProcessTaxEntriesAsync`; the temp shell item has Quantity/UnitPrice 0)

### TC-D06.036 — Expense delete flips transaction type to SaleReturn; update hard-deletes and re-posts (current behavior)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [INT-03]
- **Source:** WF-6.3 Expense (DeleteExpenseCommandHanlder L90; update path L142-215) + doc-11 INT-03 (type-flip hack, no audit trail)
- **Arrange:** expense E1 posted (TC-D06.035 state)
- **Act/Assert (current behavior):** DELETE expense -> the underlying Transaction's **TransactionType becomes SaleReturn** (inventory "reversal" switch; harmless no-op because an Expense never moved stock, but the ledger now shows a phantom Sale Return) · UPDATE expense -> old Transaction + its AccountingEntry rows are **hard-deleted** and a fresh transaction posted — no reversal entries, no audit trail · Gap-Target direction owned by the INT-03 epic: mirrored reversal entries via the reversal engine instead

### Stock Adjustment (StockAdjustmentStrategy.cs)

### TC-D06.037 — Stock gain posts Dr Inventory / Cr Stock Adjustment plus Input GST entries
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Stock Adjustment (StockAdjustmentStrategy.cs L35-89)
- **Arrange:** transaction TotalAmount 500, narration containing "Gain", one item qty 5 @ 100 with T5
- **Assert:** **Dr 1200 Inventory / Cr 5400 Stock Adjustment = 500** — EntryType.Regular, narration `Stock Gain - {narration}` · GST entry **Dr 1151 / Cr 2100 = 25** — EntryType.Tax, narration `VAT-5-In on Stock Gain - {narration}`; amount = (UnitPrice x Quantity) x 5% (gross, no discount subtraction) · SigmaDr = SigmaCr = 525

### TC-D06.038 — Stock loss posts Dr Stock Adjustment / Cr Inventory with no GST entries
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Stock Adjustment (L90-103)
- **Arrange:** transaction TotalAmount 500, narration containing "Loss" (no "Gain" substring), item qty 5 @ 100 with T5 attached
- **Assert:** **Dr 5400 / Cr 1200 = 500** — narration `Stock Loss - {narration}` · **no** GST entries (loss branch has no tax block) · SigmaDr = SigmaCr = 500

### TC-D06.039 — Gain/loss decided purely by narration substring (current behavior)
- **Layers:** UT
- **Priority:** P1   **Category:** Gap-Char [ACC-07]
- **Source:** WF-6.3 Stock Adjustment + doc-11 ACC-07 (StockAdjustmentStrategy.cs L30: `Narration.Contains("Gain")`)
- **Arrange:** two transactions with identical stock-increase payloads (AdjustmentType = Gain): narration A = "count correction" (no "Gain"), narration B = "Regain found items"
- **Assert (current behavior):** narration A posts a **Loss** entry (Dr 5400 / Cr 1200) — the real adjustment type is ignored · narration B posts a **Gain** entry because the substring matches · same substring detection also gates the payment leg (FullPaymentStrategy.cs L129)

### TC-D06.040 — Gain/loss decided by an explicit flag, independent of narration
- **Layers:** UT
- **Priority:** P1   **Category:** Gap-Target [ACC-07]
- **Source:** WF-6.3 + doc-11 ACC-07 ("Explicit flag on the transaction/DTO")
- **Arrange:** same payloads as TC-D06.039
- **Assert (desired, RED until fix):** both transactions post **Gain** entries because the DTO/transaction flag says Gain — narration content ("count correction", "Regain") has no effect

### TC-D06.041 — Integration: stock gain round trip persists entries and increases stock
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Stock Adjustment + WF-6.1
- **Arrange:** PS1 stock 100; POST /api/inventory/gain {productId: PS1, qty 5, reason "cycle count found"} (WF-5.1 endpoint) with stock-manager JWT
- **Assert:** 200/201 · ProductStock == 105 · Transaction(TransactionType = StockAdjustment, TransactionNumber `ADJ-{date}-nnnn`, narration contains "Gain") with the Dr 1200 / Cr 5400 entry, **SigmaDr == SigmaCr** · TaxEntry rows per TaxService (StockAdjustment -> default Input arm) when items carry tax

### Payroll (PayrollStrategy.cs)

### TC-D06.042 — Payroll accrues each component to Salary Payable with exact component accounts
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Payroll phase 1 (PayrollStrategy.cs L41-104)
- **Arrange:** fixture PAY1 (all 9 components > 0)
- **Assert:** 9 entries, each EntryType.**Salary**, Reference = payroll.Id, all crediting **2200 Salary Payable**: **Dr 6100 = 5000** (`Salary Expense`), **Dr 6110 = 500** (`Bonus Expense`), **Dr 6120 = 300** (`Commission`), **Dr 6130 = 200** (`Festival Allowance`), **Dr 6140 = 100** (`Travel Allowance`), **Dr 6150 = 50** (`Mobile Bill Allowance`), **Dr 6160 = 50** (`Food Bill Allowance`), **Dr 6170 = 100** (`Adavance Salary` — current literal, code typo), **Dr 6190 = 200** (`Other Stuff Allowance`) — SigmaDr = 6500

### TC-D06.043 — Payroll settlement debits Salary Payable to Bank or Cash for the component total
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Payroll phase 2 (PayrollStrategy.cs L106-111)
- **Arrange:** PAY1; then a variant with PaymentMode CASH
- **Assert:** settlement entry **Dr 2200 / Cr 1060 Bank = 6500** for BANK (narration `Salary Payment`, EntryType.Salary); CASH variant -> **Cr 1050 Cash** · running total: 2200 is debited and credited 6500 each -> **net P&L effect is the 6xxx expenses; 2200 passes through at zero** · SigmaDr == SigmaCr == 13000 across all 10 entries

### TC-D06.044 — Zero components produce no entries and totalPayroll equals the sum of non-zero components
- **Layers:** UT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-6.3 Payroll (per-component `> 0` guards)
- **Arrange:** payroll with only BasicSalary 5000 (all others 0)
- **Assert:** exactly 2 entries: Dr 6100 / Cr 2200 = 5000 and settlement Dr 2200 / Cr 1060 = 5000 · totalPayroll = 5000 (no zero-amount entries)

### TC-D06.045 — Payroll accounting exceptions are swallowed: payroll saved, ledger missing (current behavior)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-02]
- **Source:** WF-6.3 Payroll (AddPayrollCommandHandler L81-84 swallows accounting exceptions) + doc-11 INT-02/F-05
- **Arrange:** chart of accounts without 2200 (Salary Payable)
- **Act:** POST /api/payRoll with PAY1
- **Assert (current behavior):** 200/201 · Payroll row persisted · Transaction(TransactionType = Payroll, TransactionNumber `PRL-{date}-nnnn`, TotalAmount = 6500) persisted · **zero** AccountingEntry rows — the ledger leg failed silently

### TC-D06.046 — Payroll creation fails or flags when the ledger leg fails (INT-02)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-02]
- **Source:** WF-6.3 + doc-11 INT-02
- **Arrange:** same missing-2200 seed
- **Act:** POST /api/payRoll with PAY1
- **Assert (desired, RED until fix):** request fails with an explicit error (or is persisted in a flagged "accounting-pending" state that an ops report surfaces) · no untracked Payroll+Transaction rows without entries · consistent with the INT-02 policy chosen for TC-D06.007

### Loans (LoanStrategy.cs + handlers)

### TC-D06.047 — Take-loan creates parent + auto-numbered accounts and posts Dr Bank / Cr Loan Payable
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Loans (AddLoanDetailCommand.cs L41-148; LoanStrategy.cs L21-31)
- **Arrange:** chart without 7xxx accounts; loan LN1 (100,000, lender "ACME Bank")
- **Assert:** parent liability **7000 "To Loan Account"** auto-created · per-loan **7010 "Loan Payable - ACME Bank"** (Liability, parent 7000) and **7020 "Interest On Loan Account - ACME Bank"** (Expense) auto-created · second loan -> 7030/7040 (+10 numbering) · LoanDetail row links both account ids · Transaction(TransactionType = LoanPayable, TransactionNumber `LPA-{date}-nnnn`, TotalAmount = 100000) · entry **Dr 1060 Bank / Cr 7010 = 100000**, EntryType.**Loan**, Reference = loanDetail.Id

### TC-D06.048 — Loan repayment interest entry posts the full LoanAmount instead of InterestAmount (current behavior)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [ACC-01]
- **Source:** WF-6.3 Loans + doc-11 ACC-01 (LoanStrategy.cs L48: amount argument is `loanDetail.LoanAmount`)
- **Arrange:** LN1 (LoanAmount 100,000); repayment request Principal 20,000, Interest 2,500
- **Assert (current behavior):** LRE transaction TotalAmount = 22,500 (Principal + Interest); LoanRepayment row stores InterestAmount 2,500 · entries: **Dr 7010 / Cr 1060 = 20,000** (principal, correct) AND **Dr 7020 / Cr 1060 = 100,000** (interest entry posts the **full original loan amount**) — bank over-credited by 97,500; SigmaDr == SigmaCr == 120,000 (balanced but wrong)

### TC-D06.049 — Loan repayment interest entry posts the InterestAmount due
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Target [ACC-01]
- **Source:** WF-6.3 + doc-11 ACC-01 ("Fix amount source")
- **Arrange:** same as TC-D06.048
- **Assert (desired, RED until fix):** interest entry **Dr 7020 / Cr 1060 = 2,500** · SigmaDr == SigmaCr == 22,500 · bank credits total 22,500 matches the LRE TotalAmount

### TC-D06.050 — Principal-only and interest-only repayments each post exactly one entry
- **Layers:** UT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-6.3 Loans (LoanStrategy.cs L39-50 guards)
- **Arrange:** (a) Principal 20,000, Interest 0; (b) Principal 0, Interest 2,500
- **Assert:** (a) single entry Dr 7010 / Cr 1060 = 20,000; LRE TotalAmount 20,000 · (b) single interest entry Dr 7020 / Cr 1060 (amount = LoanAmount per current code — see TC-D06.048; InterestAmount after the ACC-01 fix) · zero-amount branch produces no entry in both cases

### TC-D06.051 — Integration: loan take + repay round trip persists LPA/LRE transactions balanced
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.3 Loans
- **Arrange:** POST /api/loan (LOAN_MANAGE_LOAN claim) with LN1; then POST /api/loan/repayment {loanDetailId, principal 20000, interest 2500}
- **Assert:** 200 both · DB: LPA transaction with Dr 1060 / Cr 7010 = 100,000 (EntryType.Loan, Sigma balanced) · LRE transaction with TotalAmount 22,500, entries per current code (TC-D06.048 characterizations hold end-to-end) · LoanRepayment row linked by LoanDetailId · new ledger accounts visible via GET /api/ledgerAccount/{branchId}

### General Entry & Opening Balance (WF-6.3 "other" mappings)

### TC-D06.052 — Manual general entry posts one user-chosen Dr/Cr entry as DirectEntry
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.3 Manual General Entry (AddGeneralEntryCommandHandler.cs L28-75)
- **Arrange:** POST /api/generalEntry {debitLedgerAccountId: 5300, creditLedgerAccountId: 1050, amount 250, narration "misc", reference "MISC-001", branch B1}
- **Assert:** 200 · Transaction(TransactionType = DirectEntry, TransactionNumber = **"MISC-001"** (user reference honored), SubTotal = TotalAmount = 250, Status = Completed) · exactly one AccountingEntry **Dr 5300 / Cr 1050 = 250**, EntryType.Regular · repeat without reference -> TransactionNumber `DRE-{date}-0001`

### TC-D06.053 — General entry rejects invalid input via FluentValidation
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-6.3 (AddGeneralEntryCommandValidator)
- **Arrange:** payload with Amount 0 (and a second payload with DebitLedgerAccountId = Guid.Empty)
- **Act:** POST /api/generalEntry
- **Assert:** 400 with validation error body · no Transaction row, no AccountingEntry row

### TC-D06.054 — Opening balance posts Dr account / Cr 5555 (debit-type) and Dr 5555 / Cr account (credit-type)
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.3 Opening Balance (AddOpeningBalanceCommandHandler.cs L31-81)
- **Arrange:** POST /api/ledgerAccount/opening-balance {accountId: 1050, type: Debit, openingBalance: 5000, financialYearId: FY2026}; then {accountId: 2100, type: Credit, openingBalance: 2000}
- **Assert:** two OBL transactions (TransactionType = OpeningBalance, TransactionNumber `OBL-{date}-nnnn`), entries EntryType.**OpeningBalance**: **Dr 1050 / Cr 5555 = 5000** (narration `Opening Balance Account Cash Debit`) and **Dr 5555 / Cr 2100 = 2000** (`Opening Balance Account Accounts Payable Credit`) — each balanced; these rows are exactly what WF-6.6 carry-forward logic later reuses

### TC-D06.055 — Accounting endpoints enforce their claims
- **Layers:** IT
- **Priority:** P1   **Category:** Permission
- **Source:** WF-6.1/WF-6.3 + TransactionController.cs L27, LoanController.cs L21
- **Arrange:** JWT for `cashier` (no ACCOUNTING_VIEW_TRANSACTIONS, no LOAN_MANAGE_LOAN claims)
- **Act/Assert:** GET /api/transaction -> **403** · POST /api/loan -> **403** · same calls with admin JWT -> 200 (positive control)

---

## WF-6.4 — Payment Processing Engine

### TC-D06.056 — FullPaymentStrategy maps every source type to the documented Dr/Cr pair
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.4 (FullPaymentStrategy.cs L70-164)
- **Arrange:** payment account by method = 1050 (Cash); amount 100; each source type in turn
- **Assert (table-driven, all EntryType.Regular):**

| Source type | Debit | Credit | Narration |
|---|---|---|---|
| Sale | Cash/Bank 1050 | AR 1100 | `Payment received - {entry narration}` |
| SaleReturn | AR 1100 | Cash/Bank 1050 | `Payment received - {entry narration}` |
| Purchase | AP 2100 | Cash/Bank 1050 | `Payment made - {entry narration}` |
| PurchaseReturn | Cash/Bank 1050 | AP 2100 | `Payment made - {entry narration}` |
| StockAdjustment (entry narration contains "Gain") | AP 2100 | Cash/Bank 1050 | `Payment made - {entry narration}` |
| StockAdjustment (otherwise -> Loss) | Cash/Bank 1050 | AP 2100 | `Payment made - {entry narration}` |

### TC-D06.057 — Payment account resolves by method: Cash->1050, card/UPI/netbanking->1060, default->Cash
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.4 (FullPaymentStrategy.cs L78-83)
- **Assert:** ACCPaymentMethod.Cash -> 1050 · DebitCard, CreditCard, UPI, NetBanking -> 1060 · **Cheque -> default arm -> 1050** · any other enum value -> 1050 · resolved Guid.Empty (account missing) -> `InvalidOperationException("Payment account not found")`

### TC-D06.058 — Validation accepts any Amount > 0; the balance check is commented out (current behavior)
- **Layers:** UT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-6.4 (FullPaymentStrategy.cs L23-47) — cross-ref INT-06 (overpayment, owned by WF-3.7/WF-4.6 catalogs)
- **Arrange:** transaction TotalAmount 895, BalanceAmount 895
- **Assert (current behavior):** Amount 0 -> invalid (`"Payment amount must be greater than zero"`); Amount -5 -> invalid · **Amount 5,000 (overpayment) passes validation** (L34-44 commented out) and posts a 5,000 entry — the accounting layer imposes no cap · payment entry row: Status = ACCPaymentStatus.Completed, ReferenceNumber = OrderNumber, narration `Full payment for {transaction.Narration} - {PAY number}`

### TC-D06.059 — Payment factory always returns FullPaymentStrategy; partial branch is dead code (current behavior)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [ACC-04]
- **Source:** WF-6.4 + doc-11 ACC-04 (IPaymentStrategyFactory.cs L25-40 — partial selection commented out L29-36)
- **Arrange:** paymentDto.Amount 100 against a transaction with TotalAmount 895
- **Assert (current behavior):** GetStrategy returns **FullPaymentStrategy** for any Amount > 0 · PartialPaymentStrategy never returned; its balance-maintenance code (PaidAmount += Amount, BalanceAmount recompute, PaymentStatus Partial/Completed, PartialPaymentStrategy.cs L66-76) is unreachable · consequence asserted on the partial-payment dataset (TC-D06.063 arrangement with Amount 400): PAY transaction.PaidAmount/BalanceAmount remain 0 — accounting-side balances inert; SO-level TotalPaidAmount/PaymentStatus are authoritative

### TC-D06.060 — Partial payments route to the wired partial strategy and maintain balances
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Target [ACC-04]
- **Source:** WF-6.4 + doc-11 ACC-04 ("Wire partial strategy or delete; maintain transaction balances")
- **Arrange:** transaction TotalAmount 895, BalanceAmount 895; payments of 400 then 495
- **Assert (desired, RED until fix):** first payment -> PartialPaymentStrategy (or wired equivalent): entry Dr 1050 / Cr 1100 = 400, transaction.PaidAmount = 400, BalanceAmount = 495, PaymentStatus = Partial · second payment completes: PaidAmount 895, BalanceAmount 0, PaymentStatus = Completed · narration `Partial payment for {number} - Payment n` per PartialPaymentStrategy.cs L59

### TC-D06.061 — Payment transaction is created with Id = Guid.Empty when TransactionId unset (current behavior)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [ACC-05]
- **Source:** WF-6.4 + doc-11 ACC-05 (PaymentService.cs L54 `Id = paymentDto.TransactionId`; PaymentDto.cs:9 never set by SO/PO payment handlers)
- **Arrange:** two consecutive POS cash payments via the WF-3.7 payment endpoint, no TransactionId supplied
- **Assert (current behavior):** first payment: 200, and the DB contains a Transaction(TransactionType = Payment) row with **Id = Guid.Empty**, TransactionNumber `PAY-{date}-0001` · second payment: fails at SaveAsync with a primary-key collision on Transactions.Id (DbUpdateException -> 500) — its PaymentEntry is not persisted · entries reference TransactionId Guid.Empty

### TC-D06.062 — Payment transaction gets a real id (new or parent) so consecutive payments succeed
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [ACC-05]
- **Source:** WF-6.4 + doc-11 ACC-05 ("Generate new id or pass parent transaction id")
- **Arrange:** two consecutive payments with no TransactionId
- **Assert (desired, RED until fix):** both succeed · each PAY transaction has a distinct non-empty Id (or the parent SO transaction's id, with entries linked there) · no Guid.Empty rows in Transactions

### TC-D06.063 — Integration: cash sale payment round trip posts PAY transaction + PaymentEntry + Dr Cash / Cr AR
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.4 (PaymentService.cs L28-122) + WF-3.7 endpoint
- **Arrange:** SO-1 (S1, TotalAmount 895) posted and Completed, unpaid
- **Act:** POST payment {transactionType: Sale, orderNumber: SO-1 ref, amount: 895, method: Cash}
- **Assert:** 200 · response echoes PaymentEntryId, TransactionNumber `PAY-{date}-nnnn`, Amount 895, Status Completed · DB: Transaction(Payment, narration label "Sale Payment", TotalAmount 895) · PaymentEntry row (Cash, 895, Completed) · AccountingEntry **Dr 1050 Cash / Cr 1100 AR = 895**, EntryType.Regular, narration `Payment received - Full payment for Sale Payment - PAY-...` · SO-1 TotalPaidAmount/PaymentStatus updated by the SO payment handler (authoritative layer) · **SigmaDr == SigmaCr == 895** for the PAY transaction

### TC-D06.064 — Integration: card sale payment posts Dr Bank / Cr AR
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.4 (L78-83, L90-107)
- **Arrange:** SO-1 unpaid; payment method CreditCard (repeat matrix row with UPI and NetBanking)
- **Assert:** AccountingEntry **Dr 1060 Bank / Cr 1100 AR = 895** · PaymentEntry.PaymentMethod = CreditCard · PAY transaction otherwise identical to TC-D06.063

### TC-D06.065 — Payment narration label follows the source transaction type
- **Layers:** UT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-6.4 (PaymentService.cs L42-50)
- **Assert:** narration label per TransactionType: Sale -> `Sale Payment`; SaleReturn -> `Sale Refund Payment`; Purchase -> `Purchase Payment`; PurchaseReturn -> `Purchase Refund Payment`; StockAdjustment -> `Stock Adjustment {Notes} Payment`; anything else -> `Payment` · the label becomes the PAY transaction's Narration and flows into PaymentEntry narration `Full payment for {label} - {PAY number}`

### TC-D06.066 — Refund records a negative PaymentEntry but posts no accounting entries (current behavior)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [ACC-08]
- **Source:** WF-6.4 + doc-11 ACC-08 (PaymentService.cs L155-231; accounting-entry call commented at L199)
- **Arrange:** SO-1 paid 895 (TC-D06.063 state); invoke `IPaymentService.RefundPaymentAsync(paymentEntryId, 300, "wrong charge")` through the real DI container (no HTTP route currently exposes refunds — itself part of the ACC-08 consolidation gap)
- **Assert (current behavior):** 200 · PaymentEntry row with Amount **-300**, ReferenceNumber `REF-{original}`, narration `Refund for payment {id} - wrong charge`, Status Completed · parent transaction PaidAmount 595 / BalanceAmount 300, PaymentStatus Partial · **zero new AccountingEntry rows** — GL still shows the full 895 cash-in · `CreateRefundAccountingEntriesAsync` (L233-299) exists but is never invoked by this path

### TC-D06.067 — Refund posts a balanced reversal entry against AR
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [ACC-08]
- **Source:** WF-6.4 + doc-11 ACC-08 ("Consolidate refund paths")
- **Arrange:** same as TC-D06.066
- **Assert (desired, RED until fix):** refund additionally posts **Dr 1100 AR / Cr 1050 Cash = 300** (sale-refund direction per FullPaymentStrategy SaleReturn mapping / `CreateRefundAccountingEntriesAsync`) — GL cash and AR now reflect the refund · SigmaDr == SigmaCr across the transaction's entries including the refund entry

### TC-D06.068 — ReverseTransactionAsync mirrors entries with REV- references but no handler invokes it (current behavior)
- **Layers:** UT
- **Priority:** P2   **Category:** Gap-Char [ACC-11]
- **Source:** WF-6.4 + doc-11 ACC-11/INT-03 (AccountingService.cs L209-270)
- **Arrange:** completed sale transaction S1 (5 entries); call `IAccountingService.ReverseTransactionAsync(transactionId)` directly via DI
- **Assert (current behavior of the orphaned engine):** returns true · for each original entry a mirrored entry is added on the **same** transaction: Debit<->Credit swapped, Amount equal, Reference `REV-{original}`, Narration `Reversal - {original}`, EntryType.Regular · inventory reversed per the type switch (Sale -> +qty, PurchaseReturn -> -qty, others per L243-250) · transaction.Status = Reversed · **code-level check:** no controller/handler references `ReverseTransactionAsync` — live reversals use delete-and-repost or type-flip instead (documented ACC-11 dead-code state; wiring decision belongs to the INT-03 epic)

---

## WF-6.5 — Customer Ledger Workflow (FIFO Application)

### TC-D06.069 — Ledger payment applies FIFO oldest-first across open orders
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.5 (AddCustomerLedgerCommandHandler.cs L44-90)
- **Arrange:** ledger fixture (SO-A due 500 oldest, SO-B due 200, SO-C due 200; previousBalance 0); request Amount 600, Overdue 700
- **Assert:** orders fetched where PaymentStatus in {Pending, Partial}, ordered by **CreatedDate ascending** · applications: SO-A **500** (full), SO-B **100** (partial: min(100 remaining, 200 due)), SO-C **0** (remaining exhausted) · each application dispatches `AddSalesOrderPaymentCommand` with PaymentMethod **Cash**, Note "Payment from account" · accumulated applied = 600

### TC-D06.070 — Payment smaller than the oldest order's due applies partially to that order only
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.5 (payAmount = min(remaining, order.TotalAmount - order.TotalPaidAmount))
- **Arrange:** same fixture; request Amount 200
- **Assert:** SO-A paid 200 (TotalPaidAmount 200, PaymentStatus Partial); SO-B/SO-C untouched · applied = 200

### TC-D06.071 — Remainder becomes credit balance; no open orders leaves the whole amount as balance
- **Layers:** UT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-6.5 (L59, L92-93)
- **Arrange:** (a) fixture + request Amount 50 (previousBalance 0, orders collectible); (b) customer with **no** open orders, last ledger Balance 100, request Amount 50
- **Assert:** (a) totalAvailable = 0 + 50 = 50 -> SO-A paid 50, remaining 0 -> new row Balance = **0** · (b) totalAvailable = previousBalance + Amount = **150**, no payment commands dispatched, new row Balance = **150**

### TC-D06.072 — Running balance chains from the last ledger row and notes record the applications
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.5 (L51-56, L96-100)
- **Arrange:** customer's previous ledger row Balance 100 (latest by ModifiedDate); request Amount 600 over the fixture orders
- **Assert:** totalAvailable = 100 + 600 = 700 -> SO-A 500, SO-B 200, SO-C 0; remaining 0 -> new row Balance = 0 · Note ends with `| Applied to Orders: SO-A (500), SO-B (200)`; with no applications the suffix is omitted · row stores CustomerId, LocationId, Date, Amount, Reference, Description

### TC-D06.073 — Ledger payment exceeding overdue is rejected with 409
- **Layers:** IT
- **Priority:** P0   **Category:** Validation
- **Source:** WF-6.5 (L35-38)
- **Arrange:** fixture customer (overdue 700); request Amount 800
- **Act:** POST /api/customerLedger
- **Assert:** **409** with `"Amount cannot exceed overdue"` · no CustomerLedger row, no order payments dispatched, no GL entries

### TC-D06.074 — Integration: ledger payment dispatches real GL payments and updates orders and ledger rows
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.5 + WF-6.4 (each dispatched AddSalesOrderPaymentCommand posts GL)
- **Arrange:** fixture customer C1 (SO-A 500 due, SO-B 200 due, SO-C 200 due); POST /api/customerLedger {amount 600, overdue 700, date today}
- **Assert:** 200 · CustomerLedger row with Balance 0 and the application note · **two** PAY transactions created by the dispatched payments: entries **Dr 1050 Cash / Cr 1100 AR = 500** and **Dr 1050 / Cr 1100 = 100** (SigmaDr == SigmaCr == 600) · SO-A TotalPaidAmount 500 / PaymentStatus Completed; SO-B TotalPaidAmount 200 / Partial; SO-C untouched · overdue read path (GetSalesOrderOverdueByCustomerIdCommandHandler) now returns 200 (SO-C only) · ledger listing (GetAllCustomerLedger) shows the row with filters honored

### TC-D06.075 — Deleting a ledger row does not reverse the GL payments it dispatched (current behavior)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [ACC-09]
- **Source:** WF-6.5 + doc-11 ACC-09 (ledger delete handler; no compensating GL logic)
- **Arrange:** state after TC-D06.074 (row applied 600 to orders; GL Dr Cash 600 / Cr AR 600; orders updated)
- **Act:** DELETE /api/customerLedger/{id}
- **Assert (current behavior):** 200 · CustomerLedger row gone · **GL entries still stand** (Cash debited 600, AR credited 600) · **order payments still stand** (SO-A still Completed with TotalPaidAmount 500) — deleting the audit row does not compensate the sub-ledger or the GL · overdue recalculation re-exposes the "paid" orders as collectible

### TC-D06.076 — Ledger delete writes compensating GL reversals and restores order payments
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [ACC-09]
- **Source:** WF-6.5 + doc-11 ACC-09 ("Compensating reversals or soft-delete with audit")
- **Arrange:** same as TC-D06.075
- **Assert (desired, RED until fix):** delete (or void) produces mirrored entries **Dr 1100 AR / Cr 1050 Cash = 500** and **= 100** (or soft-delete with an audit trail and explicit compensation records) · SO-A/SO-B TotalPaidAmount/PaymentStatus restored to pre-payment state · AR and Cash balances net back to pre-ledger-payment values

---

## WF-6.6 — Financial Year & Year-End Closing

### TC-D06.077 — Tenant registration auto-creates the current calendar-year FY, open
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.6 (TenantRegistrationService.EnsureCurrentFinancialYearAsync L410-428)
- **Arrange:** register a fresh tenant
- **Assert:** exactly one FinancialYear row: StartDate = Jan 1 of the current calendar year, EndDate = Dec 31, IsClosed = false, ClosedDate null · visible via GET /api/financialYear

### TC-D06.078 — Year-end close posts the closing entry, next-FY OBL transaction, and flips the old FY closed (profit case)
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.6 (AddYearEndClosingCommandHandler.cs L37-228)
- **Arrange:** FY2026 activity in branch B1 only: sale S1 + purchase PU1 (entries per fixtures). Income credits: 4100 = 1150 (1000 + 150 discount credit), 5900 = 2, 4200 = 100 (purchase-discount credit) -> incomeTotal **1252**. Expense debits: 5100 = 600, 5200 = 150 -> expenseTotal **750**. Net **502**.
- **Act:** POST /api/yearEndClosing with admin JWT
- **Assert:** 200 with result DTOs per branch: TotalIncome 1252, TotalExpense 750, NetProfitOrLoss 502 · DB: FY2026.IsClosed = true with ClosedDate/ClosedBy stamped · new FY2027 created (StartDate/EndDate +1 year, IsClosed = false) · YEC transaction (TransactionType = YearEndClosing, TransactionNumber `YEC-{date}-nnnn`, TotalAmount = 502, old FY) with closing entry **Dr 3100 Income Summary / Cr 3200 Retained Earnings = 502**, EntryType.YearEndClosing · OBL transaction (TransactionType = OpeningBalance, TotalAmount = 0, new FY2027) · old-FY entry rows unchanged

### TC-D06.079 — Year-end loss closes Dr Retained Earnings / Cr Income Summary
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.6 (L129-138)
- **Arrange:** FY entries with incomeTotal 200, expenseTotal 700 -> net -500
- **Assert:** closing entry **Dr 3200 Retained Earnings / Cr 3100 Income Summary = 500** (EntryType.YearEndClosing, old FY); YEC transaction TotalAmount = 500; result DTO NetProfitOrLoss = -500

### TC-D06.080 — Year-end income/expense totals are company-wide, not branch-filtered (current behavior)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [ACC-10]
- **Source:** WF-6.6 + doc-11 ACC-10 (AddYearEndClosingCommandHandler.cs L71-78 — filters on FinancialYearId only, inside the per-branch loop)
- **Arrange:** FY2026 entries in two branches: B1 sale income 1000 (credit to 4100, branch B1); B2 expense 500 (debit to 5300, branch B2); no other income/expense
- **Act:** POST /api/yearEndClosing
- **Assert (current behavior):** **both** branch result DTOs show identical company-wide totals: TotalIncome 1000, TotalExpense 500, NetProfitOrLoss 500 (B1 "should" be 1000/0/1000, B2 0/500/-500) · each branch gets its own YEC closing entry for the **same** amount 500 (duplicated company net per branch)

### TC-D06.081 — Year-end income/expense totals are branch-filtered inside the loop
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [ACC-10]
- **Source:** WF-6.6 + doc-11 ACC-10 ("Branch-aware totals")
- **Arrange:** same seed as TC-D06.080
- **Assert (desired, RED until fix):** B1 DTO shows TotalIncome 1000 / TotalExpense 0 / Net 1000; B2 DTO shows 0 / 500 / -500 · closing entries per branch use that branch's own net · carry-forward block (which already filters `e.BranchId == branchId` at L141) unchanged

### TC-D06.082 — Carry-forward writes new-FY OBL entries for every non-temporary balance-bearing account, excluding Income/Expense
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.6 (L140-211)
- **Arrange:** TC-D06.078 dataset (branch B1 balances before carry-forward: AR 1100 Dr 1047; Inventory 1200 Dr 400; AP 2100 Cr 944; Output-GST child 2151 Cr 45; Input-GST child 1151 Dr 45; 5900 net Cr 1 — Income type; closing entry Dr 3100 502 / Cr 3200 502 appended before balancing)
- **Act:** POST /api/yearEndClosing
- **Assert (new-FY OBL entries, all EntryType.OpeningBalance, each balanced):** **Dr 1100 / Cr 5555 = 1047** · **Dr 1200 / Cr 5555 = 400** · **Dr 5555 / Cr 2100 = 944** · **Dr 5555 / Cr 2151 = 45** · **Dr 1151 / Cr 5555 = 45** · **Dr 3100 / Cr 5555 = 502** and **Dr 5555 / Cr 3200 = 502** (from the appended closing entry) · **no** new-FY entries for 4100, 5100, 5200, 4200, 5900 (Income/Expense/IsTemporary skipped at L185) · every new-FY entry stamps FinancialYearId = FY2027 and BranchId = B1

### TC-D06.083 — P&L accounts are never zeroed; new FY simply starts them at zero (current behavior)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [ACC-10]
- **Source:** WF-6.6 + doc-11 ACC-10 ("P&L accounts never zeroed"; doc-06 risk F-07)
- **Arrange/Act:** year-end close per TC-D06.078
- **Assert (current behavior):** **zero** AccountingEntry rows exist in FY2027 for accounts 4100, 5100, 5200, 5900, 4200 (no zeroing/closing-out entries; exclusion from carry-forward is the only mechanism) · FY2026 balances for those accounts persist unchanged · income/expense accounts "stop carrying forward" implicitly — report-time P&L must rely on FY/date filtering (REP-02 tension documented in D07)

### TC-D06.084 — P&L accounts are explicitly zeroed per the chosen policy
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [ACC-10]
- **Source:** WF-6.6 + doc-11 ACC-10 ("decide on account zeroing policy")
- **Arrange:** TC-D06.078 state
- **Assert (desired, RED until fix):** the zeroing policy is explicit and testable — either (a) zeroing entries in the old FY (Dr/Cr each income and expense account against 3100 so their balance = 0) exist, or (b) a documented flag on the FY marks accounts implicitly closed and reports honor it · under (a): for account 4100 with FY balance Cr 1150, a closing entry **Dr 4100 / Cr 3100 = 1150** exists; every income/expense account's old-FY balance sums to zero

### TC-D06.085 — Net zero year still creates the YEC and OBL transactions but no closing entry
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-6.6 (L93-139)
- **Arrange:** FY2026 with incomeTotal = expenseTotal = 600 (e.g., sale SubTotal 600 with COGS 600, no tax/discount/round-off)
- **Act:** POST /api/yearEndClosing
- **Assert:** 200 · DTO NetProfitOrLoss = 0 · YEC transaction created with TotalAmount = 0 · **no** YearEndClosing AccountingEntry (L123 guard `netProfitOrLoss != 0`) · OBL transaction and carry-forward entries still produced · old FY closed, new FY open

### TC-D06.086 — Year-end with no open FY returns 404
- **Layers:** IT
- **Priority:** P1   **Category:** Negative
- **Source:** WF-6.6 (L41-45)
- **Arrange:** all financial years IsClosed = true
- **Act:** POST /api/yearEndClosing
- **Assert:** **404** `"year not found"` · no new FY created, no transactions, no entries

### TC-D06.087 — After close, new transactions stamp the new FY id
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.6 (WF-6.1 step 1 + L213-220)
- **Arrange:** year-end closed FY2026 (TC-D06.078 state); FY2027 open
- **Act:** POST /api/salesorder (fixture S1 variant)
- **Assert:** new Transaction.FinancialYearId = FY2027.Id · FY2026 rows untouched · FY2027 OBL carry-forward rows from TC-D06.082 coexist with the new sale entries; the new sale's AR balance adds on top of the carried-forward 1047

---

## Cross-Cutting Integration, Postman & E2E

### TC-D06.088 — Verification queries: AccountingEntry grouped by account matches independent recomputation
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-6.1 + WF-6.3 + WF-6.4 (all strategy tables)
- **Arrange:** one workday of activity via real endpoints: sale S1 (credit), purchase PU1, cash payment 895 on S1
- **Act:** query AccountingEntry rows; aggregate Dr-leg and Cr-leg amounts grouped by account (each row stores both legs — AccountingEntry.cs L14-18)
- **Assert (independent recompute from fixture constants):** global **Sigma(all Dr-legs) == Sigma(all Cr-legs) == 4838** (S1 1797 + PU1 2146 + payment 895) · per account: 1100 Dr 1942 (1047 + 895); 1050 Dr 895; 4100 Cr 1150; 2151 Cr 45; 5100 Dr 600; 1200 Dr 1000 / Cr 600; 5200 Dr 150; 5900 Dr 1 / Cr 2; 2100 Dr 101 / Cr 1045; 1151 Dr 45; 4200 Cr 100 · every row has both legs non-null, Amount > 0, EntryType per its producing strategy · entry counts: S1 5, PU1 4, payment 1

### TC-D06.089 — Tenant isolation: accounting data of another tenant is invisible
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-6.2/WF-6.5 + template seed (Tenant B)
- **Arrange:** tenant A has the TC-D06.088 dataset and a customer-ledger row L-A
- **Act:** with Tenant B admin JWT: GET /api/transaction; GET /api/ledgerAccount/{tenant A branchId}; GET /api/customerLedger for tenant A's customer
- **Assert:** tenant B sees **none** of tenant A's transactions, accounts, or ledger rows (404/empty lists per endpoint contract) · direct id-addressed reads of tenant A row ids -> 404 · repeat with tenant A JWT -> data visible (positive control)

### TC-D06.090 — Postman journal verification runner: create sale, then GET the transaction by reference
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.1 + WF-6.3 Sale
- **Arrange:** environment `local-cloud`; `POST /api/auth/login` chains `token`/`tenantId`; collection folder `D06 Accounting`
- **Act (runner requests):** 1) POST /api/salesorder (S1 payload) -> save `referenceNumber` from the response; 2) GET /api/transaction filtered by the reference (TransactionResource query params)
- **Assert (collection test scripts):** response schema: TransactionNumber, TransactionType = "Sale", Status = "Completed", SubTotal/DiscountAmount/TaxAmount/TotalAmount = 1000/150/45/895 · TransactionNumber matches `^SAL-\d{8}-\d{4}$` · FinancialYearId present · runner exports `transactionId` for follow-up GETs (journal detail via the transaction list payload's included entries)

### TC-D06.091 — Postman full API runner flow: login -> sale -> payment -> return -> refund -> reads
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.3 + WF-6.4 + WF-6.5
- **Act (runner folder order):** login (admin) -> POST /api/salesorder (S1) -> POST sale payment (Cash 895, WF-3.7) -> POST sale return (WF-3.6) -> POST /api/customerLedger payment (WF-6.5) -> GET /api/transaction (list) -> GET /api/customerLedger
- **Assert (chained collection tests):** each write returns 2xx; environment variables chain order/return references · transaction list contains rows with TransactionType Sale, Payment (`PAY-`), SaleReturn (`SRN-`) and status Completed · payment response echoes PaymentEntryId and Amount 895 · customer-ledger response shows Balance and the "Applied to Orders" note · contract checks: enum names (TransactionType, ACCPaymentMethod, EntryType) and numeric fields present in every payload (schema-level only — deep DB asserts stay in IT)

### TC-D06.092 — E2E: accounting transaction list shows the posted sale
- **Layers:** E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-6.1 (journey `J-06.1` per E2E_JOURNEYS.md; API-bootstrapped state)
- **Arrange:** via API: login as admin, seed FY/COA/products, post sale S1 (TotalAmount 895)
- **Act (Playwright):** log in through the real UI -> open Accounting -> Transactions list (grid showing number, date, type, reference, amount, status)
- **Assert:** a row is visible with TransactionNumber `SAL-...-0001`, type Sale, reference = the sale order number, amount 895, status Completed · key totals only (no exhaustive math — owned by UT/IT)

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has >=1 Happy case (WF-6.1: 001/011; WF-6.2: 012/013; WF-6.3: every strategy 015/024/026/029/031/037/038/042/043/047/052/054; WF-6.4: 056/063; WF-6.5: 069/074; WF-6.6: 078/082/087)
- [x] Every write endpoint has: Validation case (bad input -> 400/409: 053, 058, 073), Permission case (missing claim -> 403: 055), Tenant-Isolation case (other tenant's id -> 404: 089). (Sale/purchase/POS endpoint-level matrices are owned by D03/D04 catalogs and cross-referenced here; D06 covers the accounting-owned endpoints.)
- [x] Every money/stock mutation has DB-state assertions (entries balanced SigmaDr == SigmaCredit, stock delta) — IT cases 001, 011, 023, 025, 028, 030, 035, 041, 051, 063, 064, 074, 088
- [x] Every doc-11 gap touching this domain appears in >=1 Gap-Char or Gap-Target case — INT-01 (008/009), INT-02 (006/007/045/046), INT-03 (036), ACC-01 (048/049), ACC-02 (033/034), ACC-03 (019/020), ACC-04 (059/060), ACC-05 (061/062), ACC-06 (021/022), ACC-07 (039/040), ACC-08 (066/067), ACC-09 (075/076), ACC-10 (080/081/083/084), ACC-11 (068)
- [x] Gap-Char assertions describe CURRENT behavior (code-verified against the files in the verification map); Gap-Target describes DESIRED behavior (RED now)
- [x] Concurrency case coverage for sequential-number generation where the doc flags it — INT-11 cross-ref noted in TC-D06.004 (full concurrency matrix owned by D03/D04 per WF-3.2/WF-4.1)
- [x] Edge/boundary cases: zero/omitted components (016, 044), negative round-off (027), multi-tax (018, 033), rounding remainders (015/082 carry-forward Dr-Cr), fallback credit accounts (032), over- vs under-payment (058, 070/071), net-zero year (085)

## Discrepancy notes

1. **Transaction-number prefixes (doc vs code):** doc 06 WF-6.1 L13 lists prefixes `SAL-RET`, `PUR-RET`, `STO`; the code emits **`SRN`** (SaleReturn), **`PRN`** (PurchaseReturn), **`STF`/`STT`** (StockTransferFrom/ToBranch) — `POS.Repository/Accouting/Transaction/TransactionRepository.cs` L74-87. The catalog asserts the code-verified prefixes.
2. **Doc-06 end-to-end worked example figures do not match the code formulas:** the example posts "Dr AR 900 / Cr Sales 900" and GST 47.50, but the code's main entry uses **gross SubTotal** (Dr AR 1000) and GST = (1000 - line discount 100) x 5% = **45** (`SaleStrategy.cs` L38, L56-57; `AccountingService.cs` L81). Fixtures in this catalog use the code-derived numbers (1000 / 45 / TotalAmount 895); the doc example should be corrected.
3. **Misleading comment confirming ACC-03:** `SaleStrategy.cs` L123 comment says "Discount Entry: Dr. Discount Given, Cr. Accounts Receivable" while the code credits **Sales 4100** (L130). The catalog's Gap-Char (TC-D06.019) asserts the code, not the comment.
4. **Code typo in payroll narration:** "Adavance Salary" (`PayrollStrategy.cs` L95). TC-D06.042 asserts the current literal string; fix the narration together with any ACC/F-05 work on that file.
5. **Doc-06 "Output GST (parent) 2150 used by sales":** strategies resolve the **child** account via `Tax.OutPutAccountCode` (`TaxRepository.cs` L17-36); the parent 2150 row is fetched in `SaleStrategy` (L23) but never used as an entry leg. Test cases assert child-account legs only.
6. **Expense tax entries:** doc 06 WF-6.1 step 8 lists Expense under `TaxService` Input mapping; in the real expense path the handler bypasses `TaxService` entirely (no TaxEntry rows — TC-D06.035). The TaxService mapping still holds for direct-pipeline usage (TC-D06.010 asserts the default arm).

