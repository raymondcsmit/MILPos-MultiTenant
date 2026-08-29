# MILPOS — E2E Journey Specifications (Playwright)

**Version:** 1.0 — August 28, 2026
**Source of truth:** `00_TEST_STRATEGY.md` (layer division, charter, naming §5: journey IDs `J-xx` are defined here) + the ten `TC-D01…TC-D10` catalogs (every journey cites its Covered TC IDs).
**Scope:** user journeys through the real UI (Angular 20, `SourceCode/Angular`) against the real API + real DB. Exhaustive money/stock math stays in UT/IT — journeys assert **key totals only** (receipt grand totals, report headline numbers, stock cells).

---

## 1. Tooling Decisions

| Concern | Decision |
|---|---|
| Runner | **Playwright + `@playwright/test`** (TypeScript), `fullyParallel: true`, retries: 1 in CI / 0 locally |
| Browser | **Chromium only** for `web-cloud` / `web-desktop` (the Angular app is Chrome-targeted in production kiosks; cross-browser matrix is out of scope until Wave 5 review) |
| Projects | `web-cloud` — browser against a **cloud-mode** API (PostgreSQL/SqlServer, multi-tenancy enabled, subdomain/`X-Tenant-ID` resolution) <br> `web-desktop` — same browser project against a **desktop-mode** API (SQLite, `MultiTenancy:Enabled=false`, `DeploymentSettings:DeploymentMode="Desktop"`), reusing the same specs via `baseURL` switch <br> `electron` — **optional**, uses Playwright's `_electron.launch({ args: ['main.js'] })` for the WF-10.1 boot journey only (J-29); excluded from default `playwright test` run |
| baseURL | `web-cloud`: `http://localhost:4200` (Angular dev server proxying `/api` to the cloud API, per `angular.json`/`proxy.conf.json`) · `web-desktop`: `http://localhost:4400` (second dev-server instance proxying to the desktop API) · config reads `process.env.E2E_BASE_URL` override |
| Auth | **`storageState`**: `global-setup.ts` logs in **once per role** through the real `POST /api/authentication`, persists `admin.json` / `manager.json` / `cashier.json` storage states (localStorage `access_token`, `auth_obj`, `userMenus`) into `playwright/.auth/`; specs use `test.use({ storageState: 'playwright/.auth/admin.json' })`. Login-failure and registration journeys intentionally skip storageState (fresh context) |
| Data bootstrap | **API-only, never DB**: every precondition is created through the request context (`playwright.request`) — tenant register, users, products, stock, customers, orders, reminders. Journeys must remain runnable against a disposable CI API instance with no direct SQL access |
| Seeding helper | Shared `ApiSeeder` class wrapping the request context (see §5). One **new tenant per worker** is the primary isolation boundary in cloud mode; desktop mode isolates via per-worker SQLite file |
| Reports | HTML reporter + JUnit for CI; trace retained `on-first-retry`; video off (cost) except Electron |
| Time budget | Smoke < 10 min · full suite < 45 min (charter §6) |

**Mode rule:** a journey marked `both` runs identically in `web-cloud` and `web-desktop` — seeds resolve tenant context from the logged-in JWT (cloud) or the single-tenant fallback (desktop). Journeys marked `cloud` depend on multi-tenancy (register/switch/trial/storefront); Electron-shell behavior lives in J-29 (`electron` project only).

---

## 2. Journey Catalog (29 journeys, J-01…J-29)

Legend: **Mode** = cloud / desktop / both · **P** = priority · TC IDs in `Covered TCs` are the catalog cases this journey executes at the E2E layer (IT-layer IDs are cited as the pinned backend contract the UI ride on).

---

### J-01 — Login success: routing per role and session state
- **Roles:** cashier, manager · **Mode:** both · **P:** P0 · `@smoke`
- **Covered TCs:** TC-D01.001, TC-D01.022
- **Preconditions:** seeded tenant (ApiSeeder `seedTenant()`), users `admin`/`manager`/`cashier` (seeded at registration).
- **Steps:**
  - Given a fresh browser context (no storageState) on `/login`
  - When cashier submits valid credentials (geolocation permission granted via context options)
  - Then toast **"LOGIN_SUCCESSFULLY"** is visible; URL is `/pos` (POS-only claim lands on POS); `localStorage['access_token']` holds a 3-segment JWT; `localStorage['userMenus']` parses as a JSON array
  - When manager submits valid credentials
  - Then URL lands on `/` (dashboard), `localStorage['auth_obj']` exists
  - When the login form is submitted with an empty password
  - Then client-side validation shows and **no** `POST /api/authentication` request fires (network assertion)
- **Assertions:** exact URLs `/pos` and `/`; toast text; localStorage keys present.
- **Flakiness:** toast auto-dismiss — assert within dialog container, not `waitForTimeout`; geolocation prompt must be pre-granted (`permissions: ['geolocation']`).

### J-02 — Login failure UX: generic 401 message, form stays usable, no lockout (absence characterization)
- **Roles:** anonymous · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D01.002, TC-D01.003 (IT/PM contracts surfaced through the UI); **no E2E-layer TC exists** — see note
- **Preconditions:** admin user seeded.
- **Steps:**
  - Given the login screen
  - When submitting `admin` + wrong password 3 times consecutively
  - Then each attempt shows the identical error toast **"UserName Or Password is InCorrect."** (unknown-username attempt shows the same text — no enumeration); the form remains interactive; no redirect
  - When valid credentials are finally submitted
  - Then login succeeds (J-01 assertions) — no cooldown/captcha interstitial appeared at any point
- **Assertions:** exact toast text ×3; post-failure successful login.
- **Note (lockout):** the D01 catalog contains **no lockout TC** — no failed-attempt counter/lockout exists in code. This journey is an explicit characterization of that absence; when an account-lockout enhancement is scheduled, add its TC to D01 and flip the third assertion to the lockout UX (Gap-Target swap, same pattern as §7).
- **Flakiness:** rapid resubmits can race the toast — use `expect(toast).toBeVisible()` per attempt before resubmitting.

