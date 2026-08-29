# Workflow Document 11 — Workflow Gaps & Enhancement Signals (Consolidated)

**Purpose:** Every `⚠ GAP` observed across documents 01–10, consolidated, deduplicated, and organized for enhancement planning. Each item cites its source workflow(s). This document is the direct input for defining the enhancement plan.

**Severity legend:**
- 🔴 **Critical** — data corruption/integrity risk, correctness bug in money/stock, or security exposure
- 🟠 **High** — functional gap blocking real-world use, or significant fragility
- 🟡 **Medium** — quality/UX/maintainability issue with user impact
- ⚪ **Low** — polish, hygiene, dead code

---

## 1. Data Integrity & Atomicity (the dominant theme)

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| INT-01 | 🔴 | Order + accounting + inventory are **not atomic**; accounting/inventory failures swallowed (logged only) → orders can exist with missing ledger entries or unadjusted stock | WF-3.2/3.3, WF-4.1/4.3/4.5, WF-5.1/5.4, WF-6.3 | Wrap each business-event pipeline in a single DB transaction (or outbox pattern); fail the request when the ledger/stock leg fails |
| INT-02 | 🔴 | `SaveAsync` failure checks have **empty bodies** throughout AccountingService/InventoryService | WF-6.1, WF-5.0 | Handle save failures explicitly; throw after rollback |
| INT-03 | 🔴 | Update/delete reversal uses the **type-flip hack** (mutate TransactionType → run inventory switch) — fragile; a failure between reverse and re-post **double-counts or loses stock** | WF-3.3, WF-4.3, WF-4.4 | Replace with an explicit reversal engine (`ReverseTransactionAsync` exists but is uncalled) writing mirrored entries + explicit stock deltas |
| INT-04 | 🔴 | **No server-side recalculation** — totals/taxes/discounts computed in Angular and persisted as-is; price/stock not re-verified | WF-3.1/3.2 | Recompute totals server-side; reject or flag mismatches; verify stock before commit |
| INT-05 | 🔴 | **Absolute stock correction backdoor** (`bulk-adjust`) writes CurrentStock with **no journal entries** — stock silently diverges from the ledger | WF-5.3 | Route through the transaction pipeline or require an explicit "unaccounted correction" approval |
| INT-06 | 🟠 | Overpayment not blocked (validates against full TotalAmount, not remaining balance) on both sales & purchase payments | WF-3.7, WF-4.6 | Validate against `TotalAmount − TotalPaidAmount` |
| INT-07 | 🟠 | Payment **delete status recheck double-subtracts** the amount (purchase side) | WF-4.6 | Fix recompute logic |
| INT-08 | 🟠 | Damaged stock: **NullReferenceException** when no ProductStock row exists (swallowed → whole accounting block dies silently); quantity **not base-unit converted**; no payment leg | WF-5.4 | Null-safe cost; unit conversion; align with manual-adjustment flow |
| INT-09 | 🟠 | DamagedStock writes have **no DB transaction** around rows + accounting | WF-5.4 | Transactionalize |
| INT-10 | 🟡 | Product.CurrentStock (dual stock field) is stale — only ProductStock is live | WF-5.0 | Remove or sync; single source of truth |
| INT-11 | 🟡 | Number generation from latest row → concurrency collisions (409 retry as only safety net) | WF-3.2, WF-4.1 | Sequence table / DB sequence / retry helper |

## 2. Accounting Correctness

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| ACC-01 | 🔴 | **Loan interest entry posts `LoanDetail.LoanAmount` instead of `InterestAmount`** | WF-6.3 | Fix amount source |
| ACC-02 | 🟠 | **Expense GST** computed on whole transaction total per tax and dictionary **overwrites** (multi-tax collapse) | WF-6.3 | Compute per line-item, aggregate per account |
| ACC-03 | 🟠 | Sale discount booked **Dr Discount/Cr Sales** (not against AR) → AR ≠ TotalAmount; revenue overstated (offset by expense) | WF-3.2, WF-6.4 | Book discount against AR (or document the model) |
| ACC-04 | 🟠 | **PartialPaymentStrategy dead code**; factory always returns Full; accounting-side `PaidAmount/BalanceAmount/PaymentStatus` never maintained | WF-3.7, WF-4.6, WF-6.4 | Wire partial strategy or delete; maintain transaction balances |
| ACC-05 | 🟡 | Payment transaction created with **`Id = Guid.Empty`** when TransactionId unset | WF-6.4 | Generate new id or pass parent transaction id |
| ACC-06 | 🟡 | Round-off narrations swapped (Sale says "Sale Return" and vice versa) | WF-6.3 | Fix narration strings |
| ACC-07 | 🟡 | Gain/loss detection by **narration substring** ("Gain") in two places | WF-5.0/5.1 | Explicit flag on the transaction/DTO |
| ACC-08 | 🟡 | `RefundPaymentAsync`'s accounting-entry call commented out; `CreateRefundAccountingEntriesAsync` orphaned | WF-6.4 | Consolidate refund paths |
| ACC-09 | 🟡 | CustomerLedger **delete doesn't reverse** the GL payments it dispatched | WF-8.2 | Compensating reversals or soft-delete with audit |
| ACC-10 | 🟡 | Year-end: income/expense totals not branch-filtered inside per-branch loop; P&L accounts never zeroed | WF-6.6 | Branch-aware totals; decide on account zeroing policy |
| ACC-11 | ⚪ | Dead code: `ProcessStockAdjustmentAsync`, `ReverseTransactionAsync` uncalled; commented-out partial-payment selection; PO-return old implementation blocks | WF-5/6 | Remove or wire |

