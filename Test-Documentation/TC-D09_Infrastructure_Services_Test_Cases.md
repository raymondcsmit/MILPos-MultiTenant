# TC-D09 — Infrastructure Services Test Cases

**Source:** `New-Documents/09_Infrastructure_Services_Workflows.md` (WF-9.1 … WF-9.7) — code-verified against `SourceCode/SQLAPI/` (citations inline).
**Scope:** FBR e-invoicing, email (SMTP/MailKit), SignalR real-time layer, Hangfire background jobs (complete inventory), import/export, public storefront, server + client caching.
**Workflows covered:** WF-9.1, WF-9.2, WF-9.3, WF-9.4, WF-9.5, WF-9.6, WF-9.7.
**Gap signals referenced:** RT-01, RT-02, RT-04, RT-05, SEC-09, UX-04, BIZ-05, REP-04, ACC-11 (doc 11) · N-01, N-07 (doc 09 self-signals).

**Test data prerequisites (shared seed):**
- Tenant A (active, licensed) with locations L1 (`IsFBREnabled=true`, `AutoSubmitInvoices=true`, `FBRKey=TEST_BEARER_KEY`, `ApiBaseUrl=http://fbr-mock`, `POSID="123"`) and L2 (`IsFBREnabled=false`); Tenant B (isolation/cache-key checks)
- Users: `admin` (all claims incl. `EMAIL_SEND_EMAIL`), `manager` (no email/import claims), `cashier` (POS claims only)
- Products: P-SIMPLE (tax 17%, stock 100 @ L1), P-B2; Customers: C1 (NTN/CNIC set), Walk-in; open FinancialYear FY2026
- Two SMTP rows: SMTP-FIRST (inserted first, `IsDefault=false`, host `smtp-first-mock:2525`) and SMTP-DEFAULT (`IsDefault=true`, host `smtp-default-mock:587`, EncryptionType `ssl`) — proves first-vs-default selection
- Paid sales order SO-FBR-1 @ L1 (cash, 2 items, TotalTax/TotalDiscount set) and return order SO-FBR-2
- EmailTemplate TPL-1 (stored Subject/Message containing `{{CustomerName}}` token, never server-rendered)
- Reminder rows due for dispatch (ReminderScheduler) for the Hangfire cases

**External-dependency rule (binding for this domain):**
- **FBR and SMTP are mocked at the HTTP boundary in IT/UT** — FBR via a fake `HttpMessageHandler` (stubbing `POST {ApiBaseUrl}/api/v1/invoice`, `GET .../verify/{n}`, `POST .../cancel`) returning canned `FBRInvoiceResponse`/errors; SMTP via a mock SMTP server (e.g. `smtp4dev`/Papercut) or a MailKit-transport seam. MemoryCache/clock are injectable fakes for backoff/TTL assertions.
- **Postman and E2E use the FBR sandbox or a local mock-server** (and mock SMTP) — never the FBR production API. Postman environment `local-cloud` with `fbrMockBaseUrl`; the FBR status polling runner chains against the mock-server. No case in this catalog requires live FBR/SMTP connectivity.

---

## WF-9.1 — FBR (Pakistan Tax Authority) E-Invoicing Workflow

### TC-D09.001 — Order creation stages FBRStatus=Queued only when location is FBR-enabled with auto-submit
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-9.1 (state model; WF-3.2 step 4) — verified `POS.MediatR/SalesOrder/Add/AddSalesOrderCommandHandler.cs:108-110`
- **Arrange:** Tenant A; L1 FBR-enabled + AutoSubmitInvoices; L2 FBR-disabled; cashier JWT
- **Act:** POST /api/SalesOrder for L1 (paid cash, BuyerNTN/BuyerCNIC set); second POST identical payload for L2
- **Assert (IT):** order@L1: `FBRStatus == Queued` (enum persisted), `FBRRetryCount == 0`, `FBRInvoiceNumber == null`, Buyer* fields persisted, `SaleType == "Retail"` when unset; order@L2: `FBRStatus == NotSubmitted`, Buyer fields untouched by FBR block

### TC-D09.002 — Submit payload construction matches FBR contract (payment mode, invoice type, PCT, tax rate, totals)
- **Layers:** UT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-9.1 step 3 — verified `POS.Domain/FBR/FBRInvoiceService.cs:253-307`
- **Arrange:** SO-FBR-1 (cash payment → Cash; card variant SO; cheque variant SO); return order SO-FBR-2; item UnitPrice=1000, TaxValue=170, Quantity=2, Discount=50
- **Act:** invoke `IFBRInvoiceService.SubmitInvoiceAsync` through a fake `HttpMessageHandler` capturing the JSON body of `POST {ApiBaseUrl}/api/v1/invoice`
- **Assert (UT):** captured payload: `PaymentMode == 1` (Cash) / `2` (Debit- or CreditCard) / `6` (Cheque); `InvoiceType == 3` for return, `1` otherwise; `POSID == 123`; `USIN == OrderNumber`; `TotalSaleValue == TotalAmount − TotalTax`; `TotalBillAmount == TotalAmount`; item: `PCTCode == "00000000"`, `TaxRate == 17.0` (=TaxValue/UnitPrice×100 recomputed in test), `TaxCharged == 340` (170×2), `TotalAmount == 2250` (1000×2 + 170×2 − 50)

### TC-D09.003 — Manual submit endpoint acknowledges order and persists invoice identifiers
- **Layers:** IT, PM
- **Priority:** P0   **Category:** Happy
- **Source:** WF-9.1 step 1/5 — verified `POS.API/Controllers/FBR/FBRController.cs:25-37`, `FBRInvoiceService.cs:84-121`
- **Arrange:** SO-FBR-1 @ L1 `FBRStatus=Queued`; FBR mock returns 200 `{invoiceNumber:"FBR-INV-9001", usin:"SO-2026-0001", qrCodeData:"<qr-payload>"}`; `Authorization: Bearer TEST_BEARER_KEY` expected
- **Act:** POST api/fbr/submit/{SO-FBR-1} with admin JWT
- **Assert (IT):** 200; SalesOrder: `FBRStatus == Acknowledged`, `FBRInvoiceNumber == "FBR-INV-9001"`, `FBRUSIN == "SO-2026-0001"`, `FBRQRCodeData == "<qr-payload>"`, `FBRAcknowledgedAt != null`, `FBRResponseJson` contains `"FBR-INV-9001"`; FBRSubmissionLog row: `Status == Acknowledged`, `HttpStatusCode == 200`, `ResponseTime >= 0`, `RequestPayload` contains `"PaymentMode":1`
- **Assert (PM):** mock-server received request with header `Authorization: Bearer TEST_BEARER_KEY` at `{ApiBaseUrl}/api/v1/invoice`

### TC-D09.004 — Successful response validation writes Acknowledged log + QR path and is idempotent per attempt
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-9.1 steps 5/7 — verified `FBRInvoiceService.cs:71-78,96-121,104-111`
- **Arrange:** same as TC-D09.003
- **Act:** POST api/fbr/submit/{SO-FBR-1}; inspect DB logs
- **Assert (IT):** exactly 1 FBRSubmissionLog row for the order with `Status == Acknowledged`, `ResponsePayload` == serialized `FBRInvoiceResponse` containing `QRCodeBase64 == "/qrcodes/{SO-FBR-1}.png"`; a QR PNG file exists at the QR service output directory for `{SO-FBR-1}.png` (cloud mode); second submit attempt adds a second log row (attempt log always written)

