# Workflow Document 09 — Infrastructure Services Workflows

**Scope:** FBR e-invoicing, email, SignalR real-time layer, Hangfire background jobs (complete inventory), import/export, public storefront, caching (server + client), and dashboard data flows.

---

## WF-9.1 — FBR (Pakistan Tax Authority) E-Invoicing Workflow

**Files:** `POS.Domain/FBR/FBRInvoiceService.cs`, `FBRQRCodeService.cs`, `POS.API/BackgroundServices/FBRSyncBackgroundService.cs`, `POS.API/Controllers/FBR/FBRController.cs`, `POS.MediatR/FBR/*`.

### State model
Sales orders carry FBR columns: `FBRStatus` (NotSubmitted → Queued → Submitting → Acknowledged / Failed / RequiresManualReview), `FBRRetryCount`, `FBRNextRetryAt`, `FBRInvoiceNumber`, `FBRUSIN`, `FBRQRCodeData`, `FBRAcknowledgedAt`, `FBRResponseJson`, `FBRQRCodeImagePath` (SalesOrder.cs:56-67). New orders default NotSubmitted; **staging at order creation** sets `Queued` when `location.IsFBREnabled && AutoSubmitInvoices` (WF-3.2 step 4).

### Submission loops
1. **Manual:** `POST api/fbr/submit/{salesOrderId}` (FBRController.cs:25-37) → `SubmitFBRInvoiceCommandHandler` (26-43) loads order → `IFBRInvoiceService.SubmitInvoiceAsync` immediately.
2. **Background** — `FBRSyncBackgroundService` (hosted service, Startup.cs:101), `ExecuteAsync` (36-56): every **30 seconds**:
   - `ProcessPendingInvoicesAsync` (58-87): up to 10 orders with `FBRStatus ∈ {NotSubmitted, Queued}` and `FBRRetryCount < 5`, oldest first.
   - `ProcessRetryQueueAsync` (89-114): up to 5 orders with `FBRStatus == Failed` and `FBRNextRetryAt <= now` and `FBRRetryCount < 5`.
   - `SubmitInvoiceToFBRAsync` (116-182): set `Submitting` → call service → success: `Acknowledged` + invoice number/USIN/QR data/ack timestamp + raw response JSON; failure: `Failed`, `FBRRetryCount++`, exponential backoff `min(60 × 2^retryCount, 3600)` seconds (163-168); at 5 failures → `RequiresManualReview` (171-178).

### Invoice build & HTTP call — `FBRInvoiceService.SubmitInvoiceAsync` (43-154)
1. Load order with items/product/customer/payments/location (46-52).
2. **Config from the order's Location**: `IsFBREnabled`, `FBRKey` (bearer token), `ApiBaseUrl`, `POSID` (60-65).
3. `BuildFBRInvoiceRequest` (253-307): payment mode mapping Cash→1, Debit/Credit card→2, Cheque→6 (256-268); invoice type 3 for returns, 1 otherwise (270); line items with `PCTCode="00000000"`, per-item tax rate = `TaxValue/UnitPrice×100` (292-305).
4. `POST {ApiBaseUrl}/api/v1/invoice` with `Authorization: Bearer {FBRKey}` (84-90).
5. Every attempt writes an **FBRSubmissionLog** row (request payload, status Acknowledged/Failed, HTTP code, response time, error) (71-78, 100-152).

### Status & QR
6. **Status tracking:** `GET api/fbr/status/{salesOrderId}` (FBRController.cs:42-54) → handler returns fbrStatus/invoiceNumber/USIN/submittedAt/acknowledgedAt/retryCount/errorMessage. Service also has `VerifyInvoiceAsync` (GET `/api/v1/invoice/verify/{number}`, 210-248) and `CancelInvoiceAsync` (POST `/api/v1/invoice/cancel`, 159-205) — resolving orders by searching `FBRSubmissionLog.ResponsePayload.Contains(invoiceNumber)`.
7. **QR generation:** on success `IFBRQRCodeService.GenerateQRCodeAsync` (FBRInvoiceService.cs:104-111) → `FBRQRCodeService` (55-94): QRCoder `PngByteQRCode`, ECC level Q, scale 20; writes `{invoiceId}.png` to `wwwroot/qrcodes` (Web) or `%APPDATA%/milpos/qrcodes` (Desktop); returns `/qrcodes/{invoiceId}.png`. Background service sets `salesOrder.FBRQRCodeImagePath` (FBRSyncBackgroundService.cs:143-145; its own `GenerateQRCodeImageAsync` 184-189 is a placeholder).

**⚠ GAPS:** QR image path written by a placeholder method; order resolution for verify/cancel by payload string-search is fragile; no FBR sandbox/live environment switch documented beyond Location config.

