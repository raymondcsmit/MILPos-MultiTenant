# TC-D08 — CRM / Inquiry / Reminder Test Cases

**Source:** `New-Documents/08_CRM_Inquiry_Reminder_Workflows.md` (WF-8.1 … WF-8.4)
**Scope:** Customer & supplier CRUD, customer ledger lump-payment with FIFO application, inquiry (lead) lifecycle, and the reminder pipeline (creation → Hangfire fan-out → 10-min dispatch → SignalR/email notification → mark-read).
**Workflows covered:** WF-8.1, WF-8.2, WF-8.3, WF-8.4.
**Gap signals referenced:** BIZ-07 (WF-8.1), ACC-09 (WF-8.2), C-04 (WF-8.3), RT-01, RT-02, UX-05 (WF-8.4).

**Key code citations (spot-verified):**
- `POS.MediatR/CustomerLedger/Add/AddCustomerLedgerCommandHandler.cs:35-38` (Amount > Overdue → 409), `:44-48` (FIFO by CreatedDate over Pending/Partial), `:65-69` (`payAmount = min(remaining, TotalAmount − TotalPaidAmount)`), `:73-85` (per-order `AddSalesOrderPaymentCommand`, method Cash), `:93,96-100` (remainder → `Balance`, note lists applications)
- `POS.MediatR/CustomerLedger/Delete/DeleteCustomerLedgerCommandHandler.cs:22-48` (hard delete, **no** GL/order compensation)
- `POS.MediatR/SalesOrderPayment/Handler/AddSalesOrderPaymentCommandHandler.cs:53-56` (409 if Amount > TotalAmount), `:60-68` (Paid/Partial + `TotalPaidAmount +=`), `:75-93` (GL `ProcessPaymentAsync`, `TransactionType.Sale`, failures swallowed)
- `POS.API/Helpers/JobService.cs:45-66` (frequency crons 00:10–00:59, `ReminderSchedule` `*/10 * * * *`, queue `reminder`, `[AutomaticRetry(3, {60,300,900})]`, `[DisableConcurrentExecution(3600)]`)
- `POS.MediatR/ReminderServices/Handlers/MonthlyReminderServicesQueryHandler.cs:34-60` (day-clamp `&&` bug: predicates like `Day == currentDate.Day && Day == 30 && Day == 31` are unsatisfiable on short months)
- `POS.MediatR/ReminderServices/Handlers/ReminderSchedulerServiceQueryHandler.cs:48-52` (`Take(10)`), `:60` (`Clients.All.SendNotification`), `:61-88` (email w/ default SMTP, failures logged), `:90-97` (`IsActive=false`)
- `POS.Repository/Reminder/ReminderSchedulerRepository.cs:32-66` (`AddMultiReminder`: 1 row/reminder-user, `Duration` = today @ `StartDate` time-of-day, `IsRead=false`), `:95-99` (raw-SQL `MarkAsRead`)
- `POS.MediatR/Reminder/Handlers/AddReminderCommandHandler.cs:38-60` (OneTime default, creator auto-added to `ReminderUsers`)
- `POS.MediatR/ReminderScheduler/Handlers/AddReminderSchedulerCommandHandler.cs:41-73` (per-user OneTime push, `IsActive=true`)
- `POS.MediatR/Reminder/Handlers/GetTop10ReminderNotificationQueryHandler.cs:31-39` (`!IsRead && !IsActive`, own user, `Take(10)`)
- `POS.API/Controllers/NotificationController.cs:20-85` (`top10`, `all`+`X-Pagination`, `markAllAsRead`, `count`)
- `POS.API/Controllers/Customer/CustomerController.cs:33-105` (`CUST_VIEW/ADD/UPDATE/DELETE_CUSTOMER`, `REP_CUST_PAYMENT_REP`), `POS.API/Controllers/CustomerLedger/CustomerLedgerController.cs:25,67,92-117` (`CUST_MANAGE_CUSTOMER_LADGER`, `CUST_VIEW_CUSTOMER_LADGERS`; **delete/overdue have no ClaimCheck** — see Discrepancy notes)
- `POS.MediatR/Customer/Handlers/AddCustomerCommandHandler.cs:51-56` (duplicate CustomerName → 422); `POS.API/Controllers/Supplier/SupplierController.cs:45-136` (`SUPP_*` claims)
- `POS.Data/Entities/Customer/Customer.cs:7-40` (**no credit metadata fields** — see Discrepancy notes)
- `POS.MediatR/Inquiry/Handlers/UpdateInquiryCommandHandler.cs:39-81` (free-form status mapping — no state machine), `AddInquiryCommandHandler.cs:35` (products deduped by ProductId)

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed), Tenant B (isolation). Users: `admin` (all claims), `manager` (CRM view claims only, no manage claims), `cashier` (POS claims only).
- Tenant A customers: C-1 (ledger-clean), C-2 (credit case). Suppliers: S-1. Locations L1, L2. Open FY2026; CoA per WF-6.2 (AR 1100, Cash 1050).
- Credit sales orders for C-1 (non-request, `IsSalesOrderRequest=false`): **SO-1** (Total 500, Paid 0, `Pending`, created earliest), **SO-2** (Total 400, Paid 100, `Partial`), **SO-3** (Total 250, `Pending`, created latest). Overdue = 500 + 300 + 250 = **1050**.
- Inquiries: I-1 (`New`, source walk-in, 2 products). InquiryStatus list per tenant config (`New`, `Contacted`, `Qualified`, `Closed`).
- Reminders: R-D (Daily, IsRepeated, DailyReminders rows), R-M29/R-M30/R-M31 (Monthly, StartDate.Day 29/30/31), R-Y (Yearly). ReminderScheduler seed helpers set `Duration` relative to the real clock (see job-testability note).
- Integration DB: SQLite file-per-factory via `TestWebApplicationFactory`; Hangfire storage in tests: SQLite (jobs registered but **not** auto-executed — see below).