### TC-D09.005 — Invalid FBR credential (401) marks order Failed and logs the HTTP failure
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-9.1 step 5 — verified `FBRInvoiceService.cs:123-139`, `FBRSyncBackgroundService.cs:154-181`
- **Arrange:** L1 `FBRKey=BAD_KEY`; FBR mock returns HTTP 401 body `{"error":"invalid token"}`
- **Act:** POST api/fbr/submit/{SO-FBR-1}
- **Assert (IT):** 400 (BadRequest from controller error path); SalesOrder (after loop pass): `FBRStatus == Failed`, `FBRRetryCount == 1`, `FBRErrorMessage` contains "invalid token"; FBRSubmissionLog row `Status == Failed`, `HttpStatusCode == 401`, `ResponsePayload` contains "invalid token"; `FBRAcknowledgedAt == null`

### TC-D09.006 — FBR endpoint unreachable (offline) fails the attempt, schedules backoff, and still logs
- **Layers:** IT
- **Priority:** P0   **Category:** Negative
- **Source:** WF-9.1 step 5 + gap note — verified `FBRInvoiceService.cs:141-153`, `FBRSyncBackgroundService.cs:154-181`
- **Arrange:** FBR mock handler throws `HttpRequestException` (connection refused); SO-FBR-1 `FBRStatus=Queued`
- **Act:** run one `FBRSyncBackgroundService` pass (invoke `ExecuteAsync` iteration / call submit path directly with cancel token)
- **Assert (IT):** SalesOrder: `FBRStatus == Failed`, `FBRRetryCount == 1`, `FBRNextRetryAt == UtcNow + 120s` (±1s tolerance; see formula `min(60×2^RetryCount,3600)` applied **after** increment, `FBRSyncBackgroundService.cs:163-168`); FBRSubmissionLog row exists with `Status == Failed` and `ErrorMessage` contains exception message (log written even on exception path, `FBRInvoiceService.cs:148-149`)

### TC-D09.007 — Exponential backoff progression 120s→240s→480s→960s→1920s; 5th failure → RequiresManualReview
- **Layers:** UT, IT
- **Priority:** P0   **Category:** Edge
- **Source:** WF-9.1 step 2 — verified `FBRSyncBackgroundService.cs:159-178`
- **Arrange:** SO with FBRStatus=Failed; inject fake clock; FBR mock always 500
- **Act:** run 5 retry passes, advancing fake clock past each `FBRNextRetryAt`
- **Assert (UT/IT):** after failure n the persisted `FBRNextRetryAt == UtcNow + min(60×2^n, 3600)s`: n=1→120s, n=2→240s, n=3→480s, n=4→960s, n=5→1920s; at n=5 `FBRStatus == RequiresManualReview` and `FBRRetryCount == 5`; unit edge: `RetryCount=6` yields capped 3600s (formula assertion, recomputed from constants in test); RequiresManualReview orders are **not** re-picked by pending or retry queries

### TC-D09.008 — Pending loop submits ≤10 oldest NotSubmitted/Queued orders with RetryCount<5
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-9.1 step 2 — verified `FBRSyncBackgroundService.cs:58-87`
- **Arrange:** 12 Queued orders (created t1<t2<…<t12, RetryCount=0) + 1 Queued order with RetryCount=5; FBR mock returns 200 for all
- **Act:** invoke `ProcessPendingInvoicesAsync` directly once (handler-invoked, no 30s wait)
- **Assert (IT):** exactly the 10 oldest orders (t1…t10) have `FBRStatus == Acknowledged`; t11, t12 still `Queued`; RetryCount=5 order untouched (`Queued`, not submitted — filter `FBRRetryCount < 5`, line 75)

### TC-D09.009 — Retry queue processes ≤5 Failed orders whose FBRNextRetryAt is due, oldest-due first
- **Layers:** IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-9.1 step 2 — verified `FBRSyncBackgroundService.cs:89-114`
- **Arrange:** 7 Failed orders: 5 with `FBRNextRetryAt <= now` (RetryCount 1-2), 2 with `FBRNextRetryAt = now + 1h`; FBR mock returns 200
- **Act:** invoke `ProcessRetryQueueAsync` directly once
- **Assert (IT):** exactly 5 due orders → `Acknowledged` with invoice fields set; the 2 future-retry orders remain `Failed` untouched; a 6th due order (8 seeded) also remains pending (Take(5) cap, line 104)

### TC-D09.010 — QR code generation (cloud): PNG in wwwroot/qrcodes, QRCoder ECC-Q scale 20, relative URL returned
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.1 step 7 — verified `POS.Domain/FBR/FBRQRCodeService.cs:24-49,55-94`
- **Arrange:** Web-host environment (`WebRootPath` = temp dir); qrData string of 200 chars; invoiceId = SO-FBR-1
- **Act:** call `IFBRQRCodeService.GenerateQRCodeAsync(qrData, SO-FBR-1)`
- **Assert (UT):** return value == `/qrcodes/{SO-FBR-1}.png`; file `wwwroot/qrcodes/{SO-FBR-1}.png` exists; PNG is decodable QR of ECC level Q with module scale 20 (round-trip decode with QRCoder returns exactly `qrData`); file bytes identical on repeated calls (deterministic)

### TC-D09.011 — QR code generation (desktop): file written to %APPDATA%/milpos/qrcodes, URL path unchanged
- **Layers:** UT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-9.1 step 7 (path differs cloud vs desktop) — verified `FBRQRCodeService.cs:24-36`
- **Arrange:** host environment name `Desktop`; `%APPDATA%` redirected to temp dir
- **Act:** call `GenerateQRCodeAsync(qrData, invoiceId)` with Desktop-env service instance
- **Assert (UT):** PNG written to `%APPDATA%/milpos/qrcodes/{invoiceId}.png` (not wwwroot); return value still `/qrcodes/{invoiceId}.png`; **no** file created under wwwroot/qrcodes

### TC-D09.012 — Background service writes FBRQRCodeImagePath via a placeholder that never creates a file
- **Layers:** UT, IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.1 gap (N-01) — verified `FBRSyncBackgroundService.cs:143-145,184-189`
- **Arrange:** SO-FBR-1 queued; FBR mock 200 with qrCodeData; cloud host
- **Act:** run one full background submit pass
- **Assert (Char/IT):** SalesOrder.`FBRQRCodeImagePath == "/qrcodes/{SO-FBR-1}.png"` although **no** PNG file exists at that URL (placeholder returns the literal path, line 188); QR file exists only at the service-generated location from TC-D09.010 — the two paths may diverge; this characterizes the placeholder (guard: refactor must not silently change stored path semantics)

### TC-D09.013 — Verify/cancel resolve the order by string-searching FBRSubmissionLog.ResponsePayload
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P2   **Source:** WF-9.1 gap (N-01) — verified `FBRInvoiceService.cs:159-205,210-248`
- **Arrange:** acknowledged order whose log `ResponsePayload` contains `"FBR-INV-9001"`; second order whose payload coincidentally embeds `"XFBR-INV-9001Y"` substring
- **Act:** POST api/fbr endpoints (cancel: invoiceNumber="FBR-INV-9001", reason="test"; verify: GET path with number) via service
- **Assert (Char/IT):** resolution query matches orders via `ResponsePayload.Contains(invoiceNumber)` — the substring-colliding order is a false-positive resolution candidate (assert both candidates match the resolution predicate; first match wins); FBR mock received `POST .../invoice/cancel` with `{invoiceNumber, reason, cancelledAt}` and `GET .../invoice/verify/FBR-INV-9001`; unknown number → `InvalidOperationException` "not configured or enabled" path (500-class failure) — fragile-resolution behavior pinned

### TC-D09.014 — FBR status endpoint returns full tracking payload; unknown order → 404; Postman polling runner
- **Layers:** IT, PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.1 step 6 — verified `FBRController.cs:42-54`
- **Arrange:** acknowledged SO-FBR-1 (from TC-D09.003); unknown GUID U
- **Act:** GET api/fbr/status/{SO-FBR-1}; GET api/fbr/status/{U}; Postman runner polls status every 5s until `fbrStatus == "Acknowledged"` (max 12 iterations)
- **Assert (IT):** 200 with fields `fbrStatus == "Acknowledged"`, `invoiceNumber == "FBR-INV-9001"`, `usin`, `submittedAt`, `acknowledgedAt`, `retryCount == 0`, `errorMessage == null`; unknown GUID → 404 `{error}`
- **Assert (PM):** runner completes with all iterations returning 200/404 contract-shaped bodies (no field-name drift)

