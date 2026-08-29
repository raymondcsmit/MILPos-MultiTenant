# MILPOS — Master Test Case Index & Traceability

**Version:** 1.0 — August 28, 2026
**Specification source:** `New-Documents/01–10` (code-verified workflow docs) + `New-Documents/11` (gap catalog)
**Standard:** see `00_TEST_STRATEGY.md` · **Format:** `TEMPLATE_Test_Case_Catalog.md`

---

## 1. Suite Statistics

| Catalog | Domain | Cases | Gap-Char | Gap-Target (RED) |
|---|---|---:|---:|---:|
| TC-D01 | Auth & Authorization | 65 | 7 | 5 |
| TC-D02 | Multi-Tenancy & Licensing | 52 | 6 | 5 |
| TC-D03 | POS & Sales (money path) | 95 | 18 | 12 |
| TC-D04 | Purchasing | 70 | 13 | 7 |
| TC-D05 | Inventory & Stock | 70 | 19 | 9 |
| TC-D06 | Accounting & Finance (core) | 92 | 16 | 14 |
| TC-D07 | Reporting | 65 | 5 | 5 |
| TC-D08 | CRM, Inquiry & Reminder | 56 | 8 | 7 |
| TC-D09 | Infrastructure Services | 65 | 18 | 8 |
| TC-D10 | Desktop & Offline Sync | 50 | 10 | 8 |
| **Total** | | **680** | **120** | **80** |

**Layer distribution:** every case is tagged with one or more of UT / IT / PM / E2E.
**Companion plans:** `POSTMAN_COLLECTION_PLAN.md` — 340 REST endpoints (71 controllers), 366 requests, 8 runner flows, all 121 PM-layer TCs mapped. `E2E_JOURNEYS.md` — 29 journeys (J-01…J-29), smoke ≈7 min, full cloud ≈28 min, zero orphaned E2E TCs.

**TDD engine:** the 80 Gap-Target cases are RED by definition — they are the failing tests that drive the enhancement phases in `New-Documents/11`. The 120 Gap-Char cases pin current behavior so fixes can't silently regress unrelated behavior.

---

## 2. WF → Catalog Traceability (primary workflows)

| WF | Title | Catalog | Cases |
|---|---|---|---:|
| WF-1.1–1.6 | Login, password reset, users, roles/claims, profile, sessions | TC-D01 | 24/12/8/12/4/4 |
| WF-2.1–2.5 | Registration, tenant resolution, switching, trial, licensing | TC-D02 | 11/16/6/9/11 |
| WF-3.1–3.7 | POS checkout, SO CRUD, quotation, conversion, return, payments | TC-D03 | 15/23/11/6/7/16/15 |
| WF-4.1–4.6 | PO create/receive/update/delete, PO return, supplier payments | TC-D04 | 19/5/11/7/11/13 |
| WF-5.0–5.7 | Central engine, adjustments, absolute, damaged, transfers, FEFO, alerts | TC-D05 | 9/14/5/5/7/14/6/10 |
| WF-6.1–6.6 | Pipeline, COA, strategy mappings, payment engine, ledger FIFO, year-end | TC-D06 | 11/3/41/13/8/11 |
| WF-7.1–7.3 | Financial reports, operational reports (17), dashboards | TC-D07 | 29/23/13 |
| WF-8.1–8.4 | Customers/suppliers, ledger FIFO, inquiries, reminders | TC-D08 | 14/13/9/20 |
| WF-9.1–9.7 | FBR, email, SignalR, Hangfire jobs, import/export, storefront, caching | TC-D09 | 15/9/8/12/8/6/7 |
| WF-10.1–10.5 | Electron boot, DB export, sync/conflicts, auto-update, mode matrix | TC-D10 | 11/12/18/4/5 |

All 47 workflows have ≥1 Happy case; catalogs cross-reference related workflows in other domains where behavior overlaps (e.g., D06 re-verifies sale/purchase journals).

---

## 3. Gap Signal → Catalog Traceability (doc 11 → tests)

Every enhancement signal is covered by ≥1 Gap-Char and/or Gap-Target case:

| Signal(s) | Covered in | Signal(s) | Covered in |
|---|---|---|---|
| INT-01, 02, 03 | D03, D04, D05, D06 | SEC-01 | D03, D05, D09 |
| INT-04 | D03 | SEC-02 | D10 |
| INT-05 | D03, D05 | SEC-03 | D02 |
| INT-06 | D03, D04, D06 | SEC-04 | D01 |
| INT-07 | D03, D04 | SEC-05 | D01 |
| INT-08, 09, 10 | D05 | SEC-06, 07 | D02 |
| INT-11 (numbering race) | all write-path domains | SEC-08 | D01 |
| ACC-01…ACC-11 | D06 (+D03/D04/D05/D08/D09) | SEC-09 | D09 |
| BIZ-01 | D04 | REP-01…REP-05 | D07 (+D06) |
| BIZ-02 | D05 | RT-01…RT-05 | D09 (+D01/D07/D08) |
| BIZ-03 | D05, D07 | SYN-01…SYN-04 | D10 |
| BIZ-04 | D05 | UX-01 | D02 |
| BIZ-05 | D03, D09 | UX-02 | D03 |
| BIZ-06, 08 | D03 | UX-03 | D01 |
| BIZ-07 | D08 | UX-04 | D09 |
| BIZ-09 | D07 | UX-05 | D08 |
| BIZ-10 | D04 | UX-06 | D07 |