---

## WF-9.2 — Email Workflow

**Files:** `POS.API/Controllers/Email/EmailController.cs`, `POS.MediatR/Email/*`, `POS.MediatR/EmailTemplate/*`, `POS.Repository/Email/EmailRepository.cs`, `POS.Repository/EmailLog/EmailLogRepository.cs`.

1. **SMTP configuration** — CRUD via `AddEmailSMTPSettingCommandHandler`, `UpdateEmailSMTPSettingCommandHandler`, `DeleteEmailSMTPSettingCommandHandler`, `GetEmailSMTPSetting(s)QueryHandler` (POS.MediatR/Email/Handlers/). `SendTestEmailCommandHandler` (20-52) sends a hard-coded test body using **submitted** settings to verify connectivity before saving.
2. **Send entry points:**
   - `POST api/email` `[ClaimCheck("EMAIL_SEND_EMAIL")]` (EmailController.cs:26-33) → `SendEmailCommand`.
   - `POST api/email/salesOrPurchase` (41-46) → `SendSalesOrPurchaseCommand` (one base64 PDF attachment, e.g. invoice/receipt email).
3. **SendEmailCommandHandler** (31-77): loads **default** SMTP row (`FindBy(c => c.IsDefault)`, 33; 404 if missing); decodes base64 attachments (41-53); maps settings into `SendEmailSpecification` (host/port/username/password/encryption/from) → `IEmailRepository.SendEmail` (55-69).
   - `SendSalesOrPurchaseCommandHandler` (17-52): takes **first** SMTP row (`All.FirstOrDefaultAsync`, 19) — not necessarily the default.
4. **SMTP transport** — `EmailRepository.SendEmail` (17-125, **MailKit**): MimeMessage (From/To/CC parsing 22-43); attachments → `Multipart("mixed")` with `application/octet-stream` parts (45-73), else plain HTML TextPart; `SecureSocketOptions` mapped from `EncryptionType` string `None|ssl|tls|starttls` (83-99); Connect + Authenticate + 30s timeout + Send (102-111). Returns false on error, **never throws** (115-120).
5. **Logging** — `finally` → `emailLogRepository.CreateEmailLog(spec, errorMessage)` (121-124) → **EmailLog** row (sender, recipient, subject, body, error, SentAt, status Sent/Failed) + attachments written to `wwwroot/{EmailAttachmentPath}/{guid}.{ext}` with **EmailLogAttachment** rows (87-115). Queryable via `GetEmailLogs` (40-69).
6. **Templates** — EmailTemplate CRUD (duplicate-name check 41-46). **⚠ No server-side token-replacement engine exists** — templates are stored/retrieved only; rendering happens client-side or not at all (reminder emails send raw Subject/Message).

---

## WF-9.3 — SignalR Real-Time Workflow (UserHub)

**Hub:** `POS.Repository/Hub/UserHub.cs` (10-98), mapped at `/userHub` (Startup.cs:458; AddSignalR 270-273).

1. **Join** (57-75): registers connectionId→userId in **in-memory** `IConnectionMappingRepository`; broadcasts `newOnlineUser` + `onlineUsers`.
2. **SendNotification(userId)** (84-88): routes to the specific connection id (reminder dispatch uses this — WF-8.4).
3. **ForceLogout / OnUserPermissionChange**: server-initiated client actions (forced logout; permission refresh after role edits — WF-1.4).
4. **OnDisconnectedAsync** (90-97): cleans the connection map.
5. **Client** — `signalr.service.ts`: HubConnection to `{api}userHub`, reconnect backoff `[0, 2000, 10000, 30000]`, re-join on reconnect (49-79); `sendNotification` → `_userNotification$` BehaviorSubject (106-141); presence lists + forced logout handling (117-129).

**⚠ GAP:** in-memory connection map — no Redis backplane; presence and targeted notifications break with multiple API instances or a restart.

---

## WF-9.4 — Hangfire Background Jobs (Complete Inventory)

Registration: `Program.cs:176-177` → `JobService.StartScheduler()` (JobService.cs:30-70). Storage chosen by `DatabaseProvider`: SQLite (Desktop path `%APPDATA%/milpos/HangFireDB.db`, Program.cs:62-79), PostgreSQL (80-90), SqlServer (91-103). Servers listen on queues `{default, cleanup, reminder}` with `ProcessorCount×5` workers (106-113). Dashboard at `/hangfire` (169-174). All reminder jobs: queue `reminder`, AutomaticRetry(3, {60,300,900}), DisableConcurrentExecution(3600).

