# Workflow Document 04 — Purchasing Workflows

**Scope:** Purchase order lifecycle (create/update/delete), purchase order requests (requisitions), PO returns with supplier refunds, supplier payments.

**Critical timing fact:** there is **no GRN (goods receipt note) workflow** — the term does not exist in the codebase. Stock and accounting for a purchase happen **at PO creation time**. `MarkAsReceived` is a cosmetic status flag only.

---

## WF-4.1 — Purchase Order Create (Backend)

**Endpoints:** `POS.API/Controllers/PurchaseOrder/PurchaseOrderController.cs` (route `api/PurchaseOrder`) — 16 endpoints including GET paged list (40-63), GET by id (71-82), POST create (90-97), PUT update (120-127), PUT return (135-142), DELETE (149-159), `newOrderNumber` (165-177), items (185-192), `markasreceived` (199-206), item reports (213-233), recent deliveries (239-248), P&L (255-268), totals + tax items (276-324). Claims: `PO_*` (orders), `POR_*` (requests).

**Command:** `AddPurchaseOrderCommand` (POS.MediatR/PurchaseOrder/Add/AddPurchaseOrderCommand.cs:10-29) — flag **`IsPurchaseOrderRequest`** distinguishes a requisition from a real PO. There is no separate PurchaseOrderRequest handler folder; the request workflow is the same command guarded by `POR_*` claims.

**Handler:** `AddPurchaseOrderCommandHandler.cs` (Handle 59-182):

1. **Duplicate check** (62-66): same `OrderNumber` → HTTP 409.
2. **Map + defaults** (68-69): `PaymentStatus=Pending`.
3. **Sales-person anti-spoofing** (72-82): restricted-location users force `SalesPersonId` to self.
4. **Item sanitization** (84-89): null `Product`/`Tax` navigations (avoid FK duplication), stamp CreatedDate.
5. **Zero-value auto-paid** (90-93): `TotalAmount==0` → Paid.
6. **Persist PO** (94).
7. **Real PO only** (96-111): for each item, load **Product**, convert UnitPrice to base units → **`Product.PurchasePrice = baseUnitPrice`** (product master cost updated from PO).
8. **Save #1** (112-116); failure → logged 500.
9. **Accounting + stock, real PO only** (117-179, try/catch **swallows** exceptions, 176-179):
   - Load taxes (123-129).
   - Per item (130-160): base-unit conversion, sum `totalTaxPercentage` from `PurchaseOrderItemTaxes`, build `TransactionItemDto` (base qty/price, `PurchasePrice`, TaxIds).
   - `CreateTransactionDto { BranchId=LocationId, Narration="Purchase order", ReferenceNumber=OrderNumber, TransactionType=Purchase, RoundOffAmount }` (161-170).
   - `ProcessTransactionAsync` (171) → pipeline (WF-6.1): **PurchaseStrategy** entries + **stock +qty at LocationId** + **LIFO: ProductStock.PurchasePrice overwritten** + Input TaxEntries.
10. Response 201.

### PurchaseStrategy journal entries (PurchaseStrategy.cs:18-132; Inventory=1200, AP=2100, Input GST=1150→child, Discount Received=4200, RoundOff=5900)

| Entry | Debit | Credit | Amount |
|---|---|---|---|
| Main (31-42) | Inventory 1200 | AP 2100 | SubTotal (gross) |
| Input GST (44-93, per tax child) | Input-GST child (`Tax.InPutAccountCode`) | AP 2100 | Σ ((qty×price − discount) × gst%) |
| Discount (95-110) | AP 2100 | Discount Received 4200 (income) | DiscountAmount |
| Round-off (112-131) | AP / RoundOff | RoundOff / AP | abs value |

Net effect: Inventory at **gross cost**; AP = SubTotal + GST − Discount; input GST (recoverable) and discount received (income) recognized immediately.

### PO Request variant
When `IsPurchaseOrderRequest=true`: steps 7 and 9 skipped — no product price update, **no Transaction, no accounting, no stock change**. Requests convert to real POs via `UpdatePurchaseOrderCommand` (claim `POR_CONVERT_TO_PO`) flipping the flag (handler copies flag at L199). Number generation uses inverted comparison (`IsPurchaseOrderRequest != request.isPurchaseOrder`, GetNewPurchaseOrderNumberQueryHandler.cs:23) — separate `PO#`/`POR#` sequences.

---

## WF-4.2 — Mark As Received (Backend)

**Handler:** `MarkPurchseReceived/MarkParchaseOrderAsReceivedCommandHandler.cs` (23-52):
1. Load PO with items → 404.
2. Already `RECEIVED` → idempotent success.
3. Set `DeliveryStatus = PurchaseDeliveryStatus.RECEIVED`; save.