### J-03 — Sidebar menu renders from login claims (Can* flags)
- **Roles:** manager (menu-claims role) · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D01.021
- **Preconditions:** tenant with role R-MANAGER holding `USR_VIEW_USER` (via `seedRole()` + `seedUser()`), **no** `POS_POS`.
- **Steps:**
  - Given manager logged in (storageState)
  - Then the sidebar shows the **"Users"** parent and **"Users List"** child linking `/users`; the POS menu item is **absent**
  - When clicking Users List
  - Then `/users` loads the user grid (guard `USR_VIEW_USER` passes)
- **Assertions:** sidebar link count/labels; absence of POS link; successful navigation.
- **Flakiness:** sidebar renders after the login menu payload — wait on the Users link, not `networkidle`.

### J-04 — Route protection: deep-link redirect and permission-denial UX
- **Roles:** cashier · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D01.023, TC-D01.024 (403 UX)
- **Preconditions:** none beyond seeds.
- **Steps:**
  - Given a **fresh context** (no session) navigating directly to `/users`
  - Then redirected to `/login`; **no** permission toast is shown (session-missing branch is silent)
  - Given cashier logged in (claims `POS_POS` only) navigating to `/users` (route `claimType: USR_VIEW_USER`)
  - Then an error toast with the **`UI_PERMISSION_ERROR`** translation text appears and the URL becomes `/login`; session (`access_token`) is preserved
- **Assertions:** exact redirect targets; toast text key; no second toast duplication.
- **Flakiness:** toast timing — bind assertion to the toastr container; run with `page.waitForURL('/login')`.

### J-05 — Password recovery: reset link → new password → re-login
- **Roles:** anonymous (admin email) · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D01.031 (IT contract: `POST /api/forgotpassword` + `/api/recoverpassword/<code>`)
- **Preconditions:** admin with email `admin@<run>.test`; default `EmailSMTPSetting` seeded via API; SMTP is a capture double in the test host.
- **Steps:**
  - Given the forgot-password screen, when submitting the admin email
  - Then success toast; the test reads the reset link from the test host's **SMTP capture double** (email body contains `https://…/reset-password/<code>`; the API's user DTO never leaks `ResetPasswordCode` — TC-D01.029)
  - When opening `/#/reset-password/<code>` and submitting a new password `N3w-Secret!`
  - Then success toast is visible
  - When logging out/in with the **old** password → error toast; with `N3w-Secret!` → dashboard
  - When re-opening the same reset link → user-not-found error (code single-use, cleared)
- **Assertions:** exact password strings; old password rejected; code replay fails.
- **Flakiness:** none significant; resolver fetch adds one request — wait for the recovery form, not the resolver promise.

### J-06 — ForceLogout push clears the session mid-navigation
- **Roles:** cashier (victim), admin (trigger) · **Mode:** both (SignalR required) · **P:** P2
- **Covered TCs:** TC-D01.062 (IT: `UserHub.ForceLogout`)
- **Preconditions:** cashier session open in context A; admin API session.
- **Steps:**
  - Given cashier on `/pos` with an open SignalR connection
  - When the admin triggers ForceLogout for the cashier via API (`/api/User` admin surface)
  - Then within 5 s (no reload) context A is pushed to `/login` and `localStorage['access_token']`/`auth_obj` are gone
  - When the cashier navigates to `/pos` again
  - Then redirected to `/login` (guard rejects)
- **Assertions:** logout within 5 s; localStorage keys absent; redirect.
- **Flakiness:** WebSocket delivery timing — poll up to 5 s; do not stub the hub.

### J-07 — User & role management through the UI
- **Roles:** admin · **Mode:** both · **P:** P2
- **Covered TCs:** TC-D01.037, TC-D01.045 (IT contracts for User/Role creation surfaced via UI)
- **Preconditions:** admin storageState; location L1 seeded.
- **Steps:**
  - Given admin on `/roles` — when creating role **"Stock Clerk"** with claim `INV_GAIN` — then the role list shows the new row
  - Given admin on `/users` — when adding user `clerk-<run>@test` with role Stock Clerk and location L1 (password left default)
  - Then the user grid lists the new user with the role badge
  - When logging in as the new user with the default password `admin@123`
  - Then login succeeds and the sidebar exposes only the claims the role granted
- **Assertions:** grid rows; default-password login works (matches TC-D01.037); sidebar limited to role claims.
- **Flakiness:** role-claim multi-select is a mat-chip list — set values by keyboard to avoid overlay races.

### J-08 — Tenant registration → first-run dashboard (self-service signup)
- **Roles:** anonymous → new tenant admin · **Mode:** cloud · **P:** P0
- **Covered TCs:** TC-D02.001, TC-D02.052 (journey spec `J-01` named there = this journey)
- **Preconditions:** no tenant with subdomain `gamma-<run>` (unique suffix).
- **Steps:**
  - Given the public signup route `/register`
  - When filling name/subdomain/admin email/password/business type and submitting
  - Then success toast and redirect to the login screen
  - When logging in with the new admin credentials
  - Then dashboard renders with the seeded defaults: company title == registered name, menu items visible, location **"Main Warehouse"** selectable in the location switcher
  - Then `localStorage['access_token']` decodes with `TenantId` == the new tenant (parse in test from the raw JWT)
- **Assertions:** toast; company title text; JWT `TenantId` claim equality.
- **Flakiness:** registration provisions full default data (WF-2.1) — dashboard first paint can lag ~2–5 s; wait on company-title element with a raised timeout, not on a fixed sleep.

### J-09 — Tenant switch via UI: current broken token-key behavior *(Gap-Char)*
- **Roles:** superadmin · **Mode:** cloud · **P:** P0
- **Covered TCs:** TC-D02.027, TC-D02.031 — **Gap-Char [UX-01]**; Gap-Target swap: TC-D02.032 (see §7)
- **Preconditions:** superadmin tenant + second active tenant B seeded (`seedTenant()` ×2, admin promoted `IsSuperAdmin`).
- **Steps:**
  - Given superadmin on `/tenants` (`app-tenant-list`)
  - When opening the row menu and clicking **"Switch Tenant"** for tenant B, then waiting for the `window.location.href='/'` reload
  - Then `localStorage` contains key **`auth_token`** and does **not** contain `access_token`
  - When the dashboard boots and issues its first `GET /api/dashboard/statistics`
  - Then the request carries **no** `Authorization` header (network assertion) and the app bounces to `/login` — the current broken UX, asserted exactly
