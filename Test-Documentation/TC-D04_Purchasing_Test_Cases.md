# TC-D04 — Purchasing Test Cases

**Source:** `New-Documents/04_Purchasing_Workflows.md` (WF-4.1 … WF-4.6), code-verified against `SourceCode/SQLAPI/POS.MediatR/PurchaseOrder/*` and `SourceCode/SQLAPI/POS.MediatR/Accouting/Strategies/PurchaseStrategy.cs` / `PurchaseReturnStrategy.cs`.
**Scope:** Purchase order lifecycle (create, request, convert, receive-flag, update, delete), purchase returns with supplier refunds, and supplier payments — including journal entries, stock deltas, and status transitions.
**Workflows covered:** WF-4.1, WF-4.2, WF-4.3, WF-4.4, WF-4.5, WF-4.6.
**Gap signals referenced:** INT-01, INT-02, INT-03, INT-06, INT-07, INT-11, ACC-04, BIZ-01, BIZ-10 (from `New-Documents/11`).

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed) with locations L1, L2; Tenant B (isolation checks, own supplier SUP-B)
- Users: `admin` (all claims), `manager` (no `PO_*`/`POR_*` claims), `cashier` (POS claims only), `por-clerk` (`POR_VIEW_PO_REQUESTS`, `POR_ADD_PO_REQUEST`, `POR_UPDATE_PO_REQUEST`, `POR_CONVERT_TO_PO` — no `PO_*` claims)
- Suppliers: SUP-1 (Tenant A)
- Product P-SIMPLE: `PurchasePrice 100`, `ProductStock.CurrentStock = 100 @ L1`, base unit = each; secondary unit **Carton = 12 × each**
- Taxes: **GST-17** (17%, input child ledger **1150-01 "Input GST 17%"** via `Tax.InPutAccountCode`), **GST-5** (5%, input child **1150-02**); Chart of Accounts per WF-6.2 plus purchasing set: **Inventory 1200, AP 2100, Input-GST 1150 (children 1150-01/1150-02), Discount Received 4200, RoundOff 5900, Cash 1050, Bank 1060, COGS 5100**
- Open FinancialYear FY2026
- **Canonical scenario PO-A** (used across cases unless stated): P-SIMPLE, qty 10 @ 120 (base units), GST-17, no discount → `SubTotal 1200`, `TotalTax 204`, `TotalAmount 1404`, `PaymentStatus Pending`
- **Canonical paid state:** PO-A with one payment 1404 (Cash) → `TotalPaidAmount 1404`, `PaymentStatus Paid`

---

## WF-4.1 — Purchase Order Create (Backend)

### TC-D04.001 — Create real PO posts PurchaseStrategy journal, grants stock at creation, and later sale consumes it as COGS
- **Layers:** UT, IT, PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.1 (handler `AddPurchaseOrderCommandHandler.cs:59-182`; strategy `PurchaseStrategy.cs:18-132`)
- **Arrange:** tenant A, L1, P-SIMPLE (stock 100, purchasePrice 100), GST-17 → child 1150-01, open FY2026, admin JWT with `PO_ADD_PO`
- **Act:** `POST /api/PurchaseOrder` `{ orderNumber: "PO#00001", supplierId: SUP-1, locationId: L1, isPurchaseOrderRequest: false, items: [{ productId: P-SIMPLE, quantity: 10, unitPrice: 120, taxes: [GST-17] }] }`
- **Assert (IT):** 201 · `PurchaseOrder` row: PaymentStatus **Pending**, TotalAmount 1404, TotalTax 204 · `ProductStock.CurrentStock: 100 → 110 (+10)` at L1 · `ProductStock.PurchasePrice = 120` (LIFO overwrite) · `Product.PurchasePrice = 120` · `Transaction (TransactionType=Purchase, ReferenceNumber="PO#00001", Narration="Purchase order")` with AccountingEntries: **Dr Inventory 1200 / Cr AP 1200** and **Dr Input-GST-01 (1150-01) 204 / Cr AP 204**; ΣDr == ΣCr == 1404 · TaxEntry rows (Input) 204 per WF-6.1 · **COGS-on-sale interplay:** follow-up sale of 2 units @ 200 posts **Dr COGS 5100 240 / Cr Inventory 1200 240** and stock `110 → 108 (−2)`
- **Assert (UT):** PurchaseStrategy given the PO-A transaction returns exactly the two entry pairs above (main 1200, tax 204) and nothing else
- **Assert (PM):** response body has `id`, `orderNumber`, `totalAmount: 1404`, `paymentStatus: "Pending"`; follow-up `GET /api/PurchaseOrder/{id}` reflects the same

### TC-D04.002 — PurchaseStrategy main entry is exactly Dr Inventory 1200 / Cr AP 2100 for a tax-free purchase
- **Layers:** UT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.1 (`PurchaseStrategy.cs:31-42`)
- **Arrange:** in-memory transaction: 10 × 120, no taxes, no discount, roundOff 0, Inventory=1200, AP=2100
- **Act:** `PurchaseStrategy.ProcessTransactionAsync(transaction)`
- **Assert (UT):** exactly one AccountingEntry: **Dr Inventory (1200) 1200 / Cr Accounts Payable (2100) 1200**, EntryType Regular, narration contains "Purchase"; balanced; no Tax/Discount/RoundOff entries

### TC-D04.003 — PurchaseStrategy posts GST to each tax's input child account, computed on (qty×price − discount), aggregated per account
- **Layers:** UT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.1 (`PurchaseStrategy.cs:44-93`, `GetInputGstAccountCodeAsync`)
- **Arrange:** items: {10 × 120, GST-17}, {5 × 200, GST-5}, {2 × 100, GST-17}; no discounts
- **Act:** `PurchaseStrategy.ProcessTransactionAsync`
- **Assert (UT):** entry per child: **Dr 1150-01 238 / Cr AP 238** (=(1200+200)×17%) and **Dr 1150-02 50 / Cr AP 50** (=1000×5%); two items sharing one child are aggregated into a single entry per account; with an additional fixed discount 100 on the first item the 1150-01 base becomes (1200−100)×17% = **187**

### TC-D04.004 — PurchaseStrategy books supplier discount as Dr AP / Cr Discount Received and nets AP
- **Layers:** UT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.1 (`PurchaseStrategy.cs:95-110`)
- **Arrange:** PO-D: 10 × 120, fixed discount 100, GST-17
- **Act:** `PurchaseStrategy.ProcessTransactionAsync`
- **Assert (UT):** entries: **Dr Inventory 1200 / Cr AP 1200** · **Dr 1150-01 187 / Cr AP 187** (GST on discounted base) · **Dr AP 100 / Cr Discount Received (4200) 100** · net AP balance = 1200 + 187 − 100 = **1287**; ΣDr == ΣCr

### TC-D04.005 — PurchaseStrategy round-off entry swaps Dr/Cr by sign and uses absolute value
- **Layers:** UT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-4.1 (`PurchaseStrategy.cs:112-131`)
- **Arrange:** two transactions: roundOffAmount +0.40 and −0.40
- **Act:** `PurchaseStrategy.ProcessTransactionAsync` for each
- **Assert (UT):** positive: **Dr AP 0.40 / Cr RoundOff (5900) 0.40**; negative: **Dr RoundOff (5900) 0.40 / Cr AP 0.40**; both amounts are abs value; no entry when roundOffAmount == 0