**Background-job testability (binding for WF-8.4 job cases):**
- **Direct handler invocation:** Hangfire recurring jobs are thin wrappers (`JobService.cs:79-137` just `_mediator.Send(query)`). Tests invoke the underlying MediatR queries (`DailyReminderServicesQuery`, `ReminderSchedulerServiceQuery`, …) directly through the real DI container of `TestWebApplicationFactory` — deterministic, no scheduler timing involved. One smoke test (TC-D08.056) verifies `StartScheduler()` registration itself against the SQLite Hangfire storage (`JobStorage.Current.GetConnection().GetRecurringJobs()`), never execution.
- **Fake clock:** the strategy mandates no `DateTime.Now` in assertions without an injected clock. Handlers currently read `DateTime.Now` internally (`DailyReminderServicesQueryHandler.cs:30`, `MonthlyReminderServicesQueryHandler.cs:32`, `ReminderSchedulerServiceQueryHandler.cs:46`). Until the non-behavioral `IClock` seam lands, fan-out cases are made deterministic by seeding reminders **relative to the real clock at test start** (StartDate = UtcNow − 1d, EndDate = null or UtcNow + 1d, `DailyReminders.DayOfWeek` = today); the monthly day-clamp cases (TC-D08.042/043) **require** the `IClock` seam and are the driving RED tests for it.
- **Storage:** Hangfire uses `Hangfire.SQLite` in tests (same file-per-factory pattern); `[AutomaticRetry]`/`[DisableConcurrentExecution]` attributes are exercised only via the registration smoke test, not live retries.

---

## WF-8.1 — Customer & Supplier Management

### TC-D08.001 — Create customer with billing/shipping addresses persists customer + ContactAddress rows
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.1
- **Arrange:** tenant A; JWT with `CUST_ADD_CUSTOMER`
- **Act:** `POST /api/customer` `{CustomerName: "Ammar Traders", Email: "ammar@t.io", MobileNo: "0300-111", BillingAddress: {...}, ShippingAddress: {...}}`
- **Assert:** 200 · `Customers` row exists with Email/MobileNo as sent · 2 `ContactAddress` rows linked via `BillingAddressId`/`ShippingAddressId` · `IsWalkIn=false` · (PM) response body contains `id`, `customerName`; follow-up `GET /api/customer/{id}` returns same fields

### TC-D08.002 — Duplicate customer name rejected with 422
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Validation
- **Source:** WF-8.1 (code: `AddCustomerCommandHandler.cs:51-56`)
- **Arrange:** tenant A; customer "Ammar Traders" already exists
- **Act:** `POST /api/customer` `{CustomerName: "Ammar Traders", ...}` (different email/mobile)
- **Assert:** 422 · message "Customer Name is already exist." · `Customers` count for tenant A unchanged · no orphan `ContactAddress` rows created

### TC-D08.003 — Customer create with blank name / missing addresses rejected
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Validation
- **Source:** WF-8.1
- **Arrange:** tenant A; JWT with `CUST_ADD_CUSTOMER`
- **Act:** `POST /api/customer` with `CustomerName: ""` (and second request with empty body)
- **Assert:** 400 (model binding/validator) for both · DB unchanged · (PM) error payload shape per `ServiceResponse` contract (`success=false`, message populated)

### TC-D08.004 — Customer CRUD without claims returns 403
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Permission
- **Source:** WF-8.1 (code: `CustomerController.cs:34,76,91,105`)
- **Arrange:** JWT for user holding none of `CUST_ADD_CUSTOMER` / `CUST_UPDATE_CUSTOMER` / `CUST_DELETE_CUSTOMER` / `CUST_VIEW_CUSTOMERS`
- **Act:** 4 requests: `POST /api/customer`, `PUT /api/customer/{C-1}`, `DELETE /api/customer/{C-1}`, `GET /api/customer`
- **Assert:** all four 403 · `Customers` table byte-identical before/after · (PM) 403 body does not leak entity data

### TC-D08.005 — Cross-tenant customer id is invisible (404)
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-8.1
- **Arrange:** customer X owned by tenant B; tenant A JWT with all `CUST_*` claims
- **Act:** `GET /api/customer/{X}`, `PUT /api/customer/{X}` (valid body), `DELETE /api/customer/{X}`
- **Assert:** all 404 (not 403/200 — id must not be enumerable) · tenant B `Customers` row untouched

### TC-D08.006 — Update customer re-points addresses and keeps ledger history intact
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.1
- **Arrange:** C-1 with 1 existing billing address and ≥1 CustomerLedger row
- **Act:** `PUT /api/customer/{C-1}` changing MobileNo and ShippingAddress
- **Assert:** 200 · `Customer.MobileNo` updated · new `ContactAddress` linked as `ShippingAddressId`, old shipping row not left dangling on another customer · CustomerLedger rows for C-1 unchanged

### TC-D08.007 — Delete customer without orders removes row
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Happy
- **Source:** WF-8.1
- **Arrange:** tenant A customer with no sales orders / ledger rows
- **Act:** `DELETE /api/customer/{id}` with `CUST_DELETE_CUSTOMER`
- **Assert:** 200 · `GET /api/customer/{id}` → 404 · `ContactAddress` rows no longer referenced

### TC-D08.008 — Customer listing is paged with X-Pagination header
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Edge
- **Source:** WF-8.1
- **Arrange:** tenant A with 7 customers; page size 5
- **Act:** `GET /api/customer?pageSize=5&skip=0` with `CUST_VIEW_CUSTOMERS`
- **Assert:** 200 · response array length ≤ 5 · `X-Pagination` header parses to `{totalCount: 7, pageSize: 5, skip: 0, totalPages: 2}`

### TC-D08.009 — Supplier CRUD happy path with SupplierAddress
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.1
- **Arrange:** JWT with `SUPP_ADD_SUPPLIER`, `SUPP_VIEW_SUPPLIERS`
- **Act:** `POST /api/supplier` `{SupplierName: "Global Foods", Email, MobileNo, SupplierAddress: {...}}` then `GET /api/supplier/{id}`
- **Assert:** 200 on both · `Suppliers` row persisted with address linkage · (PM) field names match supplier contract DTO

### TC-D08.010 — Duplicate supplier name → 422; supplier writes without claim → 403
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Validation, Permission
- **Source:** WF-8.1 (code: `SupplierController.cs:96,117,136`)
- **Arrange:** S-1 exists; second JWT without `SUPP_ADD_SUPPLIER`
- **Act:** (a) `POST /api/supplier` duplicate name; (b) `POST /api/supplier` with claim-less JWT
- **Assert:** (a) 422, count unchanged; (b) 403, count unchanged

