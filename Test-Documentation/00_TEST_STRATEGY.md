# MILPOS — Test Strategy & Test Case Documentation Standard

**Version:** 1.0 — August 28, 2026
**Source of truth:** `New-Documents/01–10` workflow documents (code-verified, with `WF-x.y` IDs) and `New-Documents/11` (gap catalog, `INT-/ACC-/BIZ-/SEC-/REP-/RT-/SYN-/UX-` IDs).
**Goal:** >90% coverage on every layer (unit, integration, E2E, Postman API runners) with tests written **before** code changes (TDD).

---

## 1. Test Pyramid & Layer Responsibilities

```
            ┌──────────────────────────┐
            │   E2E (Playwright)       │  ~40 journeys — real browser, real API, real DB
            ├──────────────────────────┤
            │   Postman API Runners    │  ~120 requests — collection-level flows, contract checks
            ├──────────────────────────┤
            │   Integration (xUnit)    │  ~500 cases — full API in-process (WebApplicationFactory
            │                          │  + SQLite), covers handler+repo+EF+middleware+authZ
            ├──────────────────────────┤
            │   Unit (xUnit)           │  ~400 cases — pure logic only: strategies, tax math,
            │                          │  totals, FEFO, FIFO, converters, validators, guards
            └──────────────────────────┘
```

**Division of labor (binding):**

| Layer | Owns | Does NOT own |
|---|---|---|
| **Unit** | Journal-entry mappings per strategy, tax/discount/round-off math, unit conversion, FEFO allocation, FIFO ledger application, validators, helper methods, gap-fix logic | HTTP, EF, serialization |
| **Integration** | Every endpoint: status codes, DB state (order rows, ProductStock deltas, AccountingEntry Dr/Cr balance, TaxEntry rows), permission 403, tenant isolation 404, duplicate 409, middleware chain | Pixel-level UI |
| **Postman** | API contract shapes (fields, enums), end-to-end API runner flows (login → sale → payment → return), environment/tenant chaining, smoke & regression suites runnable by QA without IDE | Deep DB assertions (only via follow-up GETs) |
| **E2E (Playwright)** | User journeys through the real UI: POS checkout, returns, purchases, auth, tenant switch, reports render | Exhaustive math (assert key totals only) |

**Why integration-heavy:** the app is CQRS/MediatR with 332 handlers. Mocking repositories per handler would produce thousands of brittle tests with poor real coverage. One integration test proves controller → claim check → handler → repository → EF → SQLite end-to-end. Unit tests are reserved for the money math where correctness is subtlety.

---

## 2. Test Case ID Scheme (binding)

- **Catalog ID:** `TC-D{domain}.{seq}` — e.g. `TC-D03.014` (domain 03, case 14). Sequential, zero-padded, unique per domain.
- **Domains** mirror workflow docs: D01 Auth, D02 Tenancy/Licensing, D03 POS/Sales, D04 Purchasing, D05 Inventory, D06 Accounting, D07 Reporting, D08 CRM/Inquiry/Reminder, D09 Infrastructure, D10 Desktop/Sync.
- **Layer tags** (multi-select per case): `UT` unit, `IT` integration, `PM` Postman, `E2E` Playwright.
- **Priority:** `P0` money/stock/security correctness & tenant isolation · `P1` core business functions · `P2` secondary features · `P3` polish/stubs.
- **Category:** `Happy` · `Validation` (input rejected) · `Edge` (boundary) · `Negative` (forbidden state transition) · `Permission` (403/claims) · `Tenant-Isolation` (cross-tenant invisible) · `Concurrency` (races) · `Gap-Char` (characterization of current buggy behavior) · `Gap-Target` (desired behavior, TDD RED until fix lands).

### TDD rule for gaps
Every `⚠ GAP` / enhancement signal from doc 11 that a test touches MUST be marked either:
- **`Gap-Char`** — asserts current behavior exactly as observed (guards against accidental change while refactoring), or
- **`Gap-Target [GAP-ID]`** — asserts desired post-fix behavior; **this test is RED by definition until the enhancement lands**. These are the failing tests that drive the enhancement phases.

No test may silently "fix" a gap assertion — changing Gap-Char → Gap-Target is a deliberate, reviewed act (matching my operating rules: never weaken an assertion silently).

---

## 3. Test Case Format (binding for all catalogs)

Each catalog groups cases by workflow (`WF-x.y`). Every case is a table row or block with:

```
### TC-D05.012 — Manual gain adjustment posts Gain journal and increases stock
- **Layers:** UT, IT, PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-5.1
- **Arrange:** tenant A, location L, product P (stock 10, purchasePrice 100), open FY
- **Act:** POST /inventory/gain {productId: P, qty: 5, reason: "..." } with stock-manager JWT
- **Assert (IT):** 200/201 · ProductStock.CurrentStock == 15 · Transaction(TransactionType=StockAdjustment) exists with ReferenceNumber · AccountingEntry: Dr Inventory 1200 / Cr Gain 4900, 500 · balanced (ΣDr == ΣCr) · TaxEntry rows per WF-6.3 · no Sale-type entries
- **Assert (UT):** StockAdjustmentStrategy given amount X returns exactly the two entries above
- **Assert (PM):** response body matches schema; follow-up GET /productStock reflects 15
```

