# Workflow Document 03 — POS & Sales Workflows

**Scope:** POS terminal checkout, sales order lifecycle (create/update/delete), sales order requests (quotations), request→order conversion, sales returns with refunds, and sales payments.

**Key architectural fact:** all money math (totals, taxes, discounts, rounding) is computed **client-side in Angular pipes** and persisted as-is; the server then drives the accounting + inventory engines from the same numbers. Accounting/inventory failures are logged and swallowed — they never roll back the order.

---

## WF-3.1 — POS Screen Checkout Workflow (Walk-in Sale)

**Frontend:** `Angular/src/app/pos/pos.component.ts` (860 lines); route `/pos` (`app.routes.ts:80-91`, claim `POS_POS`, resolvers `salesOrderUnitResolver` + `salesOrderTaxResolver`).

1. **Initialization** (`ngOnInit` 152-169):
   - Load units + taxes from resolver data.
   - `createSalesOrder()` (215-239): reactive form — `orderNumber`, `deliveryDate/soCreatedDate`=now, `deliveryStatus` defaults **Delivered**, `paymentMethod` defaults **1 (Cash)**, `customerId` (required — walk-in customer default), `locationId` (required), `flatDiscount`, `salesOrderItems` FormArray.
   - `getNewSalesOrderNumber()` (541-549) → `GET salesOrder/newOrderNumber/false`.
   - Preselect user's current location (188-197); load **static client-side** payment-method list (182-186).
2. **Item entry**:
   - **Barcode pipeline** (351-403): valueChanges debounce 500ms → search by barcode → exactly one match: if `hasVariant`, fetch children and **auto-add all variants**; else add product; clears field; warn on miss; plays scan sound (821-824).
   - **Category/Brand drawers** (837-859) re-query the product dropdown.
3. **Add item** (`onProductSelect` 299-324):
   - Product already in cart → **quantity +1** (302-309).
   - Else push FormGroup (326-349): `unitPrice = product.salesPrice`, `quantity = 1`, `taxValue` = product tax IDs, `taxPercentage` = **sum of product tax percentages**, `discountType='fixed'`, `discountPercentage=0`.
   - Build per-row unit-conversion map + tax map.
4. **Unit change** (`onSelectionChange` 268-297): recalculates unit price applying the unit operator (+, −, ×, ÷) to `salesPrice`.
   - **⚠ BUG (280-286):** `product?.salesPrice ?? 0 - parseFloat(unit.value)` — `??` binds after arithmetic, so Minus/Multiply/Divide return the defined price **unchanged** (operator application broken when price defined).
5. **Totals** (`getAllTotal` 428-504, pipes in `shared/pipes/`):
   - Per item: `qty × unitPrice − discount` then **+ each tax amount sequentially** (flat amounts of the discounted base — **not compounded**).
   - `totalTax` = Σ per-item tax; `totalDiscount` = Σ item discounts + `flatDiscount`; `grandTotal` floored; remainder → `totalRoundOff`.
   - `onTotalChange` (245-266): typing a target line total **back-solves unitPrice**.
6. **Checkout** (`onSalesOrderSubmit` 595-663):
   1. Validate; `buildSalesOrder()` (726-800): per-item discount amount, taxValue total, `salesOrderItemTaxes[]` (each tax + computed amount); header `totalAmount/totalDiscount/totalTax/flatDiscount`; `salesOrderStatus=Not_Return`, `isPOSScreenOrder=true`, `isSalesOrderRequest=false`.
   2. **Client-side stock check** (613-660): `productService.getProductsInventory(locationId, items)` → aggregate required qty → `stock < itemCount` ⇒ `ProductStockAlertDailogComponent`; user can **"process anyway"** (negative stock allowed).
   3. `saveSalesOrder()` (665-687) → `POST salesOrder`.
   4. On success → toast → re-fetch full order (`getSalesOrderById`) → render `SalesOrderInvoiceComponent` (receipt) → `resetFormForNewOrder()` (689-717): clears cart, keeps walk-in customer + location, fetches new order number.

---

## WF-3.2 — Sales Order Create (Backend)

**Command:** `POS.MediatR/SalesOrder/Add/AddSalesOrderCommandHandler.cs` (Handle 66-232).