- **Assertions:** exact storage key names; missing auth header on first data call; redirect to login.
- **Flakiness:** the full page reload races storage writes — wait for `localStorage` key `auth_token` before asserting network calls.

### J-10 — Expired-trial write blocked → `/#/subscription` redirect
- **Roles:** tenant admin of an expired-trial tenant · **Mode:** cloud · **P:** P1
- **Covered TCs:** TC-D02.035, TC-D02.041
- **Preconditions:** tenant seeded **expired** — the one journey needing a test-host bootstrap route (`POST /test/seed/expired-tenant` in the CI API profile backdates `TrialExpiryDate`); document this as the sanctioned exception to API-only seeding (no public API mutates trial dates).
- **Steps:**
  - Given the expired-trial admin logged in and on `/brand`
  - When saving a new brand
  - Then the HTTP 403 `isTrialExpired:true` response triggers the interceptor: URL becomes `/#/subscription`, the purchase/activation form is visible, and the **login screen is not shown** (session preserved)
  - When performing a read (open the brands list)
  - Then the list still loads (reads stay allowed)
- **Assertions:** exact URL `/#/subscription`; activation form present; read path 200.
- **Flakiness:** interceptor redirect is instant; assert on URL, not on the transient 403 toast.

### J-11 — POS full checkout: barcode scan → walk-in customer → receipt *(+ client-only receipt assertion)*
- **Roles:** cashier · **Mode:** both · **P:** P0 · `@smoke`
- **Covered TCs:** TC-D03.013 (primary), TC-D03.015 (Gap-Char [S-11] — network assertions piggyback on the same flow)
- **Preconditions:** product **P-A** (`seedProduct`: code/barcode `PA-<run>`, salesPrice 100, tax GST-17), stock **100 @ L1** (`seedStock`), walk-in customer + location L1 preselected by the POS resolver.
- **Steps:**
  - Given cashier on `/pos`
  - When focusing the barcode field and scanning the P-A barcode twice
  - Then the cart shows one line, quantity 2, line total 234.00; cart summary shows tax 34.00 and **grand total 234.00**
  - When clicking Checkout
  - Then a success toast appears and the receipt (`app-sales-order-invoice` — `SalesOrderInvoiceComponent`) renders with order number matching `SO#\d{5}` and **grand total 234.00**
  - Then the form resets: cart empty, a **new** order number is fetched, customer still walk-in, location still L1
  - When scanning an unknown barcode `XXX-404`
  - Then a warning toast appears and the cart is unchanged
  - Network assertions (TC-D03.015): zero requests to any invoice/PDF/print endpoint occurred during receipt render; receipt data came from `GET /api/SalesOrder/{id}`
  - API post-condition via request context: `GET /api/ProductStock` → P-A @ L1 == **98**
- **Assertions:** cart line qty 2; grand total **234.00**; `SO#` + 5 digits; stock 98.
- **Flakiness:** scan handler debounces keystrokes — use `pressSequentially` with small delay; toast + receipt render concurrently — assert on the receipt component, not the toast, for the money number.

### J-12 — POS negative stock: "process anyway" dialog saves the sale *(Gap-Char)*
- **Roles:** cashier · **Mode:** both · **P:** P0
- **Covered TCs:** TC-D03.014 — **Gap-Char [S-04]**; Gap-Target swap defined in §7
- **Preconditions:** P-A stock **1 @ L1**.
- **Steps:**
  - Given cashier on `/pos` with P-A scanned ×3 (line qty 3, total 351.00)
  - When clicking Checkout
  - Then `ProductStockAlertDailogComponent` opens listing P-A with **stock 1, required 3**
  - When clicking **"process anyway"**
  - Then the dialog closes, success toast + receipt show **grand total 351.00**, and the order is saved
  - API post-condition: `GET /api/ProductStock` → P-A @ L1 == **−2** (no hard floor)
- **Assertions:** dialog numbers (1 vs 3); receipt total **351.00**; stock −2.
- **Flakiness:** Material dialog animation — `expect(dialog).toBeVisible()` before clicking; stock GET can race the save — retry-read up to 3 s.

### J-13 — Sales order lifecycle: create → edit → delete
- **Roles:** admin · **Mode:** both · **P:** P0 · `@smoke`
- **Covered TCs:** TC-D03.016, TC-D03.039, TC-D03.050 (IT contracts the UI rides on; update/delete guards TC-D03.041–044)
- **Preconditions:** P-A stock 100 @ L1; customer **C-1** (`seedCustomer`); admin storageState.
- **Steps:**
  - Given `/sales-order` list → new order form: customer C-1, add P-A qty 2 @ 100 + GST-17, payment method **Credit** (no auto-payment)
  - When saving → success toast; the list shows the new order with total **234.00**, status Pending, PaymentStatus **Pending**; stock cell reads **98**
  - When opening the order (edit), changing quantity to 3 and saving
  - Then the list row shows **351.00** and stock **97**
  - When deleting the order from the row action and confirming
  - Then the row disappears from the list and stock returns to **100** (type-flip restoration)
- **Assertions:** totals 234.00 → 351.00 → deleted; stock 98 → 97 → 100.
- **Flakiness:** list grid refetch after save — wait on the updated cell text with `expect.poll`.

### J-14 — Quotation (sales-order request) create → convert to order
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D03.056, TC-D03.058 (IT: conversion creates the real SO; original SOR row remains)
- **Preconditions:** P-A stock 100 @ L1; customer C-1.
- **Steps:**
  - Given `/sales-order-request` → new request form for C-1 with P-A ×2 @ 100 + GST-17
  - When saving → list shows the request numbered `SOR#\d{5}` with total **234.00**; no payment panel is offered
  - When clicking **Convert to Order** on the row
  - Then a success toast appears; `/sales-order` list now contains a real order `SO#\d{5}` total **234.00** and stock dropped to **98**
  - Then the request list still shows the original SOR row (it remains after conversion)
