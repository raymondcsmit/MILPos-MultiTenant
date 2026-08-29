# Workflow Document 05 — Inventory & Stock Workflows

**Scope:** How stock actually moves: the central inventory engine, manual gain/loss adjustments, bulk adjustments, absolute correction, damaged stock, inter-branch transfers, inventory batches (FEFO), and stock alerts.

---

## WF-5.0 — The Central Inventory Engine (how ALL stock moves)

There is **no dedicated "stock service."** All stock mutations flow through the accounting engine as a side effect of `AccountingService.ProcessTransactionAsync` (POS.MediatR/Accouting/Services/AccountingService.cs:26-134) calling `InventoryService.ProcessInventoryChangesAsync` (Services/InventoryService.cs:20-67):

1. **Signed quantity delta per item** from `transaction.TransactionType` (26-37):

   | TransactionType | Quantity change to ProductStock.CurrentStock |
   |---|---|
   | Purchase | +item.Quantity |
   | PurchaseReturn | −item.Quantity |
   | Sale | −item.Quantity |
   | SaleReturn | +item.Quantity |
   | StockTransferFromBranch | −item.Quantity |
   | StockTransferToBranch | +item.Quantity |
   | StockAdjustment | +qty if Narration contains "Gain" (case-insensitive), else −qty |
   | anything else (Payment, Payroll, Loan, DirectEntry…) | 0 |