1. **Duplicate check** (69-73): same `OrderNumber` exists → HTTP 409.
2. **Map + defaults** (75-100): `PaymentStatus=Pending`; `TotalAmount==0` → `PaymentStatus=Paid` (free orders auto-settled).
3. **Sales-person anti-spoofing** (79-89): if token user has restricted `LocationIds`, `SalesPersonId` **forced** to logged-in user.
4. **FBR staging** (103-124): if `location.IsFBREnabled && AutoSubmitInvoices` → `FBRStatus=Queued`, capture buyer NTN/CNIC/name/phone/address, `SaleType="Retail"`. Try/catch logged only.
5. **Persist order** (126, 149-153): `SalesOrderRepository.Add` + SaveAsync; each item's **`PurchasePrice` snapshot** stamped from `ProductStock.PurchasePrice` at that location (133-147) — the COGS basis. Entity detached (154).
6. **Accounting + inventory** (155-215) — **skipped entirely when `IsSalesOrderRequest == true`** (158):
   - Per item: base-unit conversion via `UnitConversationRepository.GetBaseUnitValuesAsync` (converts qty/price to parent unit using operator), sum tax percentages from Tax table (162-182).
   - `CreateTransactionDto { BranchId=LocationId, Narration="Sales Order", ReferenceNumber=OrderNumber, TransactionType=Sale, FlatDiscount, RoundOffAmount }` → `_accountingService.ProcessTransactionAsync` (209) → full pipeline (see WF-6.1): Transaction+Items → **SaleStrategy** journal entries → **stock −qty** → Output TaxEntries.
   - Exceptions **logged and swallowed** (212-215) — order survives without ledger entries.
7. **Auto payment** (217-230): if `IsPOSScreenOrder && PaymentMethod != ACCPaymentMethod.Credit` → dispatch `AddSalesOrderPaymentCommand` with `Amount = TotalAmount` (full settlement at POS; Credit sales remain unpaid → AR).
8. Response 201 with DTO.

### SaleStrategy journal entries (SaleStrategy.cs:18-160; codes: AR=1100, Sales=4100, Output GST=2150→child, Inventory=1200, COGS=5100, Discount=5200, RoundOff=5900)

| Entry | Debit | Credit | Amount |
|---|---|---|---|
| Main (33-44) | AR 1100 | Sales 4100 | SubTotal (gross) |
| Output GST (48-94, per tax child) | AR 1100 | GST child (`Tax.OutPutAccountCode`) | Σ ((qty×price − discount) × gst%) |
| COGS (97-121) | COGS 5100 | Inventory 1200 | Σ qty × PurchasePrice |
| Discount (124-138) | Discount Given 5200 | Sales 4100 | DiscountAmount |
| Round-off (141-159) | AR / RoundOff | RoundOff / AR | abs(RoundOffAmount) |

**⚠ Design quirk:** discount entry credits *Sales*, not AR — AR stays gross of discount; revenue overstated by discount, offset by equal Discount expense. P&L nets correctly; AR balance ≠ `TotalAmount`.

**⚠ GAPS:**
- No server-side price/stock validation — client numbers trusted; negative stock possible via "process anyway".
- No transaction spanning order + accounting + inventory; failures swallowed.
- Order-number sequence derived from latest order → concurrent checkouts can collide (409 is the safety net; user must retry).
- Stock deducted at order creation even for undelivered orders (see WF-3.5).

---

## WF-3.3 — Sales Order Update (Backend)

**Handler:** `POS.MediatR/SalesOrder/Update/UpdateSalesOrderCommandHandler.cs` (78-238).

1. Duplicate number check excluding self → 409 (80-84).
2. **Guards** (86-99): `Status==Return` → 409; non-request with `DeliveryStatus==DELIVERED` → 409; `PaymentStatus` Partial/Paid → 409. (Paid/partially-paid orders are immutable except via returns.)
3. **Reverse old accounting** (103-132) — only if not a request AND totals changed:
   - Find `Transaction` by `ReferenceNumber == OrderNumber` (with items/payments/tax/accounting includes).
   - RemoveRange all children; **flip `TransactionType` to `SaleReturn`** and call `ProcessInventoryChangesAsync` — the inventory switch sees SaleReturn ⇒ **adds quantities back** (reverse-by-type-flip trick, 122-125); delete transaction. Errors logged only.
4. **Re-create accounting** (133-193): same pipeline as Add (type Sale) when totals changed.
5. **Replace items** (195-224): RemoveRange existing; map new; re-link; refresh CreatedDate.
6. `TotalAmount==0` → Paid (225-228); save (229-234).

**⚠ GAP:** if reversal (3) fails but re-creation (4) succeeds — both swallowed — stock double-counts; if (3) succeeds and (4) fails, stock is lost. No atomicity.

---

## WF-3.4 — Sales Order Delete (Backend)

**Handler:** `POS.MediatR/SalesOrder/Delete/DeleteSalesOrderCommandHandler.cs` (66-138).

1. Load order with items/taxes → 404; `Status==Return` → 409 (78-81).
2. Delete order; for **every** transaction referencing the OrderNumber:
   - Payment-type → remove accounting + payment entries + transaction (102-107).
   - Otherwise → remove children; **flip type to SaleReturn → restore stock** via `ProcessInventoryChangesAsync` (110-112); delete transaction.
3. Save (124).

---

