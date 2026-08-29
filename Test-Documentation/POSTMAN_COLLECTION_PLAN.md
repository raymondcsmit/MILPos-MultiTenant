# MILPOS — Postman Collection Plan

**Version:** 1.0 — August 28, 2026
**Source of truth:** `00_TEST_STRATEGY.md` (§5 naming, §6 environments, §4 charter), the TC-D01…TC-D10 catalogs (PM-layer cases), and the code-verified controller inventory of `SourceCode/SQLAPI/POS.API/Controllers/` (2026-08-28).
**Deliverable this plan specifies:** one Postman collection `MILPOS API`, three environments, eight ordered runner flows, CI wiring via newman.

---

## 0. Inventory Summary (code-verified)

Extraction of every `[Route]`/`[HttpGet|HttpPost|HttpPut|HttpDelete]` attribute under `POS.API/Controllers/` (middleware files are not controllers; `HomeController` exposes only conventional MVC views and no attribute-routed endpoints):

| Measure | Count |
|---|---|
| Raw `[Http*]` attribute rows across 71 controllers | **348** |
| Route aliases (same action, second template) | −2 (`POST /api/authentication` = `POST /api/authentication/login`; bare `GET /api` = `GET /api/ProductCategories`) |
| **Distinct routes** | **346** |
| Public MVC web endpoints (Store storefront ×5, Pricing subscribe ×1) — intentionally not Postman-covered | 6 |
| **REST API endpoints the collection must cover** | **340** |
| PM-layer cases in the TC catalogs | **121** (D01 11 · D02 17 · D03 18 · D04 10 · D05 10 · D06 3 · D07 17 · D08 26 · D09 4 · D10 5) |
| Requests in the collection | **366** = 340 primary (one per endpoint) + 26 secondary (18 permission/negative variants, 8 re-verification duplicates — see §1.3) |

Route-resolution conventions used throughout: class prefix `api/[controller]` resolves to `api/<ControllerName minus "Controller">`; `api/<literal>` prefixes are used as-is; routes are case-insensitive; every listed route is shown relative to `{{baseUrl}}`.

---

## 1. Collection Structure

One collection: **`MILPOS API`** (file: `Test-Documentation/postman/MILPOS_API.postman_collection.json`).

### 1.1 Folders (mirror domains D01–D10 + Setup/Auth)

