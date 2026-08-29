# TC-D05 — Inventory & Stock Test Cases

**Source:** `New-Documents/05_Inventory_Stock_Workflows.md` (WF-5.0 … WF-5.7) + `New-Documents/11_Workflow_Gaps_Enhancement_Signals.md`
**Scope:** Every path stock actually moves: central inventory engine, manual gain/loss adjustments, bulk adjustments, absolute correction backdoor, damaged stock, inter-branch transfers, inventory batches (FEFO), and stock alerts.
**Workflows covered:** WF-5.0, WF-5.1, WF-5.2, WF-5.3, WF-5.4, WF-5.5, WF-5.6, WF-5.7
**Gap signals referenced:** INT-01, INT-02, INT-03, INT-05, INT-08, INT-09, INT-10, INT-11, ACC-07, SEC-01, BIZ-02, BIZ-03, BIZ-04 (doc-11); equivalents in doc-05 enhancement table: I-01≈INT-02, I-02≈ACC-07, I-03≈INT-05, I-04≈INT-08, I-05≈BIZ-03, I-06≈BIZ-04, I-07≈BIZ-02, I-08≈SEC-01, I-10≈INT-10.

**Code-verified anchors (spot-checked for this catalog):**
- Central engine: `POS.MediatR/Accouting/Services/InventoryService.cs:20-67` (type-switch deltas L26-37, narration "Gain" L34-35, LIFO L45-48, save-failure logged-not-thrown L57-60); `POS.Repository/Product/ProductStockRepository.cs:24-76` (get-or-create), `:170-202` (absolute write).
- Adjustment pipeline: `POS.MediatR/ProductStock/AddProductStockCommandHandler.cs:26-127`; `POS.MediatR/ProductStock/BulkUpdateProductStockCommandHandler.cs:26-156`; `POS.MediatR/ProductStock/Handlers/BulkAdjustProductStockCommandHandler.cs:25-40`.
- Journal strategy: `POS.MediatR/Accouting/Strategies/StockAdjustmentStrategy.cs:18-106` (gain detection L30; Gain: Dr 1200/Cr 5400 + GST Dr 1150/Cr 2100; Loss: Dr 5400/Cr 1200); payment leg `Accouting/Strategies/FullPaymentStrategy.cs:127-162`.
- Damaged stock: `POS.MediatR/Stock/Handlers/AddDamagedStockCommandHandler.cs:33-99` (null-safe L77 vs **non-null-safe L80** — the NRE; raw quantity L75 — no conversion).
- Transfers: `POS.MediatR/StockTransfer/Handlers/AddStockTransferCommandHandler.cs:39-186`; `UpdateStockTransferCommandHandler.cs:41-186` (delivered-guard L50-53, logged-only accounting failures L145-153); `DeleteStockTransferCommandHandler.cs:33-97` (**type-flip stock reversal for delivered transfers L48-88** — see Discrepancy note D-1); strategy mapping `Accouting/Strategies/TransactionStrategyFactory.cs:26-27`; SaleStrategy COGS `SaleStrategy.cs:96-121`; PurchaseStrategy `PurchaseStrategy.cs:30-93`.
- Batches: `POS.MediatR/InventoryBatch/Handlers/GetInventoryBatchesQueryHandler.cs:24-32` (FEFO `OrderBy(ExpiryDate)`, `Quantity > 0`, `IsActive`); **no write path exists** (repo grep: only DbSet/migrations/this read).
- Alerts: `POS.MediatR/ProductStock/Get/GetProductStockAlertCommandHandler.cs:48-125` (Dapper flag default true, EF fallback L124); EF predicate `ProductStockRepository.cs:84-85` (`CurrentStock <= Product.AlertQuantity`, `AlertQuantity.HasValue`).
- Security: `POS.API/Controllers/ProductStock/ProductStockController.cs` — `ClaimCheck("INVE_MANAGE_INVENTORY")` commented out on POST (L25), bulk-update (L39), bulk-adjust (L52) and stock-alert (L107); GET list keeps active claim (L65). DamagedStock + StockTransfer controllers have active claims.
- Dual stock (INT-10): `POS.Repository/Product/ProductRepository.cs:119` `UpdateProductCurrentStock` called only from `AccountingService.cs:183/254` (`ProcessStockAdjustmentAsync`/`ReverseTransactionAsync` — both uncalled); `InventoryService.GetCurrentStockAsync` (InventoryService.cs:69-73) reads the stale `Product.CurrentStock`.
- Unit conversion: `POS.Repository/UnitConversation/UnitConversationRepository.cs:19-65`.
- Accounting pipeline: `Accouting/Services/AccountingService.cs:26-134` (`TotalAmount = Math.Floor(SubTotal − Discount + Tax)` L84; empty save-failure catch bodies L88-91/L106-109).

> **Account-code note (D-3):** `StockAdjustmentStrategy` posts to ledger **5400 "Stock Adjustment"** for BOTH directions (income on gain, expense on loss) — NOT the template COA's 4900 Gain / 5950 Loss accounts. All adjustment assertions below use 5400 per code + doc-05 matrix.

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed) with locations **L1**, **L2**; Tenant B (isolation checks) with product **PB-1** (stock 30 @ L2-B).
- Users: `admin` (all claims: INVE_MANAGE_INVENTORY, INVE_VIEW_INVENTORIES, REP_STOCK_REPORT, STTFR_MANAGE_STTFR, DMG_ST_MANAGE_DMG_ST, DB_PROD_STOCK_ALERT), `manager` (view-only: INVE_VIEW_INVENTORIES), `cashier` (POS claims only — no inventory/transfer/damage claims).
- Products:
  - **P-SIMPLE**: 17% tax GST-17, stock 100 @ L1, PurchasePrice 100, AlertQuantity 20, base unit.
  - **P-NOTAX**: no taxes, stock 50 @ L1, PurchasePrice 20, AlertQuantity 10.
  - **P-NONE**: exists in catalog, **no ProductStock row @ L1**.
  - **P-ABS-NEW**: exists in catalog, **no ProductStock row anywhere**.
  - **P-LOW**: stock 5 @ L1, AlertQuantity 20; **P-BOUNDARY**: stock 20 @ L1, AlertQuantity 20; **P-OK**: stock 50 @ L1, AlertQuantity 10; **P-NULLALERT**: stock 10 @ L1, AlertQuantity null.
  - **P-BATCH** @ L1 (ProductStock.CurrentStock 100, PurchasePrice 10) with seeded (manually-inserted, inert) InventoryBatch rows: **B1** exp 2026-09-15 qty 40 IsActive; **B2** exp 2027-01-31 qty 60 IsActive; **B3** exp 2026-01-31 qty 25 IsActive=false; **B4** exp 2026-10-01 qty 0 IsActive.
- Units: base **Unit**; child **Dozen** (Operator=Multiply, Value=12); child **HalfDozen** (Operator=Divide, Value=2).
- Open FinancialYear **FY2026**; Chart of Accounts: AR 1100, Cash 1050, Bank 1060, AP 2100, Input GST 1150, Output GST 2150, Inventory 1200, Discount Received 4200, Sales 4100, COGS 5100, Expense 5300, **Stock Adjustment 5400**, RoundOff 5900, Gain 4900, Loss 5950.
- Integration harness: `TestWebApplicationFactory` (SQLite file-per-factory, real DI), auth via real login (`AdminJwt()`, `JwtFor("cashier")`).

---

## WF-5.0 — The Central Inventory Engine

### TC-D05.001 — Engine dispatch table maps every TransactionType to its signed stock delta
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.0 (InventoryService.cs:26-37)
- **Arrange:** SQLite in-memory context; InventoryService with real ProductStockRepository; one ProductStock row (ProductId P, LocationId L, CurrentStock 100, PurchasePrice 10); six transactions each with a single item qty 5, one per type.
- **Act:** Call `ProcessInventoryChangesAsync` once per transaction type (fresh DB state per call): Purchase, PurchaseReturn, Sale, SaleReturn, StockTransferFromBranch, StockTransferToBranch; plus a 3-item Sale transaction (qty 5/2/1).
- **Assert (UT):** deltas exactly: Purchase +5 → 105; PurchaseReturn −5 → 95; Sale −5 → 95; SaleReturn +5 → 105; StockTransferFromBranch −5 → 95; StockTransferToBranch +5 → 105; multi-item Sale → 100 − (5+2+1) = 92; BranchId of each ProductStock row == transaction.BranchId.