### TC-D08.011 — Sale is allowed regardless of customer overdue (no credit-limit enforcement) — documents the gap
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char
- **Source:** WF-8.1 ⚠ GAP / BIZ-07 (code: `Customer.cs:7-40` has no credit fields; no enforcement anywhere in order pipeline)
- **Arrange:** C-2 with open credit orders totalling overdue 1050 (SO-1..SO-3); no credit-limit field exists on Customer
- **Act:** create a new credit sales order for C-2 (any amount, e.g. Total 9000)
- **Assert:** order creation **succeeds** (200/201) with `PaymentStatus=Pending` · no endpoint/handler returns a credit-related rejection · `Customer` row has no credit-limit column to consult (SQLite schema inspection) · overdue aggregation (see TC-D08.013) simply grows to 10050

### TC-D08.012 — Order creation blocked when overdue exceeds configured credit limit — TDD RED until BIZ-07 lands
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Gap-Target [BIZ-07]
- **Source:** WF-8.1 / BIZ-07
- **Arrange:** C-2 with `CreditLimit = 5000` (field added by the enhancement) and overdue 1050
- **Act:** create new credit sales order for C-2 with Total 4500 (would take exposure to 5550)
- **Assert:** 409 with message referencing credit limit · order not persisted · (PM) error schema contract. **RED by definition** — Customer has no credit fields and no check exists today.

### TC-D08.013 — Overdue + balance snapshot math is exact
- **Layers:** UT · IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-8.1, WF-8.2 (code: `GetSalesOrderOverdueByCustomerIdCommandHandler.cs:16-32`)
- **Arrange:** C-1 with SO-1/SO-2/SO-3 (overdue 1050) and no ledger rows
- **Act:** `GET /api/customerledger/{C-1}/overdue`
- **Assert:** 200 · `{Overdue: 1050.00, Balance: 0.00}` — recompute expected in test from seeded order constants (1050 = 500 + (400−100) + 250), never from production formula · request-type orders (`IsSalesOrderRequest=true`) seeded additionally are excluded from the sum · (UT) handler given repository stubs returning the same order states returns exactly `(1050, 0)` — no DB round-trip needed at UT layer

### TC-D08.014 — Customer payments view aggregates SalesOrderPayment rows read-only
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Happy
- **Source:** WF-8.1 (code: `CustomerController.cs:167` claim `REP_CUST_PAYMENT_REP`)
- **Arrange:** C-1 with the per-order payment rows produced by TC-D08.017's ledger run
- **Act:** `GET /api/customer/payments?customerId={C-1}` with `REP_CUST_PAYMENT_REP`
- **Assert:** 200 · rows match `SalesOrderPayment` table exactly (order numbers, amounts, dates) · response contains no write-capable fields · without claim → 403

---

## WF-8.2 — Customer Ledger Payment (FIFO Application)

### TC-D08.015 — UT: FIFO allocator applies lump payment oldest-order-first with partial application
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-8.2 (code: `AddCustomerLedgerCommandHandler.cs:44-90`)
- **Arrange:** pure allocator extracted from the handler loop (TDD prerequisite extraction, behavior-identical); orders in CreatedDate order: O1 (Total 500, Paid 0), O2 (Total 400, Paid 100), O3 (Total 250, Paid 0); previousBalance 0; Amount 650
- **Act:** run allocation
- **Assert:** exact tuples `[(O1, 500), (O2, 150), (O3, 0)]` — O1 settles fully, O2 partially (Paid 100→250), O3 untouched · leftover 0 · sum applied = 650

### TC-D08.016 — UT: leftover after clearing overdue becomes credit Balance
- **Layers:** UT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-8.2 (code: `AddCustomerLedgerCommandHandler.cs:56-93`)
- **Arrange:** allocator with previousBalance 300 (seeded prior ledger row), single open order (Total 200, Paid 0), Amount 100
- **Assert:** applied `[(order, 200)]` (order fully settled) · leftover = (300+100) − 200 = **200** → new Balance 200 · negative-input variant: Amount −50 yields no applications and Balance −50 (current math) — see TC-D08.026

### TC-D08.017 — IT: one ledger payment fans out to N per-order payments and one balanced GL cash leg each
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-8.2 (code: `AddCustomerLedgerCommandHandler.cs:63-100` + `AddSalesOrderPaymentCommandHandler.cs:57-93`)
- **Arrange:** C-1, SO-1 (500 due), SO-2 (300 due), SO-3 (250 due), no prior ledger
- **Act:** `POST /api/customerledger` `{CustomerId: C-1, Amount: 650, Overdue: 1050, Date: today, Note: "receipt #R1"}`
- **Assert:** 200 · exactly **2** `SalesOrderPayment` rows: (SO-1, 500) and (SO-2, 150), `PaymentMethod=Cash`, note "Payment from account" · SO-1 `PaymentStatus=Paid`, `TotalPaidAmount=500`; SO-2 `Partial`, `TotalPaidAmount=250`; SO-3 unchanged (Pending, 0) · GL per dispatched payment: `Transaction(TransactionType=Sale, ReferenceNumber=SO-1.OrderNumber)` with `AccountingEntry Dr Cash(1050) 500 / Cr AccountsReceivable(1100) 500`, and for SO-2 `Dr Cash 150 / Cr AR 150` — **two** transactions (one per order), never one merged 650 · ΣDr == ΣCr across both · single `CustomerLedger` row: `Amount=650`, `Balance=0`, `Note` contains "SO-1… (500), SO-2… (150)" fragments · (PM) follow-up `GET {C-1}/overdue` → `{Overdue: 250, Balance: 0}`

### TC-D08.018 — Ledger payment above overdue rejected with 409, nothing written
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Validation
- **Source:** WF-8.2 (code: `AddCustomerLedgerCommandHandler.cs:35-38`)
- **Arrange:** C-1 overdue 1050
- **Act:** `POST /api/customerledger` `{Amount: 1050.01}`
- **Assert:** 409 "Amount cannot exceed overdue" · zero `CustomerLedger`, `SalesOrderPayment`, `Transaction`/`AccountingEntry` rows created · order states byte-identical

### TC-D08.019 — Second receipt spends prior credit Balance first (running-balance chain)
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-8.2 (code: `AddCustomerLedgerCommandHandler.cs:51-60`)
- **Arrange:** run receipt #1 of 650 (as TC-D08.017 → SO-3 remains 250 due, Balance 0); then receipt #2 `Amount: 400` (≤ overdue 250? **no** — seed instead SO-3 due 250 and re-open SO-2 by… simplest: fresh customer C-L2 with orders O1 300 due, O2 200 due; receipt #1 = 100 → O1 Partial(Paid 100), Balance 0; receipt #2 = 400)
- **Act:** receipt #2 `POST /api/customerledger` `{Amount: 400}` for C-L2
- **Assert:** `totalAvailable = 0 + 400` → O1 gets 200 (Paid 300, status Paid), O2 gets 200 (Paid) · ledger row #2 `Balance=0` · chain order respected (O1 before O2 by CreatedDate) · overdue now 0

