# 09 — QA Test Suite: Integrations, FBR Tax, Email, Jobs & Import/Export

**Module:** FBR Fiscalization (Pakistan Tax), SMTP Email Dispatch, Background Jobs (Hangfire), Profiler & CSV Import/Export  
**Location:** `Documentation/QA/09_QA_INTEGRATIONS_FBR_EMAIL_JOBS_IMPORTEXPORT_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** N-02, N-15, N-17, N-18, N-34, N-40, RT-04, RT-05

---

## 1. Module Overview & Quality Objectives
The Integrations subsystem connects MILPOS to statutory external authorities (Pakistan Federal Board of Revenue POS digital fiscalization), transactional email gateways (SMTP), background task queues (Hangfire), SQLite query performance profilers, and bulk data import/export engines.

### Primary Risks & Failure Modes:
- **Completely Unauthenticated Import/Export (N-40):** All 10 endpoints in `ImportExportController` lack `[Authorize]` attributes, allowing unauthenticated public downloads of customer, supplier, and inventory databases.
- **Unclaimed FBR Controller Endpoints (N-34):** `POST /api/fbr/submit/{id}` and `GET /api/fbr/status/{id}` have no `[ClaimCheck]`, allowing any low-privilege user to trigger tax authority submissions.
- **CSV Spaced Header Mapping Discrepancy:** Bulk product import templates require exact spaced CsvHelper header names (`SKU Code`, `Purchase Price`, `Sales Price`, `Tax Amount`, `Alert Quantity`); DTO property names fail with validation errors.
- **Profiler Main-Database Contention (N-17):** Background `ApiAndQueriesProfiler` writing query trace logs back into the operational SQLite database, triggering lock storms and HTTP timeouts.
- **Email Service Default SMTP Selection Bug (RT-04):** Transactional email dispatcher picking the first SMTP configuration rather than honoring the `IsDefault = true` record.

---

## 2. Test Cases with Concrete Execution Data

### QA-INT-001 — Unauthenticated CSV Export Security Probe (N-40 Finding)
- **Aspect / Sub-Module:** Bulk Data Export Security Audit
- **Test Type:** Security / Vulnerability Audit (N-40)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/ImportExportController.cs`
- **Preconditions:**
  - Database contains products, customers, and suppliers with phone numbers and balances.
  - Client makes unauthenticated requests (zero tokens, anonymous browser session).
- **Concrete Test Data:**
  - **Probe 1 (Product Catalog Export):** `GET /api/ImportExport/export-products`
  - **Probe 2 (Customer Database Export):** `GET /api/ImportExport/export-customers`
  - **Probe 3 (Supplier Database Export):** `GET /api/ImportExport/export-suppliers`
- **Step-by-Step Execution Procedure:**
  1. Dispatch GET requests to each of the 3 export endpoints without any `Authorization` header.
  2. Inspect the HTTP status code, Content-Type, and raw response bytes.
- **Expected Results (Secure Target):**
  - All 3 endpoints strictly return `401 Unauthorized`.
- **Defect Verification (N-40 Bug):**
  - In unfixed code, `ImportExportController` lacks `[Authorize]`.
  - The server returns HTTP 200 with raw CSV files exposing all customer phone numbers, addresses, and product cost prices to the public internet.
- **QA Pass/Fail Checklist:**
  - [ ] Anonymous exports are blocked with 401 Unauthorized.
  - [ ] Flag critical security defect N-40 if CSV files download anonymously.

---

### QA-INT-002 — Product Bulk Import with Exact Spaced CSV Headers
- **Aspect / Sub-Module:** CSV Bulk Data Import Engine
- **Test Type:** Functional Happy Path & Data Mapping
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.API/Controllers/ImportExportController.cs`
- **Preconditions:**
  - Authenticated as `admin_alpha`.
  - Categories and Units pre-seeded.
- **Concrete Test Data:**
  - CSV File: `products_import_valid.csv`
  - Exact Spaced Headers Required:
    ```csv
    Product Name,Product Code,Barcode,SKU Code,Purchase Price,Sales Price,Tax Amount,Alert Quantity,Category Name,Unit Name
    Highland Spring Water 500ml,WATER-500,8909001001,SKU-WATER-500,25.00,50.00,8.50,20,Beverages,Piece
    Crunchy Granola Bar 40g,BAR-040,8909001002,SKU-BAR-040,40.00,80.00,13.60,30,Snacks,Piece
    ```
  - **Endpoint:** `POST /api/ImportExport/import-products`
  - **Content-Type:** `multipart/form-data`
- **Step-by-Step Execution Procedure:**
  1. Upload `products_import_valid.csv` via multipart form.
  2. Inspect response payload for imported count and error arrays.
  3. Query `Products` and `ProductStocks` tables.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`.
  - Response: `{"success": true, "importedCount": 2, "errors": []}`.
  - Both products inserted into DB with correct purchase/sales prices and stock rows initialized.
- **QA Pass/Fail Checklist:**
  - [ ] Spaced CSV headers map cleanly to entity properties.
  - [ ] Records persist without data truncation or parsing errors.

---