**⚠ No stock, no accounting, no item-level partial receiving.** Partial deliveries are impossible to model: the full PO quantity hit stock at creation.

---

## WF-4.3 — Purchase Order Update (Backend)

**Handler:** `Update/UpdatePurchaseOrderCommandHandler.cs` (73-231).

1. Duplicate number excluding self → 409 (75-79).
2. **Guards:** Status==Return → 409 (81-85); DeliveryStatus==RECEIVED → 409 (87-90); PaymentStatus Partial/Paid → 409 (92-95).
3. Load existing items (97).
4. **Reverse old accounting/stock** (99-128, only when real PO AND totals changed):
   - Find `Transaction` by ReferenceNumber with children (104-109).
   - RemoveRange items/payment/tax/accounting entries (113-116).
   - **Type-flip hack (119-121):** set `TransactionType=PurchaseReturn` → `ProcessInventoryChangesAsync` subtracts the originally purchased quantities from ProductStock; transaction then deleted.
5. **Re-create accounting/stock** (130-191, same condition): rebuild TransactionItemDtos → `ProcessTransactionAsync` (type Purchase) → **re-adds NEW quantities** + re-applies LIFO price.
   - **⚠ Net stock = new − old** — correct only if nothing else consumed the stock in between; both blocks have separate swallowed try/catch — failure in 4 but success in 5 **double-counts stock** (and vice versa loses it).
6. **Replace items** (192-218): RemoveRange; map fresh; re-parent.
7. `TotalAmount==0` → Paid (219-222); update + save (223-228).

---

## WF-4.4 — Purchase Order Delete (Soft Delete + Full Reversal)

**Handler:** `Delete/DeletePurchaseOrderCommandHandler.cs` (68-141):

1. Load PO with items + taxes → 404 (72-80).
2. Guard Status==Return → 409 (81-84).
3. **Soft delete:** `IsDeleted=true` (86-87).
4. **Full reversal** (90-125): all Transactions with ReferenceNumber==OrderNumber:
   - Payment-type → remove accounting + payment entries + transaction (102-107).
   - Otherwise → remove children; **type-flip to PurchaseReturn → subtract purchased quantities** from ProductStock (110-117); remove transaction.
5. Save (127-131); accounting errors swallowed (122-125).

---

## WF-4.5 — Purchase Return Workflow (+ Supplier Refund)

**Endpoint:** `PUT api/PurchaseOrder/{id}/return` (claim `PO_RETURN_PO`).
**Command:** `UpdatePurchaseOrderReturnCommand` — includes `IsSelectPaymentMethod`, `PaymentMethod`, `TotalRoundOff`.
**Handler:** `Update/UpdatePurchaseOrderReturnCommandHandler.cs` (active method 219-421; old implementation fully commented out at 65-217).

1. **Begin DB transaction** (223); unhandled exceptions → rollback + `ReturnException` (415-420). *(This is one of the few flows with an explicit transaction.)*
2. Map request; null nav props (225-230); load existing PO (231).
3. **Header mutation** (233-238): `PurchaseReturnNote=Note`; `Status=PurchaseOrderStatus.Return`; `TotalAmount/TotalTax/TotalDiscount` **reduced** by returned amounts.
4. **Items replaced** (240-267): existing items dropped; new `PurchaseOrderItem` rows from the return payload with **`Status=Return`** + their taxes. *(Original item rows are lost — history replaced, unlike sales returns which append.)*
5. **Payment status recompute** (269-280): TotalAmount≤TotalPaidAmount → Paid; TotalPaidAmount>0 → Partial; else Pending.
6. **Save #1** (282-289); failure → rollback + 500.
7. **Return accounting + stock** (299-347, swallowed):
   - TransactionDtos with base conversion + taxes.
   - `CreateTransactionDto { Narration="purchase Order item Return", TransactionType=PurchaseReturn, RoundOffAmount }` (332-341) → **PurchaseReturnStrategy** (PurchaseReturnStrategy.cs:18-132):
     - Dr AP 2100 / Cr Inventory 1200 (main)
     - Dr AP / Cr Input-GST child (GST reversal)
     - Dr Discount Received 4200 / Cr AP (discount reversal)
     - Round-off entries
   - Stock: `PurchaseReturn ⇒ −qty` at the PO's location; PurchasePrice unchanged.
   - TaxEntries: Input.