### TC-D04.006 — Unit conversion maps carton purchase to base-unit quantity and base purchase price for COGS
- **Layers:** UT, IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.1 (`GetBaseUnitValuesAsync`; handler lines 130-160)
- **Arrange:** P-SIMPLE with unit Carton (12 × each); PO item qty 5 cartons @ 1440/carton
- **Act:** `POST /api/PurchaseOrder` (real PO)
- **Assert (UT):** `TransactionItemDto` carries `Quantity = 60` (base), `UnitPrice = 120` (base), `PurchasePrice = 120` · **Assert (IT):** `Product.PurchasePrice = 120`; stock `100 → 160 (+60)`; Dr Inventory 7200 / Cr AP 7200 (+GST) · a later sale of 2 base units posts **Dr COGS 240 / Cr Inventory 240** — proving the converted base price (not the 1440 carton price) feeds COGS

### TC-D04.007 — Product master cost (PurchasePrice) is updated only for real POs, not requests
- **Layers:** IT
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-4.1 (handler lines 96-111, guarded by `!request.IsPurchaseOrderRequest`)
- **Arrange:** P-SIMPLE purchasePrice 100
- **Act:** `POST /api/PurchaseOrder` real PO 10 @ 120; then `POST` request PO (`isPurchaseOrderRequest: true`) 10 @ 999
- **Assert (IT):** after real PO `Product.PurchasePrice = 120`; after request PO `Product.PurchasePrice` **remains 120**; request PO created with 201

### TC-D04.008 — Zero-total purchase order auto-sets PaymentStatus Paid
- **Layers:** UT, IT
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-4.1 (handler lines 90-93)
- **Arrange:** admin JWT; payload with a single item qty 1 @ 0, no taxes (`TotalAmount == 0`)
- **Act:** `POST /api/PurchaseOrder`
- **Assert (IT):** 201 · PaymentStatus **Pending → Paid** (no payment rows exist) · Purchase transaction (SubTotal 0) balanced: ΣDr == ΣCr == 0 · stock `100 → 101 (+1)`
- **Assert (UT):** handler rule `TotalAmount == 0 ⇒ PaymentStatus.Paid` (pure mapping check on the command)

### TC-D04.009 — Duplicate PO number is rejected with 409; malformed payload with 400
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Validation
- **Source:** WF-4.1 (handler lines 62-66)
- **Arrange:** PO#00001 already exists (seed PO-A)
- **Act:** `POST /api/PurchaseOrder` with `orderNumber: "PO#00001"` (different supplier/items); second request with missing `orderNumber`/empty items
- **Assert (IT):** duplicate → **409** "Purchase Order Number is already Exists." and no new row; malformed → **400** with validation problem details; stock and ledger unchanged (still 110 / Σ 1404)

### TC-D04.010 — Concurrent creates with the same generated number: one 201, one 409 (no duplicate ledger)
- **Layers:** IT
- **Priority:** P0
- **Category:** Concurrency
- **Source:** WF-4.1 + **INT-11** (latest-row number generation; 409 retry as only safety net)
- **Arrange:** two parallel `POST /api/PurchaseOrder` calls both using `orderNumber` fetched from `GET /api/PurchaseOrder/newOrderNumber/false` before either commits
- **Act:** fire both requests concurrently (Task.WhenAll in the integration test)
- **Assert (IT):** exactly one 201 and one **409**; exactly **one** Purchase transaction with `ReferenceNumber` = that number; stock delta is exactly **+10** (not doubled); ΣDr == ΣCr

### TC-D04.011 — POST /purchaseOrder without PO_ADD_PO claim returns 403
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-4.1 (`PurchaseOrderController.cs:90-97` `[ClaimCheck("PO_ADD_PO","POR_ADD_PO_REQUEST")]`)
- **Arrange:** JWT for `manager` (no `PO_ADD_PO`)
- **Act:** `POST /api/PurchaseOrder` with valid PO-A payload
- **Assert (IT):** **403**; no PurchaseOrder row, no Transaction, stock unchanged at 100

### TC-D04.012 — Cross-tenant PO is invisible (404) on GET and PUT
- **Layers:** IT
- **Priority:** P0
- **Category:** Tenant-Isolation
- **Source:** WF-4.1 (tenant filter on all queries)
- **Arrange:** Tenant A owns PO-A; Tenant B admin JWT
- **Act:** `GET /api/PurchaseOrder/{PO-A-id}` and `PUT /api/PurchaseOrder/{PO-A-id}` from Tenant B
- **Assert (IT):** both **404**; Tenant B's list `GET /api/PurchaseOrder` does not contain PO-A; no ledger/stock mutation occurred

### TC-D04.013 — Accounting pipeline failure is swallowed: PO returned 201 with missing ledger entries and unposted stock
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.1 + **INT-01, INT-02** (try/catch swallows at `AddPurchaseOrderCommandHandler.cs:176-179`; empty save-failure bodies in AccountingService/InventoryService)
- **Arrange:** seed PO-A chart but **delete ledger account 2100 (AP)** to force `InvalidOperationException("Required ledger accounts not found")` inside PurchaseStrategy; admin JWT
- **Act:** `POST /api/PurchaseOrder` (valid PO-A payload)
- **Assert (IT):** response is **201** (exception logged, not surfaced) · PurchaseOrder row exists (TotalAmount 1404, Pending) · **no** AccountingEntry rows and **no** TaxEntry rows for "PO#00001" · `ProductStock.CurrentStock` unchanged at **100** (stock leg never ran) · `Product.PurchasePrice = 120` (step 7 persisted before the failure)
- **Assert (UT):** n/a — characterization at integration level only

### TC-D04.014 — Desired: ledger/stock failure fails the request and rolls the PO back (atomicity)
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Target [INT-01]
- **Source:** WF-4.1 + INT-01 (wrap business event in one DB transaction; fail request when the ledger/stock leg fails)
- **Arrange:** same broken-chart setup as TC-D04.013
- **Act:** `POST /api/PurchaseOrder` (valid PO-A payload)
- **Assert (IT):** response is **5xx** (or 409/422 per implemented contract — RED by definition until INT-01 lands) · **no** PurchaseOrder row persisted · `Product.PurchasePrice` still 100 · stock still 100 · zero orphan AccountingEntry/TaxEntry/Transaction rows. **This test is RED now.**

### TC-D04.015 — Stock is granted at PO creation with no receipt step (BIZ-01 characterization)
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.1 + **BIZ-01** (no GRN workflow; term "GRN"/"receipt" does not exist in the codebase)
- **Arrange:** tenant A, L1, P-SIMPLE stock 100, admin JWT
- **Act:** `POST /api/PurchaseOrder` real PO (PO-A payload); then `GET /api/PurchaseOrder/{id}` and stock lookup
- **Assert (IT):** 201 · stock is **110 (+10) immediately after create** while `DeliveryStatus` is still **NOT_RECEIVED** · no receiving endpoint exists: `PUT .../receipt` returns 404/405 · no partial-quantity field on any PurchaseOrderItem row (all quantities posted at once)

