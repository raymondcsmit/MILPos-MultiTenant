# Workflow Document 08 — CRM, Inquiry & Reminder Workflows

**Scope:** Customer & supplier management, customer ledger payments (FIFO application), the inquiry (lead) lifecycle with activities/notes/attachments, and the reminder subsystem (creation → Hangfire fan-out → dispatch → SignalR/email notification).

---

## WF-8.1 — Customer & Supplier Management Workflows

### Customers
**Backend:** `CustomerController` (POS.API/Controllers/Customer/) + `POS.MediatR/Customer/`. **Frontend:** `Angular/src/app/customer/`.

- **CRUD:** Add/Update/Delete customer with **ContactAddress** (multi-address); uniqueness enforced on `(TenantId, Email)` and `(TenantId, MobileNo)` per the indexing strategy.
- **Search/list:** paged listing with `X-Pagination` header; `customerSearch` endpoint — client-side IndexedDB intercepts search when the full master list is cached (see WF-9.7).
- **Payments view:** `GetCustomerPaymentsQueryHandler` → `customerRepository.GetCustomersPayment` — read-only aggregation of `SalesOrderPayment` rows per customer (no direct customer-payment writes; money moves via per-order payments, see WF-3.7).
- **Pending/overdue:** `GetSalesOrderOverdueByCustomerIdCommandHandler` (CustomerLedger/Get, 16-32) — Overdue = Σ(TotalAmount − TotalPaidAmount) over open orders (Pending/Partial, not requests); `GetCustomerPendingSalesOrderCommandHandler` (SalesOrder/Report, 24) — pending order list per customer (claim `CUST_VIEW_CUSTOMER_PENDING_PAYMENTS`).
- **Import/export:** customer bulk import via ImportExport service (see WF-9.5).

### Suppliers
**Backend:** `SupplierController` + `POS.MediatR/Supplier/`. **Frontend:** `Angular/src/app/supplier/`.

- CRUD with **SupplierAddress**; same uniqueness pattern (email/mobile per tenant).
- Purchase history + pending-payment visibility through purchase-order endpoints (`supplierpendingpayment`-style lookups mirrored from sales side).
- Import/export via ImportExport service (WF-9.5).

**⚠ GAP:** no credit-limit enforcement — Customer entity carries credit metadata, but no workflow blocks a sale when the customer's overdue exceeds a limit (limit value is informational only).

---

## WF-8.2 — Customer Ledger Payment Workflow (FIFO Application)

"Customer pays money into their account" — a lump receipt applied automatically across open invoices.

**Entity:** CustomerLedger (POS.Data/Entities/CustomerLeadger/CustomerLedger.cs:10-29) — running `Balance` (customer credit), `Overdue`, per-row references. Sub-ledger only; GL effect happens via the dispatched per-order payments.

**Write path — `AddCustomerLedgerCommandHandler`** (POS.MediatR/CustomerLedger/Add, 31-118):
1. **Reject if `Amount > Overdue`** (35-38) — cannot over-deposit beyond outstanding invoices.
2. Fetch open sales orders (PaymentStatus Pending/Partial), **FIFO by CreatedDate** (44-48) — oldest invoices settle first.
3. Load last ledger row's `Balance` (51-56); `totalAvailable = previousBalance + request.Amount` (59).
4. Loop orders: `payAmount = min(remaining, order.TotalAmount − order.TotalPaidAmount)`; for each, dispatch **`AddSalesOrderPaymentCommand`** (73-82) — which:
   - Updates the order's `TotalPaidAmount`/`PaymentStatus` (WF-3.7), and
   - Posts the GL payment (Dr Cash / Cr AR via PaymentService → FullPaymentStrategy).
   - Accumulates applied amounts (83-89).
5. Remainder becomes the new credit **Balance** (93); notes record per-order applications (96-100).

**Read paths:** overdue + balance snapshot (GetSalesOrderOverdueByCustomerIdCommandHandler); ledger listing with account/date/location/reference filters (GetAllCustomerLedgerCommandHandler + CustomerLedgerRepository.GetAllCustomerLedger 19-55); single fetch; delete.

**⚠ GAPS:**
- **Delete does not compensate:** `DeleteCustomerLedgerCommandHandler` removes the ledger row but does NOT reverse the GL payments it dispatched against orders — orders stay over-paid and cash stays debited.
- FIFO application is order-date-based, not due-date-based (no due dates on orders → no true aging).
- No ledger-row audit linkage to the specific SalesOrderPayment rows created.