### QA-INT-003 — FBR Fiscal Invoice Submission & QR Code Generation (Location L-FBR)
- **Aspect / Sub-Module:** Tax Authority Fiscalization (Pakistan FBR POS Integration)
- **Test Type:** Compliance & Functional Happy Path
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/FBR/FBRController.cs`, `FBRInvoiceService.cs`
- **Preconditions:**
  - Location `L-FBR` (`Mall of Lahore`) is configured with `IsFBREnabled = true`, `POS_ID = 101928`.
  - Completed POS cash sale of 1,000.00 + 170.00 GST = 1,170.00 total (`SO-FBR-001`).
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/fbr/submit/SO-FBR-001-GUID`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Trigger FBR invoice submission for `SO-FBR-001`.
  2. Inspect response payload for FBR Fiscal Number (`USIN`) and Invoice Number.
  3. Query `SalesOrders` table to verify `FBRInvoiceNumber` and `QRCode` string.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`.
  - **Response Structure:**
    ```json
    {
      "status": "Success",
      "invoiceNumber": "101928-20260906-0001",
      "fbrInvoiceNumber": "FBR-USIN-998877112233",
      "qrCode": "https://fbr.gov.pk/verify?inv=101928-20260906-0001&code=...",
      "responseCode": "100"
    }
    ```
  - POS thermal receipt renders the cryptographic QR Code for customer tax validation.
- **QA Pass/Fail Checklist:**
  - [ ] FBR submission returns success code 100.
  - [ ] FBR Invoice Number and QR Code string saved to database.

---

### QA-INT-004 — FBR Controller Missing ClaimCheck Audit (N-34 Finding)
- **Aspect / Sub-Module:** Statutory Tax API Security
- **Test Type:** Security / Access Control Audit (N-34)
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.API/Controllers/FBR/FBRController.cs`
- **Preconditions:**
  - User `auditor_readonly` authenticated with read-only claims (zero tax submission claims).
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/fbr/submit/SO-FBR-001-GUID`
  - **Headers:** `Authorization: Bearer {{token_auditor_readonly}}`
- **Step-by-Step Execution Procedure:**
  1. Dispatch FBR submission request using read-only auditor token.
  2. Inspect response HTTP status code.
- **Expected Results (Hardened Target):**
  - **HTTP Status Code:** `403 Forbidden` (`ClaimCheck` requires `SETT_MANAGE_FBR`).
- **Defect Verification (N-34 Bug):**
  - In unfixed code, `FBRController` lacks `[ClaimCheck]`. Any authenticated user can force submissions or query status.
- **QA Pass/Fail Checklist:**
  - [ ] Unprivileged users are blocked with 403 Forbidden.
  - [ ] Log defect N-34 if read-only user triggers live submission.

---

### QA-INT-005 — SMTP Default Account Selection Verification (RT-04 Finding)
- **Aspect / Sub-Module:** Transactional Email Gateway
- **Test Type:** Configuration & Logic Defect (RT-04)
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.Repository/Email/EmailSMTPSettingRepository.cs`
- **Preconditions:**
  - Two SMTP settings exist in database:
    - Setting 1 (Primary Corporate): `smtp.alpha.com`, Port 587, `IsDefault = false`.
    - Setting 2 (Transaction Service): `smtp.sendgrid.net`, Port 587, `IsDefault = true`.
- **Concrete Test Data:**
  - Dispatch a sales invoice email via `POST /api/Email/salesOrPurchase`.
- **Step-by-Step Execution Procedure:**
  1. Trigger email dispatch.
  2. Inspect mock SMTP log or outbound network traces to verify which server received the email.
- **Expected Results:**
  - Outbound email routes through Setting 2 (`smtp.sendgrid.net`) because `IsDefault = true`.
- **Defect Verification (RT-04 Bug):**
  - In unfixed code, repository queries `All.FirstOrDefault()` without ordering by `IsDefault`, improperly routing emails through non-default SMTP servers.
- **QA Pass/Fail Checklist:**
  - [ ] Outbound emails strictly honor the `IsDefault = true` configuration.

---

### QA-INT-006 — Profiler Main-Database Lock Storm Prevention (N-17 Finding)
- **Aspect / Sub-Module:** Performance Profiler & Database Concurrency
- **Test Type:** Performance & Stress Test (N-17)
- **Priority & Severity:** P1 (High)
- **Source & References:** `ApiAndQueriesProfiler/BackgroundServices/ProfilerDrainWriter.cs`
- **Preconditions:**
  - Embedded SQLite database running in desktop or test mode.
  - High concurrency stress load: 50 simultaneous read requests.
- **Concrete Test Data:**
  - Execute rapid bursts of `GET /api/Product` requests.
- **Step-by-Step Execution Procedure:**
  1. Fire 50 concurrent requests.
  2. Measure response times and observe SQLite file lock contention.
  3. Verify that test harness or production config disables profiler writes to the primary database file.
- **Expected Results:**
  - API responds within < 500ms for all 50 requests.
  - Zero `SQLite Error 5: 'database is locked'` exceptions.
- **QA Pass/Fail Checklist:**
  - [ ] No database lock storms occur under concurrent read traffic.
  - [ ] Profiler drain does not degrade primary transaction performance.