## WF-3.5 — Sales Order Request (Quotation) Workflow

There is **no separate handler** — a request is a `SalesOrder` row with `IsSalesOrderRequest=true` flowing through the same Add/Update endpoints:

1. **UI:** `sales-order-request-add-edit.component.ts` sets `isSalesOrderRequest: true` (602), allows explicit created time (586-596). Store calls the same `salesOrderService.add/updateSalesOrder` (store lines 126, 138); list queries pass `isSalesOrderRequest: true`.
2. **Server differences:**
   - **Add:** no accounting entries, no stock movement, no auto-payment (`AddSalesOrderCommandHandler.cs:158`).
   - **Update:** accounting removal/recreation skipped entirely.
   - **Numbering:** `SO#00001` for orders vs **`SOR#00001`** for requests — separate sequences (`GetNewSalesOrderNumberQueryHandler.cs:23-51`).
   - Reporting/dashboard exclude requests (`!IsSalesOrderRequest` filters, e.g., SalesOrderRepository.cs:212).
3. **Request → Order conversion** (claim `SOR_CONVERT_TO_SO`): dialog `sales-order-request-convert-dailog` searches requests → loads chosen request into the **Sales Order add/edit screen** → saved as a real order (`isSalesOrderRequest=false`) via PUT. **Conversion creates a new SO** — stock deduction + accounting occur at that point. The original SOR row remains.
4. **Storefront variant** (`StoreController.cs:106-162`): builds `AddSalesOrderCommand` with `IsSalesOrderRequest=true`, `DeliveryStatus=PENDING`, guest info in `Note` — but the `_mediator.Send` call is **commented out** (145-158); checkout currently just clears the cart and shows success. **Incomplete feature.**

---

## WF-3.6 — Sales Return Workflow (with Refund)

**Frontend:** `Angular/src/app/sale-order-return/sale-order-return/sale-order-return.component.ts`.

1. Load order via route resolver; fetch returnable items via `GET salesOrder/{id}/returnItems` (`GetSalesOrderWithReturnItemsCommand.cs:25-52` — sums quantities of item rows with `Status==Return` into `ReturnItemsQuantities`).
2. Per-item form (294-318): original price/qty/taxes disabled; only `returnquantity` editable, `Validators.max(originalQty − alreadyReturned)` — prevents over-return.
3. Totals with **return pipes** (360-436, 574-580) which **pro-rate fixed discounts** (fixed line discount ÷ total qty × returned qty); grand total floored; remainder → `totalRoundOff`.
4. `buildSalesOrder()` (487-572): `salesOrderStatus=Return`, only items with `returnquantity>0`; `isSelectPaymentMethod` auto-true if `paidAmount>0` (255).
5. Submit → `PUT salesOrder/{id}/return` (claim `SO_RETURN_SO`).

**Backend:** `Update\UpdateSalesOrderCommandReturnHandler.cs` (71-264):

1. Load existing order (80).
2. **Header mutation** (82-88): `SaleReturnNote=Note`; `Status=Return`; `TotalAmount/TotalTax/TotalDiscount/FlatDiscount` **reduced** by returned amounts.
3. **Insert new item rows** (90-118): one `SalesOrderItem` per returned line with `Status=Return` (history preserved; original rows untouched).
4. **Recompute PaymentStatus** (128-139): `TotalAmount ≤ TotalPaidAmount` → Paid; `TotalPaidAmount>0` → Partial; else Pending. Save (141-147).
5. **Accounting** (150-207): `TransactionType.SaleReturn`, Narration "Sales Order item Return" → **SaleReturnStrategy** (SaleReturnStrategy.cs:18-164) — exact mirror of Sale entries:
   - Dr Sales 4100 / Cr AR 1100 (SubTotal)
   - Dr GST child / Cr AR (output GST reversal)
   - Dr Inventory 1200 / Cr COGS 5100 (reverse COGS = Σ qty × PurchasePrice)
   - Dr Sales / Cr Discount Given (discount reversal)
   - Round-off (same direction convention as Sale — not mirrored)
   - Inventory engine **adds stock back** (`SaleReturn ⇒ +qty`); TaxEntries Output.
6. **Refund payment** (209-261): `remainingPayment = TotalAmount − TotalPaidAmount + TotalRefundAmount`; if `< 0` AND `IsSelectPaymentMethod` AND status Paid/Partial AND `TotalPaidAmount>0` → `refundAmount = TotalPaidAmount − TotalAmount − TotalRefundAmount`; if >0 → create `SalesOrderPayment` with **`PaymentType.Refund`** (234-242), bump `TotalRefundAmount` (245), `ProcessPaymentAsync(TransactionType.SaleReturn)` → **Dr AR / Cr Cash/Bank** (money back to customer).