---

## WF-8.3 — Inquiry (Lead) Management Workflow

**Backend:** `InquiryController` + `InquiryActivityController`, `InquiryAttachmentController`, `InquiryNoteController`, `InquirySourceController`, `InquiryStatusController` (POS.API/Controllers/Inquiry*/). **Frontend:** `Angular/src/app/inquiry/`, `inquiry-source/`, `inquiry-status/`.

**Entities:** Inquiry, InquiryActivity, InquiryNote, InquiryProduct, InquirySource, InquiryStatus, InquiryAttachment (POS.Data/Entities/Inquiry/).

### Lifecycle
1. **Create inquiry** — AddInquiryCommand: captures contact, **Source** (walk-in/phone/web — tenant-configurable via InquirySource CRUD), initial **Status** (New/Contacted/... — tenant-configurable via InquiryStatus CRUD), interested **InquiryProducts**.
2. **Activity timeline** — each interaction appends an **InquiryActivity** (call/meeting/email rows with timestamps + user); **InquiryNote** rows hold internal/external notes; **InquiryAttachment** rows store uploaded files (file storage service, tenant-scoped paths).
3. **Status progression** — UpdateInquiryCommand moves Status (any status to any status; no enforced state machine); status list itself is tenant-manageable.
4. **Task editing** — inquiry task edit DTOs support assignment-style follow-ups (`inquiry-task.ts` / `inquiry-task-edit.ts` frontend models).
5. **Convert/Close** — an inquiry can be closed via status; there is **no automated conversion to Sales Order** (conversion is manual: staff creates the order and references the customer).

**⚠ GAPS:**
- No enforced status state machine (any transition allowed) despite the codebase's stated state-machine methodology.
- No lead-assignment/ownership or follow-up due-date reminders auto-linked to inquiries (reminders are independent — see WF-8.4).
- No inquiry→order conversion artifact (attribution lost).

---

## WF-8.4 — Reminder Workflow (Creation → Fan-out → Dispatch → Notification)

**Backend:** `POS.MediatR/Reminder/`, `ReminderScheduler/`, `ReminderServices/`; repositories in `POS.Repository/Reminder/`. **Frontend:** `Angular/src/app/reminder/`, `calendar-view/` (FullCalendar).

### Entities
Reminder (+ Daily/Quarterly/HalfYearly child tables), Frequency enum, ReminderScheduler (per-user dispatch row), ReminderNotification, ReminderUser.

### Stage 1 — Creation
1. **Recurring reminder** — `AddReminderCommandHandler` (Reminder/Add, 38-60):
   - Defaults `Frequency.OneTime` (40-43).
   - Ensures the creator is in **ReminderUsers** (45-51).
   - Persists **Reminder** with StartDate, optional EndDate, IsRepeated, IsEmailNotification, plus child **DailyReminders** (day-of-week rows) for daily frequency.
2. **One-off push** — `AddReminderSchedulerCommandHandler` (ReminderScheduler/Add, 41-73): inserts **ReminderScheduler** rows per user with `Frequency.OneTime`, `IsActive=true` (immediate dispatch candidate).

### Stage 2 — Nightly fan-out (Hangfire)
`JobService.StartScheduler()` registered at boot (Program.cs:176-177 → JobService.cs:30-70). Frequency jobs run **daily at staggered minutes** on the `reminder` queue with `[AutomaticRetry(Attempts=3, DelaysInSeconds={60,300,900})]` + `[DisableConcurrentExecution(3600)]`:

| Job | Cron (JobService line) | MediatR query |
|---|---|---|
| DailyReminder | `Cron.Daily(0,10)` (45) | DailyReminderServicesQuery |
| WeeklyReminder | `Cron.Daily(0,15)` (48) | WeeklyReminderServicesQuery |
| MonthlyReminder | `Cron.Daily(0,20)` (51) | MonthlyReminderServicesQuery |
| QuarterlyReminder | `Cron.Daily(0,30)` (54) | QuarterlyReminderServiceQuery |
| HalfYearlyReminder | `Cron.Daily(0,40)` (57) | HalfYearlyReminderServiceQuery |
| YearlyReminder | `Cron.Daily(0,50)` (60) | YearlyReminderServicesQuery |
| CustomDateReminder | `Cron.Daily(0,59)` (63) | CustomDateReminderServicesQuery |

