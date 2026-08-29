# TC-D03 — POS & Sales Test Cases

**Source:** `New-Documents/03_POS_Sales_Workflows.md` (WF-3.1 … WF-3.7) + `New-Documents/11_Workflow_Gaps_Enhancement_Signals.md`.
**Code spot-verified (2026-08-28):** `SourceCode/SQLAPI/POS.MediatR/SalesOrder/Add/AddSalesOrderCommandHandler.cs`, `SalesOrder/Update/UpdateSalesOrderCommandHandler.cs`, `SalesOrder/Update/UpdateSalesOrderCommandReturnHandler.cs`, `SalesOrder/Delete/DeleteSalesOrderCommandHandler.cs`, `SalesOrder/Get/GetNewSalesOrderNumberQueryHandler.cs`, `POS.MediatR/SalesOrderPayment/Handler/AddSalesOrderPaymentCommandHandler.cs` + `DeleteSalesOrderPaymentCommandHandler.cs`, `POS.MediatR/Accouting/Strategies/SaleStrategy.cs`, `SaleReturnStrategy.cs`, `FullPaymentStrategy.cs`, `POS.Repository/UnitConversation/UnitConversationRepository.cs`, `POS.MediatR/Accouting/Services/AccountingService.cs`, `POS.API/Controllers/SalesOrder/SalesOrderController.cs`, `POS.API/Controllers/SalesOrderPayment/SalesOrderPaymentController.cs`, `Angular/src/app/pos/pos.component.ts`, `Angular/src/app/shared/pipes/quantities-unitprice-tax.pipe.ts`, `quantities-unitprice-return.pipe.ts`, `Angular/src/app/sales-order/sales-order-calculation.service.ts`, `sales-order-add-edit/sales-order-add-edit.component.ts`.

**Scope:** POS terminal checkout, sales order create/update/delete, quotations (SOR), request→order conversion, sales returns with refunds, sales payments — the money path.

**Workflows covered:** WF-3.1, WF-3.2, WF-3.3, WF-3.4, WF-3.5, WF-3.6, WF-3.7.

**Gap signals referenced:** INT-01, INT-02, INT-03, INT-04, INT-06, INT-11, S-01…S-12, UX-02, BIZ-05, BIZ-06, BIZ-08, ACC-03, ACC-04, ACC-06 (SEC-01 & INT-05 are D05-owned — see Discrepancy notes).

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed) with locations **L1** (POS, not FBR), **L2**, **L-FBR** (`IsFBREnabled=true`, `AutoSubmitInvoices=true`); Tenant B (isolation checks)
- Users: `admin` (all claims, unrestricted `LocationIds`), `manager` (back-office SO claims, no POS), `cashier` (`POS_POS` only, unrestricted), `cashier-l1` (`POS_POS` with **restricted** `LocationIds=[L1]`), `none` (authenticated, no SO/POS claims)
- Products (Tenant A):
  - **P-A**: salesPrice 100.00, purchasePrice 60.00 @ L1 / 55.00 @ L2, tax GST-17 (17%, output account **2150-01**); stock L1 = 100, L2 = 40
  - **P-B**: salesPrice 50.00, purchasePrice 30.00, **no tax**; stock L1 = 100
  - **P-M**: salesPrice 200.00, purchasePrice 100.00, taxes GST-17 (2150-01) **+** PST-5 (5%, output **2150-02**); stock L1 = 50
  - **P-U**: salesPrice 100.00, base unit **PC**, purchasePrice 60.00; child unit **DZ** (parent PC, operator ×, value 12); child unit **GM100** (parent PC, operator ÷, value 100); stock L1 = 120
- Customers: `C-WALK` (walk-in), `C-REG`. Open FinancialYear **FY2026**
- Chart of Accounts: AR **1100**, Cash **1050**, Bank **1060**, Inventory **1200**, Sales **4100**, COGS **5100**, GST-Out **2150** (children 2150-01/2150-02), Discount Given **5200**, RoundOff **5900**
- Canonical orders: **SO-1** POS cash sale 2 × P-A @ 100 + GST 17% (TotalAmount 234.00, Paid, TotalPaidAmount 234.00); **SO-2** credit sale, same math (Pending); **SO-3** unpaid non-POS order 2 × P-A @ 100 (Pending)

**Canonical journal math (recompute independently in tests — never copy production formulas):**

| Scenario | SubTotal | Discount | Tax | TotalAmount (floored) | RoundOff | COGS |
|---|---|---|---|---|---|---|
| S1: 2×P-A @100, GST 17% | 200.00 | 0 | 34.00 | 234.00 | 0 | 120.00 |
| S-D: 2×P-A @100, line fixed disc 10, flat 5 | 200.00 | 15.00 | 32.30 | 217.00 | 0.30 | 120.00 |
| S-P: 2×P-A @100, line 10% disc | 200.00 | 20.00 | 30.60 | 210.00 | 0.60 | 120.00 |
| M1: 1×P-M @200 (GST 17 + PST 5) | 200.00 | 0 | 44.00 (34+10) | 244.00 | 0 | 100.00 |

---

## WF-3.1 — POS Screen Checkout Workflow (client math & UI)

### TC-D03.001 — Barcode scan adds product; repeat scan increments quantity; variant auto-adds all children
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.1 (`Angular/src/app/pos/pos.component.ts:299-403`)
- **Arrange:** POS screen loaded (resolver data: units + taxes); P-A barcode "PA-123" matches exactly 1 product; P-VARIANT has 3 children
- **Act:** (1) type "PA-123" in barcode field (fires after 500 ms debounce); (2) scan same barcode again; (3) scan P-VARIANT parent barcode
- **Assert:** after (1) cart has 1 row productId=P-A, quantity=1, unitPrice=100.00, barcode field cleared, scan sound `playSound()` invoked; after (2) still 1 row, quantity=2 (`pos.component.ts:304-309`); after (3) cart gains exactly 3 rows (one per child, deep-cloned), each quantity=1

### TC-D03.002 — Add-item defaults: unitPrice=salesPrice, taxPercentage=Σ product tax percentages, discountType fixed
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.1 (`pos.component.ts:326-349`)
- **Arrange:** P-M (GST-17 17% + PST-5 5%) in product drawer
- **Act:** select P-M from drawer (`onProductSelect`)
- **Assert:** new FormGroup values exactly: unitPrice=200.00, quantity=1, discountPercentage=0, discountType='fixed', taxValue=[GST-17-id, PST-5-id], taxPercentage=**22** (sum, not compounded), unitId=P-M base unit

### TC-D03.003 — Per-item tax is sequential flat addition of each tax on the discounted base (never compounded)
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.1 step 5 (`Angular/src/app/shared/pipes/quantities-unitprice-tax.pipe.ts:59-79`)
- **Arrange:** taxes [GST-17 (17%), PST-5 (5%)]; item qty=1, unitPrice=200.00, taxIds=[GST-17, PST-5], no discount
- **Act:** run `quantitiesunitpriceTax` pipe (5-arg form) and the line-total pipe
- **Assert:** per-tax amounts GST = 200×0.17 = **34.00**, PST = 200×0.05 = **10.00** (PST computed on 200, **not** on 234 — a compounded 11.70 must NOT appear); totalTax = **44.00**; line grand total = **244.00**; single-tax item qty 2 × 100 @ 17% → tax **34.00**, line total **234.00**

### TC-D03.004 — Line discount math (fixed vs percentage) and discount validator floor
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.1 (`quantities-unitprice-tax.pipe.ts:80-89`, `pos.component.ts:339` Validators.min(0))
- **Arrange:** item qty=2, unitPrice=100.00
- **Act/Assert:** discountType 'fixed', discountPercentage=10 → discount amount **10.00**, line total (200−10)×1.17 = **222.30**; discountType 'percent', discountPercentage=10 → discount **20.00**, line total **210.60**; discountPercentage=0 → valid, discount 0.00; discountPercentage=−5 → FormGroup **invalid** (`min(0)`)

### TC-D03.005 — Flat discount adds to totalDiscount and subtracts from grand total
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.1 step 5 (`pos.component.ts:499-502`)
- **Arrange:** cart = 2 × P-A @100 with line fixed discount 10; flatDiscount=5
- **Act:** `getAllTotal()`
- **Assert:** totalDiscount = item 10.00 + flat 5.00 = **15.00**; grandTotal = 222.30 − 5 = **217.30**; totalTax = **32.30** (tax on discounted line base 190; flat discount not re-applied per line)

### TC-D03.006 — Grand total floored, remainder becomes totalRoundOff
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.1 step 5 (`sales-order-add-edit.component.ts:475-484`, `sales-order-calculation.service.ts:85-86`)
- **Arrange:** computed grandTotal 217.30 (inputs from TC-D03.005)
- **Act:** run floor/round-off split (`totalRoundOff = total − floor(total); totalAmount = floor(total)`)
- **Assert:** totalAmount = **217**, totalRoundOff = **0.30**; exact case 234.00 → totalAmount 234, roundOff **0**; .99 case → remainder **0.99** (never negative, never ≥ 1)

### TC-D03.007 — Unit operator Plus applies correctly to salesPrice
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.1 step 4 (`pos.component.ts:268-297`, `Operators.Plush` line 277)
- **Arrange:** cart row for P-A (salesPrice 100.00); unit "BONUS+50" (operator +, value 50)
- **Act:** `onSelectionChange(unitId, index)`
- **Assert:** row unitPrice patched to **150.00** = (100 ?? 0) + 50

### TC-D03.008 — Unit operators × − ÷ leave a defined salesPrice unchanged (`??` precedence bug)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [UX-02 / S-03]
- **Source:** WF-3.1 step 4 ⚠BUG (`pos.component.ts:280-286`); doc-11 UX-02, S-03
- **Arrange:** cart row for P-A, salesPrice **defined** = 100.00; units: "DOZEN" (×, value 12), "LESS5" (−, value 5), "HALF" (÷, value 2)
- **Act:** `onSelectionChange` once per unit, reading patched unitPrice each time
- **Assert (current behavior):** DOZEN → **100.00** (not 1200); LESS5 → **100.00** (not 95); HALF → **100.00** (not 50). `product?.salesPrice ?? 0 * 12` binds `??` after the arithmetic, so the defined price short-circuits the operator. Guards the bug against accidental change during refactors.