**⚠ GAPS:**
- No manager-approval step or permission-differentiated return flow.
- Returns are whole-line (no partial-quantity pricing tiers); discount pro-rating assumes uniform per-unit discount.
- A return on a Credit (unpaid) sale still posts Dr Sales/Cr AR and restocks — correct — but `IsSelectPaymentMethod` guard prevents a refund when nothing was paid; cash refunds can't be recorded against partially-paid orders unless paid amount covers it.

---

## WF-3.7 — Sales Payment Workflow

### Add payment
**Trigger points:** (a) POS checkout auto-payment (WF-3.2 step 7); (b) manual from order list via `add-sales-order-payment` component (prefills `amount = totalAmount − totalPaidAmount`, max-validated client-side).

**Handler:** `SalesOrderPayment/Handler/AddSalesOrderPaymentCommandHandler.cs` (45-98):
1. Load order → 404.
2. **Validation** (53-56): `Amount > TotalAmount` → 409. **⚠ compares against full TotalAmount, not remaining balance** — overpaying an already-partially-paid order is possible.
3. Create **SalesOrderPayment** row; `PaymentStatus` = Paid if `TotalAmount ≤ Amount + TotalPaidAmount` else Partial; `TotalPaidAmount += Amount` (60-68); save.
4. **Accounting** (75-93): `PaymentDto { BranchId=LocationId, OrderNumber, TransactionType=Sale }` → `PaymentService.ProcessPaymentAsync` — creates a separate **`TransactionType.Payment`** transaction; `PaymentStrategyFactory` **always returns FullPaymentStrategy** (partial branch commented out — dead code); FullPaymentStrategy creates **PaymentEntry** + journal: **Dr Cash 1050 (Cash) | Bank 1060 (DebitCard/CreditCard/UPI/NetBanking; default→Cash) / Cr AR 1100**. Errors logged only.
   - **⚠ accounting-side `Transaction.PaidAmount/BalanceAmount` never updated** (only unreachable PartialPaymentStrategy does); SO-level `PaymentStatus`/`TotalPaidAmount` are the authoritative payment state.

### Delete payment (correction path)
**Handler:** `DeleteSalesOrderPaymentCommandHandler.cs` (44-102):
1. Load payment → 404; order `Status==Return` → 409 ("return Sale Order Payment Can't Delete").
2. Delete payment; `TotalPaidAmount −= Amount`; recompute PaymentStatus; save.
3. Compensation accounting: `ProcessPaymentAsync(TransactionType.SaleReturn, Amount)` → **Dr AR / Cr Cash/Bank** (money effectively returned).

### Customer-level payments
No standalone customer-payment handler. Money movement is always per-sales-order via SalesOrderPayment. The **CustomerLedger** workflow (WF-8.2) applies a customer's lump payment FIFO across open orders by dispatching `AddSalesOrderPaymentCommand` per order.

---

## Workflow Interaction Map

```
 POS screen (WF-3.1)                      Sales Order list
   │ POST /salesOrder                              │
   ▼                                               ▼
 WF-3.2 Add ──► AccountingService ──► SaleStrategy (AR/Sales/GST/COGS)
   │            ──► InventoryService (stock −) ──► TaxService (Output)
   │
   ├── auto payment (non-credit) ──► WF-3.7 ──► Dr Cash/Bank, Cr AR
   │
 WF-3.3 Update (unpaid only) ──► reverse (type-flip trick) + re-post
 WF-3.4 Delete ──► reverse stock + delete transactions
 WF-3.5 SOR: same endpoints, flag=true ──► NO accounting/stock
   └── convert ──► real SO (accounting+stock at conversion)
 WF-3.6 Return ──► mirrored entries + restock + optional refund (WF-3.7)
```

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| S-01 | Integrity | No server-side recalculation of totals/taxes; client-trusted money math |
| S-02 | Integrity | Order+accounting+inventory not atomic; failures swallowed → orders without ledger/stock effects |
| S-03 | POS | Unit-price operator bug (`??` precedence) breaks Minus/Multiply/Divide unit pricing |
| S-04 | POS | Negative stock allowed by confirmation; no hard floor option |
| S-05 | Payments | Overpayment vs remaining balance not blocked; accounting PaidAmount/BalanceAmount never maintained |
| S-06 | Payments | PartialPaymentStrategy dead code; factory hard-codes Full |
| S-07 | Returns | No approval workflow; no exchange (swap) support |
| S-08 | Numbering | Sequential number generation race under concurrency |
| S-09 | Delivery | Stock deducted at order creation, not delivery; no GRN-equivalent for sales; partial delivery unsupported |
| S-10 | Storefront | Checkout stub — MediatR send commented out |
| S-11 | Receipts | Invoice render is client-side; no server-rendered/PDF archival of invoices |
| S-12 | FBR | Staging only at Add; submission/retry is separate (see WF-9.1) |