3. **Fan-out handler** (e.g., DailyReminderServicesQueryHandler.cs:28-45): finds active Daily reminders whose DailyReminders include today's weekday and start/end window → `ReminderSchedulerRepository.AddMultiReminder` (ReminderSchedulerRepository.cs:32-66) **creates one ReminderScheduler row per reminder-user**: `Duration` = today at the reminder's StartDate time-of-day, IsEmailNotification copied, IsActive=true, IsRead=false.
   - **Monthly clamping** (MonthlyReminderServicesQueryHandler.cs:29-83): special-cases month lengths for days 29-31 — **⚠ apparent logic bug in the `&&` clauses (lines 40/49/58)**.
   - Weekly/Quarterly/HalfYearly/Yearly/CustomDate use the same tail.

### Stage 3 — Dispatch loop (every 10 minutes)
4. Recurring job **ReminderSchedule** `*/10 * * * *` (JobService.cs:66) → `ReminderSchedule()` (145-156), guarded by `IConnectionMappingRepository.GetSchedulerServiceStatus()` re-entrancy flag → `ReminderSchedulerServiceQueryHandler.Handle` (44-100):
   - Takes up to 10 active ReminderScheduler rows with `Duration <= now` (48-52).
   - **Real-time push:** `_hubContext.Clients.All.SendNotification(reminderScheduler.UserId)` (60) via `IHubContext<UserHub, IHubClient>`.
   - **Email:** if `IsEmailNotification` and default SMTP exists → sends the scheduler's Subject/Message to the user's email (61-88; MailKit path from WF-9.2).
   - **Deactivates:** `IsActive=false` (90); bulk save (92-97).

### Stage 4 — Client consumption & read-back
5. **SignalR client** — `signalr.service.ts`: auto-reconnect backoff `[0, 2000, 10000, 30000]`; re-join on reconnect; `sendNotification` event pushes userId into `_userNotification$` BehaviorSubject (106-141) — Angular components observe to refetch.
6. **Notification read-back** — NotificationController:
   - `GET api/notification/top10` (20-30) → `GetTop10ReminderNotificationQueryHandler` (31-39): 10 unread (`!IsRead && !IsActive`) schedulers for the current user.
   - `GET all` paged + `X-Pagination` (36-57); `POST markAllAsRead` (63-72) → raw-SQL `MarkAsRead` (Repository 95-99); `GET count` (78-85).

### Calendar view
`calendar-view/` renders reminders on **FullCalendar** (day/month/agenda) reading the same reminder + scheduler data (`calender-reminder.ts` model).

**⚠ GAPS:**
- Dispatch loop caps at 10 rows per 10-minute tick → backlog under volume (800/day max throughput).
- `SendNotification` goes to **All clients** with the userId in the payload (hub method filters server-side by connection map, but the payload pattern broadcasts) — verify per-connection routing on scale-out (in-memory map breaks with multiple instances).
- Reminder emails depend on default SMTP configured; failures only logged.
- No snooze/complete workflow on the notification itself (mark-as-read only).

---

## Workflow Interaction Map

```
 Reminder (recurring)                      Inquiry (lead)
   │ nightly fan-out (Hangfire)               │ activities/notes/attachments
   ▼                                          ▼
 ReminderScheduler rows (per user)         Status progression (free-form)
   │ dispatch loop (10 min)                   │
   ├─► SignalR SendNotification ──► Angular notification tray
   ├─► Email (default SMTP)                   └─ manual order creation
   └─► IsActive=false
 
 Customer pays lump sum
   └─► CustomerLedger Add ──► FIFO dispatch AddSalesOrderPayment per open order
         ├─► order TotalPaidAmount/PaymentStatus updated
         └─► GL: Dr Cash / Cr AR (per order)
```

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| C-01 | Credit | No credit-limit enforcement at POS/order time |
| C-02 | Ledger | CustomerLedger delete doesn't reverse dispatched GL payments |
| C-03 | Ledger | FIFO by order date, not due date; no AR aging |
| C-04 | Inquiry | No enforced status state machine; no owner/assignment; no inquiry→order conversion artifact |
| C-05 | Reminders | 10-row dispatch cap per 10-min tick; backlog risk |
| C-06 | Reminders | Monthly day-clamping logic bug (29-31) |
| C-07 | Reminders | No snooze/complete; email failures silent |
| C-08 | Notifications | Broadcast-pattern notification payload; in-memory connection map limits scale-out |