### TC-D03.009 — Unit operators apply correct arithmetic to a defined price (post-fix)
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Target [UX-02 / S-03]
- **Source:** doc-11 UX-02 enhancement ("Fix expression")
- **Arrange:** same as TC-D03.008
- **Act:** `onSelectionChange` per unit
- **Assert (desired):** DOZEN → **1200.00**, LESS5 → **95.00**, HALF → **50.00**, Plus(+50) → **150.00**. **RED until the UX-02 fix lands.**

### TC-D03.010 — Typing a target line total back-solves unitPrice (fixed and percentage types)
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.1 step 5 (`pos.component.ts:245-266`)
- **Arrange:** row qty=2, taxPercentage=17
- **Act/Assert:** discountType 'fixed', discountPercentage=10, type total=222.30 → unitPrice = (222.30/1.17 + 10)/2 = **100.00**; discountType 'percent', discountPercentage=10, type total=210.60 → unitPrice = 210.60/(1.17×0.90)/2 = **100.00**; recompute forward via pipe — round-trip line total equals the typed target (± 0.01)

### TC-D03.011 — Multi-item aggregation across mixed taxed/untaxed lines
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.1 step 5 (`pos.component.ts:428-504`)
- **Arrange:** cart = 2 × P-A @100 (GST 17) + 3 × P-B @50 (no tax)
- **Act:** `getAllTotal()`
- **Assert:** totalBeforeDiscount = **350.00**; totalTax = **34.00**; totalDiscount = **0.00**; grandTotal = **384.00**; row `total` controls patched to **234.00** / **150.00**

### TC-D03.012 — Client-computed totals are persisted as-is; ledger diverges from order totals
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Gap-Char [S-01 / INT-04]
- **Source:** WF-3.1/3.2 ⚠GAPS (`AddSalesOrderCommandHandler.cs:75-100,218-229`); doc-11 S-01, INT-04
- **Arrange:** cashier JWT; P-A stock 100 @ L1; craft `POST /api/SalesOrder` with true item math (2×P-A @100, GST-17) but header `totalAmount: 999`, `isPOSScreenOrder:true`, `paymentMethod:1 (Cash)`
- **Act:** POST /api/SalesOrder
- **Assert (current behavior):** **201** (no server-side recalculation) · DB `SalesOrder.TotalAmount == 999.00` while same-OrderNumber `Transaction.TotalAmount == 234.00` (server recomputes floor(200−0+34) from items) — divergent figures coexist · auto-payment uses the **client** number: `SalesOrderPayment.Amount == 999.00`, `TotalPaidAmount == 999.00`, `PaymentStatus == Paid`, payment entry **Dr Cash 1050 / Cr AR 1100 = 999.00**. Guards the client-trusted-money gap.

### TC-D03.013 — E2E POS checkout journey: scan → cart → checkout → receipt → reset keeps walk-in + location
- **Layers:** E2E
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.1 steps 1–6 (`pos.component.ts:595-717`)
- **Arrange:** Playwright: login as cashier, route /pos; P-A stock 100 @ L1; walk-in customer + location L1 preselected
- **Act:** scan "PA-123" twice (quantity 2, cart total 234.00); click Checkout; then scan unknown barcode "XXX"
- **Assert:** success toast · `SalesOrderInvoiceComponent` receipt rendered with order number pattern `SO#` + 5 digits and total **234.00** · form reset: cart empty, orderNumber re-fetched (new value), customerId still walk-in, locationId still L1 (`resetFormForNewOrder`, `pos.component.ts:689-717`) · unknown barcode → warning toast, cart unchanged · follow-up `GET /productStock` P-A @ L1 = **98**

### TC-D03.014 — E2E Stock alert dialog "process anyway" saves the sale and drives stock negative
- **Layers:** E2E
- **Priority:** P0   **Category:** Gap-Char [S-04]
- **Source:** WF-3.1 step 6.2 (`pos.component.ts:613-660`); doc-11 S-04
- **Arrange:** P-A stock @ L1 = **1**; cashier on /pos
- **Act:** add 3 × P-A, checkout → `ProductStockAlertDailogComponent` opens listing P-A (stock 1, required 3); click **"process anyway"**
- **Assert (current behavior):** dialog closes, order **saved** (toast + receipt, total **351.00** for 3×100 + 17%) · `GET /productStock` P-A @ L1 = **−2** (no hard floor, negative allowed) · no blocking error. Guards the negative-stock confirmation gap.

### TC-D03.015 — E2E Receipt is rendered client-side; no server-rendered invoice/PDF call
- **Layers:** E2E
- **Priority:** P3   **Category:** Gap-Char [S-11]
- **Source:** WF-3.1 step 6.4; doc-11 S-11
- **Arrange:** route /pos with Playwright network instrumentation
- **Act:** complete one cash sale (TC-D03.013 flow)
- **Assert (current behavior):** receipt rendered from the `getSalesOrderById` response by `SalesOrderInvoiceComponent`; network log shows **zero** requests to any invoice/PDF/print endpoint during receipt render — the invoice exists only client-side, with no archival. Guards the render-architecture gap.

---

## WF-3.2 — Sales Order Create (Backend)

### TC-D03.016 — POST /salesOrder end-to-end: exact journal, balanced entries, stock delta, TaxEntry, auto-payment
- **Layers:** UT · IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.2 (`AddSalesOrderCommandHandler.cs:66-232`, `SaleStrategy.cs:18-160`, `AccountingService.cs:63-122`)
- **Arrange:** cashier JWT; P-A stock 100 @ L1 (purchasePrice 60.00); GST-17 output child 2150-01; open FY2026
- **Act:** `POST /api/SalesOrder` `{orderNumber:"SO#90001", locationId:L1, customerId:C-WALK, deliveryStatus:Delivered, paymentMethod:1 (Cash), isPOSScreenOrder:true, isSalesOrderRequest:false, totalAmount:234, flatDiscount:0, totalRoundOff:0, items:[{productId:P-A, unitId:PC, quantity:2, unitPrice:100, discountType:'fixed', discountPercentage:0, taxes:[GST-17]}]}`
- **Assert (IT):** **201** + DTO · DB `SalesOrder`: PaymentStatus=**Paid**, TotalAmount=234.00, TotalTax=34.00 · `Transaction` (TransactionType=**Sale**, Narration "Sales Order", ReferenceNumber "SO#90001") with `TransactionItem` baseQty=2 / basePrice=100 · AccountingEntry rows exactly: **Dr AR 1100 / Cr Sales 4100 = 200.00** (SubTotal) · **Dr AR 1100 / Cr 2150-01 = 34.00** (output GST) · **Dr COGS 5100 / Cr Inventory 1200 = 120.00** (2 × 60 snapshot) · **no** Discount or RoundOff entries (DiscountAmount=0, RoundOffAmount=0) · ΣDr == ΣCr == 354.00 for this transaction · `TaxEntry`: 1 Output row, amount 34.00 · `ProductStock(P-A, L1).CurrentStock == 98` (−2) · auto-payment: `SalesOrderPayment` Amount **234.00** Cash, `TransactionType=Payment` transaction with **Dr Cash 1050 / Cr AR 1100 = 234.00** + `PaymentEntry` row 234.00; SO-level `TotalPaidAmount == 234.00`
- **Assert (UT):** SaleStrategy given a transaction with the S1 numbers returns exactly the three entry pairs above with those amounts and entry types (Regular/Tax/Inventory)
- **Assert (PM):** response body has id/orderNumber/totalAmount=234; follow-up `GET /api/SalesOrder/{id}` reflects PaymentStatus "Paid"

### TC-D03.017 — PurchasePrice snapshot stamped per location; COGS basis follows the selling location
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.2 step 5 (`AddSalesOrderCommandHandler.cs:133-147`)
- **Arrange:** P-A stock: L1 purchasePrice 60.00, L2 purchasePrice 55.00
- **Act:** two POSTs: order A @ L1 (2×P-A), order B @ L2 (2×P-A), both non-POS
- **Assert:** order A items `PurchasePrice == 60.00`, its Sale transaction COGS entry **Dr 5100 / Cr 1200 = 120.00**; order B items `PurchasePrice == 55.00`, COGS entry **Dr 5100 / Cr 1200 = 110.00**; L2 stock 40 → **38**

### TC-D03.018 — Duplicate OrderNumber rejected with 409
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.2 step 1 (`AddSalesOrderCommandHandler.cs:69-73`)
- **Arrange:** existing order with OrderNumber "SO#90001" (from TC-D03.016)
- **Act:** `POST /api/SalesOrder` with `orderNumber:"SO#90001"` (any valid body)
- **Assert:** **409** with message exactly `"Sales Order Number is already Exists."` · no new SalesOrder row · no Transaction/stock change

### TC-D03.019 — Order-number generation race: parallel creates with the same fetched number → one 201, one 409, retry wins
- **Layers:** IT
- **Priority:** P0   **Category:** Concurrency · Gap-Char [INT-11 / S-08]
- **Source:** WF-3.2 ⚠GAPS (`GetNewSalesOrderNumberQueryHandler.cs:25`, `AddSalesOrderCommandHandler.cs:69-73`); doc-11 INT-11, S-08
- **Arrange:** two POS clients both call `GET /api/SalesOrder/newOrderNumber/false` → both receive "SO#90005"
- **Act:** fire both `POST /api/SalesOrder` with orderNumber "SO#90005" in parallel
- **Assert (current behavior):** exactly one **201** and one **409** (`"Sales Order Number is already Exists."`) — 409 is the only safety net · losing client re-fetches → `GET newOrderNumber/false` returns "SO#90006" → retry POST → **201**. Characterizes the latest-row-derived sequence race.