## 3. Business Workflow Gaps (Functional)

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| BIZ-01 | 🔴 | **No GRN workflow** — purchase stock granted at PO creation; partial receipts impossible; MarkAsReceived cosmetic | WF-4.1/4.2 | Implement goods-receipt lines (received qty vs ordered qty); stock+accounting on receipt |
| BIZ-02 | 🟠 | **InventoryBatch lifecycle never written** — expiry/FEFO is a read over inert data (BRD headline feature unimplemented) | WF-5.6 | Batch intake on purchase, deduction on sale (FEFO), expiry alerts |
| BIZ-03 | 🟠 | **Stock transfers booked as sale/purchase to self** (AR/Sales/COGS + Inventory/AP) — no inter-branch elimination → group reports inflated | WF-5.5 | Inter-branch (elimination) accounts or transfer-specific strategy |
| BIZ-04 | 🟠 | **Stock transfer delete performs no stock reversal**; in-transit stock unreserved; marking-delivered can silently skip accounting | WF-5.5 | Reversal on delete; in-transit state; strict delivery semantics |
| BIZ-05 | 🟠 | **Storefront checkout is a stub** (MediatR send commented out; guest customer unsolved) | WF-3.5, WF-9.6 | Guest-order pipeline or customer self-registration |
| BIZ-06 | 🟠 | Sales delivery: stock deducted at order creation even when undelivered; no partial delivery | WF-3.2/3.5 | Configurable deduct-on (order vs delivery); delivery lines |
| BIZ-07 | 🟡 | No credit-limit enforcement on sales despite customer credit metadata | WF-8.1 | Check overdue+balance at order time |
| BIZ-08 | 🟡 | No return-approval workflow; no exchange (swap) handling | WF-3.6 | Approval step; exchange transaction type |
| BIZ-09 | 🟡 | No AR/AP aging reports; no reorder suggestions from alerts | WF-5.7, WF-7 | Aging buckets; auto-PO draft from reorder points |
| BIZ-10 | ⚪ | PO requests: any `POR_*` holder can convert (no approval hierarchy) | WF-4.1 | Approval workflow |

## 4. Security

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| SEC-01 | 🟠 | ProductStock mutation endpoints (gain/loss/bulk/absolute) **missing ClaimCheck** (commented out) — any authenticated user can mutate stock | WF-5.7 | Restore permission claims |
| SEC-02 | 🟠 | Electron main window `nodeIntegration:true, contextIsolation:false`; unsigned updates accepted; devtools open in login window; hard-coded cloud URL | WF-10.1/10.4 | Harden Electron config; sign updates; env-config URL |
| SEC-03 | 🟠 | License **activation trusts client-supplied purchase code** (no external verification); DUMMY_TOKEN returned; License table has no live write path | WF-2.5 | Server-verified activation; signed license files |
| SEC-04 | 🟡 | Password reset code has **no expiry**; null-check bug (`&&` on null) in ResetPasswordCommandHandler | WF-1.2 | Code TTL; fix condition |
| SEC-05 | 🟡 | No refresh tokens — 12h JWT hard expiry mid-shift | WF-1.1 | Refresh-token or sliding session for POS |
| SEC-06 | 🟡 | Anonymous tenant registration without captcha/email verification | WF-2.1 | Anti-abuse measures |
| SEC-07 | 🟡 | ApiKey middleware **writes to DB per request**; no rate limiting anywhere | WF-2.2 | Async last-used stamping (batched); rate-limit middleware |
| SEC-08 | 🟡 | Login user lookup ignores tenant-active state (`IgnoreQueryFilters`) | WF-1.1 | Post-auth tenant-active check |
| SEC-09 | ⚪ | Hangfire dashboard auth unverified | WF-9.4 | Restrict dashboard |