### TC-D05.002 — StockAdjustment direction: narration-substring "Gain" detection, case-insensitive (ACC-07 characterization)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [ACC-07]
- **Source:** WF-5.0/5.1 (InventoryService.cs:34-35; StockAdjustmentStrategy.cs:30)
- **Arrange:** stock row P@L CurrentStock 100; four StockAdjustment transactions, item qty 5 each, TotalAmount 500.
- **Act:** Process each: narration `"Gain Stock Adjustment (Add)"`, `"gain stock adjustment (add)"`, `"GAIN — top up"`, `"Loss Stock Adjustment (Remove)"`.
- **Assert (UT):** the three "Gain"-containing narrations (any casing) → +5 each (105); the "Loss" narration → −5 (95). Characterizes: direction is decided by a case-insensitive `Contains("Gain")` substring in TWO places (engine L34-35 AND strategy L30) — renaming the narration wording flips stock AND accounting silently.
- **Note:** paired with TC-D05.007 (Gap-Target).

### TC-D05.003 — Non-stock transaction types leave stock untouched
- **Layers:** UT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-5.0 (switch default `_ => 0`, InventoryService.cs:36)
- **Arrange:** stock row P@L CurrentStock 100; transactions of type Payment, Payroll, Loan, DirectEntry, Expense (each with 1 item qty 7).
- **Act:** `ProcessInventoryChangesAsync` for each.
- **Assert (UT):** CurrentStock stays 100 for all five types; no ProductStock row created; no `Update` issued on the repository.

