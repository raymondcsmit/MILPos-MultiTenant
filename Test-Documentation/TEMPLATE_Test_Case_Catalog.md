# TEMPLATE — Domain Test Case Catalog

> This is the binding template. Every `TC-D{xx}_*.md` file must follow this structure exactly.
> Delete this instructional block in real catalogs.

---

# TC-D0X — {Domain Name} Test Cases

**Source:** `New-Documents/{nn}_{Domain}_Workflows.md` (WF-x.1 … WF-x.n)
**Scope:** one sentence.
**Workflows covered:** WF-x.y list.
**Gap signals referenced:** INT-xx, SEC-xx … (from `New-Documents/11`)

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed) with locations L1, L2; Tenant B (isolation checks)
- Users: `admin` (all claims), `manager` (no stock claims), `cashier` (POS claims only)
- Products: P-SIMPLE (tax 17%, stock 100 @ L1), P-VARIANT (3 children), P-BATCH (batches B1 expiring)
- Open FinancialYear FY2026; Chart of Accounts per WF-6.2 (AR 1100, Cash 1050, Bank 1060, Inventory 1200, Sales 4100, COGS 5100, GST-Out 2150 child, Discount 5200, RoundOff 5900, Gain 4900, Loss 5950)
- Sales order SO-1 (Paid, cash, 2 items) and SO-2 (Credit, unpaid) where the domain needs them

---

## WF-x.y — {Workflow Title}

### TC-D0X.001 — {imperative title naming the expected outcome}
- **Layers:** UT · IT · PM · E2E (list all that apply)
- **Priority:** P0 | P1 | P2 | P3
- **Category:** Happy | Validation | Edge | Negative | Permission | Tenant-Isolation | Concurrency | Gap-Char | Gap-Target [GAP-ID]
- **Source:** WF-x.y (± doc-11 signal ID)
- **Arrange:** exact preconditions
- **Act:** exact request/action (method, endpoint, payload highlights / UI action)
- **Assert:** exact, numeric, observable expectations — status code, DB rows, journal entries (`Dr {account} / Cr {account} = amount`), stock deltas, response fields

*(repeat per case; group cases under their WF heading; keep numbering sequential across the whole domain file)*

### Rules checklist (enforced in review)
- [ ] Every WF in the domain has ≥1 Happy case
- [ ] Every write endpoint has: Validation case (bad input → 400/409), Permission case (missing claim → 403), Tenant-Isolation case (other tenant's id → 404)
- [ ] Every money/stock mutation has DB-state assertions (entries balanced, stock delta)
- [ ] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case
- [ ] Gap-Char assertions describe CURRENT behavior; Gap-Target describes DESIRED behavior (RED now)
- [ ] Concurrency case for sequential-number generation where the doc flags it (e.g., INT-11)
- [ ] Edge/boundary cases: zero, negative, max quantities, rounding remainders, multi-tax, unit conversion operators