Requirements for a valid test case:
1. **Observable, exact assertions** (numbers, account codes, status codes) — not "works correctly".
2. **Standalone** — a developer can write the test from the case alone.
3. **Traceable** — every case cites its WF ID; every WF must have ≥1 case; every doc-11 gap cited must appear in ≥1 Gap-Char or Gap-Target case.
4. **Reality-checked** — the "Assert" for Gap-Char cases must match the current code (verified against workflow docs' line-cited behavior), not wishful behavior.

---

## 4. Quality Charter (binding)

1. **Test behavior, not implementation** — assert DB state, HTTP responses, journal entries; never private method call counts.
2. **No tautologies** — an assertion that mirrors the production formula copied verbatim proves nothing; recompute expected values from independent constants in the test.
3. **No over-mocking** — integration tests use the real DI container + SQLite; mocks only for externals (SMTP, FBR HTTP, SignalR out).
4. **Deterministic** — no `DateTime.Now` in assertions without injecting a clock; seed DBs per test class; no cross-test coupling; parallel-safe by tenant/DB-per-factory.
5. **Failure isolation** — one logical assert-cluster per case; a red test names the broken behavior.
6. **Fast feedback** — unit suite <1 min; integration suite <10 min; Postman smoke <5 min; E2E smoke <10 min, full <45 min.
7. **Coverage gate** — backend line coverage ≥90% (coverlet), frontend ≥90% (karma-coverage), enforced in CI; excluded: `Migrations.*`, `Program.cs` bootstrap, generated code, `DiagnosticTool`, `ApiAndQueriesProfiler`, DTO property bags.

---

## 5. Naming Conventions for Test Code (planned)

- Integration: `{Feature}{Action}_Tests.cs`, method `Should_{expected}_When_{condition}()`.
- Unit: `{Subject}Tests.cs`, method `Handle_GivenX_ReturnsY()`.
- Playwright: `tests/e2e/{journey-id}-{slug}.spec.ts`, journey IDs `J-01…` defined in `E2E_JOURNEYS.md`.
- Postman: folders per domain, request names `TC-Dxx.nnn — short title` for runner traceability.

---

## 6. Environments & Test Data

| Concern | Decision |
|---|---|
| Backend integration DB | SQLite file-per-factory via existing `TestWebApplicationFactory` (SQLite mode, seeding disabled) |
| Seeding | Shared builders: `TestTenant`, `TestUsers(admin, manager, cashier)`, `TestLocation`, `TestProducts(simple, variant, batched)`, `TestChartOfAccounts`, open `FinancialYear` |
| Auth in tests | Login through the real endpoint to obtain JWT (proves WF-1.1); helpers `AdminJwt()`, `JwtFor(claimName)` |
| Postman | Environments: `local-cloud`, `local-desktop`, `staging`; variables `baseUrl`, `token`, `tenantId`, chained IDs via test scripts |
| E2E | API-bootstrapped state (seed via API calls), UI drives the journey; desktop mode optional profile |
| External services | FBR/SMTP mocked at HTTP layer in IT; FBR sandbox documented for PM/E2E manual runs |

---

## 7. What NOT to test

- EF migrations projects (`POS.Migrations.*`), `Program.cs` wiring, generated DTOs as data bags, `DiagnosticTool`, `ApiAndQueriesProfiler`, `POS.DataMigrationUtility`, Electron installer packaging.
- Third-party libraries.
- Trivial getters/setters (covered incidentally by integration assertions).

---

## 8. Execution Order (planned waves)

0. **Wave 0** — test infra (coverlet, ReportGenerator, CI, TestWebApplicationFactory helpers, seed builders) — *before any test mass*.
1. **Wave 1** — P0 cases: D06 pipeline/strategies, D03 sales/POS, D04 purchasing, D05 stock, D02 tenant isolation, D01 auth. Unit + Integration + PM for each.
2. **Wave 2** — P1 CRUD template cases across all modules.
3. **Wave 3** — D07 reports, D08 CRM/reminders, D09 infrastructure, D10 sync.
4. **Wave 4** — Angular unit tests (services/guards/components) ≥90%.
5. **Wave 5** — Playwright E2E journeys.
6. **Wave 6** — coverage gap-hunt with ReportGenerator → close to ≥90% everywhere.

**TDD enforcement:** for every new feature/fix, its Gap-Target or new TC is written and confirmed RED first, then implementation turns it GREEN. The catalogs in this folder are that specification.

---

## 9. Document Map

| File | Content |
|---|---|
| `00_TEST_STRATEGY.md` | This document — standard, charter, conventions |
| `TEMPLATE_Test_Case_Catalog.md` | The exact template per-domain catalogs follow |
| `TC-D01…TC-D10` | Per-domain exhaustive test case catalogs |
| `POSTMAN_COLLECTION_PLAN.md` | Collections, environments, folders, runner flows, contract checks |
| `E2E_JOURNEYS.md` | Playwright journey specs (J-xx) with Given/When/Then and TC traceability |
| `TEST_CASES_INDEX.md` | Master index + WF→TC and GAP→TC traceability matrices + statistics |