## 5. Reporting Consistency

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| REP-01 | 🟠 | P&L expense line = **account 5300 only** (payroll/discounts/stock-loss/round-off excluded) → misleading NetResult | WF-7.1 | Include all expense accounts (or expense-type query) |
| REP-02 | 🟡 | Trial Balance date-range-only (no FY/opening balances) vs Balance Sheet FY-scoped — same-day disagreement | WF-7.1 | Unify scoping; opening-balance integration |
| REP-03 | 🟡 | Cash Flow lacks operating/investing/financing classification | WF-7.1 | Classification mapping |
| REP-04 | 🟡 | Dashboard/server caches (24h TTL) have **no write invalidation** → stale tiles after data entry | WF-7.3, WF-9.7 | Event-based eviction on writes |
| REP-05 | ⚪ | No stock-valuation report; no custom report builder; exports client-side only (no scheduled delivery) | WF-7 | Roadmap features |

## 6. Real-Time, Jobs & Messaging

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| RT-01 | 🟡 | SignalR connection map **in-memory** — restart loss; no scale-out backplane; broadcast-pattern payloads | WF-1.6, WF-8.4, WF-9.3 | Redis backplane; targeted group sends |
| RT-02 | 🟡 | Reminder dispatch caps **10 rows / 10-min tick** → backlog; monthly day-clamping logic bug (29-31) | WF-8.4, WF-9.4 | Raise batch; fix clamping; add lag monitoring |
| RT-03 | 🟡 | Reminder fan-out window gap (jobs run 00:10–00:59 while comments claim 24h) | WF-9.4 | Align cron or per-reminder schedule |
| RT-04 | ⚪ | Email: no server-side template engine; salesOrPurchase email uses first-not-default SMTP; failures silent | WF-9.2 | Token renderer; honor IsDefault; retry/queue |
| RT-05 | ⚪ | Hangfire cleanup job disabled → storage growth | WF-9.4 | Re-enable with retention policy |

## 7. Sync & Desktop

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| SYN-01 | 🟠 | **Pull limited to 6 entity types** (purchases/expenses/payments/inventory never pulled) — asymmetric sync | WF-10.3 | Configurable entity set; symmetric pull |
| SYN-02 | 🟠 | Push-side 409 conflicts **skipped, not resolved** — changes silently never reach cloud | WF-10.3 | Apply ServerWins/MergeFields on push; queue retry |
| SYN-03 | 🟡 | No sync status UI (`/sync/status` TODO stub); no device management (list/wipe) | WF-10.3 | Sync health endpoint + UI |
| SYN-04 | 🟡 | Full-DB zip export (size unbounded); reflection-based entity copying fragile | WF-10.2 | Incremental export; typed copy pipeline |

## 8. UX / Frontend & Admin Gaps

| # | Sev | Gap | Source | Enhancement direction |
|---|-----|-----|--------|----------------------|
| UX-01 | 🟠 | **Tenant-switch token key mismatch** (`auth_token` stored vs `access_token` read) breaks post-switch auth | WF-2.3 | Fix key |
| UX-02 | 🟠 | POS unit-price operator bug (`??` precedence) — Minus/Multiply/Divide unit pricing broken | WF-3.1 | Fix expression |
| UX-03 | 🟡 | RoleMenuItem (menu CRUD permissions) **not editable post-seeding** — no admin UI | WF-1.4 | Menu-permission management screen |
| UX-04 | 🟡 | Import is all-or-nothing (no partial accept); no variant/batch/opening-stock import | WF-9.5 | Row-level accept; extended templates |
| UX-05 | ⚪ | Notifications: mark-read only (no snooze/complete) | WF-8.4 | Actionable notifications |
| UX-06 | ⚪ | Static payment-method list client-side (no tenant-managed methods) | WF-3.1 | Tenant-configurable payment methods |

---

## Suggested Enhancement Plan Skeleton (priority-ordered)

**Phase 1 — Stop the bleeding (integrity & correctness):**
INT-01, INT-02, INT-03, INT-05, ACC-01, ACC-02, UX-01, UX-02, SEC-01

**Phase 2 — Complete the core retail loop:**
BIZ-01 (GRN), BIZ-02 (batches/FEFO), BIZ-06 (delivery semantics), INT-06/07/08, ACC-03/04, BIZ-07

**Phase 3 — Trust & scale:**
SEC-02/03/05/07, SYN-01/02, RT-01/02, REP-01/02/04, INT-04 (server-side validation)

**Phase 4 — Growth features:**
BIZ-05 (storefront checkout), BIZ-09 (aging/reorder), REP-05 (valuation/custom reports), UX-03/04, BIZ-08/10

*Each item above maps to a specific workflow document section with code-level evidence — use those documents as the specification source when writing enhancement tickets.*