### TC-D03.020 — Sequence-based numbering: parallel creates both succeed with distinct consecutive numbers (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Concurrency · Gap-Target [INT-11 / S-08]
- **Source:** doc-11 INT-11 enhancement direction ("Sequence table / DB sequence / retry helper")
- **Arrange:** same as TC-D03.019 after the numbering enhancement lands
- **Act:** two parallel POSTs using concurrently-fetched numbers
- **Assert (desired):** both **201**, order numbers distinct and strictly increasing (e.g., SO#90005 / SO#90006), zero 409s, exactly 2 order rows. **RED until the INT-11 fix lands.**

### TC-D03.021 — Number sequences: SO# and SOR# are separate; next-number derivation incl. format quirk
- **Layers:** UT · IT · PM
- **Priority:** P1   **Category:** Edge
- **Source:** WF-3.5 step 2 (`GetNewSalesOrderNumberQueryHandler.cs:23-51`, `SalesOrderController.cs:195-204`)
- **Arrange:** fresh tenant (no orders)
- **Act/Assert:** `GET /api/SalesOrder/newOrderNumber/false` → `{"orderNumber":"SO#00001"}`; `/true` → `"SOR#00001"` · after creating SO#00001: next `/false` = **"SO#00002"**; after creating SOR#00001: next `/true` = **"SOR#00002"** (SO count does not advance the SOR sequence and vice-versa) · format quirk (characterized, `GetNewSalesOrderNumberQueryHandler.cs:39-50`): with latest order "SO#00009", next = **"SO#000010"** (width drift — `Replace("9","")` strips the digit); with latest "SO#00011", next = "SO#00012" · endpoint requires only `[Authorize]` — **no claim** (any authenticated user may fetch)

### TC-D03.022 — Sales-person anti-spoofing: restricted user's attribution forced; unrestricted admin may attribute on behalf
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.2 step 3 (`AddSalesOrderCommandHandler.cs:79-89`)
- **Arrange:** `cashier-l1` JWT (restricted `LocationIds=[L1]`)
- **Act:** POST /api/SalesOrder with `salesPersonId: <admin's user id>`
- **Assert:** **201** · DB `SalesOrder.SalesPersonId == cashier-l1's id` (spoofed id ignored, forced to token user) · repeat as `admin` (unrestricted) with `salesPersonId: <cashier's id>` → stored `SalesPersonId == cashier's id` (on-behalf attribution permitted)

### TC-D03.023 — FBR staging fields queued only for FBR-enabled locations; nothing submitted from this flow
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [S-12]
- **Source:** WF-3.2 step 4 (`AddSalesOrderCommandHandler.cs:103-124`); doc-11 S-12
- **Arrange:** location **L-FBR** (`IsFBREnabled=true`, `AutoSubmitInvoices=true`); plain L1 for control
- **Act:** POST to L-FBR with `buyerNTN:"1234567"`, `buyerCNIC:"34567-8901234-1"`, `buyerPhoneNumber:"0300-123"`, `buyerAddress:"Karachi"`, `buyerName:""`, `saleType:""`; control POST to L1
- **Assert (current behavior):** L-FBR order: `FBRStatus == Queued`, `BuyerNTN == "1234567"`, `BuyerCNIC == "34567-8901234-1"`, `BuyerName == "Walk-in Customer"` (empty → default), `SaleType == "Retail"` (empty → default) · **no** FBR submission dispatched by this endpoint (staging only; submission/retry is WF-9.1's job) · L1 control order: FBR fields all null. Characterizes the staging-only gap.

### TC-D03.024 — POS auto-payment for non-credit methods settles in full at checkout
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.2 step 7 (`AddSalesOrderCommandHandler.cs:218-230`)
- **Arrange:** cashier JWT; S1 payload with `paymentMethod: 1 (Cash)`
- **Act:** POST /api/SalesOrder (isPOSScreenOrder=true)
- **Assert:** single `SalesOrderPayment` row: Amount **234.00**, PaymentMethod Cash, PaymentType Payment (not Refund) · `TotalPaidAmount == 234.00`, `PaymentStatus == Paid` · `TransactionType=Payment` transaction with **Dr Cash 1050 / Cr AR 1100 = 234.00** · `GET /api/SalesOrderPayment/{orderId}` returns exactly 1 payment

### TC-D03.025 — POS credit sale: no auto-payment, stays Pending on AR
- **Layers:** IT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-3.2 step 7 (`AddSalesOrderCommandHandler.cs:218` — `!= ACCPaymentMethod.Credit`)
- **Arrange:** S1 payload with `paymentMethod: Credit`
- **Act:** POST /api/SalesOrder (isPOSScreenOrder=true)
- **Assert:** **201** · zero `SalesOrderPayment` rows for the order · `PaymentStatus == Pending`, `TotalPaidAmount == 0.00` · sale entries posted (Dr AR 1100/Cr Sales 4100 = 200.00 etc.), stock 98 · no Dr Cash entry anywhere for this OrderNumber (receivable outstanding)

### TC-D03.026 — Free order (TotalAmount 0) auto-settles to Paid without a payment row
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-3.2 step 2 (`AddSalesOrderCommandHandler.cs:97-100`)
- **Arrange:** non-POS payload (`isPOSScreenOrder:false`), 1 × P-B @ 50 with line fixed discount 50 → TotalAmount 0
- **Act:** POST /api/SalesOrder
- **Assert:** `PaymentStatus == Paid` at creation · zero `SalesOrderPayment` rows (no payment dispatch for non-POS) · sale entries: **Dr AR 1100 / Cr Sales 4100 = 50.00**, **Dr Discount 5200 / Cr Sales 4100 = 50.00**, **Dr COGS 5100 / Cr Inventory 1200 = 30.00**

### TC-D03.027 — Multi-tax sale posts one output entry per tax child (no collapse)
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.2 step 6 + SaleStrategy GST loop (`SaleStrategy.cs:48-94`)
- **Arrange:** P-M (GST-17 + PST-5) stock 50 @ L1
- **Act:** POST 1 × P-M @ 200, POS cash
- **Assert:** AccountingEntry rows for the Sale transaction: Dr 1100/Cr 4100 = 200.00 · **Dr 1100/Cr 2150-01 = 34.00** · **Dr 1100/Cr 2150-02 = 10.00** (two distinct tax-child entries, not one merged 44.00) · Dr 5100/Cr 1200 = 100.00 · payment Dr 1050/Cr 1100 = 244.00 · ΣDr == ΣCr == 588.00 · TaxEntry: 2 Output rows (34.00, 10.00) · stock P-M 50 → **49**, TotalAmount 244.00

### TC-D03.028 — Percentage-discount sale books discount as Dr Discount/Cr Sales (AR stays gross — documented quirk)
- **Layers:** UT · IT
- **Priority:** P0   **Category:** Gap-Char [ACC-03]
- **Source:** WF-3.2 SaleStrategy quirk (`SaleStrategy.cs:123-138`); doc-11 ACC-03
- **Arrange:** S-P payload (2×P-A @100, line 10% discount), POS cash
- **Act:** POST /api/SalesOrder
- **Assert (current behavior):** entries exactly: Dr 1100/Cr 4100 = **200.00** (gross SubTotal — not 180) · Dr 1100/Cr 2150-01 = 30.60 · Dr 5100/Cr 1200 = 120.00 · **Dr Discount Given 5200 / Cr Sales 4100 = 20.00** (credits Sales, *not* AR) · round-off **Dr 1100 / Cr 5900 = 0.60** · payment Dr 1050/Cr 1100 = 210.00 · consequence asserted: cumulative AR movement over sale+round-off+payment (200 + 30.60 + 0.60 − 210) = **21.20 ≠ 0** although the order is fully settled — AR ≠ TotalAmount by design. Guards the ACC-03 model.

### TC-D03.029 — Discount booked against AR so AR nets to zero on settled orders (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [ACC-03]
- **Source:** doc-11 ACC-03 enhancement ("Book discount against AR (or document the model)")
- **Arrange:** same as TC-D03.028, post-fix
- **Act:** POST + full cash settlement
- **Assert (desired):** discount entry **Dr 5200 / Cr 1100 = 20.00**; cumulative AR movement over sale+payment entries = **0.00** for the settled order; Sales 4100 credit total 180.00 (net of discount). **RED until the ACC-03 fix lands.**

### TC-D03.030 — Negative RoundOffAmount posts Dr RoundOff / Cr AR
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-3.2 SaleStrategy round-off (`SaleStrategy.cs:141-159`)
- **Arrange:** API-crafted payload: 2 × P-B @ 50 (no tax), `totalRoundOff: -0.50`, non-POS
- **Act:** POST /api/SalesOrder
- **Assert:** round-off entry **Dr RoundOff 5900 / Cr AR 1100 = 0.50** (abs amount; direction flipped vs the positive case) · round-off narration is `"Round Off on Sale Return - Sales Order"` (current swapped string — see TC-D03.073 / ACC-06) · no other round-off entries

### TC-D03.031 — Server converts child units to base via operator (× and ÷): qty×price invariant, stock deducted in base units
- **Layers:** UT · IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.2 step 6 (`AddSalesOrderCommandHandler.cs:170`, `UnitConversationRepository.cs:19-65`)
- **Arrange:** P-U stock 120 PC @ L1; units DZ (×12), GM100 (÷100)
- **Act:** POST non-POS order, items: `{unitId:DZ, quantity:1, unitPrice:1200}` and `{unitId:GM100, quantity:200, unitPrice:0.50}`
- **Assert (UT):** `GetBaseUnitValuesAsync(DZ, 1, 1200)` → baseQuantity **12**, baseUnitPrice **100.00**; `GetBaseUnitValuesAsync(GM100, 200, 0.50)` → baseQuantity **2**, baseUnitPrice **50.00**
- **Assert (IT):** **201** · Sale transaction SubTotal = 12×100 + 2×50 = **1300.00** · TotalAmount **1300.00** · COGS entry **Dr 5100 / Cr 1200 = 820.00** (12×60 + 2×60) · stock P-U 120 → **106** (−12 −2, base units) · PaymentStatus Pending (non-POS, no payment)

### TC-D03.032 — Accounting failure is swallowed: order survives 201 with no ledger entries and no stock movement
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-01 / S-02]
- **Source:** WF-3.2 step 6 ⚠GAPS (`AddSalesOrderCommandHandler.cs:155-215`); doc-11 INT-01, S-02 (also INT-02 flavor)
- **Arrange:** factory variant of Tenant A whose Chart of Accounts is seeded **without** the Sales account 4100 (SaleStrategy throws `InvalidOperationException`)
- **Act:** POST /api/SalesOrder (S1 payload, POS cash)
- **Assert (current behavior):** **201** — the exception in `ProcessTransactionAsync` is logged and swallowed · `SalesOrder` row exists (TotalAmount 234.00) · **zero** `Transaction`/`AccountingEntry`/`TaxEntry` rows with ReferenceNumber "SO#…" · `ProductStock(P-A, L1)` still **100** (no deduction) · zero `SalesOrderPayment` rows (payment dispatch was attempted only for non-credit — but no order accounting; payment leg asserts separately in TC-D03.035). Guards the non-atomic pipeline gap.

### TC-D03.033 — Atomic pipeline: accounting/stock failure fails the request and persists nothing (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-01 / S-02]
- **Source:** doc-11 INT-01 enhancement ("Wrap each business-event pipeline in a single DB transaction; fail the request when the ledger/stock leg fails")
- **Arrange:** same as TC-D03.032 post-fix
- **Act:** POST /api/SalesOrder (S1 payload)
- **Assert (desired):** **500** (or equivalent failure) · zero `SalesOrder` rows for the attempted OrderNumber · stock unchanged 100 · zero ledger rows · no payment rows. **RED until the INT-01 fix lands.**

### TC-D03.034 — Stock is deducted at order creation even when DeliveryStatus is PENDING
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [S-09 / BIZ-06]
- **Source:** WF-3.2 ⚠GAPS ("Stock deducted at order creation even for undelivered orders"); doc-11 S-09, BIZ-06
- **Arrange:** S1 payload with `deliveryStatus: PENDING`, non-POS (credit)
- **Act:** POST /api/SalesOrder
- **Assert (current behavior):** **201** · `ProductStock(P-A, L1) == 98` although nothing was delivered · no delivery/GRN-equivalent artifact exists to later reverse or complete the movement. Characterizes deduct-on-order semantics.

### TC-D03.035 — Stock is deducted on delivery, not at order creation (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [BIZ-06 / S-09]
- **Source:** doc-11 BIZ-06 enhancement ("Configurable deduct-on (order vs delivery); delivery lines")
- **Arrange:** same as TC-D03.034 post-fix (deduct-on-delivery mode)
- **Act:** POST order (PENDING) → then mark delivered (`PUT /api/SalesOrder/{id}/markasdelivered`)
- **Assert (desired):** after POST: stock still **100**, no COGS entries · after markasdelivered: stock **98**, Sale entries + COGS posted once. **RED until the BIZ-06 fix lands.**

### TC-D03.036 — POST /salesOrder without POS/order/request claims → 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-3.2 (`SalesOrderController.cs:136-143` — `ClaimCheck("SO_ADD_SO", "POS_POS", "SOR_ADD_SO_REQUEST")`)
- **Arrange:** `none` user JWT (authenticated, no SO/POS claims)
- **Act:** POST /api/SalesOrder (any valid body)
- **Assert:** **403** Forbidden · zero order rows created · zero stock/ledger changes

### TC-D03.037 — Tenant isolation: Tenant B cannot read, modify, or delete Tenant A's order
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-3.2/3.3/3.4 tenancy model (global tenant query filters)
- **Arrange:** Tenant A order SO-1 (id known to test); Tenant B admin JWT
- **Act:** from Tenant B: `GET /api/SalesOrder/{SO-1 id}`, `PUT /api/SalesOrder/{SO-1 id}`, `DELETE /api/SalesOrder/{SO-1 id}`, `PUT /api/SalesOrder/{SO-1 id}/return`
- **Assert:** all four → **404** (resource invisible cross-tenant) · SO-1 untouched (status, totals, entries, stock identical to pre-act snapshot)

### TC-D03.038 — Server recalculates totals and rejects client-mismatched money (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-04 / S-01]
- **Source:** doc-11 INT-04 enhancement ("Recompute totals server-side; reject or flag mismatches; verify stock before commit")
- **Arrange:** same crafted payload as TC-D03.012 (header totalAmount 999 vs true 234) post-fix
- **Act:** POST /api/SalesOrder
- **Assert (desired):** **400/409** (rejected) with server-computed total **234.00** surfaced in the error · no order row, no ledger rows, stock unchanged 100, no payment. **RED until the INT-04 fix lands.**

---

## WF-3.3 — Sales Order Update (Backend)

### TC-D03.039 — Update of unpaid order reverses old accounting (type-flip restores stock) and re-posts the new totals
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.3 steps 3–5 (`UpdateSalesOrderCommandHandler.cs:103-234`)
- **Arrange:** SO-3 (unpaid, non-POS, 2 × P-A @ 100, stock now 98, Sale transaction exists)
- **Act:** `PUT /api/SalesOrder/{SO-3 id}` changing quantity to 3 × P-A (totals 200→300, tax 34→51)
- **Assert:** **201** · old `Transaction` (ReferenceNumber SO-3) **deleted** with all children (TransactionItems, TaxEntries, AccountingEntries removed) · reversal leg ran with `TransactionType` flipped to **SaleReturn** → stock restored 98 → **100** · new Sale transaction posted: **Dr AR 1100 / Cr Sales 4100 = 300.00**, **Dr AR 1100 / Cr 2150-01 = 51.00**, **Dr COGS 5100 / Cr 1200 = 180.00**, ΣDr == ΣCr == 531.00 · stock re-deducted 100 → **97** · order row: new totals (300.00 / 51.00), items replaced (single item row qty 3, new CreatedDate) · `PaymentStatus` stays Pending

### TC-D03.040 — Update with unchanged totals performs no reversal and no re-post
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-3.3 step 3 guard (`UpdateSalesOrderCommandHandler.cs:105`)
- **Arrange:** SO-3 as above; PUT body with identical TotalAmount/TotalTax/TotalDiscount, only `note` changed
- **Act:** PUT /api/SalesOrder/{id}
- **Assert:** **201** · the existing Sale transaction still exists (same Transaction id, same entries, same TransactionItems) · stock unchanged at **98** · exactly one Sale transaction referencing the OrderNumber (no SaleReturn flip, no duplicates)

### TC-D03.041 — Update guard: Status == Return → 409
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.3 step 2 (`UpdateSalesOrderCommandHandler.cs:87-90`)
- **Arrange:** returned order (Status = Return, e.g., SO-1 after TC-D03.066)
- **Act:** PUT /api/SalesOrder/{returned id} (any body)
- **Assert:** **409** with message exactly `"Sales Order can't edit becuase it's already Return."` (sic) · order row, entries and stock unchanged

### TC-D03.042 — Update guard: DELIVERED non-request → 409
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.3 step 2 (`UpdateSalesOrderCommandHandler.cs:91-94`)
- **Arrange:** non-request order with `DeliveryStatus == DELIVERED` (e.g., SO-1)
- **Act:** PUT /api/SalesOrder/{id}
- **Assert:** **409** with message exactly `"Sales Order can't edit becuase it's already received."` (sic) · state unchanged · control: a request (`IsSalesOrderRequest=true`) with DELIVERED is NOT blocked by this guard

### TC-D03.043 — Update guard: PaymentStatus Partial → 409
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.3 step 2 (`UpdateSalesOrderCommandHandler.cs:96-99`)
- **Arrange:** order TotalAmount 234.00 with one manual payment 100.00 (`PaymentStatus == Partial`)
- **Act:** PUT /api/SalesOrder/{id}
- **Assert:** **409** with message exactly `"Sales Order can't edit becuase it's payment already received."` (sic) · TotalPaidAmount still 100.00, entries untouched

### TC-D03.044 — Update guard: PaymentStatus Paid → 409
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.3 step 2 (`UpdateSalesOrderCommandHandler.cs:96-99`)
- **Arrange:** SO-1 (POS cash, Paid)
- **Act:** PUT /api/SalesOrder/{SO-1 id}
- **Assert:** **409** `"Sales Order can't edit becuase it's payment already received."` (sic) — paid orders are immutable except via returns (WF-3.6)

### TC-D03.045 — Duplicate-number check on update excludes self
- **Layers:** IT
- **Priority:** P1   **Category:** Negative
- **Source:** WF-3.3 step 1 (`UpdateSalesOrderCommandHandler.cs:80-84`)
- **Arrange:** orders "SO#90001" and "SO#90002"
- **Act:** PUT /api/SalesOrder/{SO#90002's id} with `orderNumber: "SO#90001"` → then same PUT with `orderNumber: "SO#90002"` (own current number)
- **Assert:** first → **409** `"Sales Order Number is already Exists."` · second → **201** (self-collision allowed)

### TC-D03.046 — Update of a request (IsSalesOrderRequest) never touches accounting even when totals change
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.5 step 2 (`UpdateSalesOrderCommandHandler.cs:105,135` — `!IsSalesOrderRequest` guard)
- **Arrange:** SOR with items (no accounting exists); PUT changes TotalAmount
- **Act:** PUT /api/SalesOrder/{SOR id} with changed totals
- **Assert:** **201** · zero `Transaction` rows for the SOR OrderNumber before and after · stock unchanged (requests never deduct) · `PaymentStatus` recomputed per rules (Pending unless TotalAmount == 0)

### TC-D03.047 — Update to TotalAmount 0 marks the order Paid
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-3.3 step 6 (`UpdateSalesOrderCommandHandler.cs:225-228`)
- **Arrange:** SO-3 unpaid; PUT sets item quantity 0-equivalent totals (`totalAmount: 0`)
- **Act:** PUT /api/SalesOrder/{id}
- **Assert:** **201** · `PaymentStatus == Paid`, `TotalAmount == 0.00` · no payment row created by the update itself

### TC-D03.048 — Reversal succeeds but re-creation fails → both swallowed, stock restored without re-deduction (fragile half-state)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-03]
- **Source:** WF-3.3 ⚠GAPS (`UpdateSalesOrderCommandHandler.cs:103-132` vs `133-193` independent try/catch); doc-11 INT-03
- **Arrange:** SO-3 (stock 98); corrupt the ledger between the two legs (seed variant: remove Sales account 4100 **after** the initial order save, so the reversal leg succeeds and the re-creation leg throws)
- **Act:** PUT /api/SalesOrder/{SO-3 id} changing quantity 2 → 3
- **Assert (current behavior):** **201** — re-creation exception logged and swallowed · old Sale transaction **deleted**, stock restored 98 → **100** · **no new** Sale transaction/entries exist for the OrderNumber (re-post failed silently) · order row updated to totals 300.00 · final stock **100** (sale "lost": order says 300 collected-able but ledger + stock say nothing was sold). Characterizes the no-atomicity reversal gap.
- **Note:** the mirror failure (reversal throws, re-creation succeeds → stock double-counted) is covered by the same handler structure; assert in the same test with the roles of the legs inverted.

### TC-D03.049 — Explicit reversal engine: update pipeline atomic, failure leaves state unchanged (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-03]
- **Source:** doc-11 INT-03 enhancement ("Replace with an explicit reversal engine (ReverseTransactionAsync) writing mirrored entries + explicit stock deltas")
- **Arrange:** same as TC-D03.048 post-fix
- **Act:** PUT with the corrupted ledger
- **Assert (desired):** **500** (failed request) · old Sale transaction still intact with original entries · stock still **98** · order totals still 234.00 · no half-state. **RED until the INT-03 fix lands.**

---

## WF-3.4 — Sales Order Delete (Backend)

### TC-D03.050 — Delete unpaid order restores stock via type-flip and removes all order transactions
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.4 (`DeleteSalesOrderCommandHandler.cs:66-131`)
- **Arrange:** SO-3 (unpaid, stock 98 after its sale; one Sale transaction)
- **Act:** `DELETE /api/SalesOrder/{SO-3 id}` (claim `SO_DELETE_SO`)
- **Assert:** **200/success** · `SalesOrder` row gone (`GET /api/SalesOrder/{id}` → 404) · Sale transaction children removed (TransactionItems, TaxEntries, AccountingEntries) and transaction deleted · type-flip to **SaleReturn** ran `ProcessInventoryChangesAsync` → `ProductStock(P-A, L1)` back to **100** · zero rows in Transactions/AccountingEntries referencing "SO#…" for that order

### TC-D03.051 — Delete of a paid POS order removes both the Sale and the Payment transaction legs
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.4 step 2 (`DeleteSalesOrderCommandHandler.cs:95-116`)
- **Arrange:** SO-1 (POS cash, Paid): one Sale transaction + one Payment transaction with PaymentEntry
- **Act:** DELETE /api/SalesOrder/{SO-1 id}
- **Assert:** **200** · order gone · Payment-type transaction path: its AccountingEntries + PaymentEntries removed and transaction deleted (no stock side-effect from the payment leg) · Sale-type transaction path: type-flip restored stock 98 → **100** · `PaymentEntry` row (234.00) gone · `SalesOrderPayment` rows remain orphaned by design (order deleted first) — assert 0 `SalesOrder` rows and 0 `PaymentEntry` rows for the OrderNumber

### TC-D03.052 — Delete guard: Status == Return → 409
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.4 step 1 (`DeleteSalesOrderCommandHandler.cs:78-81`)
- **Arrange:** returned order (Status = Return)
- **Act:** DELETE /api/SalesOrder/{id}
- **Assert:** **409** with message exactly `"Sales Order can't delete becuase it's already Return."` (sic) · order and its return entries untouched

### TC-D03.053 — Delete unknown order → 404
- **Layers:** IT
- **Priority:** P2   **Category:** Negative
- **Source:** WF-3.4 step 1 (`DeleteSalesOrderCommandHandler.cs:73-77`)
- **Arrange:** random non-existent GUID
- **Act:** DELETE /api/SalesOrder/{guid}
- **Assert:** **404** · no state change

### TC-D03.054 — Delete without SO_DELETE_SO / SOR_DELETE_SO_REQUEST → 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-3.4 (`SalesOrderController.cs:179-189` — `ClaimCheck("SO_DELETE_SO", "SOR_DELETE_SO_REQUEST")`)
- **Arrange:** `none` user JWT; existing order
- **Act:** DELETE /api/SalesOrder/{id}
- **Assert:** **403** · order still exists, stock and ledger untouched

### TC-D03.055 — Tenant isolation: Tenant B delete of Tenant A order → 404
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-3.4 tenancy model (global tenant query filters)
- **Arrange:** Tenant A order SO-1; Tenant B admin JWT
- **Act:** DELETE /api/SalesOrder/{SO-1 id} from Tenant B
- **Assert:** **404** · SO-1 still exists with entries and stock intact

---

## WF-3.5 — Sales Order Request (Quotation) Workflow

### TC-D03.056 — Create request (IsSalesOrderRequest=true): no accounting, no stock movement, no auto-payment
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.5 steps 1–2 (`AddSalesOrderCommandHandler.cs:158`, `217-230`)
- **Arrange:** cashier JWT (claim `SOR_ADD_SO_REQUEST`); P-A stock 100 @ L1
- **Act:** POST /api/SalesOrder `{orderNumber:"SOR#90001", isSalesOrderRequest:true, isPOSScreenOrder:true, paymentMethod:1 (Cash), locationId:L1, items:[2×P-A @100 + GST-17], totalAmount:234}`
- **Assert:** **201** · **zero** `Transaction`/`AccountingEntry`/`TaxEntry` rows for "SOR#90001" · `ProductStock(P-A, L1)` still **100** (no deduction despite POS flag + Cash) · zero `SalesOrderPayment` rows (request branch skips auto-payment) · `PaymentStatus == Pending` (TotalAmount ≠ 0) · order row persisted with `IsSalesOrderRequest == true`

### TC-D03.057 — Update of a request leaves accounting untouched
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.5 step 2 (`UpdateSalesOrderCommandHandler.cs:105,135`)
- **Arrange:** SOR from TC-D03.056; PUT changes quantity 2 → 5 (totals change)
- **Assert:** **201** · still zero Transactions for "SOR#90001" (no reversal — none existed; no creation) · stock still **100** · items replaced

### TC-D03.058 — Request → order conversion creates a real SO with accounting + stock; original SOR row remains
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.5 step 3 (claim `SOR_CONVERT_TO_SO`, `SalesOrderController.cs:150-157`)
- **Arrange:** SOR "SOR#90001" (2 × P-A @ 100, Pending); user JWT holding `SOR_CONVERT_TO_SO`
- **Act:** `PUT /api/SalesOrder/{SOR id}` with `isSalesOrderRequest:false` (conversion — the loaded request is saved as a real order)
- **Assert:** **201** · order row now `IsSalesOrderRequest == false` (same id) · Sale transaction created: **Dr AR 1100 / Cr Sales 4100 = 200.00**, **Dr AR 1100 / Cr 2150-01 = 34.00**, **Dr COGS 5100 / Cr 1200 = 120.00**, ΣDr == ΣCr == 354.00 · `ProductStock(P-A, L1)` 100 → **98** (deduction happens at conversion) · numbering unchanged (still "SOR#90001" — conversion does not renumber)

### TC-D03.059 — PUT /salesOrder without any of SO_UPDATE_SO / SOR_UPDATE_SO_REQUEST / SOR_CONVERT_TO_SO → 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-3.3/3.5 (`SalesOrderController.cs:150-157` — `ClaimCheck("SO_UPDATE_SO", "SOR_UPDATE_SO_REQUEST", "SOR_CONVERT_TO_SO")`)
- **Arrange:** `none` user JWT; existing SO-3
- **Act:** PUT /api/SalesOrder/{SO-3 id}
- **Assert:** **403** · SO-3 state unchanged

### TC-D03.060 — Storefront checkout is a stub: success response but no order row
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [BIZ-05 / S-10]
- **Source:** WF-3.5 step 4 (`StoreController.cs:106-162`, `_mediator.Send` commented out 145-158); doc-11 BIZ-05, S-10
- **Arrange:** storefront guest cart payload (guest info, items)
- **Act:** POST storefront checkout endpoint
- **Assert (current behavior):** success-style response returned and cart cleared client-side · DB: **zero** new `SalesOrder` rows (guest info never persisted, `IsSalesOrderRequest=true` command never dispatched). Characterizes the incomplete storefront feature.

### TC-D03.061 — Storefront guest checkout creates an SOR with guest info (post-fix)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [BIZ-05]
- **Source:** doc-11 BIZ-05 enhancement ("Guest-order pipeline or customer self-registration")
- **Arrange:** storefront guest payload post-fix
- **Act:** POST storefront checkout
- **Assert (desired):** **201** · `SalesOrder` row with `IsSalesOrderRequest == true`, `DeliveryStatus == PENDING`, guest info in `Note` · no accounting/stock (still a request). **RED until the BIZ-05 fix lands.**

### TC-D03.062 — Requests are excluded from order lists/reports
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Happy
- **Source:** WF-3.5 step 2 (`SalesOrderRepository.cs:212` — `!IsSalesOrderRequest` filters)
- **Arrange:** one SO and one SOR for Tenant A
- **Act:** `GET /api/SalesOrder` (orders list, `isSalesOrderRequest` false by default); then `GET /api/SalesOrder?isSalesOrderRequest=true`
- **Assert:** first list: totalCount counts the SO only, SOR absent · second list: contains the SOR only · dashboard/report totals unchanged by SOR creation (no Transaction rows exist to aggregate)

---

## WF-3.6 — Sales Return Workflow (with Refund)

### TC-D03.063 — Return form validates per-item returnquantity max = originalQty − alreadyReturned
- **Layers:** UT
- **Priority:** P0   **Category:** Validation
- **Source:** WF-3.6 step 2 (`sale-order-return.component.ts:294-318` `Validators.max(originalQty − alreadyReturned)`)
- **Arrange:** SO-1 line: original qty 2, previously returned 0 → max 2; second scenario: already returned 1 → max 1
- **Act/Assert:** returnquantity = 2 → control valid (fresh order); returnquantity = 3 → **invalid** (max 2); order with 1 already returned: returnquantity = 1 → valid, 2 → **invalid**; original price/qty/tax controls are disabled (not editable)

### TC-D03.064 — GET {id}/returnItems sums previously returned quantities into ReturnItemsQuantities
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.6 step 1 (`GetSalesOrderWithReturnItemsCommand.cs:25-52`)
- **Arrange:** SO-1 with one prior return row (Status = Return, qty 1) alongside original row (qty 2)
- **Act:** `GET /api/SalesOrder/{id}/returnItems`
- **Assert:** **200** · item payload shows originalQuantity 2 and `ReturnItemsQuantities` = **1** (sum of Status==Return rows) → remaining returnable = 1

### TC-D03.065 — Return pipes pro-rate fixed line discounts across returned quantity
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.6 step 3 (`Angular/src/app/shared/pipes/quantities-unitprice-return.pipe.ts:59-67`)
- **Arrange:** original line: qty 2 @ 100, fixed discount 10, GST 17%; return 1 unit
- **Act:** run return pipe (discount pro-rate) + return tax pipe
- **Assert:** pro-rated discount portion = 10/2 × 1 = **5.00**; returned line base = 100 − 5 = **95.00**; tax = 95 × 0.17 = **16.15**; return total = **111.15** → floored **111**, roundOff **0.15**; percentage-discount control: 10% discount, return 1 → base 90.00, tax 15.30, total 105.30 (no pro-rate needed)

### TC-D03.066 — PUT return end-to-end on a paid cash sale: mirrored entries, restock, refund to customer
- **Layers:** UT · IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.6 steps 4–6 (`UpdateSalesOrderCommandReturnHandler.cs:71-264`, `SaleReturnStrategy.cs:18-164`)
- **Arrange:** SO-1 (POS cash, Paid, TotalAmount 234.00, TotalPaidAmount 234.00, stock 98)
- **Act:** `PUT /api/SalesOrder/{SO-1 id}/return` (claim `SO_RETURN_SO`) `{isSelectPaymentMethod:true, paymentMethod:Cash, note:"damaged", totalAmount:117, totalTax:17, flatDiscount:0, totalRoundOff:0, items:[{productId:P-A, quantity:1 (return qty), unitPrice:100, taxes:[GST-17], purchasePrice:60}]}`
- **Assert (IT):** **201** (body true) · header mutation: `Status == Return`, `SaleReturnNote == "damaged"`, `TotalAmount 234.00 → 117.00`, `TotalTax 34.00 → 17.00`, `TotalDiscount 0`, `FlatDiscount 0`, **`TotalRoundOff` unchanged** · item history: original qty-2 row untouched + new row `Status == Return`, qty 1 · `PaymentStatus` recompute: 117.00 ≤ 234.00 → **Paid** · SaleReturn transaction (TransactionType=**SaleReturn**, Narration "Sales Order item Return") entries exactly: **Dr Sales 4100 / Cr AR 1100 = 100.00** · **Dr 2150-01 / Cr AR 1100 = 17.00** · **Dr Inventory 1200 / Cr COGS 5100 = 60.00** · ΣDr == ΣCr == 177.00 · TaxEntry: 1 Output row 17.00 · restock: `ProductStock(P-A, L1)` 98 → **99** · refund leg: `remainingPayment = 117 − 234 + 0 = −117 < 0` → `SalesOrderPayment` row `PaymentType == Refund`, Amount **117.00**, `TotalRefundAmount == 117.00`, accounting **Dr AR 1100 / Cr Cash 1050 = 117.00**
- **Assert (UT):** SaleReturnStrategy given the return numbers returns exactly the three mirrored pairs above (and no round-off entry when RoundOffAmount == 0)
- **Assert (PM):** follow-up `GET /api/SalesOrder/{id}` shows Status "Return", TotalAmount 117; `GET /api/SalesOrderPayment/{id}` includes the Refund row

### TC-D03.067 — Full return of a partially-paid order refunds exactly the collected amount
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.6 step 6 (`UpdateSalesOrderCommandReturnHandler.cs:209-261`)
- **Arrange:** order TotalAmount 234.00, one manual payment 100.00 (Partial); return all 2 × P-A (return totals 234)
- **Act:** PUT /api/SalesOrder/{id}/return `{isSelectPaymentMethod:true, items:[2 × P-A]}`
- **Assert:** header `TotalAmount 234.00 → 0.00` · `PaymentStatus`: 0 ≤ 100 → **Paid** · refund: `refundAmount = 100 − 0 − 0 = 100.00` → `SalesOrderPayment` Refund row 100.00, `TotalRefundAmount == 100.00` · **Dr AR 1100 / Cr Cash 1050 = 100.00** · stock restored to pre-sale level (98 → 100 for 2 units)

### TC-D03.068 — Partial return on a partially-paid order with remaining ≥ 0: no refund, status Partial
- **Layers:** IT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-3.6 steps 4–6 (`UpdateSalesOrderCommandReturnHandler.cs:128-139,209-215`)
- **Arrange:** order TotalAmount 234.00, paid 100.00 (Partial); return 1 of 2 P-A (return totals 117)
- **Act:** PUT /api/SalesOrder/{id}/return `{isSelectPaymentMethod:true, items:[1 × P-A]}`
- **Assert:** header TotalAmount → **117.00** · recompute: 117 ≤ 100? no; 100 > 0 → **Partial** · `remainingPayment = 117 − 100 + 0 = 17 ≥ 0` → refund branch not entered: zero Refund rows, `TotalRefundAmount == 0.00`, no Dr AR/Cr Cash entry · stock 98 → 99, mirrored sale-return entries posted

### TC-D03.069 — Return on a credit (unpaid) sale: mirrored entries + restock, no refund, stays Pending
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.6 step 6 ⚠GAPS (third bullet — unpaid-return semantics)
- **Arrange:** SO-2 (credit, Pending, TotalPaidAmount 0, stock 98)
- **Act:** PUT /api/SalesOrder/{SO-2 id}/return with 1 × P-A, `isSelectPaymentMethod:true` (client auto-set true only when paidAmount>0 — force it true here via API)
- **Assert:** **201** · mirrored entries posted (Dr 4100/Cr 1100 = 100.00; Dr 2150-01/Cr 1100 = 17.00; Dr 1200/Cr 5100 = 60.00) · stock 98 → 99 · **no refund**: guard `TotalPaidAmount > 0` fails → zero Refund rows, zero Dr AR/Cr Cash entries · `PaymentStatus` recompute: TotalAmount 117 > 0 paid → **Pending**

### TC-D03.070 — Refund suppressed when isSelectPaymentMethod=false despite money collected
- **Layers:** IT
- **Priority:** P1   **Category:** Negative
- **Source:** WF-3.6 step 6 guard (`UpdateSalesOrderCommandReturnHandler.cs:213-215`)
- **Arrange:** SO-1 (Paid, 234.00 collected); return 1 × P-A with `isSelectPaymentMethod:false`
- **Act:** PUT /api/SalesOrder/{id}/return
- **Assert:** **201** · header reduced, entries posted, stock restored · refund branch skipped (`IsSelectPaymentMethod` false): zero Refund rows, `TotalRefundAmount == 0.00`, no Dr AR/Cr Cash compensation — cash effect deferred to manual handling

### TC-D03.071 — Direct-API over-return is accepted (no server-side max validation)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-04]
- **Source:** WF-3.6 (client-only `Validators.max`; `UpdateSalesOrderCommandReturnHandler.cs:71-118` has no quantity check); doc-11 INT-04, S-01
- **Arrange:** SO-1 (2 × P-A sold); craft PUT return with `quantity: 5` for P-A (original 2, returned 0)
- **Assert (current behavior):** **201** — over-return accepted · new Return row qty **5** · restock 98 → **103** (over-restocked +1 beyond ever-sold) · mirrored entries computed for qty 5 (Dr 4100/Cr 1100 = 500.00 etc.) · header TotalAmount 234 − 585 = **−351.00** (negative totals persisted). Characterizes the missing server-side validation.

### TC-D03.072 — Over-return rejected with 409 (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-04]
- **Source:** doc-11 INT-04 enhancement ("verify stock before commit" / server-side validation)
- **Arrange:** same as TC-D03.071 post-fix
- **Act:** PUT return with quantity 5 > original − returned (2)
- **Assert (desired):** **409** with per-item over-return message · no Return row, no restock (stock stays 98), no entries, header totals unchanged. **RED until the fix lands.**

### TC-D03.073 — Return round-off uses Sale direction (not mirrored) and narrations are swapped
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [ACC-06]
- **Source:** WF-3.6 step 5 ("Round-off — same direction convention as Sale — not mirrored"; `SaleReturnStrategy.cs:145-163`, `SaleStrategy.cs:141-159`); doc-11 ACC-06
- **Arrange:** return from TC-D03.065 math: request `totalRoundOff: 0.15`
- **Act:** PUT /api/SalesOrder/{id}/return
- **Assert (current behavior):** SaleReturn transaction round-off entry **Dr AR 1100 / Cr RoundOff 5900 = 0.15** (same direction as a Sale, i.e., NOT the mirrored Dr RoundOff/Cr AR) · narration strings characterized: return transaction's round-off narration reads **"Round Off on Sale - Sales Order item Return"** and the original sale transaction's reads **"Round Off on Sale Return - Sales Order"** (swapped per ACC-06) · main narration correct: "Sale Return - Sales Order item Return"

### TC-D03.074 — Round-off narrations corrected (post-fix)
- **Layers:** UT
- **Priority:** P3   **Category:** Gap-Target [ACC-06]
- **Source:** doc-11 ACC-06 ("Fix narration strings")
- **Act:** run SaleStrategy and SaleReturnStrategy on transactions with RoundOffAmount ≠ 0
- **Assert (desired):** Sale strategy narration `"Round Off on Sale - …"`; SaleReturn strategy narration `"Round Off on Sale Return - …"`. **RED until the ACC-06 fix lands.**

### TC-D03.075 — No approval workflow: any SO_RETURN_SO holder completes a return without manager approval
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [BIZ-08 / S-07]
- **Source:** WF-3.6 step 5 (`SalesOrderController.cs:165-172` — single claim `SO_RETURN_SO`); doc-11 BIZ-08, S-07
- **Arrange:** `cashier` JWT with only `SO_RETURN_SO` (no manager/approver claim exists in the system)
- **Act:** PUT /api/SalesOrder/{id}/return
- **Assert (current behavior):** **201** — return completed with no approval step, no approver identity recorded, no pending-approval state · no exchange/swap transaction type exists (only Sale/SaleReturn). Characterizes the missing approval + exchange gap.

### TC-D03.076 — Return requires approval before ledger/stock effects (post-fix)
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [BIZ-08]
- **Source:** doc-11 BIZ-08 enhancement ("Approval step; exchange transaction type")
- **Arrange:** same as TC-D03.075 post-fix
- **Act:** cashier submits return → approver approves
- **Assert (desired):** submit → return pending (Status not yet Return, no entries, no restock) · approve (manager claim) → Status Return, mirrored entries + restock + refund occur exactly once. **RED until the BIZ-08 fix lands.**

### TC-D03.077 — PUT {id}/return without SO_RETURN_SO → 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-3.6 step 5 (`SalesOrderController.cs:165-172` — `ClaimCheck("SO_RETURN_SO")`)
- **Arrange:** `none` user JWT; existing SO-1
- **Act:** PUT /api/SalesOrder/{SO-1 id}/return
- **Assert:** **403** · SO-1 Status unchanged (Not_Return), no entries, stock unchanged

### TC-D03.078 — Tenant isolation: Tenant B PUT return on Tenant A order → 404
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-3.6 tenancy model (global tenant query filters)
- **Arrange:** Tenant A SO-1; Tenant B JWT with `SO_RETURN_SO`
- **Act:** PUT /api/SalesOrder/{SO-1 id}/return from Tenant B
- **Assert:** **404** · SO-1 untouched (Status, totals, entries, stock)

---

## WF-3.7 — Sales Payment Workflow

### TC-D03.079 — Manual payment on a credit order settles it and posts Dr Cash / Cr AR
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.7 add-payment (`AddSalesOrderPaymentCommandHandler.cs:45-98`); route claim `SO_ADD_SO_PAYMENT` (`SalesOrderPaymentController.cs:55-58`)
- **Arrange:** SO-2 (credit, TotalAmount 234.00, Pending)
- **Act:** `POST /api/SalesOrderPayment` `{salesOrderId: SO-2, amount: 234.00, paymentMethod: Cash}`
- **Assert:** **201** · `SalesOrderPayment` row 234.00 · `TotalPaidAmount == 234.00`, `PaymentStatus == Paid` · separate `TransactionType=Payment` transaction with **Dr Cash 1050 / Cr AR 1100 = 234.00** + `PaymentEntry` row · errors in the payment leg logged only (order row already saved)

### TC-D03.080 — Partial payment leaves status Partial; entry still Dr Cash / Cr AR for the paid amount
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.7 (`AddSalesOrderPaymentCommandHandler.cs:60-68`)
- **Arrange:** SO-2 (TotalAmount 234.00, Pending)
- **Act:** POST /api/SalesOrderPayment `{amount: 100.00, paymentMethod: Cash}`
- **Assert:** **201** · `TotalPaidAmount == 100.00`, `PaymentStatus == Partial` (234 > 100) · accounting **Dr Cash 1050 / Cr AR 1100 = 100.00** · repeat payment of 134.00 → `TotalPaidAmount == 234.00`, `PaymentStatus == Paid`

### TC-D03.081 — Amount > TotalAmount rejected with 409 (validation compares against the full total)
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Gap-Char [INT-06 / S-05]
- **Source:** WF-3.7 step 2 (`AddSalesOrderPaymentCommandHandler.cs:53-56`); doc-11 INT-06, S-05
- **Arrange:** SO-2 (TotalAmount 234.00, unpaid)
- **Act:** POST /api/SalesOrderPayment `{amount: 300.00}`
- **Assert (current behavior):** **409** with message exactly `"Payment amount (300.00) cannot exceed balance amount (234.00)"` — note the message labels the **full TotalAmount** as "balance amount" · no payment row, no entries, status still Pending. Characterizes the total-vs-remaining validation basis.

### TC-D03.082 — Overpayment vs remaining balance is NOT blocked
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [INT-06 / S-05]
- **Source:** WF-3.7 ⚠GAPS ("compares against full TotalAmount, not remaining balance"); doc-11 INT-06, S-05
- **Arrange:** SO-2 (TotalAmount 234.00) already paid 100.00 (Partial, remaining 134.00)
- **Act:** POST /api/SalesOrderPayment `{amount: 200.00}` (200 ≤ 234 but > remaining 134)
- **Assert (current behavior):** **201** — accepted · `TotalPaidAmount == 300.00 > TotalAmount 234.00` (over-collected 66.00) · `PaymentStatus == Paid` (234 ≤ 200+100) · accounting **Dr Cash 1050 / Cr AR 1100 = 200.00** — cash ledger now exceeds the order total. Characterizes the overpayment gap.

### TC-D03.083 — Payment validated against remaining balance (post-fix)
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Target [INT-06]
- **Source:** doc-11 INT-06 enhancement ("Validate against TotalAmount − TotalPaidAmount")
- **Arrange:** same as TC-D03.082 post-fix
- **Act:** POST /api/SalesOrderPayment `{amount: 200.00}` with remaining 134.00
- **Assert (desired):** **409** `"Payment amount (200.00) cannot exceed remaining balance (134.00)"` · no payment row; the boundary amount 134.00 → **201** and Paid. **RED until the INT-06 fix lands.**

### TC-D03.084 — Boundary: Amount == TotalAmount is accepted
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-3.7 step 2 (`AddSalesOrderPaymentCommandHandler.cs:53` — strict `>`)
- **Arrange:** SO-2 (TotalAmount 234.00, unpaid)
- **Act:** POST /api/SalesOrderPayment `{amount: 234.00}`
- **Assert:** **201** (not 409 — validation is `Amount > TotalAmount`) · `PaymentStatus == Paid`, `TotalPaidAmount == 234.00`

### TC-D03.085 — Payment-method → account mapping: cards/UPI/NetBanking → Bank 1060; Cash and unknown → Cash 1050
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.7 (`FullPaymentStrategy.cs:78-83`)
- **Arrange:** transaction of type Sale; ledger accounts 1050/1060/1100 seeded
- **Act/Assert:** run the payment-entry accounting for each method: DebitCard, CreditCard, UPI, NetBanking → debit account **1060**; Cash → **1050**; any other enum value → **1050** (default arm); credit account always **1100**; missing 1050/1060 account → `InvalidOperationException("Payment account not found")`

### TC-D03.086 — Factory always yields FullPaymentStrategy; PartialPaymentStrategy is dead code and the over-balance check is disabled
- **Layers:** UT
- **Priority:** P0   **Category:** Gap-Char [ACC-04 / S-06]
- **Source:** WF-3.7 step 4 ⚠GAPS ("always returns FullPaymentStrategy — partial branch commented out"); `FullPaymentStrategy.cs:18-47`; doc-11 ACC-04, S-06
- **Arrange:** transaction BalanceAmount 234.00; `IPaymentStrategyFactory` resolved from DI
- **Act/Assert (current behavior):** `ValidatePaymentAsync(tx, amount 500)` returns `IsValid == true` (the over-balance checks at `FullPaymentStrategy.cs:34-44` are commented out) · `CanProcessPaymentAsync(tx, 500)` returns **false** (|500−234| ≥ 0.01) yet `ProcessPaymentAsync(tx, 500)` still creates the PaymentEntry + Dr Cash/Cr AR 500.00 — the factory never consults `CanProcessPaymentAsync` · `PartialPaymentStrategy` is never selected for any amount (dead code; strategy selection has no partial branch). Characterizes ACC-04/S-06.

### TC-D03.087 — Accounting-side Transaction.PaidAmount/BalanceAmount are never updated by payments
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [ACC-04 / S-05]
- **Source:** WF-3.7 ⚠GAPS (last bullet); doc-11 ACC-04, S-05
- **Arrange:** SO-2 paid in full via TC-D03.079
- **Act:** inspect the `TransactionType=Payment` transaction row after settlement
- **Assert (current behavior):** `Transaction.PaidAmount == 0.00` and `Transaction.BalanceAmount == 234.00` (or creation-time defaults) — unchanged despite 234.00 collected; only SO-level `PaymentStatus`/`TotalPaidAmount` are authoritative. Characterizes the unmaintained transaction balances.

### TC-D03.088 — Delete payment subtracts paid amount, recomputes status, and posts compensation Dr AR / Cr Cash
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.7 delete-payment (`DeleteSalesOrderPaymentCommandHandler.cs:44-102`); claim `SO_DELETE_SO_PAYMENT`
- **Arrange:** SO-2 fully paid (payment 234.00, Paid)
- **Act:** `DELETE /api/SalesOrderPayment/{payment id}`
- **Assert:** **200** · payment row gone · `TotalPaidAmount == 0.00`, `PaymentStatus == Pending` · compensation accounting: `ProcessPaymentAsync(TransactionType.SaleReturn, 234.00)` → **Dr AR 1100 / Cr Cash 1050 = 234.00** · `TotalRefundAmount` **not** touched by this path (stays 0.00 — refund counter is return-flow-only)

### TC-D03.089 — Delete payment on a returned order → 409
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-3.7 delete-payment step 1 (`DeleteSalesOrderPaymentCommandHandler.cs:52-56`)
- **Arrange:** SO-1 after its return (Status = Return) with an existing payment
- **Act:** DELETE /api/SalesOrderPayment/{payment id}
- **Assert:** **409** with message exactly `"return Sale Order Payment Can't Delete"` · payment row intact, `TotalPaidAmount` unchanged

### TC-D03.090 — Delete-payment Paid-recheck double-subtracts: overpaid order drops to Partial, not Paid
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** `DeleteSalesOrderPaymentCommandHandler.cs:60-73` (recheck at line 66 subtracts `Amount` again after line 60 already did)
- **Arrange:** credit order TotalAmount 100.00; two payments of 100.00 each (both accepted: 100 > 100 is false; `TotalPaidAmount == 200.00`, Paid)
- **Act:** DELETE one 100.00 payment
- **Assert (current behavior):** **200** · `TotalPaidAmount == 100.00` · status recompute: line 62 `100 == 0`? no; line 66 `100 <= 100 − 100 = 0`? no → **Partial** (a fully-settled order) — the recheck double-subtracts the deleted amount. Flags an INT-07-shaped defect on the sales side (see Discrepancy notes).

### TC-D03.091 — Delete unknown payment → 404
- **Layers:** IT
- **Priority:** P3   **Category:** Negative
- **Source:** WF-3.7 delete-payment step 1 (`DeleteSalesOrderPaymentCommandHandler.cs:46-50`)
- **Act:** DELETE /api/SalesOrderPayment/{random guid}
- **Assert:** **404** `"Sales Order payment not found."`

### TC-D03.092 — Payment endpoints enforce claims: SO_ADD_SO_PAYMENT / SO_DELETE_SO_PAYMENT
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-3.7 (`SalesOrderPaymentController.cs:55-71`)
- **Arrange:** `none` user JWT; SO-2 with one payment
- **Act:** (1) POST /api/SalesOrderPayment; (2) DELETE /api/SalesOrderPayment/{id}
- **Assert:** both → **403** · payment row count unchanged (1), `TotalPaidAmount` unchanged

### TC-D03.093 — Tenant isolation: Tenant B delete of Tenant A payment → 404
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-3.7 tenancy model (global tenant query filters)
- **Arrange:** Tenant A SO-2 with payment; Tenant B JWT with `SO_DELETE_SO_PAYMENT`
- **Act:** DELETE /api/SalesOrderPayment/{Tenant A payment id} from Tenant B
- **Assert:** **404** · payment intact, Tenant A balances unchanged

---

## Postman & End-to-End Runner Flows (cross-workflow)

### TC-D03.094 — Postman runner: login → product+stock setup → POS sale → payment → return → refund with chained variables
- **Layers:** PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-3.1 → 3.2 → 3.6 → 3.7 (collection: `MILPOS-D03-Sales`, environment `local-cloud`)
- **Arrange:** fresh tenant via environment `{{tenantId}}`; variables `baseUrl`, `token`
- **Act (runner order, each request chains the next):**
  1. `POST {{baseUrl}}/api/auth/login` (admin) → test script stores `token`, `userId`
  2. `POST {{baseUrl}}/api/product` (P-A, salesPrice 100, GST-17) → stores `productId`
  3. `POST {{baseUrl}}/api/productStock` (P-A @ `{{locationId}}`, stock 100, purchasePrice 60) → stores `stockId`
  4. `GET {{baseUrl}}/api/SalesOrder/newOrderNumber/false` → stores `orderNumber`
  5. `POST {{baseUrl}}/api/SalesOrder` (POS cash, 2 × P-A, totalAmount 234) → stores `orderId`; test asserts `status 201`, `PaymentStatus == "Paid"`
  6. `GET {{baseUrl}}/api/SalesOrderPayment/{{orderId}}` → asserts 1 payment of 234.00
  7. `PUT {{baseUrl}}/api/SalesOrder/{{orderId}}/return` (1 × P-A, totalAmount 117, isSelectPaymentMethod true) → asserts 201
  8. `GET {{baseUrl}}/api/SalesOrder/{{orderId}}` → asserts `Status == "Return"`, `TotalAmount == 117`, `TotalRefundAmount == 117`
- **Assert:** every request passes its contract check; runner ends green with `orderId`/`orderNumber`/`productId` variables populated; follow-up GETs (steps 6, 8) prove persisted state (Postman rule: deep DB asserts only via follow-up GETs)

### TC-D03.095 — Postman contract shapes: create-sale response, enums, and numbering patterns
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-3.2/3.5 response shapes (`SalesOrderController.cs:136-204`)
- **Arrange:** runner from TC-D03.094 up to step 5
- **Act/Assert (schema checks on each response body):** POST /api/SalesOrder returns `id` (GUID), `orderNumber` matching `^SO#\d{5,}$`, `paymentStatus` ∈ {Pending, Partial, Paid}, `isSalesOrderRequest == false`, `salesOrderStatus == "Not_Return"`, `fbrStatus` null for non-FBR location; `GET newOrderNumber/false` body is exactly `{ "orderNumber": "SO#…" }`; POST /api/SalesOrderPayment returns `id`, `amount` (number), `paymentMethod` (int enum); error bodies for 409 carry `message` (e.g., TC-D03.018/081 strings)

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case — WF-3.1 (TC-D03.001/013), WF-3.2 (016), WF-3.3 (039), WF-3.4 (050/051), WF-3.5 (056/058), WF-3.6 (066/067), WF-3.7 (079/080)
- [x] Every write endpoint has: Validation case (bad input → 400/409), Permission case (missing claim → 403), Tenant-Isolation case (other tenant's id → 404) — POST (018/036/037), PUT (041-045/059/078), PUT return (077/078), DELETE (052-054/055), payment add/delete (081/086→092/093)
- [x] Every money/stock mutation has DB-state assertions (entries balanced, stock delta) — 016, 017, 027, 028, 031, 039, 050, 051, 066, 067, 079, 080, 088
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case — INT-01/02 (032/033), INT-03 (048/049), INT-04/S-01 (012/038, 071/072), INT-06/S-05 (081/082/083, 087), INT-11/S-08 (019/020), S-03/UX-02 (008/009), S-04 (014), S-06/ACC-04 (086/087), S-07/BIZ-08 (075/076), S-09/BIZ-06 (034/035), S-10/BIZ-05 (060/061), S-11 (015), S-12 (023), ACC-03 (028/029), ACC-06 (030/073/074)
- [x] Gap-Char assertions describe CURRENT behavior; Gap-Target describes DESIRED behavior (RED now)
- [x] Concurrency case for sequential-number generation where the doc flags it (INT-11) — TC-D03.019 (Gap-Char) + TC-D03.020 (Gap-Target)
- [x] Edge/boundary cases: zero (026/047), negative (030), max quantities (063/071), rounding remainders (006/030/065/073), multi-tax (027), unit conversion operators (007-009/031), payment boundary (084)

## Discrepancy notes

1. **POS screen does not floor/round (doc-vs-code).** Doc 03 WF-3.1 step 5 says the POS grand total is floored with the remainder going to `totalRoundOff`. In code, `pos.component.ts` `getAllTotal()`/`buildSalesOrder()` submit the unfloored grand total and set no `totalRoundOff`; flooring exists in `sales-order-add-edit.component.ts:475-484` and `sales-order-calculation.service.ts:85-86` (back-office screens). TC-D03.006 is therefore written against the actual flooring sites; the POS screen's round-off behavior is unimplemented (candidate gap — feed into the INT-04 server-side-recalc epic).
2. **`pos.component.ts` has drifted since doc 03 was drafted.** The file now contains "BP-05 FIX" comments (line-count ~860 preserved) — e.g., `getAllTotal` reuses the already-computed item total and flat-discount changes are debounced via `sub$`. All WF-3.1 behaviors cited here (barcode pipeline, defaults, UX-02 bug at lines 280-286, back-solve, stock dialog) were re-verified in the current file; only internal comments/structure changed.
3. **Server-side over-return is possible.** The per-item max-return validation is client-side only (`Validators.max`); `UpdateSalesOrderCommandReturnHandler.cs` performs no quantity check, so direct-API over-return succeeds (TC-D03.071 Gap-Char / 072 Gap-Target, cited under INT-04). Doc 03 does not call this out explicitly.
4. **Sales-side analog of INT-07.** Doc 11 assigns the payment-delete double-subtract recheck to the purchase side only, but `DeleteSalesOrderPaymentCommandHandler.cs:66` repeats the same pattern (subtracts `Amount` twice in the Paid recheck) — characterized in TC-D03.090. Recommend extending INT-07 to cover the sales handler.
5. **SEC-01 and INT-05 are not asserted here.** Both target `ProductStock` mutation endpoints (gain/loss/bulk-adjust) owned by domain D05 (WF-5.x). D03 covers only the claim protection of the *sale-driven* stock path (`SO_ADD_SO`/`POS_POS`, TC-D03.036).
6. **ACC-05 (payment transaction created with `Id = Guid.Empty`) is D06-owned** (WF-6.4 `PaymentService`); not asserted in this catalog — see the D06 catalog when it exists.
7. **Numbering format quirk.** `GetNewSalesOrderNumberQueryHandler.cs:44` uses `Replace(soNumber.ToString(), "")`, which strips every occurrence of the digit(s) — after "SO#00009" the next number is "SO#000010" (width drift). Not flagged by docs 03/11 (INT-11 covers only the race); characterized in TC-D03.021.
8. **Dead code observed while verifying:** `DeleteSalesOrderPaymentCommandHandler.cs:59` computes an unused `refundAmount` (`Math.Min`); `FullPaymentStrategy` narrations reference `transaction.TransactionNumber` which the sale pipeline does not populate. Both are ACC-11-flavored hygiene items, not behavior-affecting for D03 asserts.