- **Assertions:** SOR vs SO numbering; total 234.00; stock 98; SOR row still present.
- **Flakiness:** convert triggers two list refreshes — assert the SO list after the toast settles.

### J-15 — Sales return with refund and PaymentStatus change
- **Roles:** admin · **Mode:** both · **P:** P0
- **Covered TCs:** TC-D03.066, TC-D03.067, TC-D03.068 (IT: pro-rated refund + status recompute)
- **Preconditions:** paid cash sale seeded via API (`seedPaidSale`: P-A ×2 @ 100 + GST-17 = **234.00**, PaymentStatus Paid, stock 98 @ L1).
- **Steps:**
  - Given `/sales-order-return/add` and the seeded order selected
  - Then `returnItems` shows previously-returned quantity 0 and max returnable 2 per line
  - When entering return quantity **1** for P-A with refund method Cash and submitting
  - Then success toast; the return list shows a return row `SRN`-referenced order with **refund 117.00** (234 × 1/2, tax pro-rated)
  - When opening the original order detail
  - Then PaymentStatus badge reads **Partial** (117.00 still collected) and stock at L1 reads **99** (+1 restock)
- **Assertions:** refund **117.00**; PaymentStatus **Partial**; stock 98 → 99.
- **Flakiness:** the return pipes recompute line totals client-side — enter qty via the spinner, then wait for the refund field to settle before saving.

### J-16 — Purchase order: create → mark received → supplier payment lifecycle
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D04.068, TC-D04.069, TC-D04.070, TC-D04.020 (Gap-Char [BIZ-01] on the cosmetic receive)
- **Preconditions:** supplier **SUP-1** (`seedSupplier`); P-SIMPLE (`seedProduct` purchasePrice 120, GST-17); location L1.
- **Steps:**
  - Given `/purchase-order` → new PO: supplier SUP-1, P-SIMPLE 10 @ 120 + GST-17
  - When saving → detail shows **Total 1404.00**, tax 204.00, status badge **Pending**; `/inventory` shows P-SIMPLE @ L1 == **110** (stock granted at creation)
  - When clicking **Mark Received** on the PO
  - Then the badge flips to **RECEIVED**; stock **still 110**; payment panel unchanged (receive is cosmetic — Gap-Char)
  - When paying **600.00** (Cash) then opening the payment panel again and paying the remaining **804.00**
  - Then the status badge transitions Pending → **Partial** → **Paid**; payment history lists exactly 2 rows (600.00, 804.00); the total-paid tile shows **1404.00**
- **Assertions:** 1404.00 / 204.00; stock 110 throughout; badge transitions; payment history sum 1404.00.
- **Flakiness:** badge re-render after payment — assert via `expect.poll` on the badge text.

### J-17 — Purchase return with supplier refund through the UI
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D04.043, TC-D04.045, TC-D04.050 (IT: mirrored entries, stock decrease, PaymentStatus recompute)
- **Preconditions:** J-16 end-state PO (Paid, 1404.00, stock 110) seeded via API for isolation (`seedPaidPurchase`).
- **Steps:**
  - Given `/purchase-order-return` → new return selecting the paid PO, returning all 10 units of P-SIMPLE
  - When submitting with refund method Cash
  - Then the return appears in the list with refund **1404.00**; the PO detail shows PaymentStatus recomputed and status **Return**
  - Then `/inventory` shows P-SIMPLE @ L1 == **100** (−10)
- **Assertions:** refund **1404.00**; stock 110 → 100.
- **Flakiness:** item list on the return form loads async — wait for the line row before entering quantity.

### J-18 — Stock adjustment gain/loss via the inventory UI
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D05.020 (IT contract: `StockAdjustmentStrategy` posts Dr/Cr 5400)
- **Preconditions:** P-SIMPLE stock **100 @ L1**.
- **Steps:**
  - Given `/inventory` (`app-inventory-list`) → Stock Adjustments → select P-SIMPLE, quantity **+5**, price 100, reason "cycle count", method Cash
  - When saving
  - Then success toast; the product grid cell for P-SIMPLE @ L1 reads **105** after refresh; the adjustment row appears in the transaction list with a reference number
  - When repeating with **−3** (loss)
  - Then the grid reads **102**
- **Assertions:** stock 100 → 105 → 102; adjustment list rows present.
- **Flakiness:** grid uses a location filter — ensure L1 is the active filter before asserting the cell.

### J-19 — Stock transfer between locations
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D05.054 (IT: WF-5.5 paired transactions)
- **Preconditions:** P-NOTAX (no tax) stock **50 @ L1**, L1 + L2 seeded.
- **Steps:**
  - Given `/stock-transfer` → New Transfer: from L1 to L2, P-NOTAX qty **10**, save as **Delivered**
  - Then the transfer list shows the row with Status Delivered and a ReferenceNo
  - When filtering `/inventory` by L1
  - Then P-NOTAX @ L1 == **40**; switching the filter to L2 shows **10**
  - When opening the transfer detail
  - Then two linked transactions (outbound/inbound) are visible
- **Assertions:** 50 → 40 / 0 → 10; reference number present.
- **Flakiness:** the stock-alert dialog can pop if qty exceeds stock — with seeds controlled it must not; assert its absence to catch seed drift.