### TC-D08.020 — Ledger payment with zero open orders and zero amount → no-op ledger row
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-8.2
- **Arrange:** C-1 with all orders Paid (or a customer with none), overdue 0
- **Act:** `POST /api/customerledger` `{Amount: 0}`
- **Assert:** 200 (0 is not > 0) · ledger row stored with `Amount=0, Balance=0`, empty application note · zero `SalesOrderPayment`/`AccountingEntry` rows

### TC-D08.021 — Deleting a ledger row leaves dispatched payments, order states and GL cash untouched — documents the gap
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char
- **Source:** WF-8.2 ⚠ GAP / ACC-09 (code: `DeleteCustomerLedgerCommandHandler.cs:22-48` — no reversal, no order recompute)
- **Arrange:** state after TC-D08.017 (2 SalesOrderPayments, 2 GL transactions, SO-1 Paid, SO-2 Partial)
- **Act:** `DELETE /api/customerledger/{ledgerRowId}`
- **Assert:** 200 · ledger row gone · **all 2 `SalesOrderPayment` rows still exist** · SO-1 still `Paid`/500, SO-2 still `Partial`/250 (orders stay over-paid relative to ledger) · **both GL transactions still exist** — Cash still debited 650 total, AR still credited 650 · no compensating `Dr AR / Cr Cash` entries anywhere · (characterization: pins the inconsistency so the fix cannot land silently)

### TC-D08.022 — Ledger delete writes compensating reversals and restores orders — TDD RED until ACC-09 lands
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [ACC-09]
- **Source:** WF-8.2 / ACC-09
- **Arrange:** same post-payment state as TC-D08.021
- **Act:** `DELETE /api/customerledger/{ledgerRowId}`
- **Assert:** for each dispatched payment a mirrored reversal: `Dr AccountsReceivable(1100) 500 / Cr Cash(1050) 500` and `Dr AR 150 / Cr Cash 150` with a reversal-type Transaction referencing the original · SO-1 back to `Pending`/Paid 0, SO-2 back to `Partial`/Paid 100 · ledger deletion audited (soft-delete with linkage or reversal note) · ΣDr == ΣCr including reversals. **RED** — current code performs none of this (see TC-D08.021).

### TC-D08.023 — Ledger payment/list without claims → 403
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Permission
- **Source:** WF-8.2 (code: `CustomerLedgerController.cs:25,67`)
- **Arrange:** JWT lacking `CUST_MANAGE_CUSTOMER_LADGER` and `CUST_VIEW_CUSTOMER_LADGERS`
- **Act:** `POST /api/customerledger` (valid body), `GET /api/customerledger`
- **Assert:** both 403 · no writes occurred

### TC-D08.024 — Cross-tenant ledger/customer ids return 404 on ledger operations
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-8.2
- **Arrange:** tenant B owns customer X with a ledger row; tenant A admin JWT
- **Act:** `POST /api/customerledger {CustomerId: X}`, `GET /api/customerledger/{tenantB-rowId}`, `DELETE /api/customerledger/{tenantB-rowId}`
- **Assert:** payment post rejected (404/409 — customer not resolvable in tenant scope, never 200), get/delete 404 · tenant B data untouched

### TC-D08.025 — Postman runner: customer → overdue → ledger payment → per-order verification chain
- **Layers:** PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.2, WF-3.7
- **Arrange:** environment `local-cloud`; chain variables `customerId`, `overdue`
- **Act:** runner flow: login → `GET /api/customer` (capture C-1) → `GET /api/customerledger/{C-1}/overdue` (store `overdue`) → `POST /api/customerledger {Amount: overdue−1}` → `GET /api/customerledger?customerId={C-1}` → `GET /api/customerledger/{C-1}/overdue`
- **Assert:** status-code + JSON-schema checks per request · final overdue = **1.00** (exactly the withheld unit) · ledger list note contains application fragments · collection folder `D08 Customer Ledger` named `TC-D08.025 — ledger FIFO runner` for traceability

### TC-D08.026 — Negative ledger amount is accepted today and stores a negative Balance — new finding, documents the hole
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char
- **Source:** WF-8.2 (code: `AddCustomerLedgerCommandHandler.cs:35-38` — only guard is `Amount > Overdue`; a negative passes it) — **not currently catalogued in doc 11; flagged for addition**
- **Arrange:** C-1 overdue 1050
- **Act:** `POST /api/customerledger` `{Amount: -50}`
- **Assert:** (characterization of current behavior) 200 · ledger row persisted with `Amount=-50, Balance=-50` · zero payments dispatched · note in test: `[Expected-failure-after-fix]` — when input validation lands this must become a `Validation` case asserting 400 and no row

### TC-D08.027 — Ledger listing filters (account/date/location/reference) return only matching rows
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Happy
- **Source:** WF-8.2 (code: `GetAllCustomerLedgerCommandHandler` + `CustomerLedgerRepository.GetAllCustomerLedger:19-55`)
- **Arrange:** 3 ledger rows for C-1 across L1/L2, different dates and references
- **Act:** `GET /api/customerledger?locationId={L1}&fromDate=…&toDate=…&reference=R1`
- **Assert:** 200 · only the L1 + date-window + R1 row returned · (PM) pagination envelope present

---

## WF-8.3 — Inquiry (Lead) Management

### TC-D08.028 — Create inquiry with source, status and interested products
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.3 (code: `AddInquiryCommandHandler.cs:33-44`)
- **Arrange:** tenant A with InquirySource "Walk-in" and InquiryStatus "New"; products P1, P2; JWT with `INQ_ADD_INQUIRY`
- **Act:** `POST /api/inquiry` `{Name, Phone, Email, InquirySourceId, InquiryStatusId, InquiryProducts: [{P1}, {P2}]}`
- **Assert:** 200 · `Inquiry` row with source/status ids · exactly 2 `InquiryProduct` rows · `InquiryActivity` timeline empty until first interaction