### TC-D09.015 — Integration flow: queue → background submit → status, with FBR HTTP fully mocked
- **Layers:** IT
- **Priority:** P0   **Category:** Happy
- **Source:** WF-9.1 steps 1-6 (end-to-end loop)
- **Arrange:** fresh tenant DB; L1 enabled; create paid sale via POST /api/SalesOrder (→ Queued per TC-D09.001); FBR mock sequence: 1st call 503, 2nd call 200 `{invoiceNumber:"FBR-INV-9002",...}`
- **Act:** run background pass #1 (→ failure), advance fake clock 120s, run pass #2; then GET api/fbr/status/{id}
- **Assert (IT):** after pass #1: `Failed`, `RetryCount == 1`, 2 log rows (one per attempt incl. inner-service log + loop bookkeeping); after pass #2: `Acknowledged`, `FBRInvoiceNumber == "FBR-INV-9002"`, `FBRAcknowledgedAt != null`, `FBRResponseJson` set; status GET returns acknowledged payload; total FBR mock invocations == 2

---

## WF-9.2 — Email Workflow

### TC-D09.016 — SendEmail uses the IsDefault SMTP row; no default → 404
- **Layers:** IT, UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.2 step 3 — verified `POS.MediatR/Email/Handlers/SendEmailCommandHandler.cs:33-69`
- **Arrange:** SMTP-DEFAULT (`IsDefault=true`, host `smtp-default-mock:587`, ssl) + SMTP-FIRST (not default); mock SMTP server capturing messages; admin JWT with `EMAIL_SEND_EMAIL`
- **Act:** POST api/email `{toAddress:"buyer@example.com", subject:"S", body:"<b>B</b>", attachments:[]}`; then delete default row and repeat
- **Assert (IT):** 200; mock SMTP at `smtp-default-mock:587` received 1 message: From == SMTP-DEFAULT.FromEmail, To == buyer@example.com, Subject == "S", HTML body preserved; no message reached `smtp-first-mock`; second call → 404 body `Default SMTP setting does not exist.` and **no** EmailLog row (fail occurs before transport)

### TC-D09.017 — salesOrPurchase email uses the FIRST SMTP row, not the IsDefault row
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.2 step 3 + RT-04 — verified `POS.MediatR/Email/Handlers/SendSalesOrPurchaseCommandHandler.cs:19`
- **Arrange:** SMTP-FIRST inserted first (`IsDefault=false`), SMTP-DEFAULT second (`IsDefault=true`); both hosts mocked
- **Act:** POST api/email/salesOrPurchase `{toAddress:"c@example.com", subject:"Invoice", message:"M", attachement:<base64 pdf>, name:"inv.pdf", fileType:"pdf"}`
- **Assert (Char/IT):** message delivered via **`smtp-first-mock:2525`** (first row by unspecified `All` ordering), zero messages on the default host — `All.FirstOrDefaultAsync()` ignores `IsDefault`; this pins current behavior (RT-04 characterization)

### TC-D09.018 — salesOrPurchase email honors IsDefault (desired behavior — RED until RT-04 fix lands)
- **Layers:** IT   **Category:** Gap-Target [RT-04]
- **Priority:** P1   **Source:** RT-04 (doc 11) — desired `IsDefault` selection
- **Arrange:** identical to TC-D09.017
- **Act:** POST api/email/salesOrPurchase (same payload)
- **Assert (Target/IT):** message delivered via `smtp-default-mock:587` only; zero messages on `smtp-first-mock`; RED by definition until the handler selects `FindBy(c => c.IsDefault)` (mirrors TC-D09.016)

### TC-D09.019 — Transport failure is silent: SendEmail returns false but handlers still return Success
- **Layers:** IT, UT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.2 steps 3-5 + RT-04 "failures silent" — verified `POS.Repository/Email/EmailRepository.cs:115-124` (never throws), `SendSalesOrPurchaseCommandHandler.cs:50` and `SendEmailCommandHandler.cs:70` (unconditional ReturnSuccess)
- **Arrange:** SMTP-DEFAULT pointing at a dead host/port (`127.0.0.1:1`, 30s timeout not awaited — fail fast); admin JWT
- **Act:** POST api/email (valid payload); POST api/email/salesOrPurchase (valid payload)
- **Assert (Char/IT):** both endpoints return **200 with `success == true`** although nothing was delivered; EmailLog rows exist with `Status == Failed` and `ErrorMessage` populated (log written in `finally`, line 121-124); no retry scheduled, no queue row — silent-failure behavior pinned (RT-04)

### TC-D09.020 — Email send failure retries via queue with bounded attempts (desired — RED until RT-04 fix)
- **Layers:** IT   **Category:** Gap-Target [RT-04]
- **Priority:** P1   **Source:** RT-04 (doc 11) — "retry/queue" direction
- **Arrange:** dead SMTP host as in TC-D09.019
- **Act:** POST api/email valid payload; inspect outbox/queue state
- **Assert (Target/IT):** API response surfaces failure (non-success status or queued=true); an outbox/queue record exists (e.g. Hangfire job or EmailOutbox row) with attempt count 1 and next-attempt timestamp; after 3 failed attempts status → `Abandoned` (bounded); EmailLog `Status == Failed` retained; **RED** until retry/queue mechanism lands

### TC-D09.021 — Attachment transport: base64 PDF becomes multipart/mixed octet-stream part + EmailLogAttachment row
- **Layers:** IT, UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.2 steps 2/4/5 — verified `EmailRepository.cs:45-73`, `EmailLogRepository.cs:71-118`
- **Arrange:** SMTP-DEFAULT on mock server (TLS `ssl` mapped — see UT below); salesOrPurchase payload with 1 KB base64 PDF named `invoice-1.pdf`
- **Act:** POST api/email/salesOrPurchase; fetch captured MIME from mock server; query EmailLog
- **Assert (IT):** captured MIME: `multipart/mixed` with 1 `text/html` body part + 1 attachment part `Content-Type: application/octet-stream`, filename `invoice-1.pdf`, base64 transfer encoding, bytes == decoded source; EmailLog row: `Status == Sent`, `ErrorMessage == null/empty`, `SentAt != null`; EmailLogAttachment row with `Name == "invoice-1.pdf"`, `Path == {EmailAttachmentPath}/{guid}.pdf` and file exists under `wwwroot/{EmailAttachmentPath}/`
- **Assert (UT):** `EncryptionType` string mapping (EmailRepository.cs:83-99): `None`→`SecureSocketOptions.None`, `ssl`→`SslOnConnect`, `tls`→`StartTls`, `starttls`→`StartTlsWhenAvailable`, other/`Auto` default; `client.Timeout == 30000`

### TC-D09.022 — No server-side template engine: stored template tokens reach the wire unreplaced
- **Layers:** IT, UT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.2 step 6 + RT-04 — verified template handlers store/retrieve only (duplicate-name check at `POS.MediatR/EmailTemplate` handlers:41-46); reminder emails send raw Subject/Message
- **Arrange:** EmailTemplate TPL-1 with Subject `Reminder for {{CustomerName}}` and Message `Hello {{CustomerName}}, balance {{Balance}}`
- **Act:** send reminder email for C1 using TPL-1 subject/message (reminder dispatch path); also POST api/email with body containing `{{CustomerName}}`
- **Assert (Char/IT):** message received by mock SMTP with subject literally `Reminder for {{CustomerName}}` and body containing `{{Balance}}` — **no token substitution server-side**; EmailTemplate CRUD duplicate: creating second template named TPL-1 → 409/failed response (name-uniqueness preserved, storage-only)
- **Assert (UT):** token-replacement renderer absent — a unit seam for a future renderer is the Gap-Target; current substitution result == input