### TC-D05.004 — Get-or-create ProductStock row with cross-location PurchasePrice seeding
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.0 (ProductStockRepository.cs:24-76)
- **Arrange:** product P with stock row only at L1 (PurchasePrice 33, most recent ModifiedDate); product.Q (no stock rows anywhere) with `Product.PurchasePrice = 12.50m`.
- **Act:** Process a Purchase qty 4 @ L2 for P; then a Sale qty 2 @ L2 for Q.
- **Assert (UT):** new row P@L2 created with CurrentStock 0 then delta applied → 4, PurchasePrice seeded 33 (copied from L1's most-recent row); row Q@L2 created CurrentStock 0 → −2, PurchasePrice seeded 12.50 (fallback to `product.PurchasePrice`); both rows persisted immediately (repository SaveAsync inside `AddProductStock`).

### TC-D05.005 — LIFO cost overwrite happens only for Purchase and Gain adjustment
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.0 (InventoryService.cs:45-48)
- **Arrange:** stock row P@L CurrentStock 100, PurchasePrice 10; transactions: Purchase (item PurchasePrice 14), StockAdjustment gain (PurchasePrice 14), Sale (PurchasePrice 14), StockAdjustment loss (PurchasePrice 14).
- **Act:** Process each on fresh state.
- **Assert (UT):** Purchase → row PurchasePrice == 14; Gain adjustment → PurchasePrice == 14; Sale and Loss adjustment → PurchasePrice unchanged (10).

### TC-D05.006 — Save failure is swallowed: stock drift is silent (INT-02/I-01)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [INT-02]
- **Source:** WF-5.0 (InventoryService.cs:57-60); doc-11 INT-02
- **Arrange:** InventoryService wired to a failing `IUnitOfWork` (`SaveAsync` returns 0); stock row P@L CurrentStock 100; Sale transaction qty 5.
- **Act:** `ProcessInventoryChangesAsync`; observe exceptions and DB.
- **Assert (UT):** **no exception propagates** (only `LogError("Error While saving product stock.")` is emitted); DB CurrentStock still 100 → stock/ledger drift is possible with zero user-visible failure. Detach loop still runs.

### TC-D05.007 — Explicit gain/loss flag replaces narration-substring detection in BOTH consumers (ACC-07)
- **Layers:** UT · IT
- **Priority:** P0   **Category:** Gap-Target [ACC-07] — **RED until enhancement lands**
- **Source:** WF-5.0/5.1; doc-11 ACC-07
- **Arrange:** StockAdjustment transactions carrying an explicit direction marker on the DTO/transaction (e.g., `StockAdjustmentDirection = Gain|Loss`), with deliberately misleading narrations ("Loss wording" for a Gain and vice versa).
- **Act:** Process via `InventoryService.ProcessInventoryChangesAsync` and `StockAdjustmentStrategy.ProcessTransactionAsync`.
- **Assert (UT):** engine delta and strategy entry direction follow the **explicit flag, never the narration**: Gain → +qty and Dr 1200/Cr 5400; Loss → −qty and Dr 5400/Cr 1200. **Assert (IT):** POST /api/ProductStock with non-standard narration still posts correct direction. Narration text changes can no longer flip accounting.

### TC-D05.008 — Product.CurrentStock is stale (dual-stock trap, INT-10)
- **Layers:** UT · IT
- **Priority:** P1   **Category:** Gap-Char [INT-10]
- **Source:** WF-5.0 ⚠ dual-stock trap; doc-11 INT-10 (ProductRepository.cs:119 only called from uncalled AccountingService.cs:183/254)
- **Arrange:** product P (Product.CurrentStock seeded 100 at product-creation time; ProductStock.CurrentStock 100 @ L1).
- **Act:** Process a Sale qty 30 through the engine (IT: POST a stock loss −30 via /api/ProductStock).
- **Assert (IT):** `ProductStock.CurrentStock` == 70 while `Product.CurrentStock` **remains 100** (no live write path). **Assert (UT):** `InventoryService.GetCurrentStockAsync(P)` returns **100** (reads the stale `Product.CurrentStock`, InventoryService.cs:69-73) — documents that any consumer of that helper gets stale numbers.

### TC-D05.009 — Purchase transaction through AccountingService updates stock and ledger together
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.0 (AccountingService.cs:26-134 → InventoryService)
- **Arrange:** product P-NOTAX (no stock row @ L2), open FY2026.
- **Act:** `POST api/PurchaseOrders` (create PO, qty 10 @ 20, location L2) — stock granted at creation per doc-05 matrix.
- **Assert (IT):** ProductStock P@L2 exists, CurrentStock == 10, PurchasePrice == 20 (LIFO); Transaction(Type=Purchase) with ReferenceNumber; AccountingEntry Dr 1200 200 / Cr 2100 200; ΣDr == ΣCr; TaxEntry rows absent (no product taxes).

---

## WF-5.1 — Manual Stock Adjustment (Gain/Loss)

### TC-D05.010 — Gain adjustment posts Dr Inventory / Cr Stock Adjustment, adds stock, LIFO + Product.PurchasePrice update
- **Layers:** IT · UT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.1 (AddProductStockCommandHandler.cs:26-127; StockAdjustmentStrategy.cs:35-88)
- **Arrange:** P-SIMPLE stock 100 @ L1 (PurchasePrice 100); admin JWT; ReferenceNumber "REF-ADJ-G1"; PaymentMethod Cash; product tax GST-17.
- **Act:** `POST api/ProductStock {productId: P-SIMPLE, locationId: L1, currentStock: 5, pricePerUnit: 100, unitId: base, paymentMethod: Cash, referenceNumber: "REF-ADJ-G1", productTaxes: [GST-17]}`.
- **Assert (IT):** 200 success · ProductStock P-SIMPLE@L1 == **105** · ProductStock.PurchasePrice == 100 (LIFO overwrite) · `Product.PurchasePrice` == 100 · Transaction(Type=StockAdjustment, Narration="Gain Stock Adjustment (Add)") with TotalAmount = floor(500+85) = **585** · AccountingEntry Dr Inventory 1200 = 585 / Cr Stock Adjustment 5400 = 585 · AccountingEntry (EntryType.Tax) Dr Input GST 1150 = 85 / Cr AP 2100 = 85 · ΣDr (670) == ΣCr (670) · TaxEntry Input row for GST-17 · PaymentEntry Amount **585** Notes "Add (Gain)" + AccountingEntry Dr AP 2100 585 / Cr Cash 1050 585 (FullPaymentStrategy.cs:127-144) · no Sale-type entries anywhere.
- **Assert (UT):** StockAdjustmentStrategy given TotalAmount 585 + one 17% tax returns exactly the two entries above (Dr 1200/Cr 5400 585; Dr 1150/Cr 2100 85) and both balanced.
- **Assert (PM):** response schema success=true; follow-up `GET api/ProductStock?locationId=L1` shows CurrentStock 105.

### TC-D05.011 — StockAdjustmentStrategy gain mapping produces exactly two balanced entries
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.1 (StockAdjustmentStrategy.cs:35-88)
- **Arrange:** in-memory SQLite with seeded ledger accounts; Transaction(Type=StockAdjustment, TotalAmount 585, Narration contains "Gain", one item UnitPrice 100 qty 5 with TransactionItemTax GST-17).
- **Act:** `StockAdjustmentStrategy.ProcessTransactionAsync(transaction)`.
- **Assert (UT):** exactly 2 AccountingEntry rows: regular Dr Inventory(1200)/Cr Stock Adjustment(5400) 585 narration "Stock Gain - …"; tax Dr InputGST(1150)/Cr AP(2100) 85 narration "… on Stock Gain - …"; per-entry DebitAmount == CreditAmount; ΣDr == ΣCr.

### TC-D05.012 — Loss adjustment posts Dr Stock Adjustment / Cr Inventory, removes stock, no GST, reverse payment leg
- **Layers:** IT · UT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.1 (AddProductStockCommandHandler.cs:66-70,101-105; StockAdjustmentStrategy.cs:90-103; FullPaymentStrategy.cs:145-160)
- **Arrange:** P-SIMPLE stock 100 @ L1; ReferenceNumber "REF-ADJ-L1"; PaymentMethod Cash.
- **Act:** `POST api/ProductStock {currentStock: -4, pricePerUnit: 100, paymentMethod: Cash, referenceNumber: "REF-ADJ-L1", productTaxes: [GST-17]}` (taxes ignored for loss).
- **Assert (IT):** 200 · stock == **96** · Transaction Narration "Loss Stock Adjustment (Remove)", TotalAmount **400** · single AccountingEntry Dr Stock Adjustment 5400 = 400 / Cr Inventory 1200 = 400 · **no GST/1150 or 2100-credit tax entries**, no TaxEntry rows · `Product.PurchasePrice` unchanged (100) · ProductStock.PurchasePrice unchanged · PaymentEntry Amount |−4×100| = **400** Notes "Remove (Loss)" + AccountingEntry Dr Cash 1050 400 / Cr AP 2100 400 · ΣDr == ΣCr for both transactions.
- **Assert (UT):** strategy loss branch returns exactly one entry Dr 5400/Cr 1200 400; no tax entries.
- **Assert (PM):** follow-up GET /api/ProductStock shows 96.

### TC-D05.013 — StockAdjustmentStrategy loss mapping produces exactly one balanced entry
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.1 (StockAdjustmentStrategy.cs:90-103)
- **Arrange:** Transaction(TotalAmount 400, Narration "Loss …", no taxes).
- **Act:** `ProcessTransactionAsync`.
- **Assert (UT):** exactly 1 AccountingEntry: Dr Stock Adjustment(5400)/Cr Inventory(1200) 400; balanced; no EntryType.Tax rows.

### TC-D05.014 — Zero-quantity adjustment is treated as gain path with zero delta
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-5.1 (`request.CurrentStock < 0` is false → gain branch, AddProductStockCommandHandler.cs:72-84)
- **Arrange:** P-NOTAX stock 50 @ L1.
- **Act:** `POST api/ProductStock {currentStock: 0, pricePerUnit: 25}`.
- **Assert (IT):** 200 · narration is the **Gain** narration ("Gain Stock Adjustment (Add)") · TransactionItem Quantity 0 · ProductStock unchanged (50) · Transaction exists with TotalAmount 0 · AccountingEntry rows for the transaction exist and ΣDr == ΣCr (0) · `Product.PurchasePrice` overwritten to 25 (gain branch runs unconditionally).

### TC-D05.015 — Unknown ProductId: request "succeeds" while nothing is written (swallowed pipeline, INT-01)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-01]
- **Source:** WF-5.1 (outer try/catch L121-124 → always `ReturnSuccess()`); doc-11 INT-01
- **Arrange:** no product with Id `00000000-000-0000-0000-000000000001`.
- **Act:** `POST api/ProductStock {productId: <unknown>, currentStock: 5, pricePerUnit: 100}` with admin JWT.
- **Assert (IT):** HTTP 200 with success=true (errors swallowed, handler L126) · **zero** new Transaction rows, **zero** AccountingEntry rows, **no** ProductStock row created · error visible only in logs ("error while saving inventory Accounting").

### TC-D05.016 — Gain adjustment with child unit converts quantity and price to base before posting
- **Layers:** IT · UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.1 (base conversion L46; UnitConversationRepository.cs:40-43)
- **Arrange:** P-NOTAX stock 50 @ L1; unit **Dozen** (Multiply 12).
- **Act:** `POST api/ProductStock {currentStock: 2, pricePerUnit: 1200, unitId: Dozen, paymentMethod: Cash}`.
- **Assert (IT):** stock == 50 + (2×12) = **74** · TransactionItem Quantity 24, UnitPrice 100 (base-converted) · TotalAmount = floor(2400 + 0 tax) = **2400** · AccountingEntry Dr 1200 2400 / Cr 5400 2400 · PaymentEntry Amount 2×1200 = 2400 (raw request product, conversion-invariant for Multiply) · `Product.PurchasePrice` == 100.
- **Assert (UT):** `GetBaseUnitValuesAsync(Dozen, 2, 1200)` → BaseQuantity 24, BaseUnitPrice 100 (Multiply: qty×value, price÷value).

### TC-D05.017 — Unit-conversion operator table for adjustments (all four operators)
- **Layers:** UT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-5.0/5.1 (UnitConversationRepository.cs:19-65)
- **Arrange:** units with Operator/Value pairs: Plush+10, Minus−10, Multiply×12, Divide÷2; inputs qty 8, price 100.
- **Act:** `GetBaseUnitValuesAsync` per operator.
- **Assert (UT):** Plush → qty 18, price 90; Minus → qty −2 (negative passes through — document!), price 110; Multiply → qty 96, price 8.33… (price/value); Divide → qty 4, price 200 (price×value); unit without ParentId/Operator/Value → passthrough qty 8, price 100, same UnitId.

### TC-D05.018 — Postman: gain adjustment contract + follow-up GET verification
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.1
- **Arrange:** environment `local-cloud`; admin token; P-SIMPLE @ L1 stock 100.
- **Act:** runner: login → `POST api/ProductStock` (gain 5 @ 100, Cash) → `GET api/ProductStock?locationId={{L1}}&productName=SIMPLE`.
- **Assert (PM):** POST body `success == true`; GET body item `currentStock == 105`, fields present: productId, locationId, purchasePrice, product.name; `X-Pagination` header parses with totalCount ≥ 1.

### TC-D05.019 — Postman: loss adjustment contract + follow-up GET verification
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.1
- **Arrange:** P-SIMPLE @ L1 stock 105 (after TC-D05.018 flow or fresh env).
- **Act:** runner: `POST api/ProductStock {currentStock: -4, pricePerUnit: 100, paymentMethod: Cash}` → `GET api/ProductStock`.
- **Assert (PM):** `success == true`; GET shows `currentStock == 101`.

### TC-D05.020 — E2E: stock adjustment via UI increases stock and updates grid
- **Layers:** E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.1
- **Arrange:** API-bootstrapped P-SIMPLE @ L1 stock 100; admin login through UI.
- **Act:** Inventory → Stock Adjustments → select P-SIMPLE, type +5, price 100, reason text, Cash → Save.
- **Assert (E2E):** success toast; product grid cell for P-SIMPLE@L1 shows **105** after refresh; adjustment appears in the transaction/adjustment list with reference; net cash/payment tile unchanged beyond +585 ledger effect (assert stock only — math owned by IT).

### TC-D05.021 — Any authenticated user can mutate stock (ClaimCheck commented out, SEC-01)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [SEC-01]
- **Source:** WF-5.7 ⚠ (ProductStockController.cs:25 — `[ClaimCheck("INVE_MANAGE_INVENTORY")]` commented); doc-11 SEC-01
- **Arrange:** cashier JWT (no INVE_MANAGE_INVENTORY); P-NOTAX stock 50 @ L1.
- **Act:** `POST api/ProductStock {currentStock: 5, pricePerUnit: 20}` with **cashier** token.
- **Assert (IT):** HTTP **200**, mutation applied — stock == 55, Transaction + AccountingEntry rows created. Characterizes: adjustment endpoint guarded only by `[Authorize]`.

### TC-D05.022 — Permission restored: stock mutations require INVE_MANAGE_INVENTORY (SEC-01)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [SEC-01] — **RED until fix lands**
- **Source:** doc-11 SEC-01 (restore claims on all three mutation endpoints)
- **Arrange:** cashier JWT; valid payloads for each endpoint.
- **Act:** `POST api/ProductStock`, `POST api/ProductStock/bulk-update`, `POST api/ProductStock/bulk-adjust` with cashier token.
- **Assert (IT):** each returns **403** (ClaimCheck failure) · zero stock/ledger rows written for any of the three · same payloads with admin JWT return 200 (control).

### TC-D05.023 — Tenant isolation: cross-tenant productId never touches other tenant's stock
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-5.1 + WF-5.0 (tenant query filters; swallowed handler)
- **Arrange:** Tenant A admin JWT; Tenant B product PB-1 (stock 30 @ L2-B, invisible to A).
- **Act:** `POST api/ProductStock {productId: PB-1, locationId: L1, currentStock: 5}` as Tenant A.
- **Assert (IT):** 200 (swallowed — TC-D05.015 behavior) · no ProductStock/Transaction/AccountingEntry row referencing PB-1 exists in Tenant A DB · Tenant B login shows PB-1 stock still **30** · `GET api/ProductStock` as Tenant A never returns Tenant B rows (global tenant filter).

---

## WF-5.2 — Bulk Stock Adjustment

### TC-D05.024 — Bulk adjustment processes each item with own transaction, entries, payment and Ref-tagged narration
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.2 (BulkUpdateProductStockCommandHandler.cs:26-136; narrations L76/L89)
- **Arrange:** P-SIMPLE stock 100 @ L1 (gain item, GST-17, Ref "REF-BULK-1"), P-NOTAX stock 50 @ L1 (loss item qty −10 @ 20, same Ref).
- **Act:** `POST api/ProductStock/bulk-update {stockUpdates: [ {P-SIMPLE, +5 @100, Cash, Ref REF-BULK-1, taxes[GST-17]}, {P-NOTAX, -10 @20, Cash, Ref REF-BULK-1} ]}`.
- **Assert (IT):** 200 · P-SIMPLE == **105**, P-NOTAX == **40** · exactly 2 StockAdjustment Transactions, narrations `"Gain Stock Adjustment (Add) - Ref: REF-BULK-1"` and `"Loss Stock Adjustment (Remove) - Ref: REF-BULK-1"` · gain transaction entries: Dr 1200 585/Cr 5400 585 + Dr 1150 85/Cr 2100 85 (Σ 670/670); loss transaction: Dr 5400 200/Cr 1200 200 · two PaymentEntries (585 "Add (Gain)", 200 "Remove (Loss)") with matching payment-leg entries Dr 2100/Cr 1050 and Dr 1050/Cr 2100 · per-transaction ΣDr == ΣCr.
- **Assert (PM):** runner posts the same 2-item payload; follow-up GETs show 105 and 40.

### TC-D05.025 — Bulk continues past a failing item (partial write, INT-01)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-01]
- **Source:** WF-5.2 (per-item try/catch continues L132-135); doc-11 INT-01
- **Arrange:** stockUpdates[0] = unknown productId; stockUpdates[1] = P-NOTAX +5 @ 20.
- **Act:** `POST api/ProductStock/bulk-update`.
- **Assert (IT):** HTTP **200** success · item 2 fully applied (stock 55, transaction + entries + payment exist) · item 1 produced **no** rows · no compensating action or error surfaced to the caller (only log "Error processing stock update for product …").

### TC-D05.026 — Bulk gain persists Product.PurchasePrice via context-wide save (characterizes the in-code uncertainty)
- **Layers:** IT
- **Priority:** P2   **Category:** Gap-Char
- **Source:** WF-5.2 (code comment L138-145 documents uncertainty whether `Product.PurchasePrice` updates are saved)
- **Arrange:** P-NOTAX with `Product.PurchasePrice` 15.
- **Act:** `POST api/ProductStock/bulk-update {P-NOTAX, +5 @ 22, no unit conversion (base)}`.
- **Assert (IT):** after response, `Product.PurchasePrice` == **22** in DB (the update rides the accounting service's context-wide SaveAsync) — pins current behavior flagged uncertain by the code comment; ProductStock.PurchasePrice also 22 (LIFO).

### TC-D05.027 — Empty bulk payload is a silent no-op success
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-5.2 (loop over empty list)
- **Arrange:** `stockUpdates: []`.
- **Act:** `POST api/ProductStock/bulk-update`.
- **Assert (IT):** 200 success · zero Transactions/entries/stock rows created (no 400 validation exists).

### TC-D05.028 — Postman: bulk adjustment runner flow
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.2
- **Act:** runner: login → bulk-update (2 items as TC-D05.024) → GET /api/ProductStock (L1) → GET /api/ProductStock/count.
- **Assert (PM):** both items verified via GET (105 / 40); count response `result == 2` rows for the two products' location rows touched.

---

## WF-5.3 — Absolute Stock Correction (Backdoor)

### TC-D05.029 — Absolute correction sets CurrentStock with NO journal entries (INT-05)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-05]
- **Source:** WF-5.3 (BulkAdjustProductStockCommandHandler.cs:25-40; ProductStockRepository.cs:170-202); doc-11 INT-05
- **Arrange:** P-NOTAX stock 50 @ L1; snapshot count of Transaction/AccountingEntry rows referencing P-NOTAX.
- **Act:** `POST api/ProductStock/bulk-adjust {adjustments: [{locationId: L1, productId: P-NOTAX, newStockValue: 7}]}` with admin JWT.
- **Assert (IT):** 200 · ProductStock.CurrentStock == **exactly 7** (absolute overwrite, not ±) · **zero** new Transaction rows, **zero** AccountingEntry rows, **zero** TaxEntry rows (raw write — no journal backing; stock now diverges from ledger) · ProductStock.PurchasePrice unchanged (no LIFO) · `Product.PurchasePrice` unchanged.

### TC-D05.030 — Absolute correction creates the row if missing, with PurchasePrice 0
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-5.3 (UpdateProductStockAsync create-if-missing branch, ProductStockRepository.cs:173-184)
- **Arrange:** P-ABS-NEW (no stock row anywhere).
- **Act:** `POST api/ProductStock/bulk-adjust {newStockValue: 7}` for P-ABS-NEW @ L2.
- **Assert (IT):** 200 · ProductStock row P-ABS-NEW@L2 exists, CurrentStock == 7, **PurchasePrice == 0** (not seeded — unlike the engine's get-or-create which seeds from product/last row), ModifiedDate set · no ledger rows.

### TC-D05.031 — Absolute correction routed through the pipeline with journal backing (INT-05)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-05] — **RED until fix lands**
- **Source:** doc-11 INT-05 (route through transaction pipeline or explicit approved "unaccounted correction")
- **Arrange:** P-NOTAX stock 50 @ L1; bulk-adjust newStockValue 45 (a −5 loss correction).
- **Act:** `POST api/ProductStock/bulk-adjust` (post-fix behavior).
- **Assert (IT):** stock == 45 **and** a StockAdjustment Transaction exists with the correction (narration references correction) · AccountingEntry Dr 5400 100 / Cr 1200 100 (5 × PurchasePrice 20) · ΣDr == ΣCr · negative delta ⇒ loss direction entries; positive delta ⇒ gain direction Dr 1200/Cr 5400 · request without an explicit approval flag when unaccounted-correction mode is off is rejected or journaled (per agreed enhancement design).

### TC-D05.032 — Any authenticated user can set absolute stock (SEC-01 on bulk-adjust)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [SEC-01]
- **Source:** WF-5.7 ⚠ (ProductStockController.cs:52 — claim commented on bulk-adjust); doc-11 SEC-01
- **Arrange:** cashier JWT.
- **Act:** `POST api/ProductStock/bulk-adjust {newStockValue: 999}` for P-NOTAX @ L1.
- **Assert (IT):** HTTP **200**; stock becomes **999**. Characterizes unguarded backdoor with cashier privileges.

### TC-D05.033 — Empty adjustments list rejected with 400
- **Layers:** IT
- **Priority:** P2   **Category:** Validation
- **Source:** WF-5.3 (handler L27-30 — the only input validation on this endpoint)
- **Act:** `POST api/ProductStock/bulk-adjust {adjustments: []}` and `{adjustments: null}`.
- **Assert (IT):** **400** "No adjustments provided." · no stock rows touched.

---

## WF-5.4 — Damaged Stock

### TC-D05.034 — Damaged stock happy path: rows + loss entries, stock reduced, NO payment leg (INT-08 partial characterization)
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.4 (AddDamagedStockCommandHandler.cs:33-99); doc-05 matrix row "Damaged Stock"
- **Arrange:** P-SIMPLE stock 100 @ L1 (PurchasePrice 100); admin JWT (claim DMG_ST_MANAGE_DMG_ST); ReportedId = admin user id.
- **Act:** `POST api/DamagedStock {reason: "Broken in warehouse", reportedId: admin, locationId: L1, damagedDate: today, damagedStockItems: [{productId: P-SIMPLE, damagedQuantity: 3, unitId: base}]}`.
- **Assert (IT):** 200 with DTO list (1 item) · DamagedStock row exists (ProductId, DamagedQuantity 3, Reason, ReportedId, LocationId, CreatedBy = current user) · ProductStock == **97** · exactly 1 Transaction (Type=StockAdjustment, Narration "Loss Damage Stock (Remove)", TotalAmount 300) · AccountingEntry Dr Stock Adjustment 5400 300 / Cr Inventory 1200 300 · ΣDr == ΣCr · **no** GST/1150 tax entries, **no** TaxEntry rows (TaxIds empty) · **no** PaymentEntry / no FullPaymentStrategy leg (no companion payment — inconsistent with manual loss, characterized per doc-05 matrix).
- **Assert (PM):** follow-up `GET api/DamagedStock` contains the row; `GET api/ProductStock` shows 97.

### TC-D05.035 — No ProductStock row ⇒ NullReferenceException swallowed, accounting block dies (INT-08)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-08]
- **Source:** WF-5.4 (L77 null-safe UnitPrice vs **L80 non-null-safe `productStock.PurchasePrice`** → NRE inside try/catch L94-97); doc-11 INT-08
- **Arrange:** P-NONE (exists, **no ProductStock row @ L1**).
- **Act:** `POST api/DamagedStock` with item P-NONE qty 2.
- **Assert (IT):** HTTP **200** with the DamagedStock DTO · DamagedStock row **is saved** (rows saved before accounting, L50-57) · **zero** Transaction / AccountingEntry rows for P-NONE · ProductStock row for P-NONE was **not** created · NRE visible only in logs ("error while saving Accounting"). Characterizes: the swallow hides a crash and kills the whole accounting block.

### TC-D05.036 — Damaged stock becomes null-safe, unit-converted, and posts the payment leg (INT-08)
- **Layers:** IT · UT
- **Priority:** P0   **Category:** Gap-Target [INT-08] — **RED until fix lands**
- **Source:** doc-11 INT-08 (null-safe cost; unit conversion; align with manual-adjustment flow)
- **Arrange:** P-NONE (no stock row) damaged 2 Dozen of P-NOTAX (row exists, PurchasePrice 20, unit Dozen).
- **Act:** `POST api/DamagedStock` with item P-NONE (null-safe case) and item P-NOTAX qty 2 Dozen.
- **Assert (IT):** 200 · P-NONE case: entries posted with UnitPrice fallback (0 or explicit validation error per agreed design — assert chosen behavior; **no silent NRE**) · P-NOTAX case: stock −**24** base (2×12 converted), entries Dr 5400 480 / Cr 1200 480 (24 × 20) · payment leg present mirroring manual loss (Dr Cash 1050 / Cr AP 2100 480) · ΣDr == ΣCr.
- **Assert (UT):** cost lookup null-safe helper: missing stock row → 0 (or documented fallback), never throws.

### TC-D05.037 — Damaged quantity is NOT base-unit converted (raw deduction, INT-08)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-08]
- **Source:** WF-5.4 (raw `item.DamagedQuantity` used at L75 — no `GetBaseUnitValuesAsync` call); doc-11 INT-08
- **Arrange:** P-SIMPLE stock 100 @ L1; unit **Dozen**.
- **Act:** `POST api/DamagedStock` item P-SIMPLE qty 2 (Dozen).
- **Assert (IT):** stock == **98** (raw −2 deducted; every other flow would deduct −24) · TransactionItem Quantity 2, UnitId Dozen unconverted · entries Dr 5400 200 / Cr 1200 200 (2 × PurchasePrice 100 raw) · characterizes the unit-mismatch divergence between damaged stock and all other stock flows.

### TC-D05.038 — DamagedStock rows survive an accounting failure (no DB transaction, INT-09)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [INT-09]
- **Source:** WF-5.4 (AddRange+save L50-57 happens before accounting; accounting swallowed L61-97); doc-11 INT-09
- **Arrange:** remove/hide ledger account 5400 for the test tenant (or force strategy failure) so the accounting leg throws.
- **Act:** `POST api/DamagedStock` item P-SIMPLE qty 3.
- **Assert (IT):** HTTP **200** (accounting failure swallowed) · DamagedStock row **persisted** · stock **not** reduced · zero Transaction/AccountingEntry rows — durable partial state with no rollback (rows + accounting not atomic).

### TC-D05.039 — Damaged stock endpoints enforce their claims (existing control)
- **Layers:** IT
- **Priority:** P1   **Category:** Permission
- **Source:** WF-5.4 (DamagedStockController.cs:40,71 — active ClaimChecks)
- **Act:** `POST api/DamagedStock` with cashier JWT (no DMG_ST_MANAGE_DMG_ST); `GET api/DamagedStock` with cashier JWT (no DMG_ST_VIEW_DMG_ST).
- **Assert (IT):** both **403** · no DamagedStock row created · same requests with admin JWT return 200 (control).

### TC-D05.040 — Postman: damaged stock flow
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.4
- **Act:** runner: login → `POST api/DamagedStock` (P-SIMPLE qty 3 @ L1) → `GET api/DamagedStock` → `GET api/ProductStock?locationId=L1`.
- **Assert (PM):** POST success; list contains the row with damagedQuantity 3; product stock GET shows 97.

---

## WF-5.5 — Stock Transfer (Branch-to-Branch)

### TC-D05.041 — Delivered transfer: stock − at source, + at destination, booked as sale + purchase to self (BIZ-03 characterization)
- **Layers:** IT · UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.5 (AddStockTransferCommandHandler.cs:39-186; TransactionStrategyFactory.cs:26-27; SaleStrategy.cs:33-121; PurchaseStrategy.cs:30-42); doc-11 BIZ-03
- **Arrange:** P-NOTAX stock 50 @ L1 (PurchasePrice 20), no row @ L2; admin JWT (claim STTFR_MANAGE_STTFR); transfer L1→L2, Status=Delivered, items [{P-NOTAX, qty 10, unitPrice 25, base unit}], no shipping.
- **Act:** `POST api/StockTransfer`.
- **Assert (IT):** 200 with StockTransferDto (ReferenceNo generated) · **stock:** ProductStock P@L1 == **40**, P@L2 row created CurrentStock == **10** · **outbound transaction** (Type=StockTransferFromBranch, BranchId L1, Narration "Stock Transfer From source Branch", ReferenceNumber == transfer ReferenceNo): AccountingEntry Dr AR 1100 250 / Cr Sales 4100 250 + Dr COGS 5100 200 / Cr Inventory 1200 200 (COGS = 10 × FromLocation PurchasePrice 20, SaleStrategy.cs:96-121) — internal transfer booked as a *sale to yourself* · **inbound transaction** (Type=StockTransferToBranch, BranchId L2, Narration "Stock Get From source Branch"): Dr Inventory 1200 250 / Cr AP 2100 250 · each transaction ΣDr == ΣCr (450/450 outbound, 250/250 inbound) · no GST entries (P-NOTAX) · exactly 2 Transactions share the ReferenceNo.
- **Assert (UT):** `TransactionStrategyFactory.GetStrategy(StockTransferFromBranch)` returns SaleStrategy; `GetStrategy(StockTransferToBranch)` returns PurchaseStrategy (factory L26-27).

### TC-D05.042 — Transfer copies source-branch PurchasePrice onto destination row (cost carried at source valuation)
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.5 (AddStockTransferCommandHandler.cs:87-93)
- **Arrange:** P-NOTAX rows at BOTH L1 (PurchasePrice 20) and L2 (PurchasePrice **33** — stale local price); delivered transfer qty 10.
- **Act:** `POST api/StockTransfer` L1→L2 Delivered.
- **Assert (IT):** after transfer, P@L2 `PurchasePrice` == **20** (overwritten from FromLocation, L89-93) · COGS entry uses 20 (200 total), inbound Inventory entry 250 (transfer price 25) · stock L1 40 / L2 10+existing.

### TC-D05.043 — Shipping charge posts an Expense transaction at the destination branch
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.5 (AddStockTransferCommandHandler.cs:133-158)
- **Arrange:** transfer as TC-D05.041 with `totalShippingCharge: 50`, payment Cash.
- **Act:** `POST api/StockTransfer` Delivered.
- **Assert (IT):** additional Transaction (Type=Expense, BranchId **L2**, Narration "Shipping charge Expense for stock transfer", ReferenceNumber == transfer ReferenceNo, TotalAmount 50) · AccountingEntry Dr Expense 5300 50 / Cr Cash 1050 50 · ΣDr == ΣCr · shipping 0 ⇒ **no** Expense transaction (control assert in same case family: run variant without shipping and count Expense rows == 0).

### TC-D05.044 — In-transit (created, not delivered) transfer moves NO stock and holds no reservation (BIZ-04)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [BIZ-04]
- **Source:** WF-5.5 ⚠ (stock executes only when Status == Delivered, L67); doc-11 BIZ-04 (in-transit unreserved)
- **Arrange:** P-NOTAX stock 50 @ L1; transfer with Status = Created (non-delivered).
- **Act:** `POST api/StockTransfer` Status=Created.
- **Assert (IT):** 200 · ProductStock P@L1 still **50**, no row @ L2 · **zero** Transactions/AccountingEntries · nothing prevents an overlapping sale of the same 10 units at L1 (no reservation — assert by processing an independent Sale qty 50 afterwards: it succeeds and drives L1 to 0).

### TC-D05.045 — Delivered transfer cannot be edited
- **Layers:** IT
- **Priority:** P1   **Category:** Negative
- **Source:** WF-5.5 (UpdateStockTransferCommandHandler.cs:50-53)
- **Arrange:** a Delivered transfer T1.
- **Act:** `PUT api/StockTransfer/{T1}` with any payload.
- **Assert (IT):** response failed with status 404-family and message "stock transfer can't be edited as it's already delivered." · transfer items unchanged.

### TC-D05.046 — Marking a created transfer Delivered with failing accounting silently delivers it (BIZ-04/INT-01)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [BIZ-04]
- **Source:** WF-5.5 (UpdateStockTransferCommandHandler.cs:145-153 — accounting exceptions **logged only**, unlike create which rolls back); doc-11 BIZ-04 + INT-01
- **Arrange:** created (non-delivered) transfer T2 L1→L2; break the accounting leg (e.g., hide ledger account 4100) so ProcessTransactionAsync throws.
- **Act:** `PUT api/StockTransfer/{T2}` with Status=Delivered.
- **Assert (IT):** 200 success · T2.Status == **Delivered** · stock **unchanged** (L1 still 50, no L2 delta) · **zero** Transactions/AccountingEntries for the transfer · error only in logs ("error while Saving Accounting of Stock Transfers") — delivered state persisted while its stock/accounting silently failed.

### TC-D05.047 — Deleting a DELIVERED transfer reverses stock via type-flip and hard-deletes the ledger rows (BIZ-04/INT-03 characterization)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [BIZ-04]
- **Source:** WF-5.5 (DeleteStockTransferCommandHandler.cs:48-88 — **verified**: flips TransactionType and calls ProcessInventoryChangesAsync; removes items/entries/tax/payment rows); doc-11 BIZ-04 + INT-03 (see Discrepancy D-1)
- **Arrange:** delivered transfer T1 (from TC-D05.041 state: L1 40, L2 10); snapshot Transaction/AccountingEntry counts for ReferenceNo.
- **Act:** `DELETE api/StockTransfer/{T1}` with admin JWT.
- **Assert (IT):** 200 · **stock reversal DID happen** via the type-flip hack: P@L1 back to **50** (+10), P@L2 back to **0** (−10) · both transfer Transactions and ALL their TransactionItems/TaxEntries/AccountingEntries/PaymentEntries are **hard-deleted** (counts 0 for the ReferenceNo) · **no mirrored reversal AccountingEntries exist** (reversal leaves no audit trail in the ledger — the INT-03 fragile hack, not an explicit reversal engine) · handler has no DB transaction of its own (partial-failure risk between delete and stock save).
- **Assert (PM):** follow-up GETs on both locations show 50 / 0.

### TC-D05.048 — Transfer delete posts mirrored reversal entries through an explicit reversal engine (BIZ-04/INT-03)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [BIZ-04] — **RED until fix lands**
- **Source:** doc-11 BIZ-04 + INT-03 (explicit reversal engine writing mirrored entries + explicit stock deltas)
- **Arrange:** delivered transfer T1.
- **Act:** `DELETE api/StockTransfer/{T1}` (post-fix behavior).
- **Assert (IT):** stock restored (L1 +10, L2 −10) **and** reversal AccountingEntries exist mirroring the originals (Dr Sales 4100 / Cr AR 1100 250; Dr Inventory 1200 / Cr COGS 5100 200; Dr AP 2100 / Cr Inventory 1200 250) with ReferenceNumber == transfer ReferenceNo · original transactions retained (soft-deleted/voided) for audit · operation atomic: a forced failure mid-delete leaves stock AND ledger untouched.

### TC-D05.049 — Transfers post to inter-branch elimination accounts, not AR/Sales/AP (BIZ-03)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [BIZ-03] — **RED until fix lands**
- **Source:** doc-11 BIZ-03 (inter-branch elimination accounts or transfer-specific strategy)
- **Arrange:** delivered transfer as TC-D05.041 (post-fix build with elimination accounts, e.g., Inter-Branch Transfer Out/In).
- **Assert (IT):** outbound entries hit elimination accounts — **no** Dr AR 1100, **no** Cr Sales 4100 rows for the transfer ReferenceNo; inbound hits the contra account — **no** Cr AP 2100; group P&L revenue and Balance-Sheet AP are not inflated by transfer value (Σ Sales over a period containing only transfers == 0) · COGS/Inventory cost movement preserved at source valuation.

### TC-D05.050 — Sequential ReferenceNo generation from last row races under parallel creates (INT-11 pattern)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [INT-11] *(concurrency characterization)*
- **Source:** WF-5.5 (AddStockTransferCommandHandler.cs:53-57 — reads last transfer's ReferenceNo, same from-latest-row pattern as doc-11 INT-11)
- **Arrange:** two parallel `POST api/StockTransfer` (Status=Created) issued concurrently.
- **Act:** fire both requests simultaneously.
- **Assert (IT):** both return 200 and **both transfers share the same generated ReferenceNo** (no unique constraint / no retry-visible 409) — characterizes the collision window; flag for the INT-11 sequence-table fix (transfer numbering included in its scope).

### TC-D05.051 — Transfer endpoints require STTFR_MANAGE_STTFR (existing control)
- **Layers:** IT
- **Priority:** P1   **Category:** Permission
- **Source:** WF-5.5 (StockTransferController.cs:87,102 — active ClaimChecks)
- **Act:** `POST`, `PUT {id}`, `DELETE {id}` with cashier JWT (claim absent).
- **Assert (IT):** all **403** · no transfer row/stock change · admin JWT succeeds (control).

### TC-D05.052 — Tenant isolation: other tenant's transfer is invisible and undeletable
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-5.5 (global tenant filters)
- **Arrange:** Tenant B transfer TB-1 (delivered); Tenant A admin JWT.
- **Act:** `GET api/StockTransfer/{TB-1}`, `DELETE api/StockTransfer/{TB-1}` as Tenant A.
- **Assert (IT):** both **404** · TB-1's stock rows and ledger untouched (Tenant B still sees them) · Tenant A transfer list does not contain TB-1.

### TC-D05.053 — Postman: transfer runner flow (create → verify both locations → delete)
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.5
- **Act:** runner: login → `POST api/StockTransfer` (P-NOTAX 10 L1→L2, Delivered) → `GET api/StockTransfer/{id}` → `GET api/ProductStock?locationId={{L1}}` → `GET api/ProductStock?locationId={{L2}}` → `DELETE api/StockTransfer/{id}` → repeat both stock GETs.
- **Assert (PM):** create success + ReferenceNo field; GET by id returns Status Delivered; stocks 40 / 10 pre-delete; 50 / 0 post-delete; contract fields present (status, referenceNo, stockTransferItems[]).

### TC-D05.054 — E2E: inter-branch transfer journey through the UI
- **Layers:** E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.5
- **Arrange:** API-seeded stock (P-NOTAX 50 @ L1); admin UI session.
- **Act:** Inventory → Stock Transfers → New Transfer → from L1, to L2, add P-NOTAX qty 10, Save as **Delivered**.
- **Assert (E2E):** transfer appears in the list with Status Delivered and a ReferenceNo; L1 stock grid shows 40; switch location filter to L2 → grid shows 10; opening the transfer shows two linked transactions (outbound/inbound).

---

## WF-5.6 — Inventory Batch Workflow (Latent / FEFO)

### TC-D05.055 — FEFO ordering: batches returned by ExpiryDate ascending
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.6 (GetInventoryBatchesQueryHandler.cs:24-32)
- **Arrange:** in-memory SQLite; P-BATCH batches B2 (2027-01-31, 60), B1 (2026-09-15, 40), B5 (2026-09-14, 10) all active qty > 0 (insert order deliberately NOT FEFO).
- **Act:** `GetInventoryBatchesQueryHandler.Handle(P-BATCH)`.
- **Assert (UT):** returned order exactly [B5, B1, B2] (earliest expiry first — FEFO), each with Quantity > 0 and IsActive true; full entity payloads (BatchNumber, ExpiryDate, ManufacturingDate, Quantity, PurchasePrice, SalesPrice).

### TC-D05.056 — Batch query filters: product match, Quantity > 0, IsActive only
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.6 (filter L27: `ProductId == request.ProductId && Quantity > 0 && IsActive`)
- **Arrange:** seed per shared data (B1 40 active, B2 60 active, B3 inactive, B4 qty 0).
- **Act:** `GET api/InventoryBatch?productId={{P-BATCH}}`.
- **Assert (IT):** 200 · body contains exactly [B1 (40), B2 (60)] in that order · B3 (IsActive=false) and B4 (Quantity 0) absent · batches of other products absent · tenant-scoped (Tenant B sees none of Tenant A's batches).

### TC-D05.057 — Sales never decrement batch quantities (batch table inert, BIZ-02)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [BIZ-02]
- **Source:** WF-5.6 ⚠ (nothing writes InventoryBatches — grep-verified); doc-11 BIZ-02
- **Arrange:** P-BATCH stock 100 @ L1, batches B1 40 / B2 60.
- **Act:** process a Sale of qty 5 for P-BATCH through `AccountingService.ProcessTransactionAsync` (engine-level IT — deduction path).
- **Assert (IT):** ProductStock P-BATCH@L1 == 95 · InventoryBatch rows **unchanged**: B1 still 40, B2 still 60 (deduction is not batch-aware; no batch row written, updated, or deactivated).

### TC-D05.058 — Purchases never create or increment batches (BIZ-02)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [BIZ-02]
- **Source:** WF-5.6 ⚠ (no write path for InventoryBatch); doc-11 BIZ-02
- **Arrange:** P-BATCH batch count snapshot (2 rows: B1, B2).
- **Act:** `POST api/PurchaseOrders` for P-BATCH qty 24 @ L1 (stock granted at creation).
- **Assert (IT):** ProductStock increases (100 → 124) · InventoryBatch table row count **still 2** — no batch row created, B1/B2 quantities unchanged (intake is not batch-aware; expiry data cannot exist for newly purchased goods).

### TC-D05.059 — Sales deduct batches FEFO (earliest expiry first) on sale (BIZ-02)
- **Layers:** IT · UT
- **Priority:** P0   **Category:** Gap-Target [BIZ-02] — **RED until fix lands**
- **Source:** doc-11 BIZ-02 (batch deduction on sale, FEFO)
- **Arrange:** P-BATCH stock 100, batches B1 40 (2026-09-15), B2 60 (2027-01-31).
- **Act:** Sale of qty 45 through the pipeline (post-fix build).
- **Assert (IT):** ProductStock == 55 · B1 Quantity == **0** (fully consumed / deactivated per design) · B2 Quantity == **55** (45 − 40 remainder taken from next-expiring) · batch movements recorded (intake/deduction rows or equivalent audit per agreed design).

### TC-D05.060 — Expiry alerts surface soon-to-expire batches (BIZ-02)
- **Layers:** IT · E2E
- **Priority:** P1   **Category:** Gap-Target [BIZ-02] — **RED until fix lands**
- **Source:** doc-11 BIZ-02 (expiry alerts)
- **Arrange:** B1 expires in 18 days (inside a 30-day window), B2 in 156 days, clock injected (deterministic `TimeProvider`).
- **Act:** query the expiry-alert feed (endpoint/widget per agreed enhancement design) with window = 30 days.
- **Assert (IT):** feed contains B1 with days-to-expiry 18, excludes B2 · adjusting the window to 10 days excludes B1. **Assert (E2E):** dashboard expiry widget lists P-BATCH/B1 badge (key numbers only).

---

## WF-5.7 — Stock Visibility & Alerts

### TC-D05.061 — Alert threshold predicate: `CurrentStock <= AlertQuantity`, null AlertQuantity excluded
- **Layers:** UT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-5.7 (EF predicate ProductStockRepository.cs:84-85; Dapper `WhereRaw` + `WhereNotNull`, GetProductStockAlertCommandHandler.cs:70-71)
- **Arrange:** stock rows: (P-LOW 5, alert 20), (P-BOUNDARY 20, alert 20), (P-OK 50, alert 10), (P-NULLALERT 10, alert null).
- **Act:** `GetProductStockAlertsAsync` (EF fallback path) over the seeded set.
- **Assert (UT):** included = [P-LOW, P-BOUNDARY] (equality `<=` is alerting), excluded = [P-OK, P-NULLALERT] (`AlertQuantity.HasValue` guard); ordering of the Dapper and EF predicates agree row-for-row on this set.

### TC-D05.062 — stock-alert endpoint returns alerting products with projection fields
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.7 (ProductStockController.cs:106-127; handler Dapper path L50-116)
- **Arrange:** seeded P-LOW/P-BOUNDARY/P-OK/P-NULLALERT @ L1; admin JWT.
- **Act:** `GET api/ProductStock/stock-alert?locationId={{L1}}&pageSize=50`.
- **Assert (IT):** 200 · items contain exactly P-LOW (Stock 5) and P-BOUNDARY (Stock 20) with fields ProductId, ProductName, Stock, BusinessLocation, Unit · `X-Pagination` header totalCount == 2 · P-OK and P-NULLALERT absent.

### TC-D05.063 — Alert list scoped by user locations when no LocationId param
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.7 (ProductStockRepository.cs:87-94 `_userInfoToken.LocationIds`; Dapper `WhereIn` L77-81)
- **Arrange:** P-LOW row also at L2 (stock 5); user whose `LocationIds` = [L1] only.
- **Act:** `GET api/ProductStock/stock-alert` (no locationId) with that user's JWT; then with `locationId={{L2}}`.
- **Assert (IT):** without param → only L1 rows (P-LOW@L1, P-BOUNDARY@L1); with L2 param → only P-LOW@L2; a user with LocationIds [L1, L2] sees both.

### TC-D05.064 — Dapper fast path and EF fallback return identical alert results
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-5.7 (flag `Features:Dapper:GetProductStockAlertCommandHandler`, handler L50; EF fallback L124)
- **Arrange:** same seed as TC-D05.062.
- **Act:** call stock-alert with feature flag `true` (default), then override config to `false` and call again.
- **Assert (IT):** both responses 200 with identical totalCount (2), identical items (ProductId, Stock, BusinessLocation) and identical order (Product Name asc default).

### TC-D05.065 — Pre-sale stock check endpoint reports availability
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.7 (ProductStockController.cs:94-100 `POST check` — POS "process anyway" dialog source)
- **Arrange:** P-LOW stock 5 @ L1.
- **Act:** `POST api/ProductStock/check {productId: P-LOW, locationId: L1, requestedQty: 10}` then with `requestedQty: 5`.
- **Assert (IT):** 200 both · insufficient-case flags shortfall (available 5 vs requested 10 → not sufficient / shortfall 5); exact-case sufficient (requested 5 vs available 5 → sufficient true) · response consumed by POS dialog fields present per contract.

### TC-D05.066 — Paged stock list: tenant filter, pagination header, live CurrentStock
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.7 (ProductStockController.cs:64-85; ProductStockRepository.cs:143-166)
- **Arrange:** after TC-D05.010-style gain (P-SIMPLE 105 @ L1); Tenant B rows exist elsewhere.
- **Act:** `GET api/ProductStock?locationId={{L1}}&pageSize=10` as Tenant A admin.
- **Assert (IT):** 200 · `X-Pagination` header with totalCount/pageSize/skip/totalPages · items only Tenant A rows (no Tenant B) · P-SIMPLE row `currentStock == 105` (live ProductStock value, not the stale `Product.CurrentStock` 100 — cross-check INT-10) · `productName` filter narrows results (Like prefix).

### TC-D05.067 — Postman: stock-alert and count contracts
- **Layers:** PM
- **Priority:** P2   **Category:** Happy
- **Source:** WF-5.7
- **Act:** runner: login → `GET api/ProductStock/stock-alert` → `GET api/ProductStock/count`.
- **Assert (PM):** alert body item schema (productId, productName, stock, businessLocation, unit); count body numeric equals seeded row count for the location; both requests carry the token; header X-Pagination parses on stock-alert.

### TC-D05.068 — stock-alert and check endpoints are unguarded for any authenticated user (SEC-01 read side)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [SEC-01]
- **Source:** WF-5.7 ⚠ (stock-alert ClaimCheck commented, ProductStockController.cs:107; `check` has no claim attribute); doc-11 SEC-01 (doc lists mutation endpoints; read side also unguarded — see Discrepancy D-4)
- **Act:** `GET api/ProductStock/stock-alert` and `POST api/ProductStock/check` with **cashier** JWT (no DB_PROD_STOCK_ALERT, no inventory claims).
- **Assert (IT):** both **200** with full payloads (alert rows visible to a POS-only user).

### TC-D05.069 — stock-alert requires DB_PROD_STOCK_ALERT claim (SEC-01)
- **Layers:** IT
- **Priority:** P2   **Category:** Gap-Target [SEC-01] — **RED until fix lands**
- **Source:** doc-11 SEC-01 (restore claims, including the commented `DB_PROD_STOCK_ALERT` on stock-alert)
- **Act:** `GET api/ProductStock/stock-alert` with cashier JWT (post-fix build).
- **Assert (IT):** **403** · manager (view-only claims, still no DB_PROD_STOCK_ALERT) also 403 · admin JWT 200 (control).

### TC-D05.070 — E2E: low-stock alerts widget reacts to adjustments
- **Layers:** E2E
- **Priority:** P1   **Category:** Happy
- **Source:** WF-5.7
- **Arrange:** API-seeded P-LOW stock 5 (alert 20) @ L1; admin UI session.
- **Act:** open Dashboard → Low Stock widget (lists P-LOW) → navigate Inventory → adjust P-LOW +20 (gain 20) → return to Dashboard.
- **Assert (E2E):** widget initially shows P-LOW with stock 5 ≤ alert 20; after adjustment and refresh P-LOW is **absent** from the widget (25 > 20); widget row count decremented by 1.

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case — WF-5.0 (001-005, 009), WF-5.1 (010/012), WF-5.2 (024), WF-5.3 (029/030), WF-5.4 (034), WF-5.5 (041-043), WF-5.6 (055/056), WF-5.7 (062/065/066). *(WF-5.3's only mutation path IS the INT-05 backdoor, so its "happy" execution is intentionally asserted as Gap-Char TC-D05.029 — see D-2.)*
- [x] Every write endpoint has: Validation case (bad input → 400/409): bulk-adjust empty → 400 (TC-D05.033); ProductStock/damaged "validation" is swallowed-by-design and characterized instead (TC-D05.015, TC-D05.038) — noted, not silently fixed. Permission case (missing claim → 403): TC-D05.022 (Gap-Target), TC-D05.039, TC-D05.051. Tenant-Isolation case: TC-D05.023, TC-D05.052.
- [x] Every money/stock mutation has DB-state assertions (entries balanced, stock delta) — TC-D05.009, 010, 012, 016, 024, 029, 034, 037, 041, 043, 047.
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case — INT-01 (015/025/046), INT-02 (006), INT-03 (047/048), INT-05 (029/031), INT-08 (035/036/037), INT-09 (038), INT-10 (008), INT-11 (050), ACC-07 (002/007), SEC-01 (021/022/032/068/069), BIZ-02 (057-060), BIZ-03 (049), BIZ-04 (044/046/047/048).
- [x] Gap-Char assertions describe CURRENT behavior (code-verified against cited file:line); Gap-Target describes DESIRED behavior (RED now) — each Gap-Char cites its verified anchor.
- [x] Concurrency case for sequential-number generation where the doc flags it (INT-11 pattern): TC-D05.050 (transfer ReferenceNo from-last-row race).
- [x] Edge/boundary cases: zero qty (014), zero-qty batch row (056), threshold equality `<=` (061/062), empty payloads (027/033), unit-conversion operators incl. negative pass-through (016/017), create-if-missing absolute row (030), Dapper/EF parity (064).

## Discrepancy notes

- **D-1 (verified code vs docs — BIZ-04/WF-5.5):** doc-05 WF-5.5 and doc-11 BIZ-04 state "transfer delete performs **no** stock reversal". Actual code (`StockTransfer/Handlers/DeleteStockTransferCommandHandler.cs:48-88`) **does** reverse stock for DELIVERED transfers — but via the fragile INT-03 type-flip hack (flip `TransactionType`, re-run `ProcessInventoryChangesAsync`), with all original transactions/entries hard-deleted and no mirrored reversal journal entries, and no DB transaction around the handler. TC-D05.047 characterizes the verified behavior (Gap-Char); TC-D05.048 specifies the desired reversal engine (Gap-Target). The other two BIZ-04 facets (in-transit unreserved — TC-D05.044; silently-skipped accounting on mark-delivered — TC-D05.046) remain true as documented.
- **D-2 (checklist nuance):** WF-5.3 has no non-gap happy path — the absolute-correction backdoor's success path is itself the documented divergence (INT-05), so its happy-path case is TC-D05.029 (Gap-Char) by design.
- **D-3 (account codes):** `StockAdjustmentStrategy` posts gains/losses to **5400 "Stock Adjustment"** (both directions), not the template COA's 4900 Gain / 5950 Loss. All catalog assertions use 5400 per code (`StockAdjustmentStrategy.cs:22`) and the doc-05 consolidated matrix.
- **D-4 (SEC-01 scope extension):** doc-11 SEC-01 covers the four mutation endpoints; spot-check found the **stock-alert** ClaimCheck also commented out (`ProductStockController.cs:107`) and `POST check` never had a claim — covered by TC-D05.068/069.
- **D-5 (cosmetic, I-04):** damaged-stock entity file is literally named `"DamagedStock .cs"` (stray space in filename) — untestable behavior; flagged for the INT-08 enhancement ticket hygiene.