### TC-D08.029 — Duplicate product ids in payload are de-duplicated to one InquiryProduct row
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-8.3 (code: `AddInquiryCommandHandler.cs:35` `DistinctBy(ProductId)`)
- **Act:** `POST /api/inquiry` with `InquiryProducts: [{P1}, {P1}, {P1}, {P2}]`
- **Assert:** 200 · exactly 2 `InquiryProduct` rows (P1 once, P2 once)

### TC-D08.030 — Interaction appends InquiryActivity with timestamp + user; notes/attachments attach to the inquiry
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.3 (code: `InquiryActivity/InquiryNote/InquiryAttachment` controllers)
- **Arrange:** I-1 exists; file bytes for attachment upload
- **Act:** `POST /api/inquiryactivity` `{InquiryId: I-1, Type: Call, Details}`; `POST /api/inquirynote`; `POST /api/inquiryattachment` (multipart)
- **Assert:** 200 each · 1 `InquiryActivity` row with non-null `CreatedDate` and creating user id · note row linked, internal/external flag as sent · attachment row with tenant-scoped storage path (`TenantId` present in path) · activity list GET returns rows ordered by timestamp

### TC-D08.031 — Status progression via UpdateInquiryCommand persists any target status
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.3 (code: `UpdateInquiryCommandHandler.cs:39-81`)
- **Arrange:** I-1 at `New`; statuses `Contacted`, `Qualified`, `Closed` exist; JWT with `INQ_UPDATE_INQUIRY`
- **Act:** 3 sequential `PUT /api/inquiry/{I-1}` setting status `Contacted` → `Qualified` → `Closed` (forward transitions)
- **Assert:** 200 each · `Inquiry.StatusId` equals the target each time · product rows re-written but count preserved (delete+re-add inside the update)

### TC-D08.032 — Any status transition is accepted today — no state machine — documents the gap
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [C-04]
- **Source:** WF-8.3 ⚠ GAP (code: `UpdateInquiryCommandHandler.cs:73` `_mapper.Map(request, entityExist)` — no transition validation)
- **Arrange:** I-1 at `Closed`
- **Act:** `PUT /api/inquiry/{I-1}` setting status back to `New` (and a second run `Closed` → `Contacted` skipping intermediate)
- **Assert:** (characterization) both **200** — transition accepted · `StatusId` now `New` · no rejection record, no audit of the illegal move · pins free-form behavior so the state machine cannot land silently

### TC-D08.033 — Invalid status transition rejected with 409 — TDD RED until C-04 state machine lands
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [C-04]
- **Source:** WF-8.3 / C-04
- **Arrange:** I-1 at `Closed`; tenant-configured machine defines legal moves (e.g. `Closed` terminal)
- **Act:** `PUT /api/inquiry/{I-1}` setting `New`
- **Assert:** 409 with transition-violation message · status unchanged · legal transition (`Contacted` → `Qualified`) still 200 in the same test. **RED** — today any move succeeds (TC-D08.032).

### TC-D08.034 — Inquiry endpoints without claims → 403; cross-tenant inquiry → 404
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Permission, Tenant-Isolation
- **Source:** WF-8.3 (code: `InquiryController.cs:44,64,85,127,141`)
- **Arrange:** inquiry J owned by tenant B; JWT without `INQ_ADD_INQUIRY`; second admin JWT for tenant A
- **Act:** `POST /api/inquiry` without claim; tenant A `GET /api/inquiry/{J}`, `PUT /api/inquiry/{J}`, `DELETE /api/inquiry/{J}`
- **Assert:** POST → 403; tenant A operations on J → all 404 · tenant B row untouched

### TC-D08.035 — Inquiry delete removes row and children
- **Layers:** IT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-8.3 (code: `DeleteInquiryCommandHandler`)
- **Arrange:** I-1 with products, one activity, one note
- **Act:** `DELETE /api/inquiry/{I-1}` with `INQ_DELETE_INQUIRY`
- **Assert:** 200 · `Inquiry`, `InquiryProduct`, `InquiryActivity`, `InquiryNote` rows gone for I-1 · source/status master rows untouched

### TC-D08.036 — E2E journey: inquiry → manual convert → customer → credit order (no conversion artifact today)
- **Layers:** E2E · PM
- **Priority:** P1   **Category:** Happy, Gap-Char [C-04]
- **Source:** WF-8.3, WF-8.1 (code: no inquiry→order linkage exists)
- **Arrange:** browser session as sales user; inquiry I-2 with contact details and 2 products
- **Act:** journey: (1) create inquiry via UI; (2) add activity "call — interested"; (3) progress status to `Qualified`; (4) manually create customer with I-2's contact data via Customers screen; (5) create a credit sales order for the new customer with the inquiry's products; (6) open inquiry I-2 and set status `Closed`
- **Assert:** customer exists with matching Email/MobileNo · order exists with the 2 products · inquiry `Closed` · **no link/attribution row exists between I-2 and the order or customer** (Gap-Char: conversion is untracked — C-04) · journeys spec `J-08-inquiry-convert-customer` in `E2E_JOURNEYS.md`

---

## WF-8.4 — Reminder Workflow (Creation → Fan-out → Dispatch → Notification)

### TC-D08.037 — Create recurring daily reminder with ReminderUsers and DailyReminders children
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.4 (code: `AddReminderCommandHandler.cs:38-60`)
- **Arrange:** creator `admin`; target user U2; JWT with reminder-add claim
- **Act:** `POST /api/reminder` `{Subject: "Shift handover", Message, StartDate: today 09:00, Frequency: Daily, IsRepeated: true, IsEmailNotification: true, ReminderUsers: [{U2}], DailyReminders: [Mon..Fri]}`
- **Assert:** 201 · `Reminder` row with StartDate time-of-day 09:00, IsRepeated=true · 5 `DailyReminders` child rows (day-of-week + IsActive) · 2 `ReminderUser` rows (U2 + creator)

### TC-D08.038 — Frequency omitted defaults to OneTime; creator auto-added to ReminderUsers when absent
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-8.4 (code: `AddReminderCommandHandler.cs:40-51`)
- **Act:** `POST /api/reminder` `{Subject, StartDate}` — no Frequency, no ReminderUsers
- **Assert:** 201 · `Frequency=OneTime` persisted · `ReminderUsers` contains exactly 1 row = the calling user's id