| # | Folder | Controllers inside | Endpoints | Owns PM cases |
|---|---|---|---|---|
| 0 | **Setup & Auth** | AuthenticationController (login only) | 1 | TC-D01.001, TC-D01.002, TC-D01.065 |
| 1 | **D01 Auth & Authorization** | Authentication (password flow), User, UserClaim, Role, RoleUsers, LoginAudit | 24 | 11 |
| 2 | **D02 Tenancy & Licensing** | Tenants, WrLicense, CompanyProfile | 18 | 17 |
| 3 | **D03 POS & Sales** | SalesOrder, SalesOrderPayment, DailyProductPrice | 26 | 18 |
| 4 | **D04 Purchasing** | PurchaseOrder, PurchaseOrderPayment, Supplier, SupplierSearch | 27 | 10 |
| 5 | **D05 Inventory, Stock & Product Master** | Product, ProductCategory, Brand, UnitConversation, Variant, Tax, Location, ProductStock, InventoryBatch, DamagedStock, StockTransfer | 51 | 10 |
| 6 | **D06 Accounting & Finance** | GeneralEntry, LedgerAccount, Loan, PayRoll, Transaction, TransactionItem, YearEndClosing, FinancialYear, Expense, ExpenseCategory, Currency | 37 | 3 |
| 7 | **D07 Reporting** | Reports, DailyReport, Dashboard | 25 | 17 |
| 8 | **D08 CRM, Inquiry, Reminder & Notifications** | Customer, CustomerSearch, CustomerLedger, Inquiry, InquiryActivity, InquiryAttachment, InquiryNote, InquirySource, InquiryStatus, Reminder, ReminderScheduler, Notification | 55 | 26 |
| 9 | **D09 Infrastructure & Services** | ImportExport, Email, EmailSMTPSetting, EmailLog, EmailTemplate, FBR, ContactUs, City, Country, Language, MenuItems, Page, PageHelper, Action, TableSettings, NLog | 74 | 4 |
| 10 | **D10 Desktop & Sync** | Sync (plus D02's `export-sqlite` / `my-database` cross-referenced) | 2 | 5 |

Sub-organization: inside each domain folder, one sub-folder per controller, then per workflow. Gap requests stay in their domain sub-folder and are flagged in the name (`[Gap-Char]` / `[Gap-Target]`) so runner output is self-explaining (§6).

### 1.2 Request naming (binding, per strategy §5)

- Every request is named **`TC-Dxx.nnn — short title`** (em dash, single space). The Collection Runner output column then reads as a traceable TC list.
- The TC ID is the **primary catalog case** that owns the assertion cluster for that request.
- Endpoints that have no dedicated PM case carry the domain's **umbrella contract case** with a `(contract)` suffix in the title. Umbrellas:

| Domain | Umbrella contract case | Rationale |
|---|---|---|
| D01 | `TC-D01.065` | PM runner chains login token; contract shapes |
| D02 | `TC-D02.051` | PM end-to-end register→login→write→activate runner |
| D03 | `TC-D03.095` | "Postman contract shapes: create-sale response, enums, numbering" |
| D04 | `TC-D04.067` | PM runner with chained environment + contract checks |
| D05 | `TC-D05.067` | "stock-alert and count contracts" (adjustments have own cases .018/.019/.024/.028/.040/.053) |
| D06 | `TC-D06.090` | "journal verification runner: create sale, then GET the transaction by reference" |
| D07 | `TC-D07.001` (TB) — reports have their own cases; dashboard umbrella `TC-D07.053` | 17 dedicated PM cases |
| D08 | `TC-D08.025` (customer/ledger runner); inquiry umbrella `TC-D08.028`; reminder umbrella `TC-D08.037`; notification umbrella `TC-D08.051` | 26 dedicated PM cases |
| D09 | `TC-D09.049` (export/download contract) — settings CRUD is contract-only | FBR (.003/.014), export (.049), hangfire probe (.042) have own cases |
| D10 | `TC-D10.035` / `TC-D10.036` | sync contract + stub characterization |

Example names:
- `TC-D03.016 — POST salesOrder (POS cash sale 2×P-A)` — dedicated case
- `TC-D03.095 (contract) — GET salesOrder/total` — umbrella contract coverage
- `TC-D02.009 — [Gap-Char] register accepts anonymous signup` — gap characterization
- `TC-D03.094 — GET salesOrder re-verify (post-payment)` — deliberate duplicate (§1.3)

### 1.3 Request accounting (366 total)

1. **340 primary requests** — exactly one per REST endpoint (§8 matrix). Every endpoint appears in ≥1 request.
2. **18 secondary permission/negative-variant requests** — same URL as their primary, different token or payload, named by the owning case:

| Request | Hits endpoint | Token | Expected |
|---|---|---|---|
| `TC-D01.002 — login wrong password (401)` | POST /api/authentication/login | — | 401 |
| `TC-D01.012 — ClaimCheck 403 generic (GET customer, claimless)` | GET /api/Customer | {{tokenNone}} | 403 |
| `TC-D01.039 — POST /api/User without USR_ADD_USER (403)` | POST /api/User | {{tokenNone}} | 403 |
| `TC-D01.047 — POST /api/Role without ROLES_ADD_ROLE (403)` | POST /api/Role | {{tokenNone}} | 403 |
| `TC-D01.060 — POST /api/CompanyProfile without SETT_UPDATE_COM_PROFILE (403)` | POST /api/CompanyProfile | {{tokenNone}} | 403 |
| `TC-D02.029 — switch without SuperAdmin policy (403)` | POST /api/Tenants/{id}/switch | {{token}} | 403 |
| `TC-D02.009 — [Gap-Char] register anonymous (no captcha)` | POST /api/Tenants/register | — | 200/201 |
| `TC-D02.010 — [Gap-Target] register requires anti-abuse token (RED)` | POST /api/Tenants/register | — | 4xx (target) |
| `TC-D02.045 — [Gap-Char] activate_license trusts any purchase code` | POST /api/CompanyProfile/activate_license | {{token}} | 200 (current) |
| `TC-D03.036 — POST salesOrder without claims (403)` | POST /api/SalesOrder | {{tokenNone}} | 403 |
| `TC-D03.054 — DELETE salesOrder without claims (403)` | DELETE /api/SalesOrder/{id} | {{tokenNone}} | 403 |
| `TC-D03.059 — PUT salesOrder without claims (403)` | PUT /api/SalesOrder/{id} | {{tokenNone}} | 403 |
| `TC-D03.077 — PUT return without SO_RETURN_SO (403)` | PUT /api/SalesOrder/{id}/return | {{tokenNone}} | 403 |
| `TC-D03.092 — POST salesOrderPayment without SO_ADD_SO_PAYMENT (403)` | POST /api/SalesOrderPayment | {{tokenNone}} | 403 |
| `TC-D04.011 — POST purchaseOrder without PO_ADD_PO (403)` | POST /api/PurchaseOrder | {{tokenNone}} | 403 |
| `TC-D08.010 — supplier write without claim (403)` | POST /api/Supplier | {{tokenNone}} | 403 |
| `TC-D10.014 — export-sqlite without SuperAdmin (403)` | POST /api/Tenants/{id}/export-sqlite | {{token}} | 403 |
| `TC-D08.012 — [Gap-Target] order blocked when overdue > credit limit (RED)` | POST /api/SalesOrder | {{token}} | 409 (target) |

3. **8 re-verification duplicate requests** — the Collection Runner executes each request once per run, so flows that must *re-read* state after a mutation use a named duplicate instead of re-running the original:

| Duplicate request | Purpose |
|---|---|
| `TC-D03.094 — GET productStock re-verify (post-sale)` | stock decreased by sold qty (R3) |
| `TC-D03.094 — GET salesOrder re-verify (post-payment)` | PaymentStatus flipped (R3) |
| `TC-D03.094 — GET transaction re-verify (post-return)` | mirrored entries exist (R3) |
| `TC-D04.067 — GET productStock re-verify (post-PO)` | stock granted at PO creation (R4) |
| `TC-D04.067 — GET productStock re-verify (post-return)` | stock subtracted by PO return (R4) |
| `TC-D05.053 — GET productStock re-verify (post-transfer @ L2)` | received location incremented (R5) |
| `TC-D06.091 — GET salesOrder re-verify (post-refund)` | return/refund state (R6) |
| `TC-D02.051 — GET productStock re-verify (tenant B)` | tenant isolation of stock rows (R2) |

---

## 2. Environments

Files: `Test-Documentation/postman/environments/{local-cloud,local-desktop,staging}.postman_environment.json` (per strategy §6). `baseUrl` points at the ASP.NET Core API host; the cloud profile and the desktop (SQLite) profile differ only in `baseUrl`, `mode`, and `apiKey` — confirm the exact ports from `POS.API/Properties/launchSettings.json` at build time.

| Variable | Type | local-cloud | local-desktop | staging | Purpose |
|---|---|---|---|---|---|
| `baseUrl` | default | `http://localhost:5000` | `http://localhost:5001` | `https://staging-api.milpos.example` (placeholder) | API root (cloud profile vs desktop SQLite profile) |
| `mode` | default | `cloud` | `desktop` | `staging` | Guard for R8 (sync) scripts |
| `token` | secret (chained) | — | — | — | JWT of the current actor; set by login test script (§3.1) |
| `tokenLimited` | secret (chained) | — | — | — | JWT of a claim-poor user (`cashier-l1` / `none`) for 403 variants |
| `tokenNone` | secret (chained) | — | — | — | JWT with no POS/SO/PO claims at all |
| `refreshToken` | secret | `""` | `""` | `""` | **Placeholder — no refresh endpoint exists in the current API surface** (TC-D01.016 is Gap-Target/RED). Kept so a future `/refresh` slots in without collection changes |
| `apiKey` | secret | — | set | — | `X-API-Key` for the desktop sync client (TC-D02.021) |
| `impersonateTenantId` | default | — | — | — | SuperAdmin `X-Tenant-ID` header channel (TC-D02.016/017) |
| `tenantId` | chained | — | — | — | Current tenant (from login/register response) |
| `tenantIdB` | default | set | set | — | Second tenant for isolation runs (R2) |
| `userId` / `userIdLimited` | chained | — | — | — | From login / user create |
| `adminUsername` / `adminPassword` | secret | `admin` / set | `admin` / set | from CI vars | Login seeds |
| `cashierUsername` / `cashierPassword` | secret | set | set | from CI vars | Limited-token login |
| `locationId` / `locationId2` | default | set | set | — | L1 (POS) and L2 |
| `productIds` | default | set | set | — | CSV list of seeded product IDs (runner data loop) |
| `productId` / `productNoTaxId` / `variantProductId` / `batchedProductId` | chained/default | — | — | — | P-A / P-B / P-VARIANT / batched (catalog seed, D03 preamble) |
| `unitId` / `unitDozenId` | default | — | — | — | Base PC and child DZ unit |
| `taxIds` | default | set | set | — | GST-17, PST-5 IDs |
| `categoryId` / `brandId` / `currencyId` / `countryId` / `cityId` / `languageId` | chained | — | — | — | Master-data chaining |
| `customerId` / `walkInCustomerId` | chained/default | — | — | — | C-REG / C-WALK |
| `supplierId` | chained | — | — | — | From supplier create (R4) |
| `salesOrderNumber` / `salesOrderId` | chained | — | — | — | **The core chain** — set by POST salesOrder, read by payment/return/GET/transaction-lookup (§3.2) |
| `salesOrderId2` / `salesOrderNumber2` | chained | — | — | — | Credit order SO-2 (payment step of R3) |
| `salesOrderRequestId` | chained | — | — | — | Quotation/SOR (IsSalesOrderRequest=true) |
| `salesOrderPaymentId` / `purchaseOrderPaymentId` | chained | — | — | — | Payment delete cases |
| `purchaseOrderNumber` / `purchaseOrderId` | chained | — | — | — | R4 chain |
| `stockTransferId` / `damagedStockId` | chained | — | — | — | R5 chain |
| `transactionId` | chained | — | — | — | From `GET /api/Transaction?reference=…` (R6) |
| `financialYearId` / `ledgerAccountId` / `expenseId` / `expenseCategoryId` / `generalEntryId` / `loanId` / `payrollId` | chained | — | — | — | D06 chaining |
| `customerLedgerId` / `inquiryId` / `inquirySourceId` / `inquiryStatusId` / `reminderId` / `reminderSchedulerId` | chained | — | — | — | R7 chain |
| `fbrSalesOrderId` | chained | — | — | — | FBR submit/status (R8/cloud only) |
| `emailSmtpId` / `emailTemplateId` / `menuItemId` / `pageId` / `pageHelperId` / `actionId` / `tableSettingScreen` | chained/default | — | — | — | D09 chaining |
| `reportFromDate` / `reportToDate` | default | `2026-01-01` / `2026-12-31` | same | same | Report windows (D07) |
| `gapFixMode` | default | `false` | `false` | `false` | Flipped to `true` when a Gap-Target fix lands; scripts use it to flip expected-RED assertions deliberately (§6) |
| `pageSize` | default | `10` | `10` | `10` | Paged-list queries |

Secrets are never committed: environment files ship with empty secret values; CI injects them via `newman -e` + `--env-var` overrides (§7).

### 2.1 Auth chaining (how `[ClaimCheck]` requests authenticate)

1. **`Setup & Auth → TC-D01.001 — POST authentication/login`** sends `{ "userNameOrEmail": "{{adminUsername}}", "password": "{{adminPassword}}" }` and its **Tests** script stores the JWT and identity into *collection* variables (collection scope survives environment switches — required by TC-D02.051's tenant-header switching):

```javascript
pm.test("login 200", () => pm.response.to.have.status(200));
const j = pm.response.json();
const auth = j.data ?? j; // UserAuthDto (defensive unwrap of the API envelope)
pm.test("UserAuthDto shape", () => {
  pm.expect(auth).to.include.keys(["token"]);           // extend after first contract pass
  pm.expect(String(auth.token)).to.have.length.above(20);
});
pm.collectionVariables.set("token", auth.token ?? auth.Token);
pm.collectionVariables.set("refreshToken", auth.refreshToken ?? "");
pm.collectionVariables.set("userId", auth.userId ?? auth.id ?? "");
pm.collectionVariables.set("tenantId", auth.tenantId ?? auth.TenantId ?? "");
```

2. **Every protected request** uses header `Authorization: Bearer {{token}}`. The middleware chain (tenant resolution → JWT → `[ClaimCheck]`) then runs server-side.
3. **`[ClaimCheck]`-protected requests** require the named claim with value `"true"` (verified by TC-D01.012). The three-token pattern exercises this:
   - `{{token}}` — admin: all claims → happy paths;
   - `{{tokenLimited}}` — `cashier-l1`: only `POS_POS`, restricted `LocationIds` → location-scope cases;
   - `{{tokenNone}}` — authenticated, no domain claims → every 403 variant (§1.3).
   Claim-less logins run as separate requests in `Setup & Auth` (`TC-D01.001 — login as cashier-l1`, `— login as claimless user`) whose scripts set `tokenLimited` / `tokenNone`.
4. **`X-API-Key: {{apiKey}}`** authenticates the desktop sync client without a JWT (TC-D02.021, R8). **`X-Tenant-ID: {{impersonateTenantId}}`** is the SuperAdmin impersonation channel (TC-D02.016/017) — scripts must clear it afterwards (`pm.request.headers.unset` pattern lives in the folder-level pre-request script of D02).

---

## 3. Variable-Chaining Conventions

**Rule:** a request that *creates* state stores its identifiers into **collection** variables in the `Tests` script; downstream requests reference them as `{{variable}}` in URL, query, and body. Collection scope (not environment scope) is mandatory so that TC-D02.051-style tenant-header switching inside one run keeps the chain intact.

### 3.1 Standard capture snippet

```javascript
// Any POST create — Tests tab
pm.test("created", () => pm.expect([200, 201]).to.include(pm.response.code));
const j = pm.response.json();
if (j.data && j.data.id) pm.collectionVariables.set("<entity>Id", j.data.id);
```

### 3.2 Concrete chain — POS sale flow (R3, TC-D03.094)

| Step | Request | Sets | Reads |
|---|---|---|---|
| 1 | `TC-D03.021 — GET salesOrder/newOrderNumber/true` | `pm.collectionVariables.set("nextSoNumber", pm.response.json().data)` (string or `{data}` — confirmed on first pass) | — |
| 2 | `TC-D03.016 — POST salesOrder (POS cash sale 2×P-A)` | `salesOrderId`, `salesOrderNumber`; asserts `totalAmount === 234.00`, `totalPaidAmount === 234.00` (auto-payment) | `{{productId}}`, `{{taxIds}}`, `{{locationId}}`, `{{customerId}}` |
| 3 | `TC-D03.095 (contract) — GET salesOrder/{id}` | — | `{{salesOrderId}}` |
| 4 | `TC-D06.090 — GET Transaction?reference={{salesOrderNumber}}` | `transactionId` | `{{salesOrderNumber}}` |
| 5 | `TC-D03.079 — POST salesOrderPayment (credit SO-2, 234.00)` | `salesOrderPaymentId`; asserts Dr Cash / Cr AR lines in follow-up GET | `{{salesOrderId2}}` |
| 6 | `TC-D03.066 — PUT salesOrder/{id}/return` | — | `{{salesOrderId}}` |
| 7 | `TC-D03.066 — GET transaction re-verify (post-return)` | — | `{{salesOrderNumber}}` |

Capture script for the POST (step 2) — the reference example for all chains:

```javascript
pm.test("201/200 created", () => pm.expect([200, 201]).to.include(pm.response.code));
const j = pm.response.json();
pm.test("sale math persisted (S1: 2×P-A @100, GST 17%)", () => {
  pm.expect(j.data.totalAmount).to.eql(234.00);       // floored grand total
  pm.expect(j.data.totalTax).to.eql(34.00);
  pm.expect(j.data.totalPaidAmount).to.eql(234.00);   // cash auto-payment settles in full
});
pm.collectionVariables.set("salesOrderId", j.data.id);
pm.collectionVariables.set("salesOrderNumber", j.data.orderNumber ?? j.data.OrderNumber);
```

Downstream URL examples:
- GET order: `{{baseUrl}}/api/SalesOrder/{{salesOrderId}}`
- Payment: `POST {{baseUrl}}/api/SalesOrderPayment` body `{ "salesOrderId": "{{salesOrderId2}}", "amount": 234.00, "paymentMethod": "Cash" }`
- Return: `PUT {{baseUrl}}/api/SalesOrder/{{salesOrderId}}/return`
- Journal lookup (R6): `GET {{baseUrl}}/api/Transaction?reference={{salesOrderNumber}}`

**Cleanup:** folder-level teardown scripts (`pm.collectionVariables.unset`) reset `salesOrderId`, `salesOrderNumber`, `purchaseOrderId`, … at the end of each flow folder so a failed run cannot poison the next one.

---

## 4. Contract Checks (standard snippets, applied per request)

Every request carries a `Tests` script assembled from these named blocks. "Schema-lite" = assert the fields the PM case names — never the whole DTO (charter §4.1: test behavior, not implementation).

```javascript
// CC-1 — status code
pm.test("status 200", () => pm.response.to.have.status(200));

// CC-2 — envelope unwraps (BaseController.ReturnFormattedResponse)
const j = pm.response.json();
pm.test("envelope has data", () => pm.expect(j).to.have.property("data"));

// CC-3 — schema-lite key fields (example: sales order)
pm.test("sale shape", () => {
  pm.expect(j.data).to.include.keys(["id", "orderNumber", "totalAmount", "paymentStatus"]);
  pm.expect(j.data.orderNumber).to.match(/^SO-/);          // SOR returns /SOR-/ (TC-D03.021)
});

// CC-4 — response-time budget (charter: Postman smoke <5 min overall; per-request guard)
pm.test("responds under 1500ms", () => pm.expect(pm.response.responseTime).to.be.below(1500));
// Reports/dashboard budget is 3000ms (aggregation endpoints): use .to.be.below(3000)

// CC-5 — paged-list contract (X-Pagination + rows)
pm.test("paged list", () => {
  pm.expect(pm.response.headers.get("X-Pagination")).to.exist;
  pm.expect(j.data).to.be.an("array").and.have.length.above(0);
});

// CC-6 — error contract (Validation/Negative cases)
pm.test("409 conflict with error payload", () => {
  pm.response.to.have.status(409);
  pm.expect(j.errors ?? j.message).to.exist;
});

// CC-7 — journal balance (R6 — recompute from response bodies, charter §4.2)
const items = pm.response.json().data;
const sum = (k) => items.reduce((s, i) => s + (Number(i[k]) || 0), 0);
pm.test("ΣDr == ΣCr", () =>
  pm.expect(sum("debitAmount").toFixed(2)).to.eql(sum("creditAmount").toFixed(2)));

// CC-8 — tenant isolation (cross-tenant read is invisible)
pm.test("cross-tenant is 404/empty", () => {
  pm.expect([404, 200]).to.include(pm.response.code);
  if (pm.response.code === 200) pm.expect(j.data).to.satisfy(
    (d) => d === null || (Array.isArray(d) && d.length === 0));
});

// CC-9 — enum contract (example: DeliveryStatus)
pm.test("delivery status enum", () =>
  pm.expect(["Pending", "Delivered", "Returned"]).to.include(j.data.deliveryStatus));
```

Application rules:
- **Every request** gets CC-1 + CC-4. Happy/`Happy`/`Edge` cases add CC-2/CC-3; paged lists add CC-5; `Validation`/`Negative` add CC-6; `Tenant-Isolation` add CC-8; accounting-verification requests add CC-7.
- Timings: 1500 ms default, 3000 ms for reports/dashboard/journal aggregation.
- Snippets must run under newman (no `pm.gui`-only APIs).

---

## 5. Runner Flows (ordered)

Runners are folders selected in the Collection Runner / newman `--folder`. Each flow's requests are already in execution order inside their folder. Statuses are exact per the catalogs.

### R1 — Auth smoke (`Setup & Auth` + `D01`) — runs on every PR, <2 min

| # | Request (TC) | Method & URL | Expected | Script asserts (status · field · timing) |
|---|---|---|---|---|
| 1 | TC-D01.001 — login (admin) | POST `/api/authentication/login` | 200 | CC-1 · `token` length >20; sets `token`,`userId`,`tenantId` · 1500 |
| 2 | TC-D01.001 — login as cashier-l1 | POST `/api/authentication/login` | 200 | sets `tokenLimited` · 1500 |
| 3 | TC-D01.001 — login as claimless user | POST `/api/authentication/login` | 200 | sets `tokenNone` · 1500 |
| 4 | TC-D01.002 — login wrong password (401) | POST `/api/authentication/login` | 401 | CC-1 · generic message (no user enumeration) · 1500 |
| 5 | TC-D01.065 (contract) — GET profile | GET `/api/User/profile` | 200 | CC-3: `id`,`userName` · 1500 |
| 6 | TC-D01.065 (contract) — GET GetAllUsers | GET `/api/User/GetAllUsers` | 200 | CC-5 · 1500 |
| 7 | TC-D01.012 — ClaimCheck 403 generic | GET `/api/Customer` w/ `{{tokenNone}}` | 403 | CC-1 · 1500 |
| 8 | TC-D01.057 — GET CompanyProfile anonymously | GET `/api/CompanyProfile` (no auth) | 200 | CC-2 · navigation data present · 1500 |
| 9 | TC-D01.065 — token hygiene check | GET `/api/User/GetAllUsers` w/ `Authorization: Bearer deadbeef` | 401 | bad token flagged (TC-D01.065) · 1500 |

### R2 — Tenant isolation (`D02`) — nightly

| # | Request (TC) | Method & URL | Expected | Script asserts |
|---|---|---|---|---|
| 1 | TC-D02.001 — register tenant B | POST `/api/Tenants/register` | 200/201 | 14-day trial, ApiKey returned; sets `tenantIdB` · 3000 |
| 2 | TC-D02.004 — duplicate subdomain | POST `/api/Tenants/register` | 400 | CC-6 · 1500 |
| 3 | TC-D02.009 — [Gap-Char] anonymous signup | POST `/api/Tenants/register` | 200/201 | current abuse surface (GREEN) · 1500 |
| 4 | TC-D02.010 — [Gap-Target] anti-abuse token (RED) | POST `/api/Tenants/register` | 4xx target | non-blocking run (§6) · 1500 |
| 5 | TC-D02.051 — login tenant B admin | POST `/api/authentication/login` | 200 | sets `token` context for B · 1500 |
| 6 | TC-D02.051 — trial write allowed | POST `/api/Product` (B) | 200/201 | active-trial write (TC-D02.034) · 1500 |
| 7 | TC-D02.018 — cross-tenant GET by id | GET `/api/Customer/{{customerId}}` (A's id, B's token) | 404 | CC-8 · 1500 |
| 8 | TC-D02.018 — cross-tenant list empty | GET `/api/SalesOrder` (B sees none of A's) | 200 empty | CC-8 · 1500 |
| 9 | TC-D02.051 — GET productStock re-verify (tenant B) | GET `/api/ProductStock?productId={{productId}}` | 200 | B sees no A stock rows · 1500 |
| 10 | TC-D02.017 — non-SuperAdmin X-Tenant-ID ignored | GET `/api/Customer` + `X-Tenant-ID: {{tenantId}}` | 200 | only B rows (claim wins) · 1500 |
| 11 | TC-D02.016 — SuperAdmin X-Tenant-ID resolves target | GET `/api/Customer` + SuperAdmin token + header | 200 | A rows visible · 1500 |
| 12 | TC-D02.027 — SuperAdmin switch | POST `/api/Tenants/{{tenantId}}/switch` | 200 | token+tenantId returned, JWT bound to target; sets `token` · 1500 |
| 13 | TC-D02.029 — switch without SuperAdmin (403) | POST `/api/Tenants/{{tenantId}}/switch` | 403 | CC-6 · 1500 |
| 14 | TC-D02.035 — expired trial read-only | GET then POST as expired tenant | read 200 / write 403 | exact 403 payload · 1500 |

### R3 — Full sales loop (`D03` + reads) — nightly, the money path (TC-D03.094)

| # | Request (TC) | Method & URL | Expected | Script asserts |
|---|---|---|---|---|
| 1 | TC-D01.001 — login | POST `/api/authentication/login` | 200 | §2.1 · 1500 |
| 2 | TC-D05.067 (contract) — POST Product | POST `/api/Product` (P-A) | 200/201 | sets `productId`; salesPrice 100, GST-17 · 1500 |
| 3 | TC-D05.018 (contract) — POST ProductStock | POST `/api/ProductStock` (L1, qty 100) | 200/201 | seed stock · 1500 |
| 4 | TC-D05.067 (contract) — GET ProductStock | GET `/api/ProductStock?productId={{productId}}&locationId={{locationId}}` | 200 | `currentStock === 100` · 1500 |
| 5 | TC-D05.065 — POST productStock/check (sufficient) | POST `/api/ProductStock/check` | 200 | `sufficient true` · 1500 |
| 6 | TC-D05.065 — [Gap-Char] check insufficient flags only | POST `/api/ProductStock/check` (request 10, stock 5) | 200 | shortfall flagged, **no** hard block (advisory, INT-01) · 1500 |
| 7 | TC-D03.021 — GET newOrderNumber/true | GET `/api/SalesOrder/newOrderNumber/true` | 200 | `SO-` pattern; sets `nextSoNumber` · 1500 |
| 8 | TC-D03.016 — POST salesOrder (POS cash sale) | POST `/api/SalesOrder` | 200/201 | §3.2 math (234.00/34.00/paid); sets `salesOrderId`,`salesOrderNumber` · 1500 |
| 9 | TC-D03.018 — duplicate OrderNumber 409 | POST `/api/SalesOrder` | 409 | CC-6 · 1500 |
| 10 | TC-D03.095 (contract) — GET salesOrder/{id} | GET `/api/SalesOrder/{{salesOrderId}}` | 200 | CC-3, CC-9 · 1500 |
| 11 | TC-D03.095 (contract) — GET salesOrder/{id}/items | GET `/api/SalesOrder/{{salesOrderId}}/items` | 200 | 2 rows × P-A · 1500 |
| 12 | TC-D06.090 — GET Transaction by reference | GET `/api/Transaction?reference={{salesOrderNumber}}` | 200 | 5 entries; sets `transactionId` · 3000 |
| 13 | TC-D06.090 (contract) — GET transactionItem/{id} | GET `/api/TransactionItem/{{transactionId}}` | 200 | CC-7 ΣDr==ΣCr · 1500 |
| 14 | TC-D03.094 — GET productStock re-verify (post-sale) | GET `/api/ProductStock?…` | 200 | `currentStock === 98` · 1500 |
| 15 | TC-D03.056 — POST salesOrder (request/SOR, no postings) | POST `/api/SalesOrder` `IsSalesOrderRequest=true` | 200/201 | no stock movement, no entries; sets `salesOrderRequestId` · 1500 |
| 16 | TC-D03.016 (contract) — POST salesOrder (credit SO-2) | POST `/api/SalesOrder` credit | 200/201 | Pending; sets `salesOrderId2`,`salesOrderNumber2` · 1500 |
| 17 | TC-D03.079 — POST salesOrderPayment (SO-2) | POST `/api/SalesOrderPayment` | 200/201 | Dr Cash / Cr AR; sets `salesOrderPaymentId` · 1500 |
| 18 | TC-D03.094 — GET salesOrder re-verify (post-payment) | GET `/api/SalesOrder/{{salesOrderId2}}` | 200 | PaymentStatus Paid · 1500 |
| 19 | TC-D03.081 — payment above total rejected | POST `/api/SalesOrderPayment` (amount > total) | 409 | CC-6 · 1500 |
| 20 | TC-D03.066 — PUT salesOrder/{id}/return | PUT `/api/SalesOrder/{{salesOrderId}}/return` | 200 | mirrored entries, restock, refund · 1500 |
| 21 | TC-D03.066 (contract) — GET returnItems | GET `/api/SalesOrder/{{salesOrderId}}/returnItems` | 200 | returned rows · 1500 |
| 22 | TC-D03.094 — GET transaction re-verify (post-return) | GET `/api/Transaction?reference=…` | 200 | SaleReturn mirrored entries present · 3000 |
| 23 | TC-D03.092 (contract) — DELETE salesOrderPayment | DELETE `/api/SalesOrderPayment/{{salesOrderPaymentId}}` | 200 | reversal asserted via follow-up GET total · 1500 |

### R4 — Purchase loop (`D04`) — nightly (TC-D04.067)

| # | Request (TC) | Method & URL | Expected | Script asserts |
|---|---|---|---|---|
| 1 | TC-D08.009 (contract) — POST Supplier | POST `/api/Supplier` | 200/201 | sets `supplierId` · 1500 |
| 2 | TC-D04.067 (contract) — GET newOrderNumber/false | GET `/api/PurchaseOrder/newOrderNumber/false` | 200 | `PO-` pattern; sets number · 1500 |
| 3 | TC-D04.001 — POST purchaseOrder | POST `/api/PurchaseOrder` | 200/201 | PurchaseStrategy journal; stock granted at creation; sets `purchaseOrderId`,`purchaseOrderNumber` · 1500 |
| 4 | TC-D04.067 — GET productStock re-verify (post-PO) | GET `/api/ProductStock?…` | 200 | stock increased by PO qty · 1500 |
| 5 | TC-D04.009 — duplicate PO number 409 | POST `/api/PurchaseOrder` | 409 | CC-6 · 1500 |
| 6 | TC-D04.016 — POST purchaseOrder (POR) | POST `/api/PurchaseOrder` request flag | 200/201 | no accounting, no stock · 1500 |
| 7 | TC-D04.020 — PUT markasreceived | PUT `/api/PurchaseOrder/{{purchaseOrderId}}/markasreceived` | 200 | DeliveryStatus flips only; idempotent second call 200 · 1500 |
| 8 | TC-D04.054 — POST purchaseOrderPayment (partial) | POST `/api/PurchaseOrderPayment` | 200/201 | Dr AP / Cr Cash; status Pending→Partial; sets `purchaseOrderPaymentId` · 1500 |
| 9 | TC-D04.056 — payment above total rejected | POST `/api/PurchaseOrderPayment` | 409 | CC-6 · 1500 |
| 10 | TC-D04.067 (contract) — GET purchaseOrderPayment/{id} | GET `/api/PurchaseOrderPayment/{{purchaseOrderId}}` | 200 | rows listed · 1500 |
| 11 | TC-D04.043 — PUT purchaseOrder/{id}/return | PUT `/api/PurchaseOrder/{{purchaseOrderId}}/return` | 200 | mirrored entries, stock decreased, supplier refund · 1500 |
| 12 | TC-D04.067 — GET productStock re-verify (post-return) | GET `/api/ProductStock?…` | 200 | stock back to pre-PO · 1500 |
| 13 | TC-D04.036 — DELETE purchaseOrder | DELETE `/api/PurchaseOrder/{{purchaseOrderId}}` | 200 | reversal (stock subtracted, entries removed) · 1500 |

### R5 — Inventory adjustments loop (`D05`) — nightly

| # | Request (TC) | Method & URL | Expected | Script asserts |
|---|---|---|---|---|
| 1 | TC-D05.018 — POST productStock (gain) | POST `/api/ProductStock` gain | 200/201 | Dr Inventory / Cr Stock Adjustment; stock +5; GET verify (CC via body) · 1500 |
| 2 | TC-D05.019 — [loss variant] POST productStock | POST `/api/ProductStock` loss | 200/201 | reversed entries; stock −2 · 1500 |
| 3 | TC-D05.018 (contract) — GET ProductStock | GET `/api/ProductStock` | 200 | adjusted quantities visible · 1500 |
| 4 | TC-D05.024/028 — POST bulk-adjust | POST `/api/ProductStock/bulk-adjust` | 200 | per-item entries, Ref-tagged narration · 3000 |
| 5 | TC-D05.024 (contract) — POST bulk-update | POST `/api/ProductStock/bulk-update` | 200 | direct set semantics · 1500 |
| 6 | TC-D05.034 — POST damagedStock | POST `/api/DamagedStock` | 200/201 | rows + loss entries, stock reduced, **no** payment leg (INT-08 Char) · 1500 |
| 7 | TC-D05.034 (contract) — GET damagedStock | GET `/api/DamagedStock` | 200 | CC-5 · 1500 |
| 8 | TC-D05.053 — POST stockTransfer | POST `/api/StockTransfer` | 200/201 | sets `stockTransferId` · 1500 |
| 9 | TC-D05.053 — GET productStock re-verify (post-transfer @ L2) | GET `/api/ProductStock?locationId={{locationId2}}` | 200 | L2 incremented · 1500 |
| 10 | TC-D05.053 (contract) — DELETE stockTransfer | DELETE `/api/StockTransfer/{{stockTransferId}}` | 200 | flow completes · 1500 |
| 11 | TC-D05.067 — GET stock-alert | GET `/api/ProductStock/stock-alert` | 200 | CC-5 contract · 1500 |
| 12 | TC-D05.067 — GET count | GET `/api/ProductStock/count` | 200 | numeric count · 1500 |
| 13 | TC-D05.067 (contract) — GET inventoryBatch/{productId} | GET `/api/InventoryBatch/{{batchedProductId}}` | 200 | batch rows (FEFO order per catalog) · 1500 |

### R6 — Accounting verification runner (`D06` + D03/D04 docs) — nightly (TC-D06.090/091)

Creates documents through the API, then asserts journal totals **from response bodies only** (charter: Postman does not touch the DB — deep state via follow-up GETs).

| # | Request (TC) | Method & URL | Expected | Script asserts |
|---|---|---|---|---|
| 1 | TC-D06.091 — login | POST `/api/authentication/login` | 200 | §2.1 · 1500 |
| 2 | TC-D06.090 (contract) — POST salesOrder (doc 1) | POST `/api/SalesOrder` | 200/201 | sets `salesOrderNumber` · 1500 |
| 3 | TC-D06.090 — GET Transaction by reference | GET `/api/Transaction?reference={{salesOrderNumber}}` | 200 | 5 entries: AR, Cash, Inventory→COGS, GST-Out; sets `transactionId` · 3000 |
| 4 | TC-D06.090 (contract) — GET transactionItem/{id} | GET `/api/TransactionItem/{{transactionId}}` | 200 | CC-7 balanced; Dr/Cr pairs per SaleStrategy · 1500 |
| 5 | TC-D06.090 (contract) — POST GeneralEntry | POST `/api/GeneralEntry` | 200/201 | manual balanced entry; sets `generalEntryId` · 1500 |
| 6 | TC-D06.090 (contract) — GET Transaction?reference=GE | GET `/api/Transaction?reference=…` | 200 | entry present, balanced · 3000 |
| 7 | TC-D06.091 — POST expense (doc 2) | POST `/api/Expense` | 200/201 | sets `expenseId` · 1500 |
| 8 | TC-D06.090 (contract) — GET Transaction?reference=EXP | GET `/api/Transaction?reference=…` | 200 | expense journal balanced · 3000 |
| 9 | TC-D06.091 — PUT salesOrder/{id}/return (refund doc) | PUT `/api/SalesOrder/{{salesOrderId}}/return` | 200 | refund legs; sets re-verify below · 1500 |
| 10 | TC-D06.091 — GET salesOrder re-verify (post-refund) | GET `/api/SalesOrder/{{salesOrderId}}` | 200 | returned state · 1500 |
| 11 | TC-D06.091 (contract) — GET Transaction (all, window) | GET `/api/Transaction?fromDate={{reportFromDate}}&toDate={{reportToDate}}` | 200 | every created reference present · 3000 |

### R7 — CRM / ledger FIFO flow (`D08`) — nightly (TC-D08.025 + .028/.037)

| # | Request (TC) | Method & URL | Expected | Script asserts |
|---|---|---|---|---|
| 1 | TC-D08.001 — POST Customer | POST `/api/Customer` | 200/201 | customer + addresses persisted; sets `customerId` · 1500 |
| 2 | TC-D08.002 — duplicate name 422 | POST `/api/Customer` | 422 | CC-6 · 1500 |
| 3 | TC-D08.008 — GET customers paged | GET `/api/Customer` | 200 | CC-5 X-Pagination · 1500 |
| 4 | TC-D08.025 — POST credit sale builds overdue | POST `/api/SalesOrder` (credit) | 200/201 | overdue snapshot rises (TC-D08.013) · 1500 |
| 5 | TC-D08.025 — GET customerLedger overdue | GET `/api/CustomerLedger/{{customerId}}/overdue` | 200 | overdue > 0 · 1500 |
| 6 | TC-D08.025 — POST customerLedger payment | POST `/api/CustomerLedger` | 200/201 | fans out to N per-order payments; sets `customerLedgerId` · 1500 |
| 7 | TC-D08.025 — GET customerLedger/{id} | GET `/api/CustomerLedger/{{customerId}}` | 200 | per-order rows, balanced cash legs each · 1500 |
| 8 | TC-D08.018 — ledger payment above overdue 409 | POST `/api/CustomerLedger` | 409 | nothing written (verify via follow-up GET) · 1500 |
| 9 | TC-D08.012 — [Gap-Target] order blocked over credit limit (RED) | POST `/api/SalesOrder` | 409 target | non-blocking run (§6) · 1500 |
| 10 | TC-D08.025 (contract) — GET customer pending SO | GET `/api/SalesOrder/customerpendingpayment/{{customerId}}` | 200 | pending rows match ledger · 1500 |
| 11 | TC-D08.028 — POST inquiry | POST `/api/Inquiry` | 200/201 | source/status/products; sets `inquiryId` · 1500 |
| 12 | TC-D08.031 — PUT inquiry status | PUT `/api/Inquiry/{{inquiryId}}` | 200 | status progressed · 1500 |
| 13 | TC-D08.028 (contract) — GET inquiry/{id}/products | GET `/api/Inquiry/{{inquiryId}}/products` | 200 | interested products · 1500 |
| 14 | TC-D08.037 — POST reminder | POST `/api/Reminder` | 200/201 | recurring daily + users; sets `reminderId` · 1500 |
| 15 | TC-D08.039 — POST reminderScheduler | POST `/api/ReminderScheduler` | 200/201 | one active row per user · 1500 |
| 16 | TC-D08.039 (contract) — GET reminderScheduler/{app}/{ref} | GET `/api/ReminderScheduler/{application}/{referenceId}` | 200 | scheduled rows · 1500 |
| 17 | TC-D08.051 — GET notification/top10 | GET `/api/Notification/top10` | 200 | own unread-inactive rows only · 1500 |
| 18 | TC-D08.051 — POST markAllAsRead | POST `/api/Notification/markAllAsRead` | 200 | rows flipped (verify via count) · 1500 |
| 19 | TC-D08.052 — [Gap-Char] mark-read only | POST `/api/Notification/markAllAsRead` | 200 | no snooze/complete action exists (documented gap, GREEN) · 1500 |

### R8 — Sync endpoints (`D10`, desktop env `local-desktop`) — nightly on desktop job

| # | Request (TC) | Method & URL | Expected | Script asserts |
|---|---|---|---|---|
| 1 | TC-D10.049 — desktop smoke login | POST `/api/authentication/login` | 200 | local SQLite instance answers with no cloud dependency · 1500 |
| 2 | TC-D02.021 — X-API-Key sync client | GET `/api/ProductStock/count` + `X-API-Key: {{apiKey}}` | 200 | authenticated, `ApiKeyLastUsedDate` stamped (verify via profile/GET) · 1500 |
| 3 | TC-D10.035 — POST sync/now | POST `/api/Sync/now` `{"direction":"Push"}` | 200 | contract + direction echo · 3000 |
| 4 | TC-D10.035 — POST sync/now (invalid direction default) | POST `/api/Sync/now` `{"direction":"sideways"}` | 200 | defaults per contract · 3000 |
| 5 | TC-D10.036 — [Gap-Char] GET sync/status stub | GET `/api/Sync/status` | 200 | 200 with no real sync data (SYN-03, GREEN) · 1500 |
| 6 | TC-D10.014 (contract) — POST export-sqlite (SuperAdmin) | POST `/api/Tenants/{id}/export-sqlite` | 200 | job accepted · 3000 |
| 7 | TC-D10.012 — GET my-database | GET `/api/Tenants/my-database` | 200 | zip stream; content-type zip; filename dated · 3000 |
| 8 | TC-D09.003 — FBR manual submit (cloud profile only) | POST `/api/fbr/submit/{{fbrSalesOrderId}}` | 200 | ack + invoice ids persisted (sandbox/manual) · 3000 |
| 9 | TC-D09.014 — FBR status polling | GET `/api/fbr/status/{{fbrSalesOrderId}}` | 200 | tracking payload; unknown order → 404 · 1500 |

---

## 6. Gap Coverage in Postman

Catalog categories `Gap-Char` (assert current buggy behavior — **GREEN now**, act as change-detectors) and `Gap-Target` (assert desired behavior — **expected-RED until the fix lands**). Strategy §2 forbids silently flipping either.

### 6.1 Gap-Char requests (expected GREEN; flip to Gap-Target only via reviewed change)

| Request (folder) | Endpoint | Asserts current behavior | Flip trigger |
|---|---|---|---|
| TC-D02.009 — register anonymous (R2 #3) | POST `/api/Tenants/register` | accepts signup with no captcha / no email verification | anti-abuse lands (SEC gap) |
| TC-D02.043 — WrLicense validate | POST `/api/WrLicense/validate` | returns `DUMMY_TOKEN`, flips tenant to Paid | real license verification |
| TC-D02.045 — activate trusts any code | POST `/api/CompanyProfile/activate_license` | 200 on arbitrary purchase code (SEC-03) | server-side verification |
| TC-D03.012 — client totals persisted | POST `/api/SalesOrder` (variant) | client-computed totals saved as-is; ledger diverges | server-side recompute (INT-02/03/04) |
| TC-D03.032 — accounting failure swallowed | POST `/api/SalesOrder` (variant) | order survives 201 with **no** ledger entries and no stock movement | transactional posting fix |
| TC-D05.034 — damaged stock no payment leg | POST `/api/DamagedStock` | loss entries without payment leg (INT-08 partial) | strategy completion |
| TC-D05.065 — stock check advisory (R3 #6) | POST `/api/ProductStock/check` | insufficient stock flagged but **not** blocked; POS sale proceeds (negative-stock sale possible; INT-01) | hard stock gate decision |
| TC-D08.052 — mark-read only (R7 #19) | POST `/api/Notification/markAllAsRead` | no snooze/complete action exists | notification lifecycle enhancement |
| TC-D09.042 — /hangfire unguarded | GET `{{baseUrl}}/hangfire` | dashboard reachable without auth filter | auth filter on dashboard |
| TC-D10.036 — sync/status stub (R8 #5) | GET `/api/Sync/status` | 200 with no real sync data (SYN-03) | real status implementation |

### 6.2 Gap-Target requests (expected-RED; drive the enhancement phases)

| Request (folder) | Endpoint | Target behavior | CI handling |
|---|---|---|---|
| TC-D02.010 — register requires anti-abuse token (R2 #4) | POST `/api/Tenants/register` | 4xx without server-side token | non-blocking job (§7) |
| TC-D08.012 — order blocked over credit limit (R7 #9) | POST `/api/SalesOrder` | 409 when overdue > credit limit (BIZ-07) | non-blocking job |
| TC-D01.016 — refresh-token flow | *(no endpoint — placeholder request)* | reissues JWT without re-login; rejects dead tokens | non-blocking; request gains a real URL when the endpoint exists (`refreshToken` variable already reserved, §2) |

### 6.3 Flip policy (binding)

- A Gap-Char request that starts failing means **someone changed the buggy behavior** — do not "fix" the test silently. The change is reviewed: either the behavior was a regression (restore) or the fix landed (convert the request to the target assertion, rename `[Gap-Char]` → post-fix title, move it into the normal suite, and flip the paired Gap-Target to GREEN-blocking).
- When `gapFixMode` = `true` (set manually at flip time), Gap-Target scripts assert the target behavior and become blocking; while `false`, they run in the tolerated job. This keeps the RED→GREEN transition explicit and reviewed — never a weakened assertion (global rule 3).

---

## 7. CI Integration

Layout: `Test-Documentation/postman/` holds `MILPOS_API.postman_collection.json`, `environments/*.postman_environment.json`, `data/*.json` (runner data files for `productIds` loops).

**Smoke suite (every PR, <5 min per charter §4.6):** `Setup & Auth`, `D01`, plus `R2` steps 1–10.

```powershell
newman run Test-Documentation/postman/MILPOS_API.postman_collection.json `
  -e Test-Documentation/postman/environments/local-cloud.postman_environment.json `
  --env-var adminPassword=$env:MILPOS_ADMIN_PASSWORD `
  --folder "Setup & Auth" --folder "D01 Auth & Authorization" `
  --reporters cli,junit `
  --reporter-junit-export TestResults/newman-smoke.xml `
  --bail false --timeout-request 10000
```

**Full suite (nightly):** all 8 runner flows in order, cloud env:

```bash
for f in "R1 Auth smoke" "R2 Tenant isolation" "R3 Full sales loop" "R4 Purchase loop" \
         "R5 Inventory adjustments loop" "R6 Accounting verification" "R7 CRM ledger FIFO flow"; do
  newman run Test-Documentation/postman/MILPOS_API.postman_collection.json \
    -e Test-Documentation/postman/environments/local-cloud.postman_environment.json \
    --folder "$f" --reporters cli,junit \
    --reporter-junit-export "TestResults/newman-$(echo $f | tr ' ' '-').xml" \
    --bail false --timeout-request 15000
done
```

**Desktop job (nightly):** boots the desktop (SQLite) profile, then runs R8 with `local-desktop` env (plus `--env-var apiKey=…`). FBR requests inside R8 run only when `mode=cloud` — their pre-request script skips via `pm.execution.skipRequest()` when `{{mode}} !== "cloud"`.

**Gap-Target job (tolerated-RED):**

```bash
newman run Test-Documentation/postman/MILPOS_API.postman_collection.json \
  -e Test-Documentation/postman/environments/local-cloud.postman_environment.json \
  --folder "Gaps - Target (expected RED)" --reporters junit \
  --reporter-junit-export TestResults/newman-gap-target.xml --bail false || true
```

CI parses the JUnit XML but treats this job as non-blocking until `gapFixMode=true`.

**Rules:**
- Secrets (`adminPassword`, `cashierPassword`, staging `token`) are CI variables, never in committed env files.
- `--bail false` everywhere: one red request must not mask the rest; the JUnit report carries per-TC failures (request name = TC ID).
- Budget check: smoke wall-clock <5 min (charter); nightly full ≈ R1–R7 with 3000 ms aggregations.
- JUnit artifacts are published alongside backend coverage; a failing TC ID maps 1:1 back to the catalog via the request name.

---

## 8. Coverage Matrix (endpoint → covering requests)

Legend: **P** = primary request (one per endpoint, §1.3-1); **S** = secondary request. "PM" column lists the catalog PM cases traceable to the row. Contract-only rows (no dedicated PM case) carry the domain umbrella `(contract)` — these are the only rows whose PM column is an umbrella, and each such endpoint family is flagged once per folder in the notes.

### 8.0 Setup & Auth (1 endpoint)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| POST | `/api/authentication/login` *(alias: `/api/authentication`)* | AuthenticationController.Login | P: TC-D01.001 — login (admin) | D01.001/002/065 |

### 8.1 D01 Auth & Authorization (24)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| POST | `/api/forgotpassword` | ForgetPassowrd | P: TC-D01.025 — forgotpassword persists reset code | D01.025 |
| GET | `/api/resetpassword/{token}` | GetResetPassowrdinfo | P: TC-D01.029 — reset token resolves user | D01.029 |
| POST | `/api/recoverpassword/{token}` | RecoverPassowrdinfo | P: TC-D01.029 (contract) — recoverpassword | D01.029 |
| POST | `/api/User` | AddUser | P: TC-D01.065 (contract) — POST User; S: TC-D01.039 — 403 | D01.039/065 |
| GET | `/api/User/GetAllUsers` | GetAllUsers | P: TC-D01.065 (contract) | D01.065 |
| GET | `/api/User/{id}` | GetUser | P: TC-D01.065 (contract) | — |
| GET | `/api/User/GetUsers` | GetUsers | P: TC-D01.065 (contract) | — |
| GET | `/api/User/GetRecentlyRegisteredUsers` | GetRecentlyRegisteredUsers | P: TC-D01.065 (contract) | — |
| PUT | `/api/User/{id}` | UpdateUser | P: TC-D01.065 (contract) | — |
| PUT | `/api/User/profile` | UpdateUserProfile | P: TC-D01.065 (contract) | — |
| POST | `/api/User/UpdateUserProfilePhoto` | UpdateUserProfilePhoto | P: TC-D01.065 (contract) | — |
| DELETE | `/api/User/{Id}` | DeleteUser | P: TC-D01.065 (contract) | — |
| POST | `/api/User/changepassword` | ChangePassword | P: TC-D01.065 (contract) | — |
| POST | `/api/User/resetpassword` | ResetPassword | P: TC-D01.025 (contract) | D01.025 |
| GET | `/api/User/profile` | GetProfile | P: TC-D01.065 (contract) — used in R1 #5 | D01.065 |
| PUT | `/api/UserClaim/{id}` | UpdateUserClaim | P: TC-D01.065 (contract) — claim matrix | D01.012 |
| POST | `/api/Role` | AddRole | P: TC-D01.065 (contract); S: TC-D01.047 — 403 | D01.047 |
| PUT | `/api/Role/{id}` | UpdateRole | P: TC-D01.065 (contract) | — |
| GET | `/api/Role/{id}` | GetRole | P: TC-D01.065 (contract) | — |
| GET | `/api/Role/GetRoles` | GetRoles | P: TC-D01.065 (contract) | — |
| DELETE | `/api/Role/{Id}` | DeleteRole | P: TC-D01.065 (contract) | — |
| GET | `/api/RoleUsers/{id}` | RoleUsers | P: TC-D01.065 (contract) | — |
| PUT | `/api/RoleUsers/{id}` | UpdateRoleUsers | P: TC-D01.065 (contract) | — |
| GET | `/api/LoginAudit` | GetLoginAudit | P: TC-D01.001 (contract) — Success/Error audit rows | D01.001/002 |

*Note:* User/Role/UserClaim/RoleUsers families have no dedicated PM cases beyond the 403 pair — tracked as catalog follow-up in §8.11; covered here as `TC-D01.065 (contract)`.

### 8.2 D02 Tenancy & Licensing (18)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| POST | `/api/Tenants/register` | Register | P: TC-D02.001 — register trial tenant; S: TC-D02.004 dup 400, TC-D02.009 Char, TC-D02.010 Target | D02.001/004/009/010 |
| GET | `/api/Tenants` | GetAllTenants | P: TC-D02.051 (contract) — SuperAdmin list | D02.051 |
| GET | `/api/Tenants/{id}` | GetTenant | P: TC-D02.051 (contract) | — |
| POST | `/api/Tenants` | CreateTenant | P: TC-D02.051 (contract) | — |
| PUT | `/api/Tenants/{id}` | UpdateTenant | P: TC-D02.051 (contract) | — |
| POST | `/api/Tenants/{id}/admin` | UpdateTenantAdmin | P: TC-D02.051 (contract) | — |
| DELETE | `/api/Tenants/{id}` | DeactivateTenant | P: TC-D02.051 (contract) | — |
| POST | `/api/Tenants/migrate-to-default` | MigrateToDefaultTenant | P: TC-D02.051 (contract) | — |
| PUT | `/api/Tenants/{id}/license` | UpdateLicense | P: TC-D02.049 (contract) | D02.049 |
| PUT | `/api/Tenants/{id}/status` | ToggleStatus | P: TC-D02.034/035 (contract) — active/expired toggle | D02.034/035 |
| POST | `/api/Tenants/{id}/switch` | SwitchTenant | P: TC-D02.027 — switch returns token+tenantId; S: TC-D02.029 — 403 | D02.027/029 |
| POST | `/api/Tenants/{id}/license/generate` | GenerateLicenseKeys | P: TC-D02.049 — generate-license-keys | D02.049 |
| POST | `/api/Tenants/{id}/export-sqlite` | ExportTenantToSqlite | P: TC-D10.014 (contract) — SuperAdmin export; S: TC-D10.014 — 403 | D10.014 |
| GET | `/api/Tenants/my-database` | DownloadMyDatabase | P: TC-D10.012 — zip download | D10.012 |
| POST | `/api/WrLicense/validate` | ValidateLicense | P: TC-D02.043 — [Gap-Char] DUMMY_TOKEN | D02.043 |
| GET | `/api/CompanyProfile` | GetCompanyProfile | P: TC-D01.057 — anonymous bootstrap profile | D01.057 |
| POST | `/api/CompanyProfile` | UpdateCompanyProfile | P: TC-D01.060 (contract); S: TC-D01.060 — 403 | D01.060 |
| POST | `/api/CompanyProfile/activate_license` | AddOrUpdateLicenseKey | P: TC-D02.048 — claim-gated activation; S: TC-D02.045 — [Gap-Char] | D02.045/048 |

### 8.3 D03 POS & Sales (26)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| GET | `/api/SalesOrder` | GetAllSalesOrder | P: TC-D03.062 (contract) — requests excluded from lists | D03.062 |
| GET | `/api/SalesOrder/returns` | GetAllSalesOrdersReturn | P: TC-D03.066 (contract) — returns list | D03.066 |
| GET | `/api/SalesOrder/{id}` | GetSalesOrder | P: TC-D03.095 (contract); re-verify dups (R3 #18, R6 #10) | D03.095/094 |
| GET | `/api/SalesOrder/{id}/returnItems` | GetSalesOrderReturnItems | P: TC-D03.066 (contract) | D03.066 |
| POST | `/api/SalesOrder` | CreateSalesOrder | P: TC-D03.016 — POS cash sale e2e; S: TC-D03.012 Char, TC-D03.032 Char, TC-D03.036 403, TC-D03.056 SOR, TC-D03.059 403, TC-D08.012 Target, TC-D02.051 trial write | D03.012/016/032/036/056/059, D02.051 |
| PUT | `/api/SalesOrder/{id}` | UpdateSalesOrder | P: TC-D03.016 (contract) — update math; S: TC-D03.059 — 403 | D03.016/059 |
| PUT | `/api/SalesOrder/{id}/return` | UpdateSalesOrderReturn | P: TC-D03.066 — return e2e; S: TC-D03.077 — 403 | D03.066/077 |
| DELETE | `/api/SalesOrder/{id}` | DeleteSalesOrder | P: TC-D03.054 (contract) — soft delete reversal; S: TC-D03.054 — 403 | D03.054 |
| GET | `/api/SalesOrder/newOrderNumber/{isSalesOrderRequest}` | GetNewSalesOrderNumber | P: TC-D03.021 — sequence formats SO/SOR | D03.021 |
| GET | `/api/SalesOrder/{id}/items` | GetSalesOrderItems | P: TC-D03.095 (contract) | D03.095 |
| GET | `/api/SalesOrder/items/reports` | GetSalesOrderItems (report) | P: TC-D07.030 (contract) — SO item report source | D07.030 |
| PUT | `/api/SalesOrder/{id}/markasdelivered` | MarkSalesOrderAsDelivered | P: TC-D03.024 (contract) — delivery flag | D03.024 |
| GET | `/api/SalesOrder/recentshipment` | GetRecentExpectedShipmentDateSalesOrder | P: TC-D03.095 (contract) | — |
| GET | `/api/SalesOrder/items/profitLoss` | GetSalesOrderProfitLossReport | P: TC-D07.030 (contract) — profit math | D07.030 |
| GET | `/api/SalesOrder/total` | GetSalesOrderTotal | P: TC-D03.095 (contract) — totals endpoint | D03.095 |
| GET | `/api/SalesOrder/tax-item-total` | GetSalesOrderTaxItemTotal | P: TC-D07.045 (contract) — output tax family | D07.045 |
| GET | `/api/SalesOrder/{id}/tax-item` | GetSalesOrderTaxItem | P: TC-D07.044/045 (contract) | D07.044/045 |
| GET | `/api/SalesOrder/pendingsalesorder` | GetAllPendingSalesOrderList | P: TC-D03.062 (contract) — pending filter | D03.062 |
| GET | `/api/SalesOrder/customerpendingpayment/{customerId}` | GetCustomerPendingSO | P: TC-D08.025 (contract) — pending per customer | D08.025 |
| GET | `/api/SalesOrderPayment/{id}` | GetAllSalesOrderPayments | P: TC-D03.079 (contract) — payments list | D03.079 |
| POST | `/api/SalesOrderPayment` | CreateSalesOrderPayment | P: TC-D03.079 — manual payment posts Dr Cash/Cr AR; S: TC-D03.081 409, TC-D03.092 403 | D03.079/081/092 |
| DELETE | `/api/SalesOrderPayment/{id}` | DeleteSalesOrderPayment | P: TC-D03.092 (contract) — delete + reversal | D03.092 |
| GET | `/api/SalesOrderPayment/report` | GetAllSalesOrderPaymentsReport | P: TC-D07.035 — sales payment report | D07.035 |
| GET | `/api/DailyProductPrice/price-list` | GetDailyPriceList | P: TC-D03.095 (contract) — POS price source | — |
| POST | `/api/DailyProductPrice/bulk-update` | UpdateDailyPriceList | P: TC-D03.095 (contract) | — |
| GET | `/api/DailyProductPrice/effective-price/{productId}` | GetEffectivePrice | P: TC-D03.095 (contract) — daily vs salesPrice precedence | — |

*Note:* DailyProductPrice has no dedicated PM case — covered as `TC-D03.095 (contract)`; flagged for a future catalog case (§8.11).

### 8.4 D04 Purchasing (27)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| GET | `/api/PurchaseOrder` | GetAllPurchaseOrder | P: TC-D04.067 (contract) — list | D04.067 |
| GET | `/api/PurchaseOrder/{id}` | GetPurchaseOrder | P: TC-D04.001 (contract) — verify header | D04.001 |
| POST | `/api/PurchaseOrder` | CreatePurchaseOrder | P: TC-D04.001 — real PO journal+stock; S: TC-D04.009 dup 409, TC-D04.011 403, TC-D04.016 POR | D04.001/009/011/016 |
| GET | `/api/PurchaseOrder/{id}/returnItems` | GetPurchaseOrderReturnItems | P: TC-D04.043 (contract) | D04.043 |
| PUT | `/api/PurchaseOrder/{id}` | UpdatePurchaseOrder | P: TC-D04.001 (contract) | — |
| PUT | `/api/PurchaseOrder/{id}/return` | UpdatePurchaseOrderReturn | P: TC-D04.043 — full return mirrored + refund | D04.043 |
| DELETE | `/api/PurchaseOrder/{id}` | DeletePurchaseOrder | P: TC-D04.036 — soft delete fully reverses | D04.036 |
| GET | `/api/PurchaseOrder/newOrderNumber/{isPurchaseOrder}` | GetNewPurchaseOrderNumber | P: TC-D04.067 (contract) — PO/POR sequences | D04.067 |
| GET | `/api/PurchaseOrder/{id}/items` | GetPurchaseOrderItems | P: TC-D04.001 (contract) | — |
| PUT | `/api/PurchaseOrder/{id}/markasreceived` | MarkPurchaseOrderAsReceived | P: TC-D04.020 — cosmetic flip, idempotent | D04.020 |
| GET | `/api/PurchaseOrder/items/reports` | GetPurchaseOrderItems (report) | P: TC-D07.033 (contract) | D07.033 |
| GET | `/api/PurchaseOrder/recentdelivery` | GetRecentExpectedDatePurchaseOrder | P: TC-D04.067 (contract) | — |
| GET | `/api/PurchaseOrder/items/profitLoss` | GetPurchaseOrderProfitLossReport | P: TC-D07.033 (contract) | D07.033 |
| GET | `/api/PurchaseOrder/total` | GetPurchaseOrderTotal | P: TC-D04.054 (contract) — total vs paid | D04.054 |
| GET | `/api/PurchaseOrder/tax-item-total` | GetPurchaseOrderTaxItemTotal | P: TC-D07.044 (contract) — input tax family | D07.044 |
| GET | `/api/PurchaseOrder/{id}/tax-item` | GetPurchaseOrderTaxItem | P: TC-D07.044 (contract) | D07.044 |
| GET | `/api/PurchaseOrderPayment/{id}` | GetAllPurchaseOrderPayments | P: TC-D04.054 (contract) | D04.054 |
| GET | `/api/PurchaseOrderPayment/report` | GetAllPurchaseOrderPaymentsReport | P: TC-D07.036 — purchase payment report | D07.036 |
| POST | `/api/PurchaseOrderPayment` | CreatePurchaseOrderPayment | P: TC-D04.054 — partial payment; S: TC-D04.056 — 409 over-total | D04.054/056 |
| DELETE | `/api/PurchaseOrderPayment/{id}` | DeletePurchaseOrderPayment | P: TC-D04.054 (contract) | — |
| GET | `/api/Supplier/GetSuppliers` | GetSuppliers | P: TC-D08.009 (contract) — paged list | D08.009 |
| GET | `/api/Supplier/{id}` | GetSupplier | P: TC-D08.009 (contract) | D08.009 |
| POST | `/api/Supplier` | AddSupplier | P: TC-D08.009 — supplier CRUD happy; S: TC-D08.010 — 403 | D08.009/010 |
| PUT | `/api/Supplier/{id}` | UpdateSupplier | P: TC-D08.009 (contract) | D08.009 |
| DELETE | `/api/Supplier/{id}` | DeleteSupplier | P: TC-D08.009 (contract) | — |
| GET | `/api/Supplier/GetSupplierPayment` | GetSupplierPayment | P: TC-D07.036 (contract) — supplier payments view | D07.036 |
| GET | `/api/SupplierSearch` | SupplierSearchController.SearchSuppliers | P: TC-D08.009 (contract) — search | — |

### 8.5 D05 Inventory, Stock & Product Master (51)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| GET | `/api/Product/GetProducts` | GetProducts | P: TC-D05.067 (contract) — paged products | D05.067 |
| GET | `/api/Product/dropdowns` | GetProductsDropDowns | P: TC-D05.067 (contract) — POS drawer source | — |
| GET | `/api/Product/{id}` | GetProduct | P: TC-D05.067 (contract) | — |
| POST | `/api/Product` | AddProduct | P: TC-D05.067 (contract) — seed P-A (R3 #2, R2 #6) | — |
| PUT | `/api/Product/{id}` | UpdateProduct | P: TC-D05.067 (contract) | — |
| DELETE | `/api/Product/{id}` | DeleteProduct | P: TC-D05.067 (contract) | — |
| GET | `/api/ProductCategories` *(alias: bare `GET /api`)* | GetProductCategories | P: TC-D05.067 (contract) | — |
| GET | `/api/ProductCategory/{id}` | GetProductCategory | P: TC-D05.067 (contract); sets `categoryId` | — |
| GET | `/api/ProductCategories/{id}/Subcategories` | Subcategories | P: TC-D05.067 (contract) | — |
| POST | `/api/ProductCategory` | AddProductCategory | P: TC-D05.067 (contract) | — |
| PUT | `/api/ProductCategory/{Id}` | UpdateProductCategory | P: TC-D05.067 (contract) | — |
| DELETE | `/api/ProductCategory/{Id}` | DeleteProductCategory | P: TC-D05.067 (contract) | — |
| GET | `/api/Brand/{id}` | GetBrand | P: TC-D05.067 (contract) | — |
| GET | `/api/Brand/Brands` | GetBrands | P: TC-D05.067 (contract) | — |
| POST | `/api/Brand` | AddBrand | P: TC-D05.067 (contract) | — |
| PUT | `/api/Brand/{Id}` | UpdateBrand | P: TC-D05.067 (contract) | — |
| DELETE | `/api/Brand/{Id}` | DeleteBrand | P: TC-D05.067 (contract) | — |
| GET | `/api/UnitConversation/UnitConversations` | GetUnitConversations | P: TC-D05.067 (contract) — units for P-U | — |
| POST | `/api/UnitConversation/UnitConversation` | AddUnitConversation | P: TC-D05.067 (contract) — child unit DZ ×12 | — |
| PUT | `/api/UnitConversation/UnitConversation/{Id}` | UpdateUnitConversation | P: TC-D05.067 (contract) | — |
| DELETE | `/api/UnitConversation/UnitConversation/{Id}` | DeleteUnitConversation | P: TC-D05.067 (contract) | — |
| GET | `/api/UnitConversation/UnitConversation/dropDown` | GetUnitConversations (dropdown) | P: TC-D05.067 (contract) | — |
| GET | `/api/Variant` | GetVariantes | P: TC-D05.067 (contract) — variant children | — |
| POST | `/api/Variant` | AddVariant | P: TC-D05.067 (contract) — P-VARIANT children | — |
| PUT | `/api/Variant/{Id}` | UpdateVariant | P: TC-D05.067 (contract) | — |
| DELETE | `/api/Variant/{Id}` | DeleteVariant | P: TC-D05.067 (contract) | — |
| GET | `/api/Tax/{id}` | GetTax | P: TC-D05.067 (contract); seeds GST-17/PST-5 | — |
| GET | `/api/Tax/Tax` | GetTaxes | P: TC-D05.067 (contract) | — |
| POST | `/api/Tax/Tax` | AddTax | P: TC-D05.067 (contract) | — |
| PUT | `/api/Tax/Tax/{Id}` | UpdateTax | P: TC-D05.067 (contract) | — |
| DELETE | `/api/Tax/Tax/{Id}` | DeleteTax | P: TC-D05.067 (contract) | — |
| GET | `/api/Location/{id}` | GetLocation | P: TC-D05.067 (contract); seeds L1/L2 (`locationId`,`locationId2`) | — |
| GET | `/api/Location` | GetLocations | P: TC-D05.067 (contract) | — |
| POST | `/api/Location` | AddLocation | P: TC-D05.067 (contract) | — |
| PUT | `/api/Location/{id}` | UpdateLocation | P: TC-D05.067 (contract) | — |
| DELETE | `/api/Location/{id}` | DeleteLocation | P: TC-D05.067 (contract) | — |
| POST | `/api/ProductStock` | AddProductStock | P: TC-D05.018 — gain posts journal + stock +LIFO/price update; loss variant TC-D05.019; seed use R3 #3 | D05.010/012/018/019 |
| POST | `/api/ProductStock/bulk-update` | BulkUpdateProductStock | P: TC-D05.024 (contract) | D05.024 |
| POST | `/api/ProductStock/bulk-adjust` | BulkAdjustProductStock | P: TC-D05.024/028 — per-item entries + Ref narration | D05.024/028 |
| GET | `/api/ProductStock` | GetProductStock | P: TC-D05.018 (contract) — follow-up GET verify; re-verify dups R3/R4/R5 | D05.018/019 |
| POST | `/api/ProductStock/check` | CheckSaleOrderProductStock | P: TC-D05.065 — advisory check (sufficient + Char insufficient) | D05.065 |
| GET | `/api/ProductStock/stock-alert` | GetProductStockAlert | P: TC-D05.067 — alert contract | D05.067 |
| GET | `/api/ProductStock/count` | GetProductStockCount | P: TC-D05.067 — count contract | D05.067 |
| GET | `/api/InventoryBatch/{productId}` | GetBatches | P: TC-D05.067 (contract) — batch/FEFO rows | — |
| GET | `/api/DamagedStock` | GetAllDamagedStocks | P: TC-D05.040 (contract) | D05.040 |
| POST | `/api/DamagedStock` | CreateDamagedStock | P: TC-D05.034/040 — loss entries, no payment leg | D05.034/040 |
| GET | `/api/StockTransfer` | GetStockTransfer | P: TC-D05.053 (contract) | D05.053 |
| POST | `/api/StockTransfer` | CreateStockTransfer | P: TC-D05.053 — transfer flow | D05.053 |
| GET | `/api/StockTransfer/{id}` | GetStockTransferById | P: TC-D05.053 (contract) | D05.053 |
| PUT | `/api/StockTransfer/{id}` | UpdateStockTransfer | P: TC-D05.053 (contract) | D05.053 |
| DELETE | `/api/StockTransfer/{id}` | DeleteStockTransfer | P: TC-D05.053 — delete flow | D05.053 |

*Note:* product-master CRUD (Product/Category/Brand/Unit/Variant/Tax/Location) and InventoryBatch have no dedicated PM cases — covered as `TC-D05.067 (contract)`; flagged in §8.11.

### 8.6 D06 Accounting & Finance (37)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| POST | `/api/GeneralEntry` | CreateGeneralEntry | P: TC-D06.090 (contract) — manual balanced entry (R6 #5) | D06.090 |
| GET | `/api/LedgerAccount/{branchId}/groupby/accountType` | GetLedgerAccountsGroupByAccountType | P: TC-D06.090 (contract) — COA grouping | — |
| GET | `/api/LedgerAccount/{branchId}` | GetLedgerAccounts | P: TC-D06.090 (contract) — seed COA rows | — |
| POST | `/api/LedgerAccount/opening-balance` | AddOpningBalance | P: TC-D06.090 (contract) | — |
| POST | `/api/LedgerAccount` | AddLedgerAccount | P: TC-D06.090 (contract); sets `ledgerAccountId` | — |
| GET | `/api/LedgerAccount/dropdown` | GetLedgerAccountDropDown | P: TC-D06.090 (contract) | — |
| PUT | `/api/LedgerAccount/{id}` | UpdateLedgerAccount | P: TC-D06.090 (contract) | — |
| POST | `/api/Loan` | AddLoan | P: TC-D06.090 (contract) | — |
| POST | `/api/Loan/repayment` | AddLoanRepayment | P: TC-D06.090 (contract) | — |
| GET | `/api/Loan` | GetAllLoanDetails | P: TC-D06.090 (contract) | — |
| GET | `/api/Loan/{id}` | GetLoanRePaymentDetails | P: TC-D06.090 (contract) | — |
| POST | `/api/PayRoll` | CreatePayroll | P: TC-D06.090 (contract) | — |
| GET | `/api/PayRoll` | GetPayRolls | P: TC-D06.090 (contract) | — |
| GET | `/api/PayRoll/download/{attachmentName}` | DownloadPayrollReciept | P: TC-D09.049 (contract) — file download shape | D09.049 |
| GET | `/api/PayRoll/{id}` | GetPayroll | P: TC-D06.090 (contract) | — |
| GET | `/api/PayRoll/employeeSearch` | employeeSearch | P: TC-D06.090 (contract) | — |
| GET | `/api/Transaction` | GetTransactions | P: TC-D06.090 — **journal lookup by reference** (R3 #12, R6 #3/#6/#8/#11) | D06.023/090/091 |
| GET | `/api/TransactionItem/{transactionId}` | GetTransactionItems | P: TC-D06.090 — **CC-7 balance assert** (R3 #13, R6 #4) | D06.023/090/091 |
| POST | `/api/YearEndClosing` | CloseYear | P: TC-D06.090 (contract) — close-year flow | — |
| GET | `/api/FinancialYear` | GetFinancialYears | P: TC-D06.090 (contract) — open FY2026 seed | — |
| POST | `/api/FinancialYear` | CreateFinancialYear | P: TC-D06.090 (contract) | — |
| PUT | `/api/FinancialYear/{id}` | UpdateFinancialYear | P: TC-D06.090 (contract) | — |
| GET | `/api/FinancialYear/{id}` | GetFinancialYear | P: TC-D06.090 (contract) | — |
| DELETE | `/api/FinancialYear/{Id}` | DeleteFinancialYear | P: TC-D06.090 (contract) | — |
| POST | `/api/Expense` | AddExpense | P: TC-D06.090 (contract) — expense doc (R6 #7) | — |
| PUT | `/api/Expense/{id}` | UpdateExpense | P: TC-D06.090 (contract) | — |
| GET | `/api/Expense` | GetExpenses | P: TC-D06.090 (contract) | — |
| GET | `/api/Expense/{id}` | GetExpense | P: TC-D06.090 (contract) | — |
| DELETE | `/api/Expense/{id}` | DeleteExpense | P: TC-D06.090 (contract) | — |
| GET | `/api/Expense/{id}/download` | DownloadFile | P: TC-D09.049 (contract) — download shape | D09.049 |
| GET | `/api/Expense/tax-total` | GetTaxItem | P: TC-D07.025 (contract) — GST netting source | D07.025 |
| GET | `/api/ExpenseCategory/{id}` | GetExpenseCategory | P: TC-D06.090 (contract) | — |
| GET | `/api/ExpenseCategories` | ExpenseCategories | P: TC-D06.090 (contract) | — |
| POST | `/api/ExpenseCategory` | AddExpenseCategory | P: TC-D06.090 (contract) | — |
| PUT | `/api/ExpenseCategory/{Id}` | UpdateExpenseCategory | P: TC-D06.090 (contract) | — |
| DELETE | `/api/ExpenseCategory/{Id}` | DeleteExpenseCategory | P: TC-D06.090 (contract) | — |
| GET | `/api/Currency` | GetCurrencies | P: TC-D06.090 (contract) | — |

*Note:* D06's dedicated PM mass is TC-D06.023/090/091 (journal pipeline + runner); the finance CRUD families (Loan/PayRoll/FinancialYear/Expense/Currency/YearEnd/LedgerAccount) are contract-only under `TC-D06.090 (contract)` — flagged in §8.11.

### 8.7 D07 Reporting (25)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| GET | `/api/Reports/ProfitLoss` | GetProfitLossReport | P: TC-D07.010 — P&L current figures | D07.010 |
| GET | `/api/Reports/taxreport` | GetTaxReport | P: TC-D07.025/044/045 (contract) — GST report | D07.025/044/045 |
| GET | `/api/Reports/cashbankreport` | GetCashBabkReport | P: TC-D07.019 — cash/bank FY balances | D07.019 |
| GET | `/api/Reports/balancesheetreport` | GetBalanceSheetReport | P: TC-D07.007 — A == L+E | D07.007 |
| GET | `/api/Reports/AccountBalancereport` | GetAccountBalanceReport | P: TC-D07.007 (contract) — per-account balances | — |
| GET | `/api/Reports` | GetAllGeneralEntryReport | P: TC-D07.021 — journal paging; S: TC-D07.023 empty-window | D07.021/023 |
| GET | `/api/Reports/trialbalancereport` | GetTrialBalanceReport | P: TC-D07.001 — balanced sums; S: TC-D07.003 empty window | D07.001/003 |
| GET | `/api/Reports/cashflowreport` | GetCashFlowReport | P: TC-D07.015 — counter-account attribution | D07.015 |
| GET | `/api/Reports/Paymentreport` | GetAllPaymentEntryReport | P: TC-D07.035/036 (contract) — payment entries | D07.035/036 |
| GET | `/api/DailyReport/sale` | GetDailySalesReport | P: TC-D07.030 (contract) — daily sales window | D07.030 |
| GET | `/api/DailyReport/purchase` | GetDailyPurchaseReport | P: TC-D07.033 (contract) | D07.033 |
| GET | `/api/DailyReport/payment` | GetPaymentReport | P: TC-D07.035 (contract) | D07.035 |
| GET | `/api/Dashboard/dailyreminder/{month}/{year}` | GetDailyReminders | P: TC-D07.053 (contract) — reminder tiles | — |
| GET | `/api/Dashboard/weeklyreminder/{month}/{year}` | GetWeeklyReminders | P: TC-D07.053 (contract) | — |
| GET | `/api/Dashboard/monthlyreminder/{month}/{year}` | GetMonthlyReminders | P: TC-D07.053 (contract) | — |
| GET | `/api/Dashboard/quarterlyreminder/{month}/{year}` | GetQuarterlyReminders | P: TC-D07.053 (contract) | — |
| GET | `/api/Dashboard/halfyearlyreminder/{month}/{year}` | GetHalfYearlyReminders | P: TC-D07.053 (contract) | — |
| GET | `/api/Dashboard/yearlyreminder/{month}/{year}` | GetYearlyReminders | P: TC-D07.053 (contract) | — |
| GET | `/api/Dashboard/onetime/{month}/{year}` | GetOneTimeReminders | P: TC-D07.053 (contract) | — |
| GET | `/api/Dashboard/bestsellingproduct` | BestSellingProduct | P: TC-D07.053 (contract) | D07.053 |
| GET | `/api/Dashboard/salesvspurchase` | SalesVsPurchase | P: TC-D07.048 — merged daily series | D07.048 |
| GET | `/api/Dashboard/statistics` | GetAccountDashboardStatistics | P: TC-D07.053 — ledger tiles exact aggregates | D07.053 |
| GET | `/api/Dashboard/product-sales-comparison` | GetProductSalesComparison | P: TC-D07.048 (contract) | D07.048 |
| GET | `/api/Dashboard/income-comparison` | GetIncomeComparison | P: TC-D07.048 (contract) | D07.048 |
| GET | `/api/Dashboard/sales-comparison` | GetSalesComparison | P: TC-D07.048 (contract) | D07.048 |

### 8.8 D08 CRM, Inquiry, Reminder & Notifications (55)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| GET | `/api/Customer` | GetCustomers | P: TC-D08.008 — paged + X-Pagination; S: TC-D01.012 403, TC-D02.018 cross-tenant | D08.008/005, D02.018, D01.012 |
| GET | `/api/Customer/{id}` | GetCustomer | P: TC-D08.001 (contract); S: TC-D08.005 cross-tenant 404 | D08.001/005 |
| POST | `/api/Customer` | CreateCustomer | P: TC-D08.001 — addresses persisted; S: TC-D08.002 422, TC-D08.003 invalid, TC-D08.004 403 | D08.001/002/003/004 |
| PUT | `/api/Customer/{id}` | UpdateCustomer | P: TC-D08.001 (contract); S: TC-D08.004 — 403 | D08.001/004 |
| DELETE | `/api/Customer/{id}` | DeleteCustomer | P: TC-D08.007 — delete w/o orders; S: TC-D08.004 — 403 | D08.004/007 |
| GET | `/api/Customer/{id}/Exist` | EmailOrPhoneExist | P: TC-D08.003 (contract) — uniqueness check | — |
| GET | `/api/Customer/GetCustomerPayment` | GetCustomerPayment | P: TC-D08.014 — payments aggregate | D08.014 |
| GET | `/api/Customer/GetCustomerPayment/report` | GetCustomerPaymentReport | P: TC-D07.035 (contract) — report endpoint | D07.035 |
| GET | `/api/Customer/walkIn` | GetWalkInCustomer | P: TC-D03.016 (contract) — C-WALK for POS | D03.016 |
| GET | `/api/CustomerSearch` | CustomerSearch | P: TC-D08.008 (contract) — POS customer lookup | — |
| POST | `/api/CustomerLedger` | AddCustomerLedger | P: TC-D08.017/025 — ledger payment fan-out; S: TC-D08.018 409, TC-D08.023 403 | D08.017/018/023/025 |
| GET | `/api/CustomerLedger/{id}` | GetCustomerLedger | P: TC-D08.025 — per-order verification (R7 #7) | D08.025 |
| GET | `/api/CustomerLedger/customerLedger` | LedgerSearch | P: TC-D08.027 — filters (account/date/location/reference) | D08.027 |
| GET | `/api/CustomerLedger` | GetCustomerledger | P: TC-D08.025 (contract) — list | D08.025 |
| DELETE | `/api/CustomerLedger/{id}` | DeleteAccountLedger | P: TC-D08.025 (contract) | D08.023 |
| GET | `/api/CustomerLedger/{id}/overdue` | GetSalesOrderOverdueByCustomerId | P: TC-D08.013 — overdue snapshot math (R7 #5) | D08.013/025 |
| POST | `/api/Inquiry` | AddInquery | P: TC-D08.028 — create w/ source+status+products; S: TC-D08.034 403 | D08.028/034 |
| PUT | `/api/Inquiry/{id}` | UpdateInquiry | P: TC-D08.031 — status progression | D08.031 |
| GET | `/api/Inquiry` | GetInquiries | P: TC-D08.028 (contract) | D08.028 |
| GET | `/api/Inquiry/{id}` | GetInquiry | P: TC-D08.028 (contract); S: TC-D08.034 cross-tenant 404 | D08.034 |
| DELETE | `/api/Inquiry/{id}` | DeleteInquiry | P: TC-D08.034 (contract) | D08.034 |
| GET | `/api/Inquiry/{id}/products` | GetProductsByInquiryId | P: TC-D08.028 (contract) — R7 #13 | D08.028 |
| GET | `/api/InquiryActivity/{inquiryId}` | GetInquiryActivities | P: TC-D08.028 (contract) | — |
| POST | `/api/InquiryActivity` | AddInquiryActivity | P: TC-D08.028 (contract) | — |
| PUT | `/api/InquiryActivity/{id}` | UpdateInquiryActivity | P: TC-D08.028 (contract) | — |
| DELETE | `/api/InquiryActivity/{id}` | DeleteInquiryActivity | P: TC-D08.028 (contract) | — |
| POST | `/api/InquiryAttachment` | AddInquiryAttachment | P: TC-D08.028 (contract) | — |
| GET | `/api/InquiryAttachment/{inquiryId}` | GetInquiryAttachmentByInquiryId | P: TC-D08.028 (contract) | — |
| DELETE | `/api/InquiryAttachment/{id}` | DeleteInquiryAttachment | P: TC-D08.028 (contract) | — |
| GET | `/api/InquiryAttachment/{id}/download` | DownloadFile | P: TC-D09.049 (contract) — download shape | D09.049 |
| GET | `/api/InquiryNote/{inquiryId}` | GetInquiryNotes | P: TC-D08.028 (contract) | — |
| POST | `/api/InquiryNote` | AddInquiryNote | P: TC-D08.028 (contract) | — |
| PUT | `/api/InquiryNote/{id}` | UpdateInquiryNote | P: TC-D08.028 (contract) | — |
| DELETE | `/api/InquiryNote/{id}` | DeleteInquiryNote | P: TC-D08.028 (contract) | — |
| GET | `/api/InquirySource/{id}` | GetInquirySource | P: TC-D08.028 (contract) | — |
| GET | `/api/InquirySource/InquirySources` | GetInquirySources | P: TC-D08.028 (contract) | — |
| POST | `/api/InquirySource/InquirySource` | AddInquirySource | P: TC-D08.028 (contract); sets `inquirySourceId` | — |
| PUT | `/api/InquirySource/InquirySource/{Id}` | UpdateInquirySource | P: TC-D08.028 (contract) | — |
| DELETE | `/api/InquirySource/InquirySource/{Id}` | DeleteInquirySource | P: TC-D08.028 (contract) | — |
| GET | `/api/InquiryStatus/InquiryStatuses` | GetAllInquiryStatus | P: TC-D08.028 (contract) | — |
| GET | `/api/InquiryStatus/InquiryStatus/{id}` | GetInquiryStatus | P: TC-D08.028 (contract) | — |
| POST | `/api/InquiryStatus/InquiryStatus` | AddInquiryStatus | P: TC-D08.028 (contract); sets `inquiryStatusId` | — |
| PUT | `/api/InquiryStatus/InquiryStatus/{Id}` | UpdateInquiryStatus | P: TC-D08.028 (contract) | — |
| DELETE | `/api/InquiryStatus/InquiryStatus/{Id}` | DeleteInquiryStatus | P: TC-D08.028 (contract) | — |
| GET | `/api/Reminder/GetReminders` | GetReminders | P: TC-D08.037 (contract) | D08.037 |
| POST | `/api/Reminder` | CreateReminder | P: TC-D08.037 — recurring + children; S: TC-D08.055 403 | D08.037/055 |
| GET | `/api/Reminder/{id}` | GetReminder | P: TC-D08.037 (contract); S: TC-D08.055 cross-tenant 404 | D08.037/055 |
| PUT | `/api/Reminder/{id}` | UpdateReminder | P: TC-D08.037 (contract); S: TC-D08.055 — 403 | D08.037/055 |
| DELETE | `/api/Reminder/{id}` | DeleteReminder | P: TC-D08.037 (contract) | D08.055 |
| POST | `/api/ReminderScheduler` | CreateReminderScheduler | P: TC-D08.039 — one-off push (R7 #15) | D08.039 |
| GET | `/api/ReminderScheduler/{application}/{referenceId}` | GetReminderScheduler | P: TC-D08.039 — rows per user (R7 #16) | D08.039 |
| GET | `/api/Notification/top10` | GetTop10ReminderNotification | P: TC-D08.051 — unread-inactive only | D08.051 |
| GET | `/api/Notification/all` | GetNotifications | P: TC-D08.051 (contract) | D08.051 |
| POST | `/api/Notification/markAllAsRead` | GetNotificationMarkasRead | P: TC-D08.051 — flips rows; S: TC-D08.052 Char | D08.051/052 |
| GET | `/api/Notification/count` | GetUserNotificationCount | P: TC-D08.051 (contract) — count after mark-read | D08.051 |

*Note:* InquiryActivity/InquiryAttachment/InquiryNote/InquirySource/InquiryStatus and CustomerSearch have no dedicated PM cases — covered as `TC-D08.028 (contract)`; flagged in §8.11.

### 8.9 D09 Infrastructure & Services (74)

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| POST | `/api/ImportExport/products/import` | ImportProducts | P: TC-D09.049 (contract) — bulk import | D09.049 |
| POST | `/api/ImportExport/products/validate` | ValidateProducts | P: TC-D09.049 (contract) | D09.049 |
| GET | `/api/ImportExport/products/export` | ExportProducts | P: TC-D09.049 — scoped export, dated filename | D09.049 |
| GET | `/api/ImportExport/products/template` | GetProductTemplate | P: TC-D09.049 (contract) | D09.049 |
| POST | `/api/ImportExport/customers/import` | ImportCustomers | P: TC-D09.049 (contract) | D09.049 |
| GET | `/api/ImportExport/customers/export` | ExportCustomers | P: TC-D09.049 (contract) | D09.049 |
| GET | `/api/ImportExport/customers/template` | GetCustomerTemplate | P: TC-D09.049 (contract) | D09.049 |
| POST | `/api/ImportExport/suppliers/import` | ImportSuppliers | P: TC-D09.049 (contract) | D09.049 |
| GET | `/api/ImportExport/suppliers/export` | ExportSuppliers | P: TC-D09.049 (contract) | D09.049 |
| GET | `/api/ImportExport/suppliers/template` | GetSupplierTemplate | P: TC-D09.049 (contract) | D09.049 |
| POST | `/api/Email/SendEmail` | SendEmail | P: TC-D09.049 (contract) — SMTP mocked at HTTP layer in IT | — |
| POST | `/api/Email/salesOrPurchase` | SendSalesOrdPurchase | P: TC-D09.049 (contract) | — |
| POST | `/api/EmailSMTPSetting` | AddEmailSMTPSetting | P: TC-D09.049 (contract); sets `emailSmtpId` | — |
| GET | `/api/EmailSMTPSetting/{id}` | GetEmailSMTPSetting | P: TC-D09.049 (contract) | — |
| GET | `/api/EmailSMTPSetting` | GetEmailSMTPSettings | P: TC-D09.049 (contract) | — |
| PUT | `/api/EmailSMTPSetting/{id}` | UpdateEmailSMTPSetting | P: TC-D09.049 (contract) | — |
| DELETE | `/api/EmailSMTPSetting/{id}` | DeleteEmailSMTPSetting | P: TC-D09.049 (contract) | — |
| POST | `/api/EmailSMTPSetting/test` | TestEmailSMTPSetting | P: TC-D09.049 (contract) | — |
| GET | `/api/EmailLog` | GetEmailLog | P: TC-D01.025 (contract) — reset email audit | D01.025 |
| DELETE | `/api/EmailLog/{id}` | DeleteEmailLog | P: TC-D09.049 (contract) | — |
| GET | `/api/EmailLog/{id}/download` | DownloadAttachment | P: TC-D09.049 (contract) — download shape | D09.049 |
| POST | `/api/EmailTemplate` | AddEmailTemplate | P: TC-D09.049 (contract); sets `emailTemplateId` | — |
| PUT | `/api/EmailTemplate/{id}` | UpdateAppSetting | P: TC-D09.049 (contract) | — |
| GET | `/api/EmailTemplate/{id}` | GetEmailTemplate | P: TC-D09.049 (contract) | — |
| GET | `/api/EmailTemplate` | GetEmailTemplates | P: TC-D09.049 (contract) | — |
| DELETE | `/api/EmailTemplate/{Id}` | DelterEmailTemplate | P: TC-D09.049 (contract) | — |
| POST | `/api/fbr/submit/{salesOrderId}` | SubmitInvoice | P: TC-D09.003 — manual submit ack (R8 #8) | D09.003 |
| GET | `/api/fbr/status/{salesOrderId}` | GetStatus | P: TC-D09.014 — polling + unknown 404 (R8 #9) | D09.014 |
| POST | `/api/ContactUs` | Create | P: TC-D09.049 (contract) — public form | — |
| GET | `/api/ContactUs` | GetContactUsList | P: TC-D09.049 (contract) | — |
| DELETE | `/api/ContactUs/{id}` | Delete | P: TC-D09.049 (contract) | — |
| GET | `/api/City/country` | GetCitiesByName | P: TC-D09.049 (contract) | — |
| GET | `/api/City/GetCities` | GetCities | P: TC-D09.049 (contract) | — |
| POST | `/api/City` | AddCity | P: TC-D09.049 (contract) | — |
| PUT | `/api/City/{id}` | UpdateCity | P: TC-D09.049 (contract) | — |
| DELETE | `/api/City/{id}` | DeleteCity | P: TC-D09.049 (contract) | — |
| GET | `/api/Country/{id}` | GetCountry | P: TC-D09.049 (contract) | — |
| GET | `/api/Country/Countries` | GetCountries | P: TC-D09.049 (contract) | — |
| POST | `/api/Country/Country` | AddCountry | P: TC-D09.049 (contract) | — |
| PUT | `/api/Country/Country/{Id}` | UpdateCountry | P: TC-D09.049 (contract) | — |
| DELETE | `/api/Country/Country/{Id}` | DeleteCountry | P: TC-D09.049 (contract) | — |
| GET | `/api/Language/{id}` | GetLanguage | P: TC-D09.049 (contract) | — |
| GET | `/api/Language` | GetLanguages | P: TC-D09.049 (contract) | — |
| GET | `/api/Language/download/{fileName}` | DownloadFile | P: TC-D09.049 (contract) — download shape | D09.049 |
| GET | `/api/Language/default` | DefaultLanguage | P: TC-D09.049 (contract) | — |
| POST | `/api/Language` | SaveLanguage | P: TC-D09.049 (contract) | — |
| PUT | `/api/Language/{id}` | UpdateLanguage | P: TC-D09.049 (contract) | — |
| DELETE | `/api/Language/{id}` | DeleteLanguage | P: TC-D09.049 (contract) | — |
| GET | `/api/MenuItems/user-menu` | GetUserMenu | P: TC-D01.065 (contract) — claim-shaped menu | D01.012 |
| POST | `/api/MenuItems` | CreateMenuItem | P: TC-D09.049 (contract) | — |
| PUT | `/api/MenuItems/{id}` | UpdateMenuItem | P: TC-D09.049 (contract) | — |
| DELETE | `/api/MenuItems/{id}` | DeleteMenuItem | P: TC-D09.049 (contract) | — |
| GET | `/api/MenuItems` | GetAllMenuItems | P: TC-D09.049 (contract) | — |
| GET | `/api/Page/{id}` | GetPage | P: TC-D09.049 (contract) | — |
| GET | `/api/Page/Pages` | GetPages | P: TC-D09.049 (contract) | — |
| POST | `/api/Page/Page` | AddPage | P: TC-D09.049 (contract) | — |
| PUT | `/api/Page/Page/{Id}` | UpdatePage | P: TC-D09.049 (contract) | — |
| DELETE | `/api/Page/Page/{Id}` | DeletePage | P: TC-D09.049 (contract) | — |
| GET | `/api/PageHelper/{id}` | GetPageHelper | P: TC-D09.049 (contract) | — |
| GET | `/api/PageHelper/code/{code}` | GetPageHelperByCode | P: TC-D09.049 (contract) | — |
| GET | `/api/PageHelper` | GetPageHelpers | P: TC-D09.049 (contract) | — |
| POST | `/api/PageHelper` | AddPageHelper | P: TC-D09.049 (contract) | — |
| POST | `/api/PageHelper/{Id}` | UpdatePageHelper | P: TC-D09.049 (contract) | — |
| DELETE | `/api/PageHelper/{Id}` | DeletePageHelper | P: TC-D09.049 (contract) | — |
| GET | `/api/Action/Action/{id}` | GetAction | P: TC-D09.049 (contract) | — |
| GET | `/api/Action/Action` | GetActions | P: TC-D09.049 (contract) | — |
| POST | `/api/Action/Action` | AddAction | P: TC-D09.049 (contract) | — |
| PUT | `/api/Action/Action/{Id}` | UpdateAction | P: TC-D09.049 (contract) | — |
| DELETE | `/api/Action/Action/{Id}` | DeleteAction | P: TC-D09.049 (contract) | — |
| GET | `/api/TableSettings/{screenName}` | GetTableSettings | P: TC-D09.049 (contract) | — |
| POST | `/api/TableSettings` | SaveTableSettings | P: TC-D09.049 (contract) | — |
| GET | `/api/NLog` | GetNLogs | P: TC-D09.049 (contract) | — |
| GET | `/api/NLog/{id}` | GetNLog | P: TC-D09.049 (contract) | — |
| POST | `/api/NLog` | CreatNLog | P: TC-D09.049 (contract) | — |
| GET | `{{baseUrl}}/hangfire` | *(Hangfire dashboard)* | P: TC-D09.042 — [Gap-Char] reachable unauthenticated | D09.042 |

### 8.10 D10 Desktop & Sync (2) — desktop environment

| Method | Route | Action | Request | PM |
|---|---|---|---|---|
| POST | `/api/Sync/now` | SyncNow | P: TC-D10.035 — contract + direction default (R8 #3/#4) | D10.035 |
| GET | `/api/Sync/status` | GetSyncStatus | P: TC-D10.036 — [Gap-Char] stub returns 200 (R8 #5) | D10.036 |

Cross-referenced desktop endpoints living in D02: `POST /api/Tenants/{id}/export-sqlite` (TC-D10.014), `GET /api/Tenants/my-database` (TC-D10.012) — see §8.2; they run in R8 on `local-desktop`.

### 8.11 Intentionally NOT covered + coverage notes

**Not covered (6 endpoints)** — public MVC web surface, no JSON contract to assert; newman cannot drive them (HTML views; anti-forgery form flow). Covered instead by E2E journeys (`E2E_JOURNEYS.md`):

| Endpoint | Controller | Why not in Postman |
|---|---|---|
| `GET store` / `GET store/{tenantName}` | StoreController.Index | public storefront HTML page |
| `GET store/cart` | Cart | HTML view, session state |
| `POST store/add-to-cart` | AddToCart | HTML form flow |
| `POST store/remove-from-cart` | RemoveFromCart | HTML form flow |
| `POST store/checkout` | Checkout | HTML form flow (creates order server-side; its accounting effects are covered by D03/D06 API requests on the same handlers) |
| `POST /Pricing/Subscribe` | PricingController.Subscribe | MVC form with `[ValidateAntiForgeryToken]`; identical server-side path is covered by `POST /api/Tenants/register` (both send `CreateTenantCommand`) |

`HomeController` (Index/Contact/Support/Error) exposes no attribute-routed endpoints and is out of inventory.

**Coverage notes (catalog follow-ups — endpoints currently carried by umbrella `(contract)` requests only):**
1. D01: User/Role/UserClaim/RoleUsers CRUD beyond the two 403 cases.
2. D03: DailyProductPrice family.
3. D05: Product/ProductCategory/Brand/UnitConversation/Variant/Tax/Location master CRUD + InventoryBatch.
4. D06: Loan/PayRoll/FinancialYear/Expense/ExpenseCategory/Currency/YearEndClosing/LedgerAccount CRUD beyond the journal-verification runner.
5. D08: InquiryActivity/InquiryAttachment/InquiryNote/InquirySource/InquiryStatus + CustomerSearch.
6. D09: settings/admin CRUD families (Email*, City, Country, Language, MenuItems, Page, PageHelper, Action, TableSettings, NLog, ContactUs, ImportExport).

Each bullet is a candidate for a dedicated `PM` catalog case in the next catalog revision; until then the umbrella requests keep every endpoint exercised and traceable.

---

## 9. Report Summary

- **Endpoints in inventory:** 346 distinct routes (348 attribute rows − 2 aliases); **340 REST endpoints covered** across 11 folders; 6 public-MVC endpoints intentionally excluded (§8.11).
- **Requests:** 366 = 340 primary + 18 secondary permission/negative variants + 8 re-verification duplicates.
- **Folders:** `Setup & Auth`, `D01 Auth & Authorization`, `D02 Tenancy & Licensing`, `D03 POS & Sales`, `D04 Purchasing`, `D05 Inventory, Stock & Product Master`, `D06 Accounting & Finance`, `D07 Reporting`, `D08 CRM, Inquiry, Reminder & Notifications`, `D09 Infrastructure & Services`, `D10 Desktop & Sync`.
- **Runner flows:** R1 Auth smoke · R2 Tenant isolation · R3 Full sales loop · R4 Purchase loop · R5 Inventory adjustments loop · R6 Accounting verification · R7 CRM/ledger FIFO flow · R8 Sync endpoints (desktop).
- **PM traceability:** all 121 PM catalog cases map to ≥1 request; every request name carries its `TC-Dxx.nnn` ID.
- **File written:** `Test-Documentation/POSTMAN_COLLECTION_PLAN.md`.