### TC-D09.023 — Email permission: POST api/email requires EMAIL_SEND_EMAIL claim; salesOrPurchase has none
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.2 step 2 — verified `POS.API/Controllers/Email/EmailController.cs:26-33` (ClaimCheck) vs `41-46` (no ClaimCheck)
- **Arrange:** manager JWT (no `EMAIL_SEND_EMAIL`); SMTP-DEFAULT present
- **Act:** POST api/email as manager; POST api/email/salesOrPurchase as manager
- **Assert (Char/IT):** first → 403 (claim filter); second → 200 (any authenticated user passes) — unclaimed-endpoint behavior pinned; recommend claim parity (no doc-11 gap ID yet — see discrepancy notes)

### TC-D09.024 — E2E: email log list page renders sent and failed rows
- **Layers:** E2E
- **Priority:** P2   **Category:** Happy
- **Source:** WF-9.2 step 5 (`GetEmailLogs`, `EmailLogRepository.cs:40-69`)
- **Arrange:** 1 Sent + 1 Failed EmailLog seeded via API sends (mock SMTP up / down); admin session
- **Act:** navigate Settings → Email Logs; search by subject substring; open a row
- **Assert (E2E):** list shows exactly 2 rows with status badges Sent/Failed, sender/recipient/subject/timestamps; subject filter narrows to 1; detail view shows body and (for the sent row) attachment name `invoice-1.pdf` linking to stored path

---

## WF-9.3 — SignalR Real-Time Workflow (UserHub)

*IT technique: full API host via `WebApplicationFactory` (test-host WebSockets enabled) + `Microsoft.AspNetCore.SignalR.Client` `HubConnection` as test client to `/userHub`; server-side pushes asserted via real clients, hub-internal state via `IConnectionMappingRepository` resolved from the host's DI container (or `IHubContext<UserHub, IHubClient>` for server-origin sends).*

### TC-D09.025 — Join registers connection in the in-memory map and broadcasts presence
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.3 step 1 — verified `POS.Repository/Hub/UserHub.cs:57-75`, map at `:12-17`, endpoint `Startup.cs:458`
- **Arrange:** two authenticated test clients A, B connected to `/userHub`; empty connection map
- **Act:** A invokes `Join(signlarUser_A)`; then B invokes `Join(signlarUser_B)`
- **Assert (IT):** map contains userId_A→connId_A and userId_B→connId_B; A received `Joined(user_A)` + `OnlineUsers([])` on join; when B joins, A received `NewOnlineUser(user_B)` (AllExcept caller) while B received `OnlineUsers` excluding B; B joining twice with same user updates map without a second `NewOnlineUser` broadcast (AddUpdate path)

### TC-D09.026 — SendNotification routes only to the target user's connection
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.3 step 2 — verified `UserHub.cs:84-88`
- **Arrange:** clients A (user A) and B (user B) joined per TC-D09.025
- **Act:** resolve `IHubContext<UserHub, IHubClient>`; invoke `SendNotification(user_B_id)` server-side
- **Assert (IT):** B's test client received `SendNotification(user_B_id)` event within 2s; A received **no** `SendNotification` event; unknown userId → `GetUserInfoById` null dereference surfaces as hub error (current behavior: NRE → error result, map unchanged)

### TC-D09.027 — OnUserPermissionChange pushes refresh action to the affected user
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.3 step 3 (WF-1.4) — verified `UserHub.cs:51-55`
- **Arrange:** user B joined; role B edited via API (permission set changed)
- **Act:** trigger permission-change push (`OnUserPermissionChange(user_B_id)` via hub context, as role-edit flow does)
- **Assert (IT):** B's client received `OnUserPermissionChange(user_B_id)`; map entry for B intact; A received nothing

### TC-D09.028 — ForceLogout and disconnect both remove the map entry and broadcast UserLeft
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.3 steps 3/4 — verified `UserHub.cs:36-49,90-97`
- **Arrange:** user B joined (map has B)
- **Act:** (1) invoke `ForceLogout(user_B)`; reconnect B; (2) dispose B's connection (`OnDisconnectedAsync`)
- **Assert (IT):** after ForceLogout: B's client received `ForceLogout(user_B)` callback, other clients received `UserLeft(user_B)`, map entry removed; after disconnect: `UserLeft(user_B)` broadcast, map empty; disconnect of an unmapped connection is a no-op (null return, line 93-94)

### TC-D09.029 — Hub accepts unauthenticated connections (no [Authorize] on UserHub)
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.3 + N-08-adjacent — verified `UserHub.cs:10` (no `[Authorize]` attribute), `Startup.cs:270-273,458`
- **Arrange:** test client with **no** JWT completing the SignalR negotiate/handshake
- **Act:** connect and invoke `Join(guestUser)`
- **Assert (Char/IT):** handshake succeeds and `Join` registers the guest in the connection map (broadcast `NewOnlineUser` fires) — current behavior pins the absence of hub-level auth; recommend `[Authorize]` on the hub (no doc-11 ID — see discrepancy notes)

### TC-D09.030 — Connection map is in-memory: API restart loses all presence and targeted sends break
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.3 gap + RT-01 — verified `IConnectionMappingRepository` in-memory registration, `UserHub.cs:12-17`
- **Arrange:** client B joined on host instance #1; recycle/recreate the host (same DB, fresh DI container)
- **Act:** after restart, client B (still connected socket is dead) reconnects as B'; server invokes `SendNotification(user_A_id)` for a user who never re-joined
- **Assert (Char/IT):** before restart `SendNotification(user_B_id)` reaches B; after restart the map is empty — notification for non-joined user fails (NRE/hub error), no persistence or recovery of presence; second instance #2 started in parallel never sees instance #1's connections (send from #2 to B's connection id fails) — no backplane, pinned

### TC-D09.031 — Redis backplane: presence and targeted sends survive restart and scale-out (desired — RED)
- **Layers:** IT   **Category:** Gap-Target [RT-01]
- **Priority:** P1   **Source:** RT-01 (doc 11)
- **Arrange:** two host instances sharing a test Redis (or backplane test double); client B joined on instance #1
- **Act:** invoke `SendNotification(user_B_id)` from instance #2; restart instance #1 and re-join B
- **Assert (Target/IT):** B receives the notification even though it was sent via instance #2; after restart, B's re-join restores presence and sends flow again; **RED** until `AddStackExchangeRedis` backplane lands

### TC-D09.032 — E2E: notification toast appears in POS session when a reminder notification is dispatched after a sale
- **Layers:** E2E
- **Priority:** P2   **Category:** Happy
- **Source:** WF-9.3 step 5 (`signalr.service.ts` reconnect `[0,2000,10000,30000]`, `_userNotification$` BehaviorSubject) + WF-9.4 dispatcher
- **Arrange:** cashier session in browser connected to `/userHub`; customer C1 has a reminder due now; Kill servers once mid-session to exercise reconnect, then restore
- **Act:** cashier creates sale for C1; trigger `ReminderSchedule` job (dispatcher, */10 cron) directly; observe UI without reload
- **Assert (E2E):** toast appears within 5s of dispatch without page refresh; reconnect after server restart succeeds within ~45s (backoff ladder) and presence list shows cashier again

---

## WF-9.4 — Hangfire Background Jobs (Complete Inventory)