| # | Job ID | Schedule | Purpose |
|---|--------|----------|---------|
| 1 | DailyReminder | `Cron.Daily(0,10)` | Fan out daily reminders → ReminderScheduler rows |
| 2 | WeeklyReminder | `Cron.Daily(0,15)` | Weekly fan-out (day-of-week match) |
| 3 | MonthlyReminder | `Cron.Daily(0,20)` | Monthly (29-31 clamping, buggy) |
| 4 | QuarterlyReminder | `Cron.Daily(0,30)` | Quarterly fan-out |
| 5 | HalfYearlyReminder | `Cron.Daily(0,40)` | Semi-annual |
| 6 | YearlyReminder | `Cron.Daily(0,50)` | Annual |
| 7 | CustomDateReminder | `Cron.Daily(0,59)` | One-off date reminders |
| 8 | ReminderSchedule | `*/10 * * * *` | **Dispatcher**: SignalR push + email for due rows, then deactivate |
| — | hangfire-cleanup | **commented out** (JobService.cs:69) | Old-job cleanup disabled |

Non-Hangfire hosted services: `ScheduledSyncService` (Desktop-only sync loop, Startup.cs:96-99 — see WF-10.3); `FBRSyncBackgroundService` (30s FBR loop, Startup.cs:101 — see WF-9.1).

**⚠ GAP:** cron comments claim "every 24 hours" but frequency jobs actually run daily at staggered minutes 00:10–00:59 — a ~50-minute daily window where a reminder whose time-of-day falls in that window fans out late.

---

## WF-9.5 — Import/Export Workflow

**Files:** `POS.API/Controllers/ImportExportController.cs`, `POS.Domain/ImportExport/{IImportExportService, ProductImportExportService, CustomerImportExportService, SupplierImportExportService}.cs`.

1. **Endpoints** (controller): `POST api/ImportExport/products/import` (36-65), `products/validate` (67-96), `products/export` (98-119), `products/template` (121-140) — mirrored for `customers/` (146-211) and `suppliers/` (217-282). Format sniffing is extension-based: `.csv` → CSV else Excel (44-46).
2. **Import** (ProductImportExportService.ImportAsync, 47-104):
   - **Parsing** — `ParseCsvAsync` (173-184, CsvHelper, lenient: HeaderValidated=null, MissingFieldFound=null) into `ProductImportDto`; `ParseExcelAsync` via EPPlus.
   - **Row validation** — `ValidateProductAsync` (474-532): required Code/Name/Category/Brand/Unit; `SalesPrice > 0`; duplicate Code against DB (498-503); FK existence by name for Category/Brand/Unit (506-525); `SalesPrice >= PurchasePrice` (528-529). Each failure → `ImportError { RowNumber = index+2, FieldName, ErrorMessage }`.
   - **Mapping** — `MapToProductAsync` (534-574): requires tenant (`_tenantProvider.GetTenantId()`), resolves FKs by name, stamps TenantId + audit, `HasVariant=false`.
   - **All-or-nothing bulk:** rows accumulate in the change tracker; `SaveChangesAsync` **only when FailureCount == 0** (81-89) — one bad row aborts the whole file. `ValidateImportAsync` (106-147) = same minus saving (dry-run `/validate`).
   - Customer/Supplier services follow the identical pattern.
3. **Export** — `ExportAsync` (149-169): query incl. Category/Brand/Unit, optional SelectedIds filter, CSV or Excel; controller wraps bytes in `File()` with dated filename (107-112).
4. **Template** — header + sample row (186-220+).
5. **Response contract:** `{ success, totalRecords, successCount, failureCount, errors[] }` (51-58).

**⚠ GAPS:** all-or-nothing import (no partial-accept mode); no variant/batch import; no import of opening stock.

---

## WF-9.6 — Storefront (Public Website) Workflow

**Files:** `POS.API/Controllers/StoreController.cs`, `StoreBaseController.cs`, `POS.API/Filters/StoreTenantAttribute.cs`, Razor views `POS.API/Views/Store/{Index,Cart,OrderSuccess}.cshtml`.