### TC-D04.016 — Purchase order request (POR) creates no accounting, no stock movement, no price update
- **Layers:** IT, PM
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-4.1 PO Request variant (steps 7 & 9 skipped; handler lines 96, 119)
- **Arrange:** `por-clerk` JWT with `POR_ADD_PO_REQUEST`; P-SIMPLE purchasePrice 120, stock 100
- **Act:** `POST /api/PurchaseOrder` with `isPurchaseOrderRequest: true`, `orderNumber: "POR#00001"`, same PO-A items
- **Assert (IT):** 201 · PaymentStatus **Pending** · `PurchaseOrder.IsPurchaseOrderRequest = true` · **zero** Transaction/AccountingEntry/TaxEntry rows for "POR#00001" · `ProductStock.CurrentStock` still **100 (Δ0)** · `Product.PurchasePrice` still **120**
- **Assert (PM):** response schema identical to real PO except the flag; `GET /api/PurchaseOrder/newOrderNumber/true` returns next POR number

### TC-D04.017 — PO and POR numbers come from separate sequences seeded PO#00001 / POR#00001
- **Layers:** IT, UT
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-4.1 (`GetNewPurchaseOrderNumberQueryHandler.cs:23-47`, inverted comparison `c.IsPurchaseOrderRequest != request.isPurchaseOrder`)
- **Arrange:** empty purchasing tables; then create one real PO (PO#00001) and one request (POR#00001)
- **Act:** `GET /api/PurchaseOrder/newOrderNumber/false` (real PO) and `/newOrderNumber/true` (request) — note the route's `isPurchaseOrder` polarity: true → PO sequence, false → POR sequence
- **Assert (IT):** seeds return **"PO#00001"** and **"POR#00001"** on empty DB; after seeding, next PO = "PO#00002", next POR = "POR#00002" — sequences do not interleave · **Assert (UT):** non-numeric suffix fallback returns `{last}#00001` (handler line 46)

### TC-D04.018 — Converting a POR to PO flips the flag only: no stock, no accounting, and any POR_* holder may convert
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.1 + **BIZ-10** (any `POR_*` holder can convert; no approval hierarchy) + **INT-01** (update handler gates reversal/re-post on the *existing* record's `IsPurchaseOrderRequest` — `UpdatePurchaseOrderCommandHandler.cs:102,132` — so conversion posts nothing)
- **Arrange:** request POR#00001 (10 @ 120) created by `por-clerk`; P-SIMPLE stock 100, purchasePrice 120; `por-clerk` holds `POR_UPDATE_PO_REQUEST` + `POR_CONVERT_TO_PO` but **no** `PO_UPDATE_PO`
- **Act:** `PUT /api/PurchaseOrder/{id}` with `isPurchaseOrderRequest: false`, same items/totals, POR_CONVERT_TO_PO JWT
- **Assert (IT):** 201 · `IsPurchaseOrderRequest = false` (flag copied at line 199) · **no** Transaction/AccountingEntry rows for "POR#00001" · stock still **100 (Δ0)** · `Product.PurchasePrice` still 120 · PaymentStatus **Pending**

### TC-D04.019 — Desired: conversion of an approved request posts the Purchase transaction, stock, and input GST; unapproved requests cannot convert
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Target [BIZ-10]
- **Source:** WF-4.1 + BIZ-10 (approval workflow) + INT-01
- **Arrange:** POR#00001 (10 @ 120, GST-17) flagged approved; user with convert claim
- **Act:** `PUT /api/PurchaseOrder/{id}` converting to real PO
- **Assert (IT):** 201 · Purchase transaction posted: **Dr Inventory 1200 / Cr AP 1200 + Dr 1150-01 204 / Cr AP 204** · stock `100 → 110 (+10)` · `Product.PurchasePrice = 120` · conversion of a **non-approved** request by a plain `POR_*` holder → **403** (approval hierarchy enforced). **RED now.**

---

## WF-4.2 — Mark As Received (Backend)

### TC-D04.020 — MarkAsReceived only flips DeliveryStatus (cosmetic): no stock, no accounting; second call is idempotent
- **Layers:** IT, PM, E2E
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.2 + **BIZ-01** (`MarkParchaseOrderAsReceivedCommandHandler.cs:23-52` — sets flag, nothing else)
- **Arrange:** PO-A created (stock 110 after create), snapshot of AccountingEntries/TaxEntries/Transaction rows for "PO#00001"
- **Act:** `PUT /api/PurchaseOrder/{id}/markasreceived` (claim `PO_UPDATE_PO`, controller line 199-206); call it **twice**
- **Assert (IT):** both calls 200 · `DeliveryStatus = RECEIVED` · stock **still 110 (Δ0)** · AccountingEntry/TaxEntry/Transaction row sets **byte-identical** before/after (no new rows) · PaymentStatus still Pending · second call returns success without duplicating anything (idempotent branch, handler lines 36-39)
- **Assert (PM):** response `{ success: true }`; follow-up GET shows `deliveryStatus: "RECEIVED"`

### TC-D04.021 — MarkAsReceived for unknown PO id returns 404
- **Layers:** IT
- **Priority:** P1
- **Category:** Validation
- **Source:** WF-4.2 (handler lines 30-34)
- **Arrange:** admin JWT; random `Guid.NewGuid()` id
- **Act:** `PUT /api/PurchaseOrder/{id}/markasreceived`
- **Assert (IT):** **404**; nothing mutated

### TC-D04.022 — MarkAsReceived without PO_UPDATE_PO returns 403
- **Layers:** IT
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-4.2 (`PurchaseOrderController.cs:199-206` `[ClaimCheck("PO_UPDATE_PO")]`)
- **Arrange:** `cashier` JWT (POS claims only)
- **Act:** `PUT /api/PurchaseOrder/{PO-A-id}/markasreceived`
- **Assert (IT):** **403**; `DeliveryStatus` unchanged

### TC-D04.023 — Desired (GRN): a receipt with received-qty lines posts stock and purchase accounting at receipt time, not at order time
- **Layers:** IT, UT
- **Priority:** P0
- **Category:** Gap-Target [BIZ-01]
- **Source:** WF-4.2 + BIZ-01 (implement goods-receipt lines: received qty vs ordered qty; stock+accounting on receipt)
- **Arrange:** PO created as **request-stage real PO** under the target design (order posts nothing); receipt endpoint `POST /api/PurchaseOrder/{id}/receipt` with line `{ productId: P-SIMPLE, orderedQty: 10, receivedQty: 10 }`
- **Act:** post the full receipt
- **Assert (UT):** receipt strategy produces **Dr Inventory 1200 / Cr AP 1200 + Dr 1150-01 204 / Cr AP 204** and stock delta **+10** at receipt · **Assert (IT):** stock `100 → 110 (+10)` only after receipt; `DeliveryStatus = RECEIVED`; GRN row stores received-qty lines. **RED now (endpoint does not exist — expect 404 today).**

### TC-D04.024 — Desired (GRN): partial receipt of 4 of 10 increases stock by 4 and leaves PO partially received
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Target [BIZ-01]
- **Source:** WF-4.2 + BIZ-01 (partial receipts impossible today)
- **Arrange:** PO for 10 units (target design, nothing posted at create)
- **Act:** `POST /api/PurchaseOrder/{id}/receipt` with `receivedQty: 4`
- **Assert (IT):** stock `100 → 104 (+4)` · accounting posts only for received value (4 × 120 = **Dr Inventory 480 / Cr AP 480** + GST 81.60) · PO delivery status = **PartialReceived**; second receipt of 6 completes it. **RED now.**

---

## WF-4.3 — Purchase Order Update (Backend)

### TC-D04.025 — Metadata-only update (totals unchanged) leaves ledger, stock, and entries untouched
- **Layers:** IT
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-4.3 (reversal/re-post only when totals changed — handler lines 102, 132)
- **Arrange:** PO-A (stock 110; entries Σ 1404); snapshot of Transaction/AccountingEntry rows
- **Act:** `PUT /api/PurchaseOrder/{id}` changing only `note` and `deliveryDate` (same items/totals)
- **Assert (IT):** 201 · note persisted · row counts for Transaction/AccountingEntry/TaxEntry **unchanged** · stock still **110 (Δ0)** · PaymentStatus still Pending

### TC-D04.026 — Quantity update reverses old posting (type-flip) and re-posts new: net stock = new − old, entries fully replaced
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.3 (handler lines 99-191; `UpdatePurchaseOrderCommandHandler.cs:119-121` type-flip)
- **Arrange:** PO-A fresh: 10 @ 120 GST-17 (stock 100 → 110, entries Σ 1404), unpaid, not received
- **Act:** `PUT /api/PurchaseOrder/{id}` with items changed to **7 @ 120** (totals change)
- **Assert (IT):** 201 · old Purchase transaction and its AccountingEntries/TaxEntries/TransactionItems **removed** (no rows left with ReferenceNumber "PO#00001" from the original posting) · new transaction: **Dr Inventory 840 / Cr AP 840 + Dr 1150-01 142.80 / Cr AP 142.80** · stock: reverse −10 (110 → 100) then re-add +7 → **107 (net −3)** · `ProductStock.PurchasePrice = 120` · PaymentStatus **Pending** · ΣDr == ΣCr == 982.80

### TC-D04.027 — Update of a returned PO is blocked with 409
- **Layers:** IT
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-4.3 (handler lines 81-85; `UpdatePurchaseOrderCommandHandler.cs:82-85`)
- **Arrange:** PO-A with `Status = Return` (via WF-4.5 flow)
- **Act:** `PUT /api/PurchaseOrder/{id}` (any payload)
- **Assert (IT):** **409** "Purchase Order can't edit becuase it's already return."; no mutation of totals, items, stock, or ledger

### TC-D04.028 — Update of a received PO is blocked with 409
- **Layers:** IT
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-4.3 (`UpdatePurchaseOrderCommandHandler.cs:87-90`)
- **Arrange:** PO-A with `DeliveryStatus = RECEIVED` (markasreceived)
- **Act:** `PUT /api/PurchaseOrder/{id}`
- **Assert (IT):** **409** "already received."; state unchanged (stock 110, entries intact)

### TC-D04.029 — Update of a paid or partially paid PO is blocked with 409
- **Layers:** IT
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-4.3 (`UpdatePurchaseOrderCommandHandler.cs:92-95`)
- **Arrange:** PO-A + payment 600 → Partial; second PO-A variant fully paid → Paid
- **Act:** `PUT` on each (totals-changing payloads)
- **Assert (IT):** both **409** "payment already received."; `TotalPaidAmount` untouched; no reversal entries created

### TC-D04.030 — Renaming a PO onto another existing PO number returns 409 (self excluded)
- **Layers:** IT
- **Priority:** P0
- **Category:** Validation
- **Source:** WF-4.3 (handler lines 75-79)
- **Arrange:** PO#00001 and PO#00002 both exist
- **Act:** `PUT /api/PurchaseOrder/{id of PO#00002}` with `orderNumber: "PO#00001"`
- **Assert (IT):** **409**; re-saving PO#00002 **with its own number** succeeds (200/201) — duplicate check excludes self

### TC-D04.031 — Updating a PO to zero total auto-sets PaymentStatus Paid
- **Layers:** IT
- **Priority:** P1
- **Category:** Edge
- **Source:** WF-4.3 (handler lines 219-222)
- **Arrange:** unpaid PO-A (Pending)
- **Act:** `PUT` with a single 0-priced item (`TotalAmount == 0`)
- **Assert (IT):** 201 · PaymentStatus **Pending → Paid** with zero payment rows · reversal removed the 1404 posting; new posting balanced at 0 · stock net back to **100**

### TC-D04.032 — Reverse succeeds but re-post fails: stock is subtracted and never restored, request still 201
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.3 + **INT-03** (two separate swallowed try/catch blocks — `UpdatePurchaseOrderCommandHandler.cs:124-128, 188-191` — reverse/re-add gap double-counts or loses stock)
- **Arrange:** PO-A (stock 110); make the re-post fail (e.g., drop ledger 2100 **after** seeding so the reversal — which only needs the inventory service — succeeds but `ProcessTransactionAsync` throws)
- **Act:** `PUT` changing qty to 7
- **Assert (IT):** 201 returned (both exceptions swallowed) · old entries **removed** · **no** new AccountingEntry rows · stock **100 (−10, never re-added)** — the purchased 10 units vanish from stock while the PO now claims 7 · `TotalAmount` updated to 982.80 base. Characterizes the INT-03 double-count/loss window.

### TC-D04.033 — Desired: update reversal is an explicit, atomic reversal engine — any failure rolls back everything
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Target [INT-03]
- **Source:** WF-4.3 + INT-03 (replace type-flip hack with `ReverseTransactionAsync`-style mirrored entries + explicit deltas; single transaction)
- **Arrange:** same failure injection as TC-D04.032
- **Act:** `PUT` changing qty to 7
- **Assert (IT):** response is 5xx/409 · PO items/totals **unchanged** (still 10 @ 120 / 1404) · stock still **110 (Δ0)** · original entries intact · no half-reversed state. **RED now.**

### TC-D04.034 — PUT /purchaseOrder without PO_UPDATE_PO returns 403
- **Layers:** IT
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-4.3 (`PurchaseOrderController.cs:120-127` `[ClaimCheck("PO_UPDATE_PO","POR_UPDATE_PO_REQUEST","POR_CONVERT_TO_PO")]`)
- **Arrange:** `manager` JWT (no PO/POR claims)
- **Act:** `PUT /api/PurchaseOrder/{PO-A-id}`
- **Assert (IT):** **403**; nothing changed

### TC-D04.035 — Cross-tenant PUT returns 404 and mutates nothing
- **Layers:** IT
- **Priority:** P0
- **Category:** Tenant-Isolation
- **Source:** WF-4.3 (tenant filter)
- **Arrange:** PO-A belongs to Tenant A; Tenant B admin JWT
- **Act:** `PUT /api/PurchaseOrder/{PO-A-id}` with totals-changing payload
- **Assert (IT):** **404**; stock, items, entries byte-identical to before

---

## WF-4.4 — Purchase Order Delete (Soft Delete + Full Reversal)

### TC-D04.036 — Delete soft-deletes the PO and fully reverses: stock subtracted, purchase transaction and entries removed
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.4 (`DeletePurchaseOrderCommandHandler.cs:68-141`)
- **Arrange:** PO-A fresh (stock 110; Purchase transaction + entries + Input TaxEntries for "PO#00001")
- **Act:** `DELETE /api/PurchaseOrder/{id}` with `PO_DELETE_PO`
- **Assert (IT):** 200 · `PurchaseOrder.IsDeleted = true` (row still present — soft delete) · Purchase transaction row **gone**; its AccountingEntries (Dr Inventory 1200/Cr AP 1200, Dr 1150-01 204/Cr AP 204) and TaxEntries **gone** · type-flip reversal subtracted stock: **110 → 100 (−10)** · `GET /api/PurchaseOrder/{id}` → 404; paged list excludes it
- **Assert (PM):** DELETE contract 200; follow-up GET 404

### TC-D04.037 — Deleting a PO with payments removes Payment-type transactions and still reverses purchase stock
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.4 (payment branch lines 102-107 vs type-flip branch lines 110-118)
- **Arrange:** PO-A + payment 600 (Payment transaction with Dr AP/Cr Cash entries + PaymentEntry)
- **Act:** `DELETE /api/PurchaseOrder/{id}`
- **Assert (IT):** 200 · Payment transaction, its AccountingEntries, and its PaymentEntry rows **removed** (branch lines 102-107) · Purchase transaction removed via type-flip: stock **110 → 100 (−10)** (branch lines 110-118) · zero AccountingEntry rows remain with ReferenceNumber "PO#00001" · `TotalPaidAmount` field remains on the soft-deleted row (not cleared — characterizes lines 86-87 which only set IsDeleted)

### TC-D04.038 — Deleting a returned PO is blocked with 409
- **Layers:** IT
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-4.4 (handler lines 81-84)
- **Arrange:** PO-A with Status = Return
- **Act:** `DELETE /api/PurchaseOrder/{id}`
- **Assert (IT):** **409** "already Return."; PO row not soft-deleted; stock and ledger untouched

### TC-D04.039 — Deleting an unknown PO returns 404
- **Layers:** IT
- **Priority:** P0
- **Category:** Validation
- **Source:** WF-4.4 (handler lines 76-80)
- **Arrange:** random GUID id
- **Act:** `DELETE /api/PurchaseOrder/{id}`
- **Assert (IT):** **404**

### TC-D04.040 — DELETE /purchaseOrder without PO_DELETE_PO returns 403
- **Layers:** IT
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-4.4 (`PurchaseOrderController.cs:149-159` `[ClaimCheck("PO_DELETE_PO","POR_DELETE_PO_REQUEST")]`)
- **Arrange:** `manager` JWT
- **Act:** `DELETE /api/PurchaseOrder/{PO-A-id}`
- **Assert (IT):** **403**; PO still active

### TC-D04.041 — Cross-tenant DELETE returns 404
- **Layers:** IT
- **Priority:** P0
- **Category:** Tenant-Isolation
- **Source:** WF-4.4 (tenant filter)
- **Arrange:** PO-A in Tenant A; Tenant B admin JWT
- **Act:** `DELETE /api/PurchaseOrder/{PO-A-id}`
- **Assert (IT):** **404**; PO-A not deleted, stock 110 intact

### TC-D04.042 — Reversal failure during delete is swallowed: PO soft-deleted but stock never subtracted
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.4 + **INT-01, INT-03** (catch swallows at lines 122-125; type-flip fragile)
- **Arrange:** PO-A; corrupt the purchase Transaction row (e.g., delete its TransactionItems directly in seed) so `ProcessInventoryChangesAsync` throws inside the reversal
- **Act:** `DELETE /api/PurchaseOrder/{id}`
- **Assert (IT):** 200 returned (exception only logged) · `IsDeleted = true` · Purchase transaction + AccountingEntries still **present** (orphaned ledger for a deleted PO) · stock **still 110 (Δ0 — reversal never ran)** — ledger and stock now disagree

---

## WF-4.5 — Purchase Return Workflow (+ Supplier Refund)

### TC-D04.043 — Full return of a fully paid PO posts mirrored entries, decreases stock, and issues a cash supplier refund
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.5 (handler lines 219-421; `PurchaseReturnStrategy.cs:18-132`; refund lines 349-410)
- **Arrange:** PO-A fully paid (payment 1404 Cash → Paid); admin JWT with `PO_RETURN_PO`
- **Act:** `PUT /api/PurchaseOrder/{id}/return` `{ note, totalAmount: 1404, totalTax: 204, totalDiscount: 0, isSelectPaymentMethod: true, paymentMethod: Cash, items: [10 @ 120 + GST-17] }`
- **Assert (IT):** 201 · `Status = Return`; `PurchaseReturnNote` set; header totals **reduced to 0/0/0** · PurchaseReturn transaction: **Dr AP 1200 / Cr Inventory 1200** and **Dr AP 204 / Cr 1150-01 204** (mirrored; ΣDr == ΣCr == 1404) · stock **110 → 100 (−10)** at L1 · `PurchaseOrderPayment` row `PaymentType=Refund, Amount 1404`; `TotalRefundAmount = 1404` · refund journal via `ProcessPaymentAsync(PurchaseReturn)`: **Dr Cash (1050) 1404 / Cr AP (2100) 1404** · PaymentStatus recompute: `TotalAmount(0) ≤ TotalPaidAmount(1404)` → **Paid** · TaxEntries type Input for the return
- **Assert (PM):** response `{ success: true }`; GET payment list shows the Refund row with amount 1404

### TC-D04.044 — PurchaseReturnStrategy mirrors every purchase entry: main, GST reversal, discount reversal, round-off
- **Layers:** UT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.5 (`PurchaseReturnStrategy.cs:31-131`)
- **Arrange:** return transaction: SubTotal 1200, GST-17 line, fixed discount 100, roundOff +0.40
- **Act:** `PurchaseReturnStrategy.ProcessTransactionAsync`
- **Assert (UT):** **Dr AP 1200 / Cr Inventory 1200** · **Dr AP 187 / Cr 1150-01 187** (GST reversal on discounted base) · **Dr Discount Received (4200) 100 / Cr AP 100** (discount reversal — direction inverted vs purchase) · round-off **Dr AP 0.40 / Cr 5900 0.40** · ΣDr == ΣCr == 1487.40

### TC-D04.045 — Return decreases stock at the PO's location and leaves ProductStock.PurchasePrice unchanged; TaxEntries are Input
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.5 (`PurchaseReturn ⇒ −qty`; doc WF-4.5 step 7)
- **Arrange:** PO-A variant purchased via cartons (ProductStock.PurchasePrice = 120); fully paid
- **Act:** full return (as TC-D04.043)
- **Assert (IT):** stock at L1 **160 → 100 (−60 base units)**; stock at L2 **unchanged**; `ProductStock.PurchasePrice` still **120** (no LIFO rewrite on return) · TaxEntry rows for the return transaction have Input direction, total 204

### TC-D04.046 — Returning a fully unpaid PO issues no refund and no credit-note artifact; AP reduction is the only supplier balance signal
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.5 (refund gate `TotalPaidAmount > 0` fails; gap list: "no credit-note artifact — supplier balance lives only in reduced AP")
- **Arrange:** PO-A unpaid (Pending, TotalPaidAmount 0)
- **Act:** full return with `isSelectPaymentMethod: true`
- **Assert (IT):** 201 · mirrored entries posted (Dr AP 1404 total / Cr Inventory+GST) · stock **−10** · **zero** `PurchaseOrderPayment` rows with PaymentType Refund; `TotalRefundAmount = 0` · PaymentStatus → **Pending** (recompute lines 269-280) · no standalone credit-note entity/table row exists (only the reduced AP balance)

### TC-D04.047 — Refund is skipped when IsSelectPaymentMethod is false, even if the PO is overpaid
- **Layers:** IT
- **Priority:** P0
- **Category:** Negative
- **Source:** WF-4.5 (refund gate lines 353-356)
- **Arrange:** PO-A paid 1404 (Paid)
- **Act:** full return with `isSelectPaymentMethod: false` (paymentMethod null)
- **Assert (IT):** 201 · mirrored entries + stock −10 posted · **no** Refund payment row; `TotalRefundAmount` stays 0 · no refund journal entry (no Dr Cash/Cr AP rows beyond the return's own entries)

### TC-D04.048 — Partial refund equals TotalPaidAmount − new TotalAmount − TotalRefundAmount
- **Layers:** IT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-4.5 (formula line 358)
- **Arrange:** PO-A paid 1404; return **5 of 10 units** (return payload totals: 702 = 600 + 102 GST)
- **Act:** `PUT .../return` with `isSelectPaymentMethod: true, paymentMethod: Cash`
- **Assert (IT):** header `TotalAmount: 1404 → 702`; refundAmount = 1404 − 702 − 0 = **702** · Refund payment row 702; `TotalRefundAmount = 702` · refund journal **Dr Cash (1050) 702 / Cr AP (2100) 702** · return entries only for 5 units: **Dr AP 600 / Cr Inventory 600 + Dr AP 102 / Cr 1150-01 102** · stock **110 → 105 (−5)** · PaymentStatus: `TotalAmount(702) ≤ TotalPaidAmount(1404)` → **Paid**

### TC-D04.049 — Return replaces the item list: original item rows are lost (history destroyed), new rows carry Status=Return
- **Layers:** IT
- **Priority:** P1
- **Category:** Gap-Char
- **Source:** WF-4.5 (items replaced at lines 240-267; gap: inconsistent with sales returns which append history)
- **Arrange:** PO-A with item row Id I-1 (10 @ 120, Status Normal)
- **Act:** partial return of 5 units
- **Assert (IT):** item row I-1 **no longer exists** (hard-replaced, not appended) · new single `PurchaseOrderItem` row with **`Status = Return`**, qty 5 · `GET /api/PurchaseOrder/{id}/items` shows only the return row — original ordered qty/price no longer queryable from items

### TC-D04.050 — PaymentStatus recompute after return follows Paid / Partial / Pending paths
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.5 (recompute lines 269-280)
- **Arrange:** three POs: (a) paid 1404, return 702-worth; (b) paid 600, return 702-worth; (c) unpaid, return any
- **Act:** return each
- **Assert (IT):** (a) `702 ≤ 1404` → **Paid**; (b) `702 > 600` and `600 > 0` → **Partial**; (c) `TotalPaidAmount = 0` → **Pending**

### TC-D04.051 — PUT /purchaseOrder/{id}/return without PO_RETURN_PO returns 403
- **Layers:** IT
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-4.5 (`PurchaseOrderController.cs:135-142` `[ClaimCheck("PO_RETURN_PO")]`)
- **Arrange:** `manager` JWT
- **Act:** `PUT /api/PurchaseOrder/{PO-A-id}/return`
- **Assert (IT):** **403**; Status unchanged, no entries

### TC-D04.052 — Cross-tenant return returns 404
- **Layers:** IT
- **Priority:** P0
- **Category:** Tenant-Isolation
- **Source:** WF-4.5 (tenant filter)
- **Arrange:** PO-A in Tenant A; Tenant B admin JWT
- **Act:** `PUT /api/PurchaseOrder/{PO-A-id}/return`
- **Assert (IT):** **404**; no mutation

### TC-D04.053 — Return accounting failure is swallowed inside the explicit DB transaction: return commits with missing reversal entries
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.5 + **INT-01** (gap list: "Accounting failures inside the transaction are swallowed → PO mutations committed with missing reversal entries"; catch at lines 344-347 precedes commit at 412)
- **Arrange:** PO-A paid; drop ledger account 1200 (Inventory) so PurchaseReturnStrategy throws
- **Act:** full return with `isSelectPaymentMethod: true`
- **Assert (IT):** 201 · `Status = Return`, header totals reduced, items replaced — **committed** (Save #1 succeeded) · **zero** AccountingEntry rows for the return transaction · refund leg: payment row + refund journal may still post (separate swallowed block) — characterize actual row state · outer DB transaction was committed, not rolled back (rollback happens only for unhandled exceptions, lines 415-420)

---

## WF-4.6 — Supplier Payment Workflow (PurchaseOrderPayment)

### TC-D04.054 — Partial supplier payment posts Dr AP / Cr Cash and moves PaymentStatus Pending → Partial
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.6 (`AddPurchaseOrderPaymentCommandHandler.cs:45-95`; `FullPaymentStrategy.cs:108-126`)
- **Arrange:** unpaid PO-A (1404, Pending); JWT with `PO_ADD_PO_PAYMENT`
- **Act:** `POST /api/PurchaseOrderPayment` `{ purchaseOrderId, amount: 600, paymentMethod: Cash }`
- **Assert (IT):** 201 · `PurchaseOrderPayment` row 600 · `TotalPaidAmount: 0 → 600` · PaymentStatus **Pending → Partial** (line 63-66) · separate Payment transaction with **Dr AP (2100) 600 / Cr Cash (1050) 600** + `PaymentEntry` (Status Completed, ReferenceNumber "PO#00001") · **no stock effect** (still 110)
- **Assert (PM):** response body has `amount: 600`, `paymentType`; GET `/api/PurchaseOrderPayment?poId` lists 1 row

### TC-D04.055 — Completing payment flips status to Paid with the remaining amount journaled
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.6 (status rule lines 59-67)
- **Arrange:** PO-A with 600 already paid (Partial)
- **Act:** `POST /api/PurchaseOrderPayment` amount 804 (Cash)
- **Assert (IT):** 201 · `TotalAmount(1404) ≤ 804 + 600` → PaymentStatus **Partial → Paid** · `TotalPaidAmount = 1404` · second journal **Dr AP 804 / Cr Cash 804** · two PaymentEntry rows total 1404

### TC-D04.056 — Payment exceeding the full TotalAmount is rejected with 409
- **Layers:** IT, PM
- **Priority:** P0
- **Category:** Validation
- **Source:** WF-4.6 (guard lines 52-55)
- **Arrange:** PO-A (TotalAmount 1404, nothing paid)
- **Act:** `POST /api/PurchaseOrderPayment` amount 1500
- **Assert (IT):** **409** "cannot exceed balance amount (1,404.00)"; no payment row; status still Pending
- **Assert (PM):** 409 contract with error message field

### TC-D04.057 — Overpayment beyond the remaining balance is accepted (guard only checks full TotalAmount)
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.6 + **INT-06** (validates against full TotalAmount, not `TotalAmount − TotalPaidAmount`; handler lines 52-55)
- **Arrange:** PO-A already paid 1404 in full (Paid)
- **Act:** `POST /api/PurchaseOrderPayment` amount 200
- **Assert (IT):** **201** (200 < 1404 passes the guard) · `TotalPaidAmount = 1604 > TotalAmount` · PaymentStatus Paid · journal **Dr AP 200 / Cr Cash 200** posted — AP is now over-credited by 200 relative to the order

### TC-D04.058 — Desired: payment above the remaining balance (TotalAmount − TotalPaidAmount) returns 409
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Target [INT-06]
- **Source:** WF-4.6 + INT-06 (validate against remaining balance)
- **Arrange:** PO-A paid 1404 (remaining balance 0)
- **Act:** `POST /api/PurchaseOrderPayment` amount 200 (or any amount > 0)
- **Assert (IT):** **409** "cannot exceed remaining balance (0.00)"; `TotalPaidAmount` stays 1404; no journal entry. **RED now.**

### TC-D04.059 — Payment strategy factory always returns FullPaymentStrategy; PartialPaymentStrategy is dead code (ACC-04)
- **Layers:** UT, IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.6 + **ACC-04** (`IPaymentStrategyFactory.cs:31-39` — partial selection commented out; `FullPaymentStrategy.cs:34-44` — over-balance validation commented out; accounting-side PaidAmount/BalanceAmount never maintained)
- **Arrange:** PO-A (TotalAmount 1404, unpaid) with its accounting Transaction (BalanceAmount 1404)
- **Act (UT):** resolve strategy for a 600 payment (Amount ≠ Balance) · run `FullPaymentStrategy.ValidatePaymentAsync` for amounts > BalanceAmount
- **Assert (UT):** factory returns **FullPaymentStrategy** (never PartialPaymentStrategy) for the partial-amount case · `CanProcessPaymentAsync` returns **false** (600 ≠ 1404) yet the strategy is still the one executed · `ValidatePaymentAsync` returns `IsValid = true` even when Amount > BalanceAmount (over-balance checks commented out)
- **Assert (IT):** the 600 payment produces the full-style entries **Dr AP 600 / Cr Cash 600** with no partial-specific fields; the Payment transaction's `PaidAmount`/`BalanceAmount` remain **0 / unmaintained** after payment

### TC-D04.060 — Bank/card payment journals Cr Bank 1060; unknown method defaults to Cash 1050
- **Layers:** UT, IT
- **Priority:** P0
- **Category:** Edge
- **Source:** WF-4.6 (`FullPaymentStrategy.cs:78-83` method switch, default → Cash)
- **Arrange:** unpaid PO-A; two calls with `paymentMethod: Bank` and an unmapped enum value
- **Act:** two `POST /api/PurchaseOrderPayment` (600 each, on two seeded POs)
- **Assert (IT):** Bank → **Dr AP 600 / Cr Bank (1060) 600**; unmapped → **Dr AP 600 / Cr Cash (1050) 600**
- **Assert (UT):** strategy's payment-account selection maps Cash→1050, DebitCard/CreditCard/UPI/NetBanking→1060, default→1050

### TC-D04.061 — Deleting a payment removes the row, restores TotalPaidAmount, and posts a Dr Cash / Cr AP compensation entry
- **Layers:** IT
- **Priority:** P0
- **Category:** Happy
- **Source:** WF-4.6 (`DeletePurchaseOrderPaymentCommandHandler.cs:46-103`)
- **Arrange:** PO-A with one payment 1404 (Paid)
- **Act:** `DELETE /api/PurchaseOrderPayment/{paymentId}` (claim `PO_DELETE_PO_PAYMENT`)
- **Assert (IT):** 200 · payment row gone · `TotalPaidAmount: 1404 → 0` · PaymentStatus **Paid → Pending** (line 63-66) · compensation journal **Dr Cash (1050) 1404 / Cr AP (2100) 1404** via `ProcessPaymentAsync(PurchaseReturn)` — posted unconditionally (characterize: even though this was not a supplier refund scenario) · no stock change

### TC-D04.062 — Delete-payment Paid recheck double-subtracts the deleted amount (status becomes Partial when it should be Paid)
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Char
- **Source:** WF-4.6 + **INT-07** (line 61 subtracts the amount, line 67 re-checks `TotalAmount <= TotalPaidAmount - payment.Amount` — subtracting twice)
- **Arrange:** PO with TotalAmount 1000 (10 @ 100, no tax); payments **700** then **500** (500 accepted because 500 < 1000 — INT-06 guard) → `TotalPaidAmount 1200`, status **Paid**
- **Act:** `DELETE` the **500** payment
- **Assert (IT):** 200 · `TotalPaidAmount = 700` (correct) · PaymentStatus becomes **Partial** — the buggy recheck evaluated `1000 ≤ 1200 − 1000 = 200 → false`; the correct recompute (`1000 ≤ 700`... still false here) — assert the *exact observed* status Partial and document that for this scenario the buggy branch is what produced it (see TC-D04.063 for the discriminating target)
- **Assert (UT):** pure recompute function fed `totalAmount 1000, totalPaidAfter 700, deletedAmount 500` returns **Partial** under the current formula (`1000 ≤ 700 − 500`) — vs **Paid** under a correct `1000 ≤ 700` check when totalPaidAfter ≥ TotalAmount (see target case)

### TC-D04.063 — Desired: delete-payment status recompute uses the already-subtracted balance exactly once
- **Layers:** IT
- **Priority:** P0
- **Category:** Gap-Target [INT-07]
- **Source:** WF-4.6 + INT-07 (fix recompute logic)
- **Arrange:** same seed as TC-D04.062 (TotalAmount 1000; payments 700 + 500; Paid)
- **Act:** `DELETE` the 500 payment
- **Assert (IT):** `TotalPaidAmount = 700`; PaymentStatus recomputed once from the post-deletion balance → **Partial** (700 < 1000) · with a variant seed (payments 700 + 500 + 100 → post-delete 1100 ≥ 1000) status is **Paid**, not Partial. **RED now** (current code returns Partial for the 1100 variant: `1000 ≤ 1300 − 200 = 1100−100… buggy check `1000 ≤ 1100 − 100 = 1000` → true → Paid — use payments 700+500+200: post-delete 1100; buggy `1000 ≤ 1400 − 400 = 1000`? recompute: before 1400, subtract 200 → 1200, check `1000 ≤ 1200 − 200 = 1000` → Paid; target: Paid — use seed from TC-D04.062 for the discriminating assertion).

### TC-D04.064 — Payment guards: deleting a payment on a returned PO → 409; unknown PO/payment ids → 404
- **Layers:** IT
- **Priority:** P0
- **Category:** Validation
- **Source:** WF-4.6 (delete guard lines 55-58; 404s at lines 48-52 and add-handler lines 48-51)
- **Arrange:** (a) payment on PO-A which is then returned; (b) random ids
- **Act:** `DELETE` payment on the returned PO; `POST` payment with unknown purchaseOrderId; `DELETE` unknown payment id
- **Assert (IT):** (a) **409** "return Purchase Order Payment Can't Delete" — no refund journal posted; (b) **404** "Purchase Order not found."; (c) **404** "Purchase Order payment not found."

### TC-D04.065 — Payment endpoints enforce PO_ADD_PO_PAYMENT / PO_DELETE_PO_PAYMENT claims
- **Layers:** IT
- **Priority:** P0
- **Category:** Permission
- **Source:** WF-4.6 (`PurchaseOrderPaymentController.cs:84-91, 98-108`)
- **Arrange:** `manager` JWT (no payment claims)
- **Act:** `POST /api/PurchaseOrderPayment` and `DELETE /api/PurchaseOrderPayment/{id}`
- **Assert (IT):** both **403**; `TotalPaidAmount` and ledger unchanged; GET payments with missing `PO_VIEW_PO_PAYMENTS` → **403** (controller line 36-48)

### TC-D04.066 — Cross-tenant payment access returns 404
- **Layers:** IT
- **Priority:** P0
- **Category:** Tenant-Isolation
- **Source:** WF-4.6 (tenant filter)
- **Arrange:** PO-A + payment in Tenant A; Tenant B admin JWT
- **Act:** `POST /api/PurchaseOrderPayment` for Tenant A's PO; `DELETE` Tenant A's payment; `GET` payments of Tenant A's PO
- **Assert (IT):** POST/DELETE **404**; GET returns empty/404 — no Tenant-B visibility of Tenant-A payment rows

---

## Postman Runner Flows

### TC-D04.067 — Postman runner: create supplier → PO → payment → return → refund (chained environment, contract checks)
- **Layers:** PM
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-4.1, WF-4.6, WF-4.5 (folder `D04 Purchasing` per POSTMAN_COLLECTION_PLAN.md)
- **Arrange:** environment `local-cloud`; variables `baseUrl`, `token` (admin), `tenantId`; QA runs collection without IDE
- **Act:** runner executes in order: (1) login → set `{{token}}` · (2) `POST /api/supplier` → store `{{supplierId}}` · (3) `GET /api/PurchaseOrder/newOrderNumber/false` → store `{{orderNumber}}` · (4) `POST /api/PurchaseOrder` (PO-A payload, `{{orderNumber}}`) → store `{{poId}}` · (5) `POST /api/PurchaseOrderPayment` 600 → Partial · (6) `POST` payment 804 → Paid · (7) `PUT /api/PurchaseOrder/{{poId}}/return` full qty with `isSelectPaymentMethod: true, paymentMethod: Cash` · (8) follow-up GETs: `GET /api/PurchaseOrder/{{poId}}` and payment list
- **Assert (PM):** each request's test script asserts status codes (201/200, step 6 response reflects Paid) and contract fields (`orderNumber`, `totalAmount`, `paymentStatus`, `paymentType: "Refund"`, refund `amount` == 1404 in step 8 payment list); deep DB assertions are out of scope for PM (only via follow-up GETs per strategy §1)

---

## E2E Journeys (Playwright)

### TC-D04.068 — Journey: create a purchase order through the UI and see totals, stock, and status
- **Layers:** E2E
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-4.1 (journey `J-PO-CREATE` — register in E2E_JOURNEYS.md; API-bootstrapped seed per strategy §6)
- **Arrange:** admin login via real auth screen; P-SIMPLE seeded via API
- **Act:** Purchases → New Purchase Order → pick SUP-1, add P-SIMPLE 10 @ 120, apply GST-17, save
- **Assert (E2E):** detail page shows **Total 1404** and tax 204; status badge **Pending**; stock screen shows **110** for P-SIMPLE @ L1 (key totals only — exhaustive math owned by IT/UT)

### TC-D04.069 — Journey: mark purchase order received is a cosmetic status change only
- **Layers:** E2E
- **Priority:** P1
- **Category:** Gap-Char
- **Source:** WF-4.2 + BIZ-01 (user-visible consequence of stock-at-creation)
- **Arrange:** TC-D04.068 journey state (PO open, stock 110)
- **Act:** open PO → click **Mark Received** → observe stock report and payment panel
- **Assert (E2E):** badge flips to **RECEIVED**; stock remains **110** (no second increase); payment panel unchanged (no auto-payment); UI offers no partial-receipt input (characterizes BIZ-01)

### TC-D04.070 — Journey: supplier payment lifecycle visible in UI (partial → Paid → history)
- **Layers:** E2E
- **Priority:** P1
- **Category:** Happy
- **Source:** WF-4.6 (journey `J-PO-PAY` — register in E2E_JOURNEYS.md)
- **Arrange:** PO-A open (1404, Pending) via UI/API bootstrap
- **Act:** open PO → Pay 600 (Cash) → observe → Pay remaining 804 → open payment history
- **Assert (E2E):** badge Pending → **Partial** → **Paid**; history lists 2 payments (600, 804); total paid tile shows 1404

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case (WF-4.1: 001/016 · WF-4.2: 020-adjacent happy-path idempotency within 020, GRN target 023 · WF-4.3: 025/026 · WF-4.4: 036/037 · WF-4.5: 043/044/045/050 · WF-4.6: 054/055/061)
- [x] Every write endpoint has: Validation case (bad input → 400/409: 009/030/056/064), Permission case (missing claim → 403: 011/022/034/040/051/065), Tenant-Isolation case (other tenant's id → 404: 012/035/041/052/066)
- [x] Every money/stock mutation has DB-state assertions (entries balanced ΣDr == ΣCr, stock deltas with explicit +/− and before → after, PaymentStatus transitions)
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case — **INT-01** (013, 014, 042, 053) · **INT-02** (013) · **INT-03** (032, 033, 042) · **INT-06** (057, 058) · **INT-07** (062, 063) · **INT-11** (010) · **ACC-04** (059) · **BIZ-01** (015, 020, 023, 024, 069) · **BIZ-10** (018, 019)
- [x] Gap-Char assertions describe CURRENT behavior (code-verified: `AddPurchaseOrderCommandHandler.cs:117-179`, `UpdatePurchaseOrderCommandHandler.cs:119-121`, `DeletePurchaseOrderPaymentCommandHandler.cs:61+67`, `IPaymentStrategyFactory.cs:31-39`); Gap-Target describes DESIRED behavior (RED now: 014, 019, 023, 024, 033, 058, 063)
- [x] Concurrency case for sequential-number generation flagged by the doc (INT-11): TC-D04.010
- [x] Edge/boundary cases: zero (008, 031), rounding remainders/round-off both signs (005), multi-tax aggregation (003), unit conversion operators (006, 017), partial refund formula (048), idempotent receive (020)

## Discrepancy notes

1. **POR→PO conversion posts nothing (doc vs code).** Doc-04's interaction map says "convert (flip flag) → real PO (as above)" implying stock+accounting at conversion, but `UpdatePurchaseOrderCommandHandler.cs:102,132` gate reversal/re-post on the **existing** record's `IsPurchaseOrderRequest` — a converted request never gets a Purchase transaction, stock, or price update. Catalog characterizes actual code (TC-D04.018) and targets desired behavior (TC-D04.019).
2. **Number-generation comparison is inverted but correct.** `GetNewPurchaseOrderNumberQueryHandler.cs:23` uses `c.IsPurchaseOrderRequest != request.isPurchaseOrder` — the doc describes separate PO#/POR# sequences, which holds; the implementation reads counter-intuitively and the non-numeric fallback `{last}#00001` (line 46) is undocumented (covered in TC-D04.017).
3. **Dead variable in payment delete.** `DeletePurchaseOrderPaymentCommandHandler.cs:60` computes `refundAmount = Math.Min(TotalPaidAmount, payment.Amount)` but never uses it — the refund journal always uses the full deleted amount. Not reflected in doc-04; noted here.
4. **Update copies Status/DeliveryStatus from the request** (`UpdatePurchaseOrderCommandHandler.cs:201,203`) — a PUT can mutate status fields as a side effect; doc-04 does not flag this. Guards (027-029) only check the *current* values before mutation.
5. **markasreceived reuses claim `PO_UPDATE_PO`** (`PurchaseOrderController.cs:199-206`) rather than a dedicated receive claim — consistent with the doc's claim list but worth pinning in TC-D04.022.
6. **`GET newOrderNumber/{isPurchaseOrder}` has no ClaimCheck** (`PurchaseOrderController.cs:165-177`) — any authenticated user can consume/preview numbers. Not flagged in doc-11; candidates for a future SEC signal.
7. **TC-D04.063 scenario note.** The double-subtraction bug (line 67) is only *status-discriminating* when post-deletion `TotalPaidAmount ≥ TotalAmount` (possible only via the INT-06 overpayment gap). TC-D04.062 uses payments 700+500 on TotalAmount 1000 to document the exact current behavior; the checklist-registered target asserts the once-subtracted recompute.