8. **Supplier refund** (349-410, swallowed):
   - `remainingPayment = TotalAmount − TotalPaidAmount + TotalRefundAmount` (351).
   - If `< 0` AND `IsSelectPaymentMethod` AND status Paid/Partial AND `TotalPaidAmount>0` (353-356):
     - `refundAmount = TotalPaidAmount − TotalAmount − TotalRefundAmount` (358); proceed if >0.
     - Create **PurchaseOrderPayment** with `PaymentType.Refund` (376-385); bump `TotalRefundAmount` (386-388); persist (389).
     - `ProcessPaymentAsync(TransactionType=PurchaseReturn)` → **Dr Cash/Bank / Cr AP** (money back from supplier).
   - Save #2 (392-397) inside the outer transaction.
9. **Commit** (412).

**⚠ GAPS:**
- Return **replaces** the item list (originals lost) — inconsistent with the sales-return design which appends history rows.
- A fully-unpaid PO return produces no refund (correct) but no credit-note artifact either — the supplier balance lives only in reduced AP.
- Accounting failures inside the transaction are swallowed → PO mutations committed with missing reversal entries.

---

## WF-4.6 — Supplier Payment Workflow (PurchaseOrderPayment)

**Endpoints:** `PurchaseOrderPaymentController.cs` — GET payments for PO (36-48, `PO_VIEW_PO_PAYMENTS`), GET report (54-77, `REP_PO_PAYMENT_REP`), POST create (84-91, `PO_ADD_PO_PAYMENT`), DELETE (98-108, `PO_DELETE_PO_PAYMENT`).

### Add payment — `AddPurchaseOrderPaymentCommandHandler.cs` (45-95)
1. Load PO → 404.
2. **Guard** (52-55): `Amount > TotalAmount` → 409. **⚠ validates against full TotalAmount, not remaining balance** (over-payment beyond `TotalAmount − TotalPaidAmount` possible).
3. Add **PurchaseOrderPayment** row (56-57).
4. Status: `TotalAmount ≤ Amount + TotalPaidAmount` → Paid else Partial; `TotalPaidAmount += Amount` (59-67).
5. Save #1 (69-73).
6. **Accounting** (74-92, swallowed): `PaymentDto { TransactionType=Purchase, OrderNumber }` → `PaymentService.ProcessPaymentAsync` → separate **Payment** transaction → FullPaymentStrategy → **PaymentEntry** + journal **Dr AP 2100 / Cr Cash 1050 | Bank 1060** (method-based; default→Cash). No stock effect. (`PaidAmount/BalanceAmount` never maintained — see WF-3.7 gap.)

### Delete payment — `DeletePurchaseOrderPaymentCommandHandler.cs` (46-103)
1. Load payment → 404; PO Status==Return → 409.
2. Delete payment row; `TotalPaidAmount −= Amount` (61).
3. Status recompute: TotalPaidAmount==0 → Pending; **⚠ `TotalAmount <= TotalPaidAmount - payment.Amount` double-subtracts the amount in the Paid recheck (67)**; else Partial.
4. Save (76-80).
5. Refund accounting (82-101): `ProcessPaymentAsync(TransactionType=PurchaseReturn, Amount)` → **Dr Cash/Bank / Cr AP**. Swallowed errors.

---

## Workflow Interaction Map

```
 PO Request (POR, flag=true)          PO (flag=false)
   │ no accounting/stock                │ POST create
   │ POR# sequence                      ▼
   │                          WF-4.1 Add ──► PurchaseStrategy (Dr Inventory/Cr AP + Input GST)
   │ convert (flip flag)              ──► stock +qty, LIFO price update
   │                                  ──► Product.PurchasePrice = base price
   ▼                                  ──► Input TaxEntries
 real PO (as above)
   │
 WF-4.2 MarkAsReceived ──► status flag ONLY (no stock!)
 WF-4.3 Update (unpaid, unreceived) ──► reverse (type-flip) + re-post
 WF-4.4 Delete ──► soft delete + full reversal
 WF-4.5 Return ──► mirrored entries + stock − + optional supplier refund
 WF-4.6 Payments ──► Dr AP / Cr Cash|Bank; delete = compensation entry
```

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| P-01 | Receiving | **No GRN workflow** — stock granted at PO creation; partial receipts impossible; delivery status cosmetic |
| P-02 | Integrity | PO+accounting+inventory not atomic; failures swallowed (Add/Update/Return) |
| P-03 | Update | Type-flip reversal hack fragile; reverse/re-add gap double-counts or loses stock |
| P-04 | Returns | Return replaces item list (history lost) — inconsistent with sales returns |
| P-05 | Payments | Overpayment not blocked vs remaining balance; Paid/Balance fields unmaintained |
| P-06 | Payments | Delete-payment status recheck double-subtracts amount |
| P-07 | Costing | LIFO overwrite only; no weighted-average/FIFO costing option |
| P-08 | Requests | No approval hierarchy on PO requests (any POR_* user can convert) |
| P-09 | Numbering | Sequential generation race under concurrency (same as sales) |