2. **Fetch-or-create stock row** (41): `ProductStockRepository.GetProductStock(locationId, productId)` (POS.Repository/Product/ProductStockRepository.cs:24-34) returns the `(ProductId, LocationId)` row or auto-creates one (`AddProductStock`, 36-76: `CurrentStock=0`, seeds `PurchasePrice` from the product's most recent stock row any-location, falling back to `product.PurchasePrice`).
3. **LIFO cost update** (45-48): for `Purchase` or Gain adjustment — `productStock.PurchasePrice = item.PurchasePrice` (latest cost wins).
4. **Apply delta** (49-51): `CurrentStock += quantityChange`; mark updated.
5. **Save** (57-60) — failure **logged, never thrown** (stock drift possible).
6. Detach entities (62-65).

**Stock truth:** `ProductStock` (per Product+Location) is the live source of truth (`POS.Data/Entities/Product/ProductStock.cs`: `CurrentStock`, `PurchasePrice`, decimal(18,2)).
**⚠ Dual-stock trap:** `Product.CurrentStock` exists too but is only written by dead code paths (ProductRepository.UpdateProductCurrentStock called only from uncalled `ProcessStockAdjustmentAsync`/`ReverseTransactionAsync`) — it is **stale**. `Product.PurchasePrice` IS maintained (PO add, gain adjustments).

**Unit conversion:** all flows except two (see WF-5.3, WF-5.4 gaps) convert qty/price to the base/parent unit first via `UnitConversationRepository.GetBaseUnitValuesAsync` (POS.Repository/UnitConversation/UnitConversationRepository.cs:19-65; operators Plush/Minus/Multiply/Divide).

---

## WF-5.1 — Manual Stock Adjustment (Gain/Loss) Workflow

**Endpoint:** `POST api/ProductStock` (ProductStockController.cs:24-31).
**Handler:** `POS.MediatR/ProductStock/AddProductStockCommandHandler.cs` (26-127).

1. Load taxes; collect product tax IDs + summed percentage (31-44).
2. Base-unit conversion of `Math.Abs(CurrentStock)` + `PricePerUnit` (46).
3. Build one TransactionItemDto (discount 0, PurchasePrice = base price) (48-56).
4. `CreateTransactionDto { BranchId=LocationId, TransactionType=StockAdjustment }` (58-64):
   - **Loss** (negative input): Narration `"Loss Stock Adjustment (Remove)"`, no TaxIds (66-70).
   - **Gain** (positive input): Narration `"Gain Stock Adjustment (Add)"`; also updates `Product.PurchasePrice` = base price (72-84).
5. `ProcessTransactionAsync` (86):
   - **Stock:** narration contains "Gain" ⇒ +qty else −qty; Gain also LIFO-overwrites `ProductStock.PurchasePrice`.
   - **Accounting — StockAdjustmentStrategy** (Strategies/StockAdjustmentStrategy.cs:18-106; gain detection again narration-based at L30):
     - **Gain:** Dr Inventory 1200 / Cr Stock Adjustment 5400 (income) for TotalAmount (38-47); optional Input-GST entries Dr 1150 / Cr 2100 (50-88).
     - **Loss:** Dr Stock Adjustment 5400 (expense) / Cr Inventory 1200 (92-103).
   - **TaxEntries:** Input (default switch branch).
6. **Companion payment** (88-119): `PaymentDto { TransactionType=StockAdjustment }`; Loss → Amount = |qty×price| note "Remove (Loss)"; Gain → Amount = qty×price+tax note "Add (Gain)" → FullPaymentStrategy stock-adjustment branch (FullPaymentStrategy.cs:127-162): Gain ⇒ Dr AP 2100 / Cr Cash|Bank; Loss ⇒ Dr Cash|Bank / Cr AP 2100.
7. Errors swallowed (121-124); always returns success.

**⚠ GAP:** gain/loss detection by narration substring is load-bearing in TWO places (InventoryService + StockAdjustmentStrategy) — any wording change breaks the accounting direction silently.

---

## WF-5.2 — Bulk Stock Adjustment Workflow

**Endpoint:** `POST api/ProductStock/bulk-update` (controller 38-44).
**Handler:** `BulkUpdateProductStockCommandHandler.cs` (26-156).
Same logic per item in a loop (narration embeds `ReferenceNumber` at 76/89); per-item try/catch **continues on failure** (132-135); companion payment per item (97-129).
**⚠ Code comment (138-145) documents uncertainty about whether `Product.PurchasePrice` updates get saved** (they ride on the accounting service's context-wide SaveAsync).

---

## WF-5.3 — Absolute Stock Correction (Backdoor)

**Endpoint:** `POST api/ProductStock/bulk-adjust` (controller 51-57).
**Handler:** `Handlers/BulkAdjustProductStockCommandHandler.cs` (25-40) → `ProductStockRepository.UpdateProductStockAsync` (ProductStockRepository.cs:170-202): **sets CurrentStock to an absolute value** (creates the row if missing), saves once (37).

**⚠ No Transaction, no accounting entries, no LIFO update, no unit conversion** — a raw inventory-correction backdoor that silently diverges stock from the ledger. Any stock figure set here has no journal backing.

---

## WF-5.4 — Damaged Stock Workflow

**Endpoints:** `POST api/DamagedStock` (Stock/DamagedStockController.cs:67-75); list GET (38-50) → passthrough handler.
**Command:** `AddDamagedStockCommand` (Stock/Commands/AddDamagedStockCommand.cs:9-17): Reason, ReportedId, LocationId, DamagedDate, DamagedStockItems[].
**Entity:** `DamagedStock` (POS.Data/Entities/Stock/"DamagedStock .cs" — **note the space in the filename**): ProductId, DamagedQuantity, Reason, ReportedId→User, DamagedDate, LocationId.

**Handler:** `Stock/Handlers/AddDamagedStockCommandHandler.cs` (33-99):
1. Build **one DamagedStock entity per item** (36-48), CreatedBy = current user.
2. `AddRange` + save (50-57). **⚠ No DB transaction** around steps 1-3.
3. **Accounting + stock reduction** (60-97, swallowed):
   - Per item: TransactionItemDto with `UnitPrice = productStock?.PurchasePrice ?? 0` (77 — null-safe) and `PurchasePrice = productStock.PurchasePrice` (80 — **NOT null-safe: NullReferenceException if no ProductStock row exists yet**, which the swallow then hides, killing the whole accounting block).
   - `CreateTransactionDto { Narration="Loss Damage Stock (Remove)", TransactionType=StockAdjustment }` (84-91) →
   - **Stock:** no "Gain" in narration ⇒ −DamagedQuantity. **⚠ Quantity NOT base-unit converted** (raw DamagedQuantity used at L75) — unit mismatch risk vs every other flow.
   - **Accounting:** StockAdjustmentStrategy loss branch → Dr 5400 / Cr 1200 for qty × PurchasePrice. No GST entries.
   - No companion payment (unlike manual adjustment) — inconsistent treatment of the same economic event.

---

## WF-5.5 — Stock Transfer (Branch-to-Branch) Workflow

**Endpoints:** StockTransferController.cs — GET list (27), POST create (57), GET by id (70), PUT update (88), DELETE (103).
**Handler:** `StockTransfer/Handlers/AddStockTransferCommandHandler.cs` (39-186):

1. **Begin DB transaction** (43).
2. Map → **StockTransfer**; null nav props; generate sequential `ReferenceNo` from last transfer (53-57); add; save (60-65; failure → rollback + 500).
3. **If `Status == Delivered`** (67) — transfers execute physically at creation when created as delivered:
   - Per item (83-110): base-unit conversion; `purchasePrice` read from **FromLocation's** ProductStock (87); copies that price onto ToLocation's ProductStock if the row exists (89-93); collects product tax IDs (95-98).
   - **Outbound transaction** (111-124): `{ BranchId=FromLocationId, Narration="Stock Transfer From source Branch", ReferenceNumber=ReferenceNo, TransactionType=StockTransferFromBranch }` →
     - **Strategy = SaleStrategy** (factory L26): Dr AR 1100 / Cr Sales 4100, output-GST entries, **Dr COGS 5100 / Cr Inventory 1200** (Σ qty × PurchasePrice) — an internal transfer booked as a *sale to yourself* (design quirk).
     - **Stock:** −qty on FromLocation's ProductStock.
   - **Inbound transaction** (127-131): same DTO mutated: `TransactionType=StockTransferToBranch`, BranchId=ToLocationId →
     - **Strategy = PurchaseStrategy**: Dr Inventory / Cr AP (+Input GST).
     - **Stock:** +qty on ToLocation; LIFO price = transferred cost.
   - **Shipping expense** (133-158): if `TotalShippingCharge>0` → manual **Expense** Transaction (BranchId=ToLocation) run through `ExpenseStrategy` (Dr 5300 / Cr Cash); save; failure → rollback + 500.
   - Accounting exception → rollback + exception return (161-166).
4. **Commit** (176).

### Update (deliver later) — `UpdateStockTransferCommandHandler.cs` (41-186)
1. Load transfer → 404.
2. **Guard: already Delivered** → cannot edit (50-53).
3. If request.Status == Delivered (55): runs the **identical dual-transaction + shipping flow** — but here accounting exceptions are only **logged and skipped** (145-153) → transfer can be marked Delivered while its stock/accounting silently failed (inconsistent-state risk).
4. Replaces all StockTransferItems; saves (156-182).

**⚠ GAPS:**
- **Internal transfers inflate revenue/AP:** outbound books AR+Sales+COGS, inbound books Inventory+AP — with no inter-branch elimination accounts, group-level P&L and Balance Sheet overstate revenue and liabilities by transfer value.
- **Delete performs NO stock reversal** (DeleteStockTransferCommandHandler exists without inventory compensation) — deleting a delivered transfer leaves both locations' stock wrong forever.
- In-transit state (created but not delivered) holds no stock reservation — stock stays at source until delivered.

---

## WF-5.6 — Inventory Batch Workflow (Latent / FEFO)

**Entity:** `InventoryBatch` (POS.Data/Entities/Inventory/InventoryBatch.cs:7-31): BatchNumber, ExpiryDate, ManufacturingDate, Quantity, PurchasePrice, SalesPrice, ProductId, LocationId, IsActive.

**Sole handler:** `GetInventoryBatchesQueryHandler.cs` (24-32): returns batches where `ProductId == request.ProductId && Quantity > 0 && IsActive`, **ordered by ExpiryDate ascending (FEFO)** — served by `GET` on InventoryBatchController (25).

**⚠ The batch table is inert:** nothing in the codebase ever **writes** InventoryBatches (grep: only DbSet, migrations, and this read). Batch quantities are never decremented by sales/purchases. Expiry tracking (a BRD headline feature) exists only as a read-side query over manually-populated data.

---

## WF-5.7 — Stock Visibility & Alerts Workflows

**Controller:** ProductStockController.cs:

| Route | Purpose | Handler notes |
|---|---|---|
| GET `` (64-85) | Paged stock per location | EF query |
| POST `check` (94-100) | Pre-sale stock check | Used by POS "process anyway" dialog |
| GET `stock-alert` (106-127) | Low-stock alerts | `CurrentStock <= Product.AlertQuantity`; **Dapper fast path with EF fallback** (GetProductStockAlertCommandHandler L50-124) |
| GET `count` (134-140) | Stock row count | — |

**⚠ GAP:** `ProductStockController` claim checks are commented out (L25-26, 39, 52) — the adjustment endpoints (gain/loss/bulk/absolute) are guarded only by `[Authorize]`, i.e., **any authenticated user of the tenant can mutate stock** without a specific permission claim.

---

## Consolidated Stock-Operation Matrix

| Operation | Stock effect | Accounting entries | Notes |
|---|---|---|---|
| Purchase (real PO create) | +baseQty; LIFO overwrite | Dr Inv/Cr AP; Dr InputGST/Cr AP; Dr AP/Cr DiscReceived; round-off | At creation, not receipt |
| PO Request | none | none | Requisition only |
| Mark As Received | **none** | none | Status flag only |
| PO Update (totals changed) | −old then +new | remove + recreate | Type-flip hack |
| PO Delete | −purchased qty | all related deleted | Soft delete |
| PO Return | −returned baseQty | Dr AP/Cr Inv + reversed GST etc. | Item list replaced |
| Supplier Payment | none | Dr AP / Cr Cash\|Bank | FullPaymentStrategy |
| Manual adjust Gain | +qty; LIFO | Dr Inv/Cr 5400 (+GST); Dr AP/Cr Cash | Narration-driven |
| Manual adjust Loss | −qty | Dr 5400/Cr Inv; Dr Cash/Cr AP | Narration-driven |
| Bulk adjust (absolute) | sets absolute | **none** | Backdoor |
| Damaged Stock | −raw qty (no conversion) | Dr 5400/Cr Inv | NRE risk; no payment |
| Stock Transfer (delivered) | From −qty; To +qty | From: Sale entries(!); To: Purchase entries; +Expense for shipping | No elimination |
| Sale | −baseQty | Dr AR/Cr Sales + GST + Dr COGS/Cr Inv | See WF-3.2 |
| InventoryBatch | read-only | none | Never written |

---

## Workflow Interaction Map

```
                       ┌────────────────────────────────────────┐
                       │   AccountingService.ProcessTransaction │
                       └───────────────────┬────────────────────┘
                                           │
                                           ▼
                             InventoryService.ProcessInventoryChanges
                                           │
        type-switch: Purchase+ Sale− Returns∓ Transfer± Adjust(narration)
                                           │
                                           ▼
                    ProductStock.Get-or-Create (LIFO price on Purchase/Gain)
                                           │
                                           ▼
                              ProductStock.CurrentStock += delta

 Manual paths:  ProductStock POST (gain/loss) ──┐
                bulk-update ───────────────────┤
                bulk-adjust (absolute, NO GL) ─┼──► engine or direct write
 DamagedStock POST ────────────────────────────┘
 Transfers:  StockTransfer POST (delivered) ──► 2 transactions (From/To) + optional shipping expense
```

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| I-01 | Engine | Stock save failures swallowed → silent stock/ledger drift |
| I-02 | Adjustments | Narration-substring gain/loss detection (2 places) is fragile |
| I-03 | Backdoor | Absolute bulk-adjust writes stock with no journal backing |
| I-04 | Damaged | NRE risk when no ProductStock row; no unit conversion; no payment leg; filename "DamagedStock .cs" has stray space |
| I-05 | Transfers | Internal transfers booked as sale/purchase inflate revenue+AP; no elimination accounts |
| I-06 | Transfers | Delete does not reverse stock; in-transit stock unreserved; delivered-marking can silently skip accounting |
| I-07 | Batches | Batch/expiry lifecycle never written — FEFO read over inert data (BRD feature unimplemented) |
| I-08 | Security | ProductStock mutation endpoints missing ClaimCheck (commented out) |
| I-09 | Costing | LIFO-only; no costing-method choice (FIFO/weighted-average), no cost layers |
| I-10 | Truth | Dual stock fields (Product.CurrentStock stale) — refactor to single source |
| I-11 | Reorder | Alerts are threshold-only; no auto-reorder suggestions or PO drafts |