### J-20 — Dashboard tiles render seeded ledger aggregates + low-stock widget reaction
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D07.053 (IT: `dashboard/statistics` aggregates), TC-D05.070 (low-stock widget reacts to adjustments)
- **Preconditions:** canonical seed from TC-D07 (`seedCanonicalLedger`: purchases 1170 on 03-10, sales 468 + 234, return 234 within the 03-10…03-12 window — posted via API sales/purchase/expense helpers); product **P-LOW** stock **5**, alert quantity **20** @ L1.
- **Steps:**
  - Given admin on `/` (dashboard) with the statistics window set to 2026-03-10…2026-03-12
  - Then the four tiles read **Total Purchase 1,170.00**, **Total Sales 702.00**, **Total Sales Return 234.00**, **Total Purchase Return 0.00**
  - Then the Low Stock widget lists **P-LOW** (stock 5 ≤ alert 20)
  - When navigating to `/inventory`, adjusting P-LOW **+20** (gain), and returning to the dashboard
  - Then after refresh P-LOW is **absent** from the widget (25 > 20) and the widget row count decremented by 1
- **Assertions:** exact four tile numbers; widget membership flip for P-LOW.
- **Flakiness:** dashboard queries are server-cached 15 min with no write-side eviction (TC-D09.061) — **each worker must use its own tenant** so a prior run's cached tile values can't leak; never re-run a journey against a reused tenant on the same day. The widget poll is on a different endpoint (stock-alert, uncached) — wait on the row removal, not the tile refresh.