### TC-D09.033 — Recurring-job schedule table: all 8 registered jobs fire on their documented cron via fake clock
- **Layers:** UT, IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-9.4 table — verified `POS.API/Helpers/JobService.cs:45-66` (all "Every 24 hours" comments notwithstanding, schedules are daily at staggered minutes)
- **Arrange:** `TestWebApplicationFactory` with Hangfire storage (SQLite per provider selection, `Program.cs:62-103`); `StartScheduler()` executed; fake clock
- **Act:** advance fake clock minute-by-minute across 00:00–01:00 local and query Hangfire recurring-job next-execution metadata; invoke each job through Hangfire's trigger when its minute arrives (or assert the registered cron expression strings)
- **Assert (UT/IT):** recurring jobs and crons exactly: `DailyReminder`→daily 00:10, `WeeklyReminder`→daily 00:15, `MonthlyReminder`→daily 00:20, `QuarterlyReminder`→daily 00:30, `HalfYearlyReminder`→daily 00:40, `YearlyReminder`→daily 00:50, `CustomDateReminder`→daily 00:59, `ReminderSchedule`→`*/10 * * * *`; all timeZones == `TimeZoneInfo.Local`; a reminder with time-of-day 00:25 fans out only after the 00:30 tick (≥ ~10 min late — the RT-03 window gap, characterized here; fix tracked under RT-03 in D08/D10 scope)

### TC-D09.034 — DailyReminder invoked directly fans out daily reminders into ReminderScheduler rows
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.4 job #1 — verified `JobService.cs:79-82` → `DailyReminderServicesQuery`
- **Arrange:** reminders of type Daily due today for customers C1, C2
- **Act:** call `JobService.DailyReminder()` directly (handler-invoked, no cron)
- **Assert (IT):** returns `true`; ReminderScheduler rows created for both customers' due reminders (count == expected from seed); idempotent on second same-day invocation (no duplicate rows per the query's own fan-out logic)

### TC-D09.035 — Weekly/Quarterly/HalfYearly/Yearly jobs filter their period when invoked directly
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.4 jobs #2/#4/#5/#6 — verified `JobService.cs:90-93,112-115,123-126,134-137`
- **Arrange:** seed reminders: 2 weekly (matching day-of-week), 1 weekly (wrong day), 1 quarterly, 1 half-yearly, 1 yearly
- **Act:** invoke each `JobService` job method directly once
- **Assert (IT):** WeeklyReminder creates scheduler rows only for the 2 matching-day reminders (wrong-day reminder untouched); Quarterly/HalfYearly/Yearly each fan out exactly their seeded set; all return `true`

### TC-D09.036 — CustomDateReminder creates rows only for the due one-off date
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.4 job #7 — verified `JobService.cs:164-167` → `CustomDateReminderServicesQuery`
- **Arrange:** 2 custom-date reminders: 1 due today, 1 scheduled for a future date
- **Act:** call `JobService.CustomDateReminderSchedule()` directly (handler-invoked, no cron)
- **Assert (IT):** returns `true`; ReminderScheduler row created only for the due-today reminder; future-dated reminder untouched (no row, still active)

### TC-D09.037 — MonthlyReminder day-clamping bug: 29-31 clamped incorrectly (characterization)
- **Layers:** UT, IT   **Category:** Gap-Char
- **Priority:** P2   **Source:** WF-9.4 job #3 + RT-02 — verified `JobService.cs:101-104` → monthly handler clamping logic
- **Arrange:** monthly reminders scheduled for the 29th, 30th, 31st of a 30-day month (February variant for 29→28)
- **Act:** invoke `MonthyReminder()` directly on a fake clock at each boundary day
- **Assert (Char/IT):** fan-out for day-29/30/31 reminders occurs on days the current clamping logic produces — including at least one known-wrong firing day (e.g. a 31st reminder firing on the 29th/30th, or never in short months); the buggy day set is pinned so the RT-02 fix flips this to exact end-of-month clamping (target tracked in D08; guard here)

### TC-D09.038 — ReminderSchedule dispatcher pushes SignalR + sends email for due rows, deactivates them, caps at 10/tick, and is re-entry gated
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.4 job #8 — verified `JobService.cs:145-156` (scheduler-status gate) and dispatcher query
- **Arrange:** 12 due ReminderScheduler rows; test SignalR client for the owning user connected; mock SMTP up
- **Act:** invoke `JobService.ReminderSchedule()`; while first invocation is in-flight, invoke it again (concurrent probe)
- **Assert (IT):** exactly 10 rows processed this tick (cap), 2 remain active for the next tick; each processed row: SignalR `SendNotification(userId)` received by the test client AND an email dispatched (mock SMTP received, per WF-8.4 semantics) AND row deactivated (fetched set no longer due); the concurrent second invocation returned `true` immediately **without** dispatching (scheduler-status flag, lines 147-155) — no double-send of the same row

### TC-D09.039 — All reminder jobs carry queue=reminder, AutomaticRetry(3, {60,300,900}), DisableConcurrentExecution(3600)
- **Layers:** UT
- **Priority:** P2   **Category:** Edge
- **Source:** WF-9.4 header — verified `JobService.cs:76-78` (and identical on all 8 methods)
- **Arrange:** reflection over `POS.API.Helpers.JobService` public job methods
- **Act:** read `[Queue]`, `[AutomaticRetry]`, `[DisableConcurrentExecution]` attributes
- **Assert (UT):** all 8 job methods: `Queue == "reminder"`; `AutomaticRetry.Attempts == 3` with `DelaysInSeconds == [60,300,900]`; `DisableConcurrentExecution.TimeoutInSeconds == 3600`; worker servers configured on queues `{default, cleanup, reminder}` with `ProcessorCount×5` workers (registration assertion, WF-9.4 header)

### TC-D09.040 — hangfire-cleanup recurring job is NOT registered (disabled in code)
- **Layers:** UT, IT   **Category:** Gap-Char
- **Priority:** P2   **Source:** WF-9.4 table + RT-05 — verified `JobService.cs:68-69` (registration commented out)
- **Arrange:** `StartScheduler()` executed
- **Act:** query Hangfire recurring jobs / reflect over `JobService.StartScheduler`
- **Assert (Char/IT):** no recurring job with id `hangfire-cleanup` exists; the `HangfireCleanupService.CleanupOldJobs` registration line is commented out; Hangfire job storage grows unbounded across the test-run simulation (seed 1000 expired jobs → all remain after a 25h fake-clock pass) — storage-growth behavior pinned (RT-05)

### TC-D09.041 — hangfire-cleanup re-enabled with retention policy (desired — RED until RT-05 fix)
- **Layers:** IT   **Category:** Gap-Target [RT-05]
- **Priority:** P2   **Source:** RT-05 (doc 11)
- **Arrange:** Hangfire storage seeded with jobs aged 1d, 8d, 32d; retention policy configured (e.g. 30d)
- **Act:** run `hangfire-cleanup` job (re-enabled) via fake clock daily trigger
- **Assert (Target/IT):** recurring job `hangfire-cleanup` registered with `Cron.Daily`; jobs older than retention deleted (8d, 32d gone; 1d retained); storage row count reduced accordingly; **RED** until re-enable lands

### TC-D09.042 — Hangfire dashboard at /hangfire is reachable without any auth filter (unguarded — characterization)
- **Layers:** IT, PM   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.4 + SEC-09 — verified `POS.API/Program.cs:169-174` — `UseHangfireDashboard()` / `MapHangfireDashboard()` with **no** authorization filter argument
- **Arrange:** anonymous HTTP client against a factory host
- **Act:** GET /hangfire (and GET /hangfire/jobs/running)
- **Assert (Char/IT):** no redirect to login and no 401/403 from app auth — dashboard responses render (from a remote-address client the built-in local-only filter may 401; assert precisely: **no custom `IDashboardAuthorizationFilter` is registered** via reflection on the stored filters collection, and the app-level pipeline adds none) — the SEC-09 "auth unverified" state is pinned as an auditable fact
- **Assert (PM):** /hangfire request from Postman environment `local-cloud` does not return the app's 401 JSON envelope (documents the bypass surface)