1. **Routing** — `[Route("store/{tenantName}")]` and `[Route("store")]` (20-21); registered only in Web/Cloud mode (`AddControllersWithViews`, Startup.cs:284-301).
2. **Tenant filter** — `StoreTenantAttribute.OnActionExecutionAsync` (16-48): reads `tenantName` route value; looks up Tenant (IgnoreQueryFilters) by **Name or Subdomain** (28); unknown → 404 (30-34); else `ITenantProvider.SetTenantId(tenant.Id)` (37-38) → EF query filters scope the catalog; exposes ViewBag.Tenant/TenantName (41-45).
3. **Catalog** — `GET store/{tenantName}` → `Index` (31-60): ProductResource (page size 20, searchQuery, skip; `IgnoreTenantFilter=true` only when no tenant route — 36-42) → `GetAllProductCommand` via MediatR → Index.cshtml.
4. **Cart** — `CartViewModel` serialized as JSON in `HttpContext.Session["Cart"]` (164-180). `POST add-to-cart` (69-91) increments/adds; `POST remove-from-cart` (93-104); `GET cart` (62-67) renders Cart.cshtml.
5. **Checkout attempt** — `POST checkout` `[ValidateAntiForgeryToken]` (106-162): reads cart, maps to `AddSalesOrderCommand` (`IsSalesOrderRequest=true`, DeliveryStatus=PENDING, guest info into Note, 114-133). **The `_mediator.Send` call is commented out** (145-158, HACK block): guest checkout lacks a valid CustomerId, so today the cart clears and OrderSuccess.cshtml shows — **intentionally incomplete MVP**.

---

## WF-9.7 — Caching Workflows (Server + Client)

### Server-side (MediatR pipeline)
**Files:** `POS.MediatR/PipeLineBehavior/{CachingBehavior, ValidationBehavior, ICacheableQuery}.cs`; registered Startup.cs:62-63 (Caching before Validation).

1. **CachingBehavior** (25-59): activates only for requests implementing `ICacheableQuery` (CacheKey, AbsoluteExpiration, BypassCache). `BypassCache=true` short-circuits (29-32). Key is **tenant-scoped**: `$"{CacheKey}_{tenantId}"` with "Global" fallback (34-35). Hit → cached TResponse (37-41); miss → handler then cache with AbsoluteExpirationRelativeToNow (**default 24h**) (43-53).
2. **Opted-in queries:** GetAllBrandCommand, GetAllCountryCommand, GetAllCurrencyCommand, GetAllLanguageCommand, GetCitiesByContryIdQuery, GetAllProductCategoriesQuery + dashboard commands (WF-7.3). **⚠ No write-side invalidation — eviction is TTL-only.**
3. **ValidationBehavior** (21-51): runs FluentValidation validators; on failure builds response via reflection, sets StatusCode=422 + Messages/Errors; handler never called.

### Client-side (Angular IndexedDB)
**Files:** `core/interceptors/cache.interceptor.ts`, `core/config/cache.config.ts`, `IndexedDbService`, `CacheSyncService`.

1. **Write invalidation** (20-28, 63-125): any 2xx POST/PUT/DELETE → extract resource name from the segment after `api/` (69-89) → delete matching `lookups` entries via `deleteByPattern` (97); for product/supplier/customer also drop `master_data` keys (ALL_PRODUCTS/ALL_SUPPLIERS/ALL_CUSTOMERS — cache.config.ts:27-31) and re-pull via `cacheSyncService.syncMasterData()` (100-120).
2. **Lookup cache** (127-149): GETs matching `CACHE_CONFIG.whitelist` (UnitConversation, Tax, Brand, ProductCategory, ExpenseCategory, InquiryStatus/Source, Role, payment-method, Country, LedgerAccount, Suppliers, location) keyed by `urlWithParams` in the `lookups` store; miss → network → put.
3. **Master-data search** (151-227): `product/dropdowns`, `SupplierSearch`, `customerSearch` **bypass the network entirely** when the full master list exists in IndexedDB — filtering client-side (name/barcode/code/category for products; name/mobile for suppliers/customers), capped at 50 results (176, 191, 226). Empty store → network fallback.
4. **TTL config** (lookups 24h, products 1h — cache.config.ts:3-6) defined but **the interceptor does not expire entries**; invalidation is write-driven only.

**⚠ Asymmetry:** server cache = TTL-only (no invalidation); client cache = write-driven invalidation (no TTL enforcement).

---

## Enhancement Signals From This Document

| ID | Area | Signal |
|----|------|--------|
| N-01 | FBR | Placeholder QR path writer; payload-string order resolution for verify/cancel |
| N-02 | Email | No server-side template rendering engine; salesOrPurchase email uses first-not-default SMTP |
| N-03 | Realtime | In-memory connection map; no backplane; broadcast-pattern payloads |
| N-04 | Jobs | Reminder fan-out window gap (00:10–00:59); dispatch cap 10/10min; cleanup job disabled |
| N-05 | Import | All-or-nothing imports; no variant/batch/stock import |
| N-06 | Storefront | Checkout stub (MediatR send commented out); guest customer problem unsolved |
| N-07 | Cache | Server TTL-only vs client write-only invalidation; no coordinated strategy |
| N-08 | Observability | Hangfire dashboard unguarded? (verify auth on /hangfire) |