---

## 4. New Findings Beyond Doc 11 (discovered during catalog drafting)

Source-verified issues not yet in the gap catalog — each has characterization cases. Full lists in each file's **Discrepancy notes**.

| # | Severity | Finding | Found in |
|---|---|---|---|
| N-01 | 🔴 | `SyncController` has **no `[Authorize]`** — anonymous sync trigger/status | TC-D10 |
| N-02 | 🔴 | `ImportExportController`, `FBRController`, `EmailController.salesOrPurchase`, `UserHub` have **no claim/auth checks** | TC-D09 |
| N-03 | 🔴 | `Paymentreport` endpoint: no ClaimCheck, `[Authorize]` commented out | TC-D07 |
| N-04 | 🟠 | Sales return: **no server-side over-return check** — max quantity is client-only → negative `TotalAmount` persisted. Automated in `Should_AcceptOverReturn_When_QuantityExceedsOriginalSold` (Gap-Char, GREEN) | TC-D03 |
| N-05 | 🟠 | Sales-side payment-delete **double-subtracts** on Paid recheck (INT-07 analog on sales) → overpaid order becomes Partial after one delete. Automated in `Should_DoubleSubtractPaymentAmount_When_DeletingOnOverpaidOrder` (Gap-Char, GREEN) | TC-D03 |
| N-06 | 🟠 | `GET /api/sync/status` returns 200 + stub (not absent); push never advances `LastPushSync` — every push rescans since epoch | TC-D10 |
| N-07 | 🟠 | CustomerLedger **DELETE + overdue GET have no ClaimCheck**; **negative ledger amounts accepted** | TC-D08 |
| N-08 | 🟠 | `UpdateRole` NRE on unknown role id; `newOrderNumber` endpoint claimless | TC-D01, D04 |
| N-09 | 🟠 | Expired JWTs valid up to 2× lifetime (`ClockSkew = MinutesToExpiration`) | TC-D01 |
| N-10 | 🟡 | POR→PO conversion **never posts** stock/accounting (update handler gates on the existing record's request flag) | TC-D04 |
| N-11 | 🟡 | Dashboard cache TTL is **15 min** in code, not 24h as documented; daily payment breakdown has an operator-precedence bug (sums all-time) | TC-D07 |
| N-12 | 🟡 | Transfer delete **does** reverse stock via type-flip (doc said none) — but hard-deletes ledger rows, no mirrored entries, no DB transaction | TC-D05 |
| N-13 | 🟡 | Numbering quirk: `SO#00009` → `SO#000010` (digit Replace bug) | TC-D03 |
| N-14 | 🟡 | POS screen never floors totals (flooring lives in sales-order screen); POS submits unfloored totals | TC-D03 |
| N-15 | ⚪ | `DamagedStock .cs` filename typo; "Adavance Salary" narration typo; FBR backoff off-by-one (first retry 120s vs comment's 60s) | TC-D05, D06, D09 |
| N-16 | 🔴 | **PO return with refund always fails**: refund leg double-saves (PaymentService flushes UoW → handler's `SaveAsync()` = 0 rows → false failure → full rollback). Request 500s, no return data persists | Wave-1 IT (`Should_Return500AndRollBack_When_PurchaseReturnRequestsRefund`) |
| N-17 | 🟠 | **ApiAndQueriesProfiler writes every request's query logs into the main database** via a background drain — production latency + SQLite lock contention amplifier; disabled in test hosts | Test infra |
| N-18 | 🟡 | FBR staging mapper persists buyer NTN/CNIC fields even when the location is not FBR-enabled (only queueing is gated) | TC-D03/D09 IT |
| N-19 | ✅ | **SEC-04 FIXED (Wave 1 tranche 3)**: reset token now validated (`&&` → `||` in `ResetPasswordCommandHandler`); `RecoverPasswordCommandHandler` propagates inner status codes instead of flattening to 500. Gap-Target tests GREEN | `PasswordResetFlowTests` |
| N-20 | ✅ | **N-16 FIXED (Wave 1)**: PO-return refund double-save removed from `UpdatePurchaseOrderReturnCommandHandler`; Gap-Char flipped to Gap-Target, GREEN | `Should_PostRefundAndPersistReturn_When_PurchaseReturnRequestsRefund` |
| N-21 | ✅ | **NoTracking license flip FIXED (Wave 1 tranche 4)**: `ValidateLicenseCommandHandler` fetched the tenant without `.AsTracking()` on a NoTracking context, so LicenseType/SubscriptionStartDate/expiry flips were silently dropped (profile still persisted — "partial activation"). `.AsTracking()` added, RED → GREEN. Siblings still unfixed: `UpdateActivatedLicenseCommandHandler:32`, `UpdateTenantLicenseCommandHandler:38` | `TrialEnforcementTests.Should_ValidateLicense_And_ReturnDummyToken_When_PurchaseCodeProvided` |
| N-22 | 🟠 | Non-POS **PENDING sales orders deduct stock at creation** (deduction is not gated on `DELIVERED` as the catalog's S-09/BIZ-06 Gap-Target assumes). Gap-Char `Should_DeductStockAtCreation_When_DeliveryStatusIsPending` pins the current behavior | TC-D03 |
| N-23 | 🟡 | `Transaction.PaidAmount`/`BalanceAmount` are **never maintained** by the payment engine — they stay 0 while Payment entry + transaction post. TC-D03.087's ACC-04 sample (234) is wrong; actual pinned value is 0 (`Should_LeaveTransactionBalanceAmountsUnmaintained_When_PaymentSettlesOrder`) | TC-D03 |
| N-24 | 🟡 | Race on same `OrderNumber` (TC-D03.019 INT-11/S-08): **exactly-one-winner confirmed** (`Should_HaveExactlyOneWinner_When_ConcurrentCreatesShareOrderNumber`); loser returns **500**, not 409 — `UnitOfWork.SaveAsync` swallows the unique violation, handler treats 0 rows as failure | TC-D03 |
| N-25 | 🟡 | **ApiKeyLastUsedDate never persists**: `ApiKeyAuthenticationMiddleware` fetches the tenant without `.AsTracking()` while `POSDbContext` defaults to NoTracking (Startup.cs:176) → the SEC-07 "per-request write" is a silent no-op (0 UPDATEs, not the 3 the catalog assumed). Pinned in `Should_NotPersistApiKeyLastUsed_When_KeyedReadsSucceed` (Gap-Char, GREEN) | TC-D02 |
| N-26 | 🟠 | **Tenant registration rides the master-clone path**: with no configured master tenant in the DB, `SeedTenantDataAsync` falls back to CSV seeding that violates the `Actions.PageId` FK (Actions.csv is inserted before Pages.csv; immediate SQLite constraints fail where PG would order/batch differently) — registration 400s. Also `Tenants.Name` is NOT NULL (catalog payloads omit `name` → 400). Both pinned by the `RegistrationCharacterizationTests` (which configure `MasterTenant` → seeded Tenant A so the production clone path runs) | TC-D02 |

> Recommended: merge these into `New-Documents/11` when the enhancement plan is built (each already has a characterization test proving the behavior).

---

## 5. How to Use This Suite (TDD workflow)

1. **Pick the next case** from the wave plan (below) in priority order (P0 first).
2. **Write the failing test first** from the TC's Arrange/Act/Assert — exactly one test per case ID, test method named after the case. For Gap-Target cases, RED is guaranteed.
3. **Confirm RED** (or for Happy cases on existing code: the test may pass — that is fine; it then pins behavior and coverage).
4. **Implement/refactor** until GREEN. Never weaken an assertion to pass.
5. **Mark the case ID in the test's comment/namespace** so traceability stays machine-checkable.
6. **Wave plan:** W0 test infra (coverlet, CI, seed builders) → W1 P0 money/stock/security (D06, D03, D04, D05 core, D02 isolation, D01 auth) → W2 P1 CRUD → W3 D07/D08/D09/D10 → W4 Angular unit ≥90% → W5 Playwright journeys → W6 coverage gap-hunt to ≥90%.

**Definition of Done for the test suite:** every TC-Dxx.nnn has ≥1 automated test (or documented manual script for D10 manual-tier), all green except sanctioned Gap-Target REDs, coverage ≥90% enforced in CI, Postman smoke + E2E smoke wired into CI.

---

## 6. Document Map

| File | Content |
|---|---|
| `00_TEST_STRATEGY.md` | Strategy, pyramid, layers, quality charter, conventions, environments |
| `TEMPLATE_Test_Case_Catalog.md` | Binding per-case format |
| `TC-D01…TC-D10_*.md` | 680 test cases across 10 domains |
| `POSTMAN_COLLECTION_PLAN.md` | Collection structure, environments, runner flows R1–R8, coverage matrix |
| `E2E_JOURNEYS.md` | 29 Playwright journeys with page objects, seeding, execution matrix |
| `TEST_CASES_INDEX.md` | This file — statistics, traceability, new findings, usage |