### TC-D09.043 — Hangfire dashboard restricted to authorized admins (desired — RED until SEC-09 fix)
- **Layers:** IT   **Category:** Gap-Target [SEC-09]
- **Priority:** P1   **Source:** SEC-09 (doc 11)
- **Arrange:** anonymous client; cashier-JWT client; admin-JWT client
- **Act:** GET /hangfire as each
- **Assert (Target/IT):** anonymous → 401; cashier → 403; admin → 200 dashboard; **RED** until a custom `IDashboardAuthorizationFilter` (role/claim check) is installed

### TC-D09.044 — Dead-code guard: uncalled infrastructure-adjacent methods and commented-out call sites remain inventoried
- **Layers:** UT   **Category:** Gap-Char
- **Priority:** P3   **Source:** WF-9.4 (housekeeping) + ACC-11 (doc 11) — verified `ReverseTransactionAsync`/`ProcessStockAdjustmentAsync` uncalled; commented-out blocks at `StoreController.cs:145` and `JobService.cs:69`
- **Arrange:** compiled solution assemblies loaded via reflection + source scan of the flagged files
- **Act:** run architecture scan asserting invocation-site counts
- **Assert (Char/UT):** `ReverseTransactionAsync` and `ProcessStockAdjustmentAsync` have 0 production call sites; the Hangfire-cleanup registration and storefront `_mediator.Send(command)` are commented out in source; scan output enumerates them (guard for the ACC-11 cleanup phase — removing/wiring must flip this test deliberately, not silently)

---

## WF-9.5 — Import/Export Workflow

### TC-D09.045 — Happy CSV product import creates products with tenant stamping
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.5 steps 1/2/5 — verified `POS.API/Controllers/ImportExportController.cs:36-65` (no ClaimCheck), `ProductImportExportService.cs:47-104,534-574`
- **Arrange:** tenant A; CSV with header + 3 valid rows (Code/Name/Category/Brand/Unit by name, SalesPrice>PurchasePrice); manager JWT (authenticated)
- **Act:** POST api/ImportExport/products/import (multipart file `products.csv`)
- **Assert (IT):** 200 with `{success:true, totalRecords:3, successCount:3, failureCount:0, errors:[]}`; 3 Product rows: `TenantId == tenantA`, `HasVariant == false`, audit fields stamped, Category/Brand/Unit resolved by name to seeded FK ids; second import of same file → 3 errors (duplicate Code, `RowNumber` 2-4)

### TC-D09.046 — Import is all-or-nothing: one bad row aborts the whole file (no partial accept)
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.5 step 2 + UX-04 — verified `ProductImportExportService.cs:81-89` (SaveChangesAsync only when FailureCount == 0)
- **Arrange:** CSV with 2 valid rows + 1 row with `SalesPrice = 0`
- **Act:** POST api/ImportExport/products/import
- **Assert (Char/IT):** response `{success:false, totalRecords:3, successCount:2, failureCount:1, errors:[1 error with FieldName "SalesPrice"]}`; **0** new Product rows persisted (valid rows also discarded — all-or-nothing); `/validate` dry-run of the same file reports identical error and no save

### TC-D09.047 — Row-level accept: valid rows persist, invalid rows rejected with per-row errors (desired — RED)
- **Layers:** IT   **Category:** Gap-Target [UX-04]
- **Priority:** P1   **Source:** UX-04 (doc 11)
- **Arrange:** same file as TC-D09.046
- **Act:** POST api/ImportExport/products/import
- **Assert (Target/IT):** 2 valid products persisted; response `{successCount:2, failureCount:1}` with `errors[0].rowNumber == 4`; ProductStock/audit consistent for accepted rows; **RED** until partial-accept mode lands