### TC-D08.039 — One-off scheduler push creates one active row per user
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.4 (code: `AddReminderSchedulerCommandHandler.cs:41-73`)
- **Arrange:** users U2, U3
- **Act:** `POST /api/reminderscheduler` `{UserIds: [U2, U3], Subject, Message, CreatedDate: now+5min, IsEmailNotification: false}`
- **Assert:** 201 · 2 `ReminderScheduler` rows (one per user), `Frequency=OneTime`, `IsActive=true`, `IsRead=false`, `Duration = request.CreatedDate` · no request → falls back to calling user only (second act/assert)

### TC-D08.040 — Nightly fan-out: Daily reminder matching today's weekday and window creates one scheduler row per reminder-user
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-8.4 (code: `DailyReminderServicesQueryHandler.cs:28-45`, `ReminderSchedulerRepository.AddMultiReminder:32-66`; direct handler invocation per job-testability preamble)
- **Arrange:** R-D daily, IsRepeated, StartDate = UtcNow − 1d 09:00, EndDate = null, `DailyReminders` active row for **today's** `DayOfWeek`, users [admin, U2]; seed relative to real clock (deterministic without seam)
- **Act:** send `DailyReminderServicesQuery` via MediatR (simulating the 00:10 job body)
- **Assert:** true · exactly **2** new `ReminderScheduler` rows (one per user): `Frequency=Daily`, `IsActive=true`, `IsRead=false`, `Duration` = today at **09:00** (reminder StartDate time-of-day), `IsEmailNotification` copied from reminder, Subject/Message copied · reminder row itself untouched (no IsActive flip on the source)

### TC-D08.041 — Fan-out window/weekday filters: outside window or wrong weekday → zero rows
- **Layers:** IT
- **Priority:** P1   **Category:** Negative
- **Source:** WF-8.4 (code: `DailyReminderServicesQueryHandler.cs:36-38`)
- **Arrange:** three Daily reminders: (a) EndDate = UtcNow − 1h; (b) StartDate = UtcNow + 1d; (c) active window but DailyReminders rows only for yesterday's weekday
- **Act:** send `DailyReminderServicesQuery`
- **Assert:** true (handler succeeds) · **0** new ReminderScheduler rows for (a), (b), (c) · (a) additionally excluded by `EndDate < today` even though weekday matches

### TC-D08.042 — Monthly day-clamp bug: days 29–31 never fire on short months — documents the wrong clamp
- **Layers:** UT · IT
- **Priority:** P0   **Category:** Gap-Char [RT-02]
- **Source:** WF-8.4 ⚠ GAP / RT-02 (code: `MonthlyReminderServicesQueryHandler.cs:34-60` — unsatisfiable `&&` chains: `Day == currentDate.Day && Day == 30 && Day == 31` etc.)
- **Arrange:** **requires `IClock` seam** (introduce as non-behavioral refactor; current code reads `DateTime.Now` internally, so no seam exists today — this case is the RED driver for the seam). Clock fixed to **2026-02-28T00:20:00** (28-day February). Monthly reminders R-M29 (StartDate.Day=29), R-M30 (Day=30), R-M31 (Day=31), R-M15 (Day=15), all with active windows, each with 1 ReminderUser.
- **Act:** send `MonthlyReminderServicesQuery`
- **Assert:** (characterization of current buggy behavior) handler returns true but creates **0** scheduler rows for R-M29/R-M30/R-M31 — on Feb 28 the branch demands `Day == 28 && Day == 29 && Day == 30 && Day == 31`, unsatisfiable; likewise clock 2026-02-29 (leap) → the `Day == 29 && Day == 30 && Day == 31` branch matches nothing; clock 2026-04-30 → `Day == 30 && Day == 31` matches nothing · control reminder R-M15 **does** fire on 2026-03-15 (31-day month, else-branch) · pins the bug so the fix cannot land silently