### J-21 — Trial Balance + Profit & Loss render seeded totals (+ transactions-list epilogue)
- **Roles:** admin · **Mode:** both · **P:** P0 · `@smoke`
- **Covered TCs:** TC-D07.001, TC-D07.010, TC-D06.092
- **Preconditions:** canonical ledger seed (§J-20) with the D07 COA and FY2026; the seeded sale (SO-1, total **468.00**) is the posted-sale fixture for the epilogue.
- **Steps:**
  - Given `/accounting/trial-balance-report` (`app-trial-balance-report`) with window 2026-03-01…2026-03-31
  - Then the grid renders **13 rows** and ΣDebit == ΣCredit == **3,157.00** (both totals visible in the footer)
  - Given `/accounting/profit-loss-report` (`app-profit-loss-report`) for FY2026
  - Then Net Result shows **100.00** with the label **"Profit"**
  - Given `/accounting/transactions` (Accounting → Transactions list, epilogue for TC-D06.092)
  - Then a row is visible with type **Sale**, reference == the seeded sale order number, amount **468.00**, status **Completed** (key totals only — the D06 fixture's own 895/`SAL-…-0001` example belongs to its IT seed; this journey asserts its own seeded numbers)
- **Assertions:** 13 rows; 3,157.00 balanced; NetResult 100.00 "Profit"; Sale transaction row 468.00 Completed.
- **Flakiness:** report date pickers are native inputs — set via `fill` with ISO dates; row-count asserts exclude the totals row; the transactions grid is paged — filter by the sale reference before asserting.

### J-22 — Balance Sheet renders the accounting identity
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D07.007
- **Preconditions:** canonical ledger seed.
- **Steps:**
  - Given `/accounting/balance-sheet-report` for FY2026
  - Then Total Assets **2,717.00**, Total Liabilities **68.00**, Total Equity **2,649.00** are rendered and 2,717.00 == 68.00 + 2,649.00
- **Assertions:** the three totals + identity.
- **Flakiness:** none beyond the shared seed cache rule (J-20).

### J-23 — Customer creation + ledger FIFO payment via UI
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D08.017, TC-D08.015 (IT/UT: FIFO fan-out to per-order payments)
- **Preconditions:** customer **C-1** with two credit orders seeded via API: O1 due **500.00**, O2 due **300.00** (oldest first), overdue **800.00**.
- **Steps:**
  - Given `/customer` list → new customer form (name, phone, billing address) → save → grid shows the customer
  - Given `/customer-ladger/add` (note the route's `ladger` spelling) selecting C-1, amount **650.00**, Cash, note "receipt #R1"
  - When submitting
  - Then the ledger list shows the new row amount 650.00 with **Balance 0.00** and the application note fragments `SO-… (500)` / `SO-… (150)`
  - When opening the customer's orders (`/customer-sales-order` filtered to C-1)
  - Then O1 shows Paid (TotalPaidAmount **500.00**) and O2 shows **Partial** (paid **150.00** of 300.00)
- **Assertions:** FIFO split (500 → O1, 150 → O2); Balance 0.00; O1 Paid / O2 Partial.
- **Flakiness:** overdue fetch populates the amount ceiling asynchronously — wait for the overdue field before typing the amount.

### J-24 — Inquiry → activity → qualify → manual convert → customer → credit order *(Gap-Char: no conversion artifact)*
- **Roles:** sales user (admin in test) · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D08.036 — Happy + **Gap-Char [C-04]**
- **Preconditions:** inquiry source/status masters seeded (registration defaults); products P-A, P-B available.
- **Steps:**
  - Given `/inquiry` → new inquiry with contact details and products P-A, P-B
  - When opening the inquiry detail, adding activity **"call — interested"** and progressing status to **Qualified**
  - Then the activity timeline shows the note with timestamp and the status chip reads Qualified
  - When manually creating a customer with the inquiry's contact data (`/customer`), then creating a **credit** sales order for that customer with P-A + P-B (`/sales-order`)
  - Then the customer exists with matching Email/MobileNo and the order lists both products
  - When returning to the inquiry and setting status **Closed**
  - Then the status chip reads Closed; **no link/attribution row exists** between the inquiry and the order or customer (assert via the API: no inquiry-reference fields on the returned customer/order objects — Gap-Char)
- **Assertions:** status transitions; contact equality; absence of conversion linkage.
- **Flakiness:** inquiry status select is server-persisted per keystroke-free save — one save per status change.

### J-25 — Reminders: create daily reminder, receive notification toast in-session
- **Roles:** admin (creator), cashier (target) · **Mode:** both · **P:** P2
- **Covered TCs:** TC-D09.032 (toast + presence), TC-D08.037 (IT: reminder creation contract)
- **Preconditions:** cashier session open on `/pos`; admin session seeds the reminder via UI.
- **Steps:**
  - Given admin on `/reminders` → new reminder "Shift handover", target user cashier, Frequency **Daily**, start time now + 1 min, IsEmailNotification off
  - When saving
  - Then the reminder list shows the row with the Daily badge and the cashier chip
  - When the dispatcher tick (`*/10` job, or the test-host trigger endpoint `POST /test/trigger/reminderschedule`) fires while the cashier session is open
  - Then a notification toast appears in the cashier context within 5 s **without page refresh**; `/notifications` lists the unread row
  - *(Optional, `@flaky` tag)* kill-and-restart the API mid-session → the SignalR reconnect ladder re-establishes presence within ~45 s
- **Assertions:** toast within 5 s; unread notification row; (optional) reconnect.
- **Flakiness:** the */10 cron means a natural wait of up to 10 min — **always** use the test-host trigger endpoint; toast auto-dismisses fast — watch for it via `page.waitForEvent` on the toastr container.

### J-26 — Import products file through the UI
- **Roles:** admin · **Mode:** both · **P:** P1
- **Covered TCs:** TC-D09.045, TC-D09.046, TC-D09.051 (IT contracts; import has no claim gate — characterized)
- **Preconditions:** category/brand/unit masters seeded with known names; CSV fixture generated at runtime into `test-results/`.
- **Steps:**
  - Given `/products` → Import action → file chooser fed `products-<run>.csv` (header + 3 valid rows, FK names matching seeds)
  - When uploading
  - Then a summary shows **totalRecords 3, successCount 3, failureCount 0**; the product grid lists the 3 new products
  - When uploading a second file with 2 valid rows + 1 row where `SalesPrice = 0`
  - Then the summary shows **failureCount 1** (error row `SalesPrice`) and **0** new products appear (all-or-nothing — Gap-Char [UX-04] behavior; row-level accept is the UX-04 Gap-Target, §7)
- **Assertions:** success counters 3/0; failure counter with field name; grid row counts.
- **Flakiness:** file-chooser events are racy — use `page.waitForEvent('filechooser')`; grid pagination may hide the last row — filter by name first.

### J-27 — Email logs page renders sent and failed rows
- **Roles:** admin · **Mode:** both · **P:** P2
- **Covered TCs:** TC-D09.024 (IT: `EmailLogRepository` shapes)
- **Preconditions:** one Sent + one Failed EmailLog produced via API sends (`POST /api/email` with SMTP capture up / down in the test host).
- **Steps:**
  - Given `/email-logs`
  - Then exactly 2 rows render with status badges **Sent** / **Failed** and sender/recipient/subject/timestamps
  - When filtering by subject substring
  - Then the list narrows to 1; opening the sent row shows the body and attachment name `invoice-1.pdf`
- **Assertions:** row count 2; badge texts; attachment name.
- **Flakiness:** email rows are tenant-wide — filter by the run's unique subject suffix before asserting count.

### J-28 — Storefront visit: catalog → cart → checkout stub *(Gap-Char)* · cloud only
- **Roles:** anonymous shopper · **Mode:** cloud · **P:** P2
- **Covered TCs:** TC-D09.053, TC-D09.055, TC-D09.056 — **Gap-Char [BIZ-05]**; Gap-Target swap: TC-D09.057 (§7)
- **Preconditions:** tenant with 7 active + 1 soft-deleted product (`seedProduct` + soft-delete via API).
- **Steps:**
  - Given `/store/<tenantName>` in a fresh context (no auth)
  - Then the catalog renders **7** products with the tenant name in the header and cart badge **0**; the deleted product is absent
  - When adding P1 to cart twice and P2 once
  - Then the badge reads **3**; removing one P1 line drops it to **2**
  - When completing checkout with guest details
  - Then the OrderSuccess page renders — and the API shows **zero** new SalesOrder rows (checkout is a stub; cart silently cleared)
- **Assertions:** product count 7; badge 3 → 2; success page; zero orders created.
- **Flakiness:** the storefront is a server-rendered MVC app on the API origin — use the API `baseURL`, not the Angular dev-server; session cookie must persist across steps (same context).

### J-29 — Electron boot journey (first-run → API spawn → main window)
- **Roles:** cloud user · **Mode:** electron project only · **P:** P1
- **Covered TCs:** TC-D10.001, TC-D10.002, TC-D10.004
- **Preconditions:** loopback mock cloud (login + `my-database` zip ≥ 1 MB); clean `%APPDATA%` fixture dir (no `POSDb.db`, no `auth.json`); packaged app or dev `main.js`.
- **Steps:**
  - Given `_electron.launch` with the mock-cloud env override and an empty userData
  - Then the splash window appears immediately and the frameless **cloud-login** window (450×600) opens
  - When entering valid cloud credentials
  - Then the setup splash reports `download-progress` events reaching 100%; `POSDb.db` exists in userData afterwards and `setup_package.zip` is deleted; `auth.json` exists
  - Then the API child process is spawned (`api-debug.log` logs `Process spawned with PID:`) and the main window (1200×800) opens **only after** the log line `Application is running on` / `Now listening on:`
  - When relaunching (run B) with the userData now populated
  - Then **no** cloud-login window appears; the app boots straight to the main window; the mock cloud logs no `my-database` request (re-provision guard)
- **Assertions:** window sizes/titles; file existence; log-line ordering; no re-download.
- **Flakiness:** process/log polling — read `api-debug.log` with a retry loop; the 60 s safety timeout (TC-D10.003) must not fire during a healthy run — assert window-open latency < 60 s to catch regressions. TC-D10.005 (DPAPI auth.json contents) and the updater journeys (TC-D10.042–044) remain **manual QA scripts** per the D10 catalog.

---

## 3. Page Object Model Plan

| POM class | Key methods (brief) |
|---|---|
| `LoginPage` | `login(user, pwd)`, `expectToast(text)`, `expectLandedOn(path)`, `submitEmpty()` (client-validation branch) |
| `RegisterTenantPage` | `register({name, subdomain, email, password, businessType})`, `expectSuccessToast()` |
| `PosPage` | `scanBarcode(code, times)`, `expectCartLine(qty, total)`, `expectGrandTotal(amount)`, `checkout()`, `expectReceipt(pattern, total)`, `confirmStockAlert('process anyway')`, `expectFormReset()` |
| `SalesOrderPage` | `openList()`, `newOrder(customer, items, paymentMethod)`, `editOrder(no, changeQty)`, `deleteOrder(no)`, `expectRow(no, {total, status, paymentStatus})`, `convertRequest(no)` (quotation), `expectStockCell(product, qty)` |
| `SalesReturnPage` | `startReturn(orderNo)`, `setReturnQty(line, qty)`, `selectRefundMethod(method)`, `submit()`, `expectRefundRow(amount)`, `expectOrderPaymentStatus(no, status)` |
| `PurchaseOrderPage` | `newPO(supplier, items)`, `expectDetail({total, tax, badge})`, `markReceived()`, `pay(amount, method)`, `openPaymentHistory()`, `startReturn(items)` |
| `InventoryPage` | `open()`, `filterLocation(loc)`, `expectStock(product, qty)`, `openAdjustment()`, `adjust(product, qty, price, reason, method)` |
| `ReportsPage` | `openTrialBalance(from, to)`, `expectBalanced(total)`, `openProfitLoss(fy)`, `expectNetResult(amount, label)`, `openBalanceSheet(fy)`, `expectIdentity(a, l, e)`, `openTransactions()`, `expectTransactionRow({number, type, amount, status})` |
| `CustomersPage` | `create(customer)`, `openLedgerPayment(customer)`, `payLedger(amount, note)`, `expectLedgerRow({amount, balance, note})`, `expectOrderStatus(no, {paymentStatus, paid})` |
| `InquiriesPage` | `create(inquiry)`, `addActivity(text)`, `setStatus(s)`, `expectStatusChip(s)`, `expectNoConversionLink()` (API-aided) |
| `TenantsPage` | `openList()`, `switchTenant(name)`, `expectStorageKey(key)`, `expectAuthHeaderOnFirstCall(bool)` |
| `UsersRolesPage` | `createRole(name, claims)`, `createUser(email, role, location)`, `expectGridRow(email)` |
| `DashboardPage` | `expectTile(label, amount)`, `expectLowStockRow(product, stock)`, `setStatisticsWindow(from, to)` |
| `StorefrontPage` | `open(tenant)`, `expectProductCount(n)`, `addToCart(product, times)`, `expectCartBadge(n)`, `checkoutGuest(details)`, `expectOrderSuccess()` |

Notes: every POM exposes only behavior; money assertions use `expect.poll` where grids refetch. Toast helpers bind to the toastr container class shared app-wide. A small `ApiSeeder` helper (not a POM) lives in `tests/e2e/support/seeder.ts`.

---

## 4. Test Data Strategy

### Seeding functions (all via Playwright `request` context — API only, never DB)

| Function | Creates |
|---|---|
| `seedTenant(subdomain?)` | Registers a tenant via `POST /api/Tenants/register` (unique subdomain), logs its admin in, returns `{tenantId, adminToken, userId, locationId: L1-Main Warehouse, fyId}`. The WF-2.1 provisioning gives roles, menus, COA, open FY, zero-stock product — reused as the journey baseline |
| `seedUser(token, {email, roleIds, locationIds})` | User with roles/locations (default password `admin@123`) |
| `seedRole(token, {name, claims})` | Role + RoleClaims (underscore-normalized claim types) |
| `seedProduct(token, {name, code, salesPrice, purchasePrice, taxName, category, brand, unit})` | Product master |
| `seedStock(token, {productId, locationId, currentStock, pricePerUnit})` | ProductStock row (adjustment endpoint — the seeded stock basis) |
| `seedCustomer(token, {name, email, phone})` / `seedSupplier(...)` | CRM parties |
| `seedSaleOrder(token, {customerId, items, paymentMethod})` / `seedPaidSale(...)` | Sales orders (cash variant auto-settles → Paid) |
| `seedPurchaseOrder(token, {...})` / `seedPaidPurchase(...)` | Purchase orders incl. payments |
| `seedCanonicalLedger(token)` | The D07 canonical seed shape: PO + SO×2 + return + expense + payment + payroll/stockloss/roundoff entries in the current month (dates derived from the clock, mirroring TC-D07's builder parameterization) |
| `seedReminder(token, {...})`, `seedInquiry(token, {...})`, `seedEmailLogs(token)` | CRM + email-log fixtures |

### Cleanup
- **Uniqueness instead of teardown:** every generated name/number carries the suffix `<run>` = `YYYYMMDD-HHMMSS-w{workerIndex}` (subdomains, product codes `PA-<run>`, email subjects, user emails). Journeys never assert global counts — only rows they created.
- The CI API + DB are **ephemeral per pipeline run** (cloud: dedicated test database recreated by the deploy job; desktop: per-worker SQLite files in `test-results/`). No DELETE sweeps — a failed run is discarded wholesale.

### Parallelism rules
- `fullyParallel: true`; cloud-mode workers each own **one freshly registered tenant** (max isolation — cache, menus, and ledger data are all tenant-scoped; this also defeats the 15-min dashboard cache leak noted in J-20).
- Desktop mode: one SQLite API per worker (distinct `--ConnectionStrings:SqliteConnectionString`), so no cross-worker contention.
- Workers capped at 4 (cloud) / 2 (desktop) — SignalR + Hangfire on a shared API host tolerate 4 comfortably.
- Never share a tenant across workers; never reuse a tenant across the same calendar day (dashboard cache).

---

## 5. Execution Matrix

| Suite | Command | Journeys | Est. duration |
|---|---|---|---|
| **Smoke** (`@smoke`, P0 core, < 10 min) | `npx playwright test --project=web-cloud --grep @smoke` | J-01, J-11, J-13, J-21 (login + POS checkout + SO lifecycle + TB/P&L) | **~7 min** |
| **Full cloud** | `npx playwright test --project=web-cloud` | J-01–J-28 (all cloud-capable web journeys) | ~28 min (4 workers) |
| **Full desktop** | `npx playwright test --project=web-desktop` | `both` journeys only: J-01–J-07 + J-11–J-27 (cloud-only J-08/J-09/J-10/J-28 excluded) | ~18 min (2 workers) |
| **Electron** (manual trigger) | `npx playwright test --project=electron` | J-29 | ~4 min |
| **CI (both projects + reports)** | `npx playwright test --project=web-cloud ; npx playwright test --project=web-desktop` (staged jobs) | 28 cloud + 24 desktop spec executions | ~45 min wall clock across parallel CI jobs (charter limit respected) |

Smoke selection rationale: one P0 journey per money-critical surface (auth gate, POS checkout, order lifecycle, financial-statement correctness) keeps the PR gate under 10 minutes; everything else runs nightly / pre-release.

---

## 6. Coverage Summary — E2E-layer TC traceability

Every E2E-tagged TC in the catalogs maps to ≥1 journey above:

| Domain | E2E TCs | Journey(s) |
|---|---|---|
| D01 | 001, 021, 022, 023, 024, 031, 062 | J-01, J-03, J-01/J-02, J-04, J-04, J-05, J-06 |
| D02 | 001, 027, 031, 035, 041, 052 (+032 RED) | J-08, J-09, J-09, J-10, J-10, J-08 (+§7 swap) |
| D03 | 013, 014, 015 | J-11, J-12, J-11 |
| D04 | 020, 068, 069, 070 | J-16, J-16, J-16, J-16 |
| D05 | 020, 054, 070 (+060 RED) | J-18, J-19, J-20 |
| D06 | 092 | J-21 |
| D07 | 001, 007, 010, 053 | J-21, J-22, J-21, J-20 |
| D08 | 036 | J-24 |
| D09 | 024, 032 | J-27, J-25 |
| D10 | 001, 002, 003, 004, 005, 010, 011, 042, 043, 044, 050 | J-29 executes 001/002/004 — the remaining 8 are deferred below (manual-by-design or RED), exactly as the D10 catalog's testability tiers dictate |

### Explicitly deferred E2E TCs (with reason — per coverage requirement)

| TC | Reason | Activation |
|---|---|---|
| TC-D02.032 | Gap-Target [UX-01] — **RED by definition** until the `auth_token`→`access_token` fix lands | Swap into J-09 (§7) |
| TC-D05.060 | Gap-Target [BIZ-02] — expiry-alert widget does not exist yet; the IT layer owns the feed | New dashboard-widget step after BIZ-02 lands |
| TC-D10.003 | Simulating a hung API is not reliably scriptable — catalog designates Manual QA script | Manual QA checklist |
| TC-D10.005 | DPAPI file contents are a manual step + UT file inspection (machine-bound DPAPI) | Manual QA checklist |
| TC-D10.010 | Gap-Target [SEC-02] — env-var override **RED** (hard-coded URL still ships); E2E half blocked behind the fix | Post-fix Electron spec |
| TC-D10.011 | Detached-DevTools observation — screenshot-based manual step | Manual QA checklist |
| TC-D10.042–044 | Updater flows need a signed, installed, packaged harness + local update feed — catalog marks semi-manual | Manual QA checklist / packaging harness epic |
| TC-D10.050 | Two-machine offline→sync choreography — catalog marks Manual QA script | Manual QA checklist |

**Totals:** 44 E2E-layer TCs identified across the ten catalogs (D01: 7 · D02: 7 · D03: 3 · D04: 4 · D05: 4 · D06: 1 · D07: 4 · D08: 1 · D09: 2 · D10: 11) — **34 executed by journeys J-01…J-29**, **10 explicitly deferred with reasons** (2 RED Gap-Targets awaiting their enhancements, 8 manual-by-design per the D10 catalog's testability tiers). Zero orphans.

---

## 7. Gap-Char E2E Journeys (assert current buggy behavior — GREEN today)

| Journey | Gap | Asserts today | Gap-Target swap-in after fix |
|---|---|---|---|
| **J-09** Tenant switch | UX-01 | `auth_token` stored, no `Authorization` header, bounce to login | TC-D02.032: same steps; then assert `access_token` key, `Authorization: Bearer` on first XHR, dashboard renders tenant B's data. Flip is a reviewed Gap-Char→Gap-Target act — never silent |
| **J-12** POS negative stock | S-04 | "process anyway" saves, stock −2 | Desired: dialog gains a documented blocking/validation path per the S-04 enhancement spec — rewrite asserts to the agreed post-fix UX (block or manager-override), then retire the −2 assertion |
| **J-16** (receive stage) | BIZ-01 | Mark Received flips badge only; stock unchanged (110); no partial-receipt input | TC-D04.023/024 (GRN): replace with receipt-line flow asserting stock +Δ at receipt time and PartialReceived status |
| **J-24** Inquiry convert | C-04 | Manual conversion; **no** attribution artifact exists | When C-04 state machine / conversion linkage lands: assert a conversion reference between inquiry and order/customer and a legal-transition 409 on illegal moves |
| **J-26** (second upload) | UX-04 | All-or-nothing import: 1 bad row discards valid rows | TC-D09.047: same file then asserts successCount 2, failureCount 1 with per-row error, valid rows persisted |
| **J-28** Storefront checkout | BIZ-05 | OrderSuccess page with **zero** orders created | TC-D09.057: same journey then asserts a real guest SOR row (`IsSalesOrderRequest=true`) and cart retained on failure path |
| **J-02** (lockout absence) | — (no doc-11 ID; characterized absence) | Repeated 401s, no lockout | When an account-lockout TC is added to D01: assert the lockout UX (counter/cooldown) instead |

---

## 8. Conventions Recap (bound by 00_TEST_STRATEGY.md)

- Spec filenames: `tests/e2e/{journey-id}-{slug}.spec.ts` (e.g. `j-11-pos-checkout.spec.ts`).
- One logical assert-cluster per journey; failure names the broken behavior (charter §5).
- Money assertions are **key totals only** — the 3-segment journal math belongs to IT/UT.
- All seeds through the API; the single sanctioned exception (J-10's expired-trial bootstrap) is documented in the journey itself.
- Every Gap-Char journey stays GREEN today and flips only through the reviewed swap defined in §7.