### TC-D09.048 — Row validation matrix: required fields, price rules, duplicates, FK-by-name with RowNumber=index+2
- **Layers:** IT, UT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-9.5 step 2 — verified `ProductImportExportService.cs:474-532` (ValidateProductAsync), `63` (rowNumber = index+2)
- **Arrange:** CSV rows each violating exactly one rule: missing Code; missing Name; missing Category; unknown Brand name; unknown Unit name; `SalesPrice <= 0`; `SalesPrice < PurchasePrice`; duplicate Code (pre-seeded P-SIMPLE's code)
- **Act:** POST api/ImportExport/products/validate
- **Assert (IT/UT):** 8 errors returned, each `{rowNumber == physical Excel/CSV row (index+2, header offset), fieldName, errorMessage}` matching the violated rule; no DB mutation (validate endpoint, `106-147`); lenient parsing confirmed: file with extra unlisted column or blank trailing line does not throw (HeaderValidated=null, MissingFieldFound=null)

### TC-D09.049 — Export content correctness: scoped query, SelectedIds filter, dated filename; Postman download
- **Layers:** IT, PM
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.5 step 3 — verified `ProductImportExportService.cs:149-169`, controller `98-119` (File() + dated name)
- **Arrange:** tenant A with 4 products (2 linked to Category/Brand/Unit); tenant B with 1 distinct product; export body `{selectedIds:[id1,id2], format:"csv"}`
- **Assert (IT):** response bytes parse as CSV containing header + exactly 2 rows (SelectedIds filter) with Category/Brand/Unit **names** (includes loaded, `151-156`); `Content-Disposition` filename contains today's date; unfiltered export (no selectedIds) returns tenant A's 4 products only — tenant B's product absent (query-filter isolation)
- **Assert (PM):** GET/POST products/export with token → HTTP 200, `Content-Type` binary/CSV, body length > 0 saved as file (download runner)

### TC-D09.050 — Round trip: export from a seeded tenant imports 1:1 into a fresh tenant
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.5 steps 2/3 (integration round trip)
- **Arrange:** tenant A with 5 valid products → export CSV; fresh tenant C (empty products, same Category/Brand/Unit names seeded)
- **Act:** POST products/import on tenant C with tenant A's export bytes
- **Assert (IT):** `{success:true, successCount:5, failureCount:0}`; tenant C has exactly 5 products with matching names/prices/category/brand/unit names; tenant A product count unchanged; cross-tenant leakage: none of tenant C's rows carry tenant A's ids

### TC-D09.051 — Import/export endpoints have no permission claim: any authenticated user can mutate the catalog
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.5 + security observation — verified `ImportExportController.cs:13-15` (BaseController auth only), endpoints `36-282` with **no** `[ClaimCheck]`
- **Arrange:** cashier JWT (no product-management claims)
- **Act:** POST products/import (valid file) and POST customers/import as cashier
- **Assert (Char/IT):** both return 200 and rows are created — no 403; characterize absence of claim enforcement (parallel to SEC-01's pattern; no dedicated doc-11 gap ID — see discrepancy notes); unknown/absent file → 400 `No file uploaded` (controller guard, lines 39-40)

### TC-D09.052 — Format sniffing: `.csv` parses as CSV, anything else as Excel
- **Layers:** UT, IT   **Category:** Edge
- **Priority:** P2   **Source:** WF-9.5 step 1 — verified `ImportExportController.cs:44-46`
- **Arrange:** identical payload saved as `products.csv` and as `products.xlsx` (Excel-written)
- **Act:** import each
- **Assert (IT/UT):** `.csv` → CsvHelper path (3 rows); `.xlsx` → EPPlus path (3 rows); `products.txt` containing CSV content → treated as Excel and fails parse (error row RowNumber 0 `General` — exception path, `94-100`); customers/suppliers endpoints mirror the same sniffing rule

---

## WF-9.6 — Storefront (Public Website) Workflow

### TC-D09.053 — Public catalog page: tenant-scoped listing, page size 20; tenant-less route exposes all tenants' products
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.6 step 3 — verified `POS.API/Controllers/StoreController.cs:31-60` (`IgnoreTenantFilter` only when no tenant route, 41)
- **Arrange:** tenant A (8 products incl. 1 soft-deleted), tenant B (3 products); Web/Cloud host
- **Act:** GET /store/{tenantA} (anonymous, cookie session); GET /store (no tenant segment)
- **Assert (IT):** tenantA page: 200 HTML rendering 7 products (deleted filtered), `ViewBag.TenantName == tenant A name`, `ViewBag.CartCount == 0`; paging: `?skip=20` on a 25-product seed returns the next 5 (PageSize == 20); `?searchQuery=` filters by name; `/store` page renders "All Products" with **all** tenants' 10 non-deleted products (`IgnoreTenantFilter == true` — cross-tenant public exposure is by design here, pinned)

### TC-D09.054 — StoreTenantAttribute resolves tenant by Name or Subdomain; unknown tenant → 404
- **Layers:** IT
- **Priority:** P1   **Category:** Validation
- **Source:** WF-9.6 step 2 — verified `POS.API/Filters/StoreTenantAttribute.cs:16-48`
- **Arrange:** tenant A `Name="alpha"`, `Subdomain="shop-alpha"`; soft-deleted tenant Z
- **Act:** GET /store/alpha; GET /store/shop-alpha; GET /store/ghost; GET /store/Z (deleted)
- **Assert (IT):** both alpha and shop-alpha URLs: 200 and identical catalog (tenantProvider set to A's id — products scoped to A); `/store/ghost` → 404 body `Store 'ghost' not found.`; deleted tenant Z → 404 (IgnoreQueryFilters lookup still finds the row but... assert actual: row is found despite IsDeleted filter — if the seed marks Z `IsDeleted`, resolution **succeeds** and store renders Z; pin observed outcome) — see note in case: assertion must record whichever of {renders, 404} the current filter produces, since `IgnoreQueryFilters` bypasses the soft-delete filter (characterization detail)

### TC-D09.055 — Cart add/remove round trip persists in session-backed JSON
- **Layers:** IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.6 step 4 — verified `StoreController.cs:69-104,164-175`
- **Arrange:** anonymous session on /store/alpha; product P1 (price 100), P2 (price 50)
- **Act:** POST add-to-cart (P1); POST add-to-cart (P1 again); POST add-to-cart (P2); GET cart; POST remove-from-cart (P1)
- **Assert (IT):** after two P1 adds: session `Cart` JSON contains 1 line `Quantity == 2`; after P2 add: 2 lines; cart page shows badge `CartCount == 3`; after remove: 1 line (P2), badge `CartCount == 1`; session cookie required — request without session loses the cart

### TC-D09.056 — Storefront checkout is a stub: no order is created, cart silently cleared, success page shown
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.6 step 5 + BIZ-05 — verified `StoreController.cs:106-162` (`_mediator.Send` commented at 145; ClearCart + OrderSuccess at 160-161)
- **Arrange:** cart with 2 items; valid antiforgery token; guest form fields CustomerName/Phone/Email/Address
- **Act:** POST checkout
- **Assert (Char/IT):** 200 rendering `OrderSuccess` view; **zero** new SalesOrder/SalesOrderItem/ProductStock/AccountingEntry rows (count diff == 0 — no `AddSalesOrderCommand` was ever sent); session `Cart` key removed (cart emptied); guest data appears nowhere in DB — the intentionally incomplete MVP is pinned (BIZ-05 characterization; N-06)

### TC-D09.057 — Guest checkout creates a real order through a guest pipeline (desired — RED until BIZ-05 fix)
- **Layers:** IT   **Category:** Gap-Target [BIZ-05]
- **Priority:** P1   **Source:** BIZ-05 (doc 11)
- **Arrange:** cart with 2 items; antiforgery token; guest form fields
- **Act:** POST checkout
- **Assert (Target/IT):** a SalesOrder row exists with `IsSalesOrderRequest == true`, `DeliveryStatus == PENDING`, guest contact data persisted (Note or guest-customer fields), items/prices/totals matching cart; stock reserved or explicitly not deducted per the fixed pipeline contract; OrderSuccess view rendered **after** successful creation; failure path (e.g. stock unavailable) → error view, cart retained; **RED** until guest pipeline lands

### TC-D09.058 — Desktop deployment excludes Razor views: storefront cannot render (MVC not registered)
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P2   **Source:** WF-9.6 step 1 — verified `Startup.cs:284-303` (Desktop: `AddControllers()` without views; Web: `AddControllersWithViews()`)
- **Arrange:** factory host with `DeploymentMode == "Desktop"`
- **Act:** GET /store/alpha; GET api/Brands (API sanity)
- **Assert (Char/IT):** storefront route fails to render a catalog page (view engine absent → 500 `ViewNotFoundException`-class failure; note: controllers are still discovered in Desktop mode, so the failure is a rendering error, not the 404 the workflow prose implies — see discrepancy notes); api/Brands returns 200 proving API-only surface; session/cart endpoints behave identically (no view dependency)

---

## WF-9.7 — Caching Workflows (Server + Client)

### TC-D09.059 — CachingBehavior activates only for ICacheableQuery with tenant-scoped keys and BypassCache short-circuit
- **Layers:** UT, IT
- **Priority:** P1   **Category:** Edge
- **Source:** WF-9.7 server step 1 — verified `POS.MediatR/PipeLineBehavior/CachingBehavior.cs:25-59`, registration order `Startup.cs:62-63`
- **Arrange:** GetAllBrandCommand (implements ICacheableQuery, CacheKey `allbrand`); a non-cacheable query (e.g. GetProductById); tenant A and B contexts
- **Act:** send each command; inspect IMemoryCache entries
- **Assert (UT/IT):** cache keys present: `allbrand_{tenantA}` and `allbrand_{tenantB}` are distinct entries (tenant-scoped, line 34-35); unauthenticated context yields `allbrand_Global`; non-cacheable query produces **no** cache entry and always reaches the handler; `BypassCache == true` variant never reads or writes cache; CachingBehavior registered **before** ValidationBehavior (pipeline order assertion, Startup.cs:62-63)

### TC-D09.060 — Cache hit serves stale response within TTL; entry expires with the default 24h AbsoluteExpiration
- **Layers:** UT, IT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.7 server step 1 — verified `CachingBehavior.cs:37-53` (hit 37-41, default 24h at 45)
- **Arrange:** tenant A, 3 brands cached via GetAllBrandCommand; inject fake clock; absolute expiration unset (default)
- **Act:** add brand #4 via API; re-issue GetAllBrandCommand at t+0, t+23h59m, t+24h1m
- **Assert (UT/IT):** at t+0 and t+23h59m the response still lists exactly 3 brands (hit returns cached TResponse; handler not re-executed — observable via query count or missing new brand); at t+24h1m response lists 4 brands (expired → handler re-run); entry options: `AbsoluteExpirationRelativeToNow == TimeSpan.FromHours(24)` when query leaves AbsoluteExpiration null

### TC-D09.061 — Server cache has no write-side invalidation: stale tiles survive until TTL (characterization)
- **Layers:** IT   **Category:** Gap-Char
- **Priority:** P1   **Source:** WF-9.7 server step 2 + REP-04 — verified: no `ICacheableQuery` eviction anywhere in write handlers; `CachingBehavior.cs` is the only cache writer
- **Arrange:** GetAllBrandCommand cached for tenant A (3 brands); admin JWT
- **Act:** POST /api/Brand (brand #4, 200); immediately re-issue GetAllBrandCommand; also query the dashboard command family (WF-7.3 opted-in) after a sale POST
- **Assert (Char/IT):** brand list still returns 3 brands (stale) — no eviction occurred on the write; dashboard tile data equally stale after the sale; repeated writes never refresh the cache before TTL — TTL-only invalidation pinned (REP-04 characterization; asymmetry with client cache noted in WF-9.7)

### TC-D09.062 — Write-side eviction refreshes cached queries immediately (desired — RED until REP-04 fix)
- **Layers:** IT   **Category:** Gap-Target [REP-04]
- **Priority:** P1   **Source:** REP-04 (doc 11)
- **Arrange:** same as TC-D09.061
- **Act:** POST /api/Brand (brand #4); re-issue GetAllBrandCommand immediately
- **Assert (Target/IT):** brand list returns 4 brands (eviction on write or write-through); dashboard tile reflects the sale immediately; **RED** until event-based eviction lands

### TC-D09.063 — Angular write invalidation: any 2xx POST/PUT/DELETE purges lookups + master-data and re-syncs
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.7 client step 1 — verified `SourceCode/Angular/src/app/core/interceptors/cache.interceptor.ts:20-28,63-125`, `cache.config.ts:27-31`
- **Arrange:** Jasmine/Vitest harness with HttpTestingController + fake IndexedDbService seeded with `lookups` entries matching `Brand`, `UnitConversation`, `ProductCategories` and `master_data` keys `ALL_PRODUCTS`, `ALL_SUPPLIERS`, `ALL_CUSTOMERS`
- **Act:** flush POST `/api/Brand` → 200; then POST `/api/product` → 200; then DELETE `/api/customer/1?x=1` → 200; then a non-2xx POST `/api/Brand` → 500
- **Assert (UT):** after Brand POST: `deleteByPattern('lookups','Brand')` called once; product/customer/supplier master keys untouched; after product POST: `lookups` pattern `product` purged AND `master_data` `ALL_PRODUCTS` deleted AND `cacheSyncService.syncMasterData()` invoked; customer DELETE (query string stripped before resource extraction, lines 71-73, 76-89): `ALL_CUSTOMERS` purged + re-sync; the 500 POST triggers **no** invalidation (2xx-gated, line 23)

### TC-D09.064 — Lookup whitelist caching by urlWithParams and master-data search bypassing the network (cap 50, fallback)
- **Layers:** UT
- **Priority:** P1   **Category:** Happy
- **Source:** WF-9.7 client steps 2/3 — verified `cache.interceptor.ts:36-54,127-149,151-227`, whitelist `cache.config.ts:7-26`
- **Arrange:** harness with seeded IndexedDB: empty `lookups` store; `master_data` `ALL_PRODUCTS` holding 120 products (searchable by name/barcode/code/category)
- **Act & Assert (UT):** GET whitelisted `/api/Brand?isDropDown=true` → network called once, response stored under `urlWithParams`; identical second GET → **zero** additional network requests, body served from store (miss→put, hit→of() paths); GET non-whitelisted `/api/SomeThing` → always network; `product/dropdowns?search=pro` with full master list → **zero network**, client-side filter over name/barcode/code/category returns ≤50 items; empty master store → network fallback fires; `SupplierSearch`/`customerSearch` filter by name/mobile respectively with the same 50 cap

### TC-D09.065 — Client TTL config is defined but never enforced (invalidation is write-driven only)
- **Layers:** UT   **Category:** Gap-Char
- **Priority:** P2   **Source:** WF-9.7 client step 4 + N-07 — verified `cache.config.ts:3-6` (lookups 24h, products 1h) and the interceptor's absence of any TTL/expiration read
- **Arrange:** `lookups` entry written 25h ago (fake Date/time injection); `master_data` `ALL_PRODUCTS` written 2h ago
- **Act:** GET the whitelisted brand URL and a `product/dropdowns` search
- **Assert (Char/UT):** both served from cache with **zero** network calls despite exceeding the configured TTLs (24h lookups, 1h products) — no expiry check exists in `handleLookupCache`/`handleProductSearch`; combined with TC-D09.061 this pins the documented asymmetry: server = TTL-only, client = write-driven-only (N-07)

---

## Rules checklist (enforced in review)

- [x] Every WF in the domain has ≥1 Happy case (WF-9.1: TC-D09.001/.003/.010; WF-9.2: .016/.021; WF-9.3: .025-.027; WF-9.4: .034/.035/.038; WF-9.5: .045/.049/.050; WF-9.6: .053/.055; WF-9.7: .060/.063/.064)
- [x] Every write endpoint has: Validation case (TC-D09.048, .054, .052), Permission case (TC-D09.023, .051, .042/.043 — including the three endpoints with **no** ClaimCheck, characterized), Tenant-Isolation case (TC-D09.050, .053, .059)
- [x] Every money/stock mutation has DB-state assertions — N/A in this domain (no journal/stock mutations); storefront checkout asserts the *absence* of order/stock/ledger rows (TC-D09.056/.057)
- [x] Every doc-11 gap touching this domain appears in ≥1 Gap-Char or Gap-Target case: RT-01 (.030/.031), RT-02 (.037), RT-04 (.017/.018/.019/.020/.022), RT-05 (.040/.041), SEC-09 (.042/.043), UX-04 (.046/.047), BIZ-05 (.056/.057), REP-04 (.061/.062), ACC-11 (.044)
- [x] Gap-Char assertions describe CURRENT behavior (code-cited); Gap-Target describes DESIRED behavior and is RED now (.018, .020, .031, .041, .043, .047, .057, .062)
- [x] Concurrency case for sequential-number generation — N/A here (D03/D04); concurrency-adjacent coverage present: dispatcher re-entry gate (TC-D09.038), FBR Submitting-state transitions (TC-D09.015), concurrent repeated submit logging (TC-D09.004)
- [x] Edge/boundary cases: FBR backoff cap & retry limits (TC-D09.007/.008/.009), 24h TTL boundary (TC-D09.060), Take(10)/Take(5) caps (TC-D09.008/.009/.038), 50-item search cap and TTL-defined-but-unenforced (TC-D09.064/.065), format-sniffing fallback (TC-D09.052)

## Discrepancy notes

1. **FBR backoff off-by-one vs code comment:** `FBRSyncBackgroundService.cs:163-168` increments `FBRRetryCount` *before* computing `min(60×2^RetryCount, 3600)`, so the first retry delay is **120s**, not the 60s the code comment ("60, 120, 240, 480, 960") claims; the doc's formula matches the code, the comment doesn't. Tests assert actual sequence 120→240→480→960→1920 (cap 3600 unreachable before manual review at 5).
2. **Desktop storefront returns a rendering error, not 404:** WF-9.6 says MVC is "registered only in Web/Cloud mode", but Desktop's `AddControllers()` (`Startup.cs:284-293`) still discovers `StoreController` — only the Razor view engine is missing, so `GET /store/{tenant}` fails with a view-not-found (500-class) rather than 404. TC-D09.058 pins the observed behavior; recommend doc wording fix ("views excluded" not "storefront excluded").
3. **Missing ClaimCheck on three controllers — no doc-11 gap ID exists:** `ImportExportController` (all endpoints), `FBRController` (`submit`/`status`), and `EmailController.salesOrPurchase` have no `[ClaimCheck]`; also `UserHub` has no `[Authorize]`. Permission cases are written as Gap-Char documenting the absence; recommend adding a security gap entry (SEC-xx) to doc 11 so the corresponding Gap-Target cases can be tracked.
4. **Deleted-tenant storefront resolution is undefined by the doc:** `StoreTenantAttribute.cs:28` uses `IgnoreQueryFilters`, so a soft-deleted tenant still resolves and its store can render. TC-D09.054 records the observed outcome; doc 09 does not address soft-deleted tenants.
5. **Soft additions vs doc 09:** `JobService.ReminderSchedule` has an in-process scheduler-status re-entry gate (`JobService.cs:147-155`) not mentioned in WF-9.4 — covered in TC-D09.038. The RT-03 fan-out window gap (00:10–00:59) is characterized inside TC-D09.033 but its fix is D08/D10 scope.