### TC-D08.043 — Monthly day 29/30/31 reminders fire on their effective days after the clamp fix — TDD RED until RT-02 lands
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [RT-02]
- **Source:** WF-8.4 / RT-02
- **Arrange:** same seeds as TC-D08.042 with `IClock` at 2026-02-28 (fixed implementation may fire days 29–31 on the month's last day, or on real dates in longer months — assert per the chosen fix spec; below assumes last-day fallback)
- **Act:** `MonthlyReminderServicesQuery` at clock 2026-02-28, then 2026-04-30, then 2026-01-31
- **Assert:** R-M31 fires on Jan 31 **and** on the chosen fallback days (Apr 30 / Feb 28) — scheduler rows exist with `Duration` = that day @ StartDate time-of-day · R-M29 fires on Jan 29 and on Feb 28 fallback · R-M30 fires on Jan 30 and Apr 30 fallback · no duplicate rows on days the reminder legitimately fires. **RED** — today all three stay silent on short months (TC-D08.042).

### TC-D08.044 — Dispatch loop processes exactly 10 due rows per run; backlog survives to next run — documents the cap
- **Layers:** IT
- **Priority:** P0   **Category:** Gap-Char [RT-02]
- **Source:** WF-8.4 ⚠ GAP / RT-02 (code: `ReminderSchedulerServiceQueryHandler.cs:48-52` `.Take(10)`; deterministic without seam — rows seeded in the past)
- **Arrange:** 15 `ReminderScheduler` rows, all `IsActive=true`, `IsRead=false`, `Duration = UtcNow − 5min` (all due), `IsEmailNotification=false`, users varied; hub + email externals mocked
- **Act:** send `ReminderSchedulerServiceQuery` (one 10-minute tick), then send it again (second tick)
- **Assert:** run 1: **exactly 10** rows flipped `IsActive=false`, `IsRead` still false · 5 rows still `IsActive=true` · 10 hub pushes observed · run 2: remaining **5** flipped; 0 due rows left; third run is a no-op (0 rows selected, still returns true) · max throughput characterization: 10 rows/10 min = 1440/day ≪ 800 users × recurring reminders — pins the backlog behavior before batch raise

### TC-D08.045 — Dispatch loop drains all due rows in one run after the batch raise — TDD RED until RT-02 lands
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Target [RT-02]
- **Source:** WF-8.4 / RT-02
- **Arrange:** same 15 due rows
- **Act:** one `ReminderSchedulerServiceQuery` run
- **Assert:** all **15** rows `IsActive=false` after a single run · 15 hub pushes · configurable batch size honored (e.g. config `Reminders:DispatchBatchSize=100` → 100-row batch). **RED** — today `.Take(10)` caps at 10 (TC-D08.044).

### TC-D08.046 — Dispatch marks rows inactive and never re-pushes them
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-8.4 (code: `ReminderSchedulerServiceQueryHandler.cs:90-97`)
- **Arrange:** 3 due rows
- **Act:** dispatch run, then re-run 3×
- **Assert:** after run 1 all 3 inactive; runs 2–4 push nothing and return true · `IsRead` remains false (read state belongs to the user, not the dispatch) · `Duration` unchanged (audit value preserved)

### TC-D08.047 — Dispatch pushes via SignalR broadcast to All clients with userId payload — documents the pattern
- **Layers:** IT
- **Priority:** P1   **Category:** Gap-Char [RT-01]
- **Source:** WF-8.4 ⚠ GAP / RT-01 (code: `ReminderSchedulerServiceQueryHandler.cs:60` `_hubContext.Clients.All.SendNotification(userId)`)
- **Arrange:** 2 due rows for users U2, U3; `IHubContext<UserHub, IHubClient>` mocked (external transport)
- **Act:** dispatch run
- **Assert:** (characterization) `SendNotification` invoked **on `Clients.All`** exactly twice with payloads `U2`, `U3` — i.e. every connected client receives every userId, payload is broadcast-pattern, not per-connection targeted · no group/per-user send method used · pins the pattern before Redis backplane / targeted-send lands

### TC-D08.048 — Dispatch sends per-user targeted notifications after backplane fix — TDD RED until RT-01 lands
- **Layers:** IT
- **Priority:** P2   **Category:** Gap-Target [RT-01]
- **Source:** WF-8.4 / RT-01
- **Arrange:** same as TC-D08.047
- **Act:** dispatch run
- **Assert:** U2's connection(s) receive only U2's userId; U3's only U3's — zero cross-delivery (asserted against mocked per-connection/group client proxies); works with 2 hub instances (backplane seam). **RED** — today `Clients.All` broadcasts (TC-D08.047).

### TC-D08.049 — Email dispatch uses default SMTP and template-free Subject/Message; SMTP failure does not block deactivation
- **Layers:** IT
- **Priority:** P1   **Category:** Happy, Edge
- **Source:** WF-8.4 (code: `ReminderSchedulerServiceQueryHandler.cs:61-88` — failures logged only, `IsActive=false` still applied)
- **Arrange:** 2 due rows with `IsEmailNotification=true` for user with Email `u2@t.io`; default SMTP setting present; SMTP transport mocked (external) — case (a) succeeds, case (b) transport throws
- **Act:** dispatch runs
- **Assert:** (a) `SendEmail` called with `ToAddress=u2@t.io`, `Subject`/`Body` = scheduler's Subject/Message, from the `IsDefault` SMTP row · (b) exception logged, **no rethrow** · in both cases rows `IsActive=false` · row with `IsEmailNotification=false` produces zero email calls even when SMTP configured

### TC-D08.050 — No default SMTP configured: dispatch completes, rows deactivate, no email attempted
- **Layers:** IT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-8.4 (code: `ReminderSchedulerServiceQueryHandler.cs:63` `defaultSmtp != null` guard)
- **Arrange:** due row with `IsEmailNotification=true`; no SMTP row with `IsDefault`
- **Act:** dispatch run
- **Assert:** true · zero `SendEmail` calls · row `IsActive=false` · hub push still delivered (real-time path independent of email)

### TC-D08.051 — Notification read-back: top10 returns own unread-inactive rows only; markAllAsRead flips user's rows
- **Layers:** IT · PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-8.4 (code: `GetTop10ReminderNotificationQueryHandler.cs:31-39`; `ReminderSchedulerRepository.MarkAsRead:95-99`; `NotificationController.cs:20-72`)
- **Arrange:** for U2: 12 dispatched rows (`!IsRead && !IsActive`), 3 dispatched-but-read, 2 undispatched (`IsActive=true`); for U3: 5 unread-inactive rows
- **Act:** as U2: `GET /api/notification/top10`, `POST /api/notification/markAllAsRead`, `GET /api/notification/count`
- **Assert:** top10 returns **exactly 10** rows, all `!IsRead && !IsActive && UserId=U2`, ordered by Duration desc; U3's rows never appear · markAllAsRead → 200 · raw-SQL effect verified in DB: all U2 rows `IsRead=1` (including the 12th+ overflow row beyond top10), U3 rows still `IsRead=0` · count endpoint now 0 for U2 · `GET /api/notification/all` emits `X-Pagination` with `totalCount=17` for U2

### TC-D08.052 — Notifications support mark-read only — no snooze/complete action exists — documents the gap
- **Layers:** IT · PM
- **Priority:** P2   **Category:** Gap-Char [UX-05]
- **Source:** WF-8.4 ⚠ GAP / UX-05 (code: `NotificationController.cs` exposes only top10/all/markAllAsRead/count; `ReminderScheduler` entity has only `IsRead`/`IsActive`)
- **Arrange:** U2 with 2 dispatched unread rows
- **Act:** `POST /api/notification/snooze/{id}` and `POST /api/notification/complete/{id}` (endpoints the enhancement would add)
- **Assert:** (characterization) both **404** — no route exists · DB shows no snooze/complete columns or state on `ReminderScheduler` · only `IsRead`/`IsActive` ever change · pins the mark-read-only surface

### TC-D08.053 — Snooze/complete actions on notifications work and keep read state coherent — TDD RED until UX-05 lands
- **Layers:** IT
- **Priority:** P3   **Category:** Gap-Target [UX-05]
- **Source:** WF-8.4 / UX-05
- **Arrange:** U2 with 1 dispatched unread row
- **Act:** `POST /api/notification/snooze/{id}` {until: now+1h} then `POST /api/notification/complete/{id}`
- **Assert:** snooze → 200, row re-activated for future delivery (`IsActive=true`, new `Duration`) and excluded from top10 until due · complete → 200, terminal state persisted, excluded from top10 permanently, excluded from count · existing markAllAsRead still works. **RED** — endpoints do not exist (TC-D08.052).

### TC-D08.054 — Cross-user notification isolation: U3 cannot read or mark U2's notifications
- **Layers:** IT
- **Priority:** P0   **Category:** Tenant-Isolation
- **Source:** WF-8.4 (code: `GetTop10ReminderNotificationQueryHandler.cs:33` `UserId == _userInfoToken.Id`; `MarkAsRead:97` `where UserId={current}`)
- **Arrange:** U2 with 4 dispatched unread rows
- **Act:** as U3: `GET /api/notification/top10`, `POST /api/notification/markAllAsRead`, `GET /api/notification/count`
- **Assert:** top10 → empty array (U2's rows invisible) · markAllAsRead does not touch U2's rows (U2 still has 4 unread) · count → 0 for U3

### TC-D08.055 — Reminder CRUD permission and cross-tenant 404
- **Layers:** IT · PM
- **Priority:** P1   **Category:** Permission, Tenant-Isolation
- **Source:** WF-8.4 (code: `ReminderController.cs`, `ReminderSchedulerController.cs` claim checks)
- **Arrange:** reminder R-Y owned by tenant B; JWT without reminder-add claim for tenant A
- **Act:** `POST /api/reminder` without claim; tenant A `GET /api/reminder/{R-Y}`, `DELETE /api/reminder/{R-Y}`
- **Assert:** POST → 403 · cross-tenant get/delete → 404 · tenant B reminder intact

### TC-D08.056 — Job registration smoke: all 7 frequency jobs + 10-minute dispatch job registered on SQLite Hangfire storage
- **Layers:** IT
- **Priority:** P2   **Category:** Happy
- **Source:** WF-8.4 (code: `JobService.cs:45-66`; Hangfire storage = SQLite in tests)
- **Arrange:** `TestWebApplicationFactory` booted with SQLite Hangfire storage; jobs **not** auto-executed (registration-only assertions per job-testability preamble)
- **Act:** call `JobService.StartScheduler()`; read `JobStorage.Current.GetConnection().GetRecurringJobs()`
- **Assert:** recurring-job set contains exactly: `DailyReminder` cron `0 10 0 * *`, `WeeklyReminder` `0 15 0 * *`, `MonthlyReminder` `0 20 0 * *`, `QuarterlyReminder` `0 30 0 * *`, `HalfYearlyReminder` `0 40 0 * *`, `YearlyReminder` `0 50 0 * *`, `CustomDateReminder` `0 59 0 * *`, `ReminderSchedule` `*/10 * * * *` · all enqueued on queue `reminder` · method targets resolve to `JobService` handlers that send the matching MediatR queries

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case (WF-8.1: 001/009 · WF-8.2: 017/019 · WF-8.3: 028/031 · WF-8.4: 037/039/040/046)
- [x] Every write endpoint has: Validation case (bad input → 400/409), Permission case (missing claim → 403), Tenant-Isolation case (other tenant's id → 404)
  - Validation: 002/003 (customer), 010 (supplier), 018 (ledger), 029 (inquiry), 041 (fan-out filters)
  - Permission: 004 (customer), 010 (supplier), 023 (ledger), 034 (inquiry), 055 (reminder)
  - Tenant-Isolation: 005 (customer), 024 (ledger), 034 (inquiry), 054 (notifications), 055 (reminder)
- [x] Every money/stock mutation has DB-state assertions (entries balanced, stock delta) — 017 (per-order GL Dr Cash/Cr AR, ΣDr == ΣCr), 019, 021/022 (reversal entries)
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case — BIZ-07: 011/012 · ACC-09: 021/022 · C-04: 032/033/036 · RT-01: 047/048 · RT-02: 042/043/044/045 · UX-05: 052/053
- [x] Gap-Char assertions describe CURRENT behavior; Gap-Target describes DESIRED behavior (RED now)
- [x] Concurrency case for sequential-number generation where the doc flags it (INT-11) — not flagged for D08 endpoints (no local number generation; orders carry OrderNumber under D03); dispatch re-entrancy instead covered by 046 (no re-push) and `DisableConcurrentExecution` via 056
- [x] Edge/boundary cases: zero amount (020), negative amount (026/016), leftover balance (016), exactly-overdue amount (018 boundary), max dispatch cap (044/045), month-length boundaries 28/29/30/31 (042/043), pagination boundary (008)

## Discrepancy notes

1. **BIZ-07 premise not code-accurate:** WF-8.1 (line 25) and doc-11 BIZ-07 state the Customer entity "carries credit metadata". `POS.Data/Entities/Customer/Customer.cs:7-40`, `AddCustomerCommand.cs`, and frontend models contain **no** credit-limit/credit-days fields at all. TC-D08.011 characterizes the true current state (no metadata, no enforcement); TC-D08.012's Gap-Target therefore includes introducing the metadata, not just the check.
2. **Duplicate-check basis differs from doc:** WF-8.1 documents uniqueness on `(TenantId, Email)` and `(TenantId, MobileNo)` per indexing strategy; the handler-level guard is **CustomerName-based → 422** (`AddCustomerCommandHandler.cs:51-56`). TC-D08.002 pins the observed name-based behavior; email/mobile uniqueness relies on DB indexes (covered incidentally by tenant-isolation seeds).
3. **New finding (not in doc 11):** `DELETE /api/customerledger/{id}` (`CustomerLedgerController.cs:92-100`) and `GET /api/customerledger/{id}/overdue` (:107-117) have **no `[ClaimCheck]`** — any authenticated tenant user can delete ledger rows or read overdue data. Recommend a SEC-gap entry; TC-D08.021/022 cover the data effect, TC-D08.023 covers the guarded endpoints only.
4. **New finding (not in doc 11):** negative ledger `Amount` passes the sole guard (`Amount > Overdue`, `AddCustomerLedgerCommandHandler.cs:35-38`) and persists a negative `Balance` — TC-D08.026 Gap-Char.
5. **Fake-clock seam missing:** reminder handlers read `DateTime.Now` directly (`DailyReminderServicesQueryHandler.cs:30`, `MonthlyReminderServicesQueryHandler.cs:32`, `ReminderSchedulerServiceQueryHandler.cs:46`), so deterministic day-clamp tests (042/043) require introducing an `IClock` seam as a non-behavioral refactor; all other job cases are deterministic via relative seeding. Hangfire in tests runs on SQLite storage with registration-only assertions (056).
6. **WF-8.2 wording vs code:** doc says remainder "becomes the new credit Balance" — confirmed (`:93`), but note the over-deposit guard makes leftover possible **only** via prior `Balance` carry (TC-D08.016 arrange reflects this; a first receipt can never leave leftover). FIFO is `OrderBy(CreatedDate)` — order-creation date, not due date (C-03 applies; aging out of D08 scope, referenced for D07).
