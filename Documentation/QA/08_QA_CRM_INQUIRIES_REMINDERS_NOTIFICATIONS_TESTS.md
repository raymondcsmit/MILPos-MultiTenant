# 08 — QA Test Suite: CRM, Inquiries, Reminders & Notifications

**Module:** Customer Relationship Management (CRM), Lead/Inquiry Tracking, Task Reminders & Real-Time Alerts  
**Location:** `Documentation/QA/08_QA_CRM_INQUIRIES_REMINDERS_NOTIFICATIONS_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** BIZ-07, N-29, N-42, RT-01, RT-02, RT-03, UX-05

---

## 1. Module Overview & Quality Objectives
The CRM and Customer Engagement subsystem handles customer profiles, credit limit enforcement, loyalty points, customer inquiry pipelines (leads, status progression, conversion to quotation), scheduled reminders (recurring follow-ups, payment alerts), and real-time push notifications via SignalR.

### Primary Risks & Failure Modes:
- **Unguarded Unique Mobile Index Crash (N-29):** Creating a customer with a duplicate `MobileNo` within the same tenant triggers an unhandled database unique constraint failure (`UNIQUE constraint failed: Customers.TenantId, Customers.MobileNo`) resulting in a raw `500 Internal Server Error` with zero 409/422 validation net.
- **Credit Limit Enforcement Bypass (BIZ-07):** POS checkout allowing orders to proceed on credit even when the customer's outstanding balance exceeds their approved credit limit.
- **Reminder Scheduler Batch Cap & Day-Clamping Bug (RT-02):** The Hangfire reminder processor restricts processing to only 10 rows per 10-minute tick, creating alert backlogs, and contains a date-clamping calculation bug on month-end days (29th, 30th, 31st).
- **Public ContactUs Endpoint Vulnerability (N-42):** `ContactUsController` is completely open without authorization across create, list, and delete actions, exposing tenant communication to public abuse.
- **SignalR In-Memory Connection Loss (RT-01):** SignalR connection mappings are stored in-memory, causing all real-time notifications to be lost upon any backend worker restart.

---

## 2. Test Cases with Concrete Execution Data

### QA-CRM-001 — Duplicate Customer Mobile Unguarded Crash (N-29 Finding)
- **Aspect / Sub-Module:** Customer Master Data Validation
- **Test Type:** Negative / Unhandled Exception Probe (N-29)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/Customer/Handlers/AddCustomerCommandHandler.cs`
- **Preconditions:**
  - Customer `CUST-001` (`Tariq Commercial Mart`) exists with `mobileNo = "03001234567"`.
- **Concrete Test Data:**
  - Attempting to register a new customer with the same mobile number.
  - **Endpoint:** `POST /api/Customer`
  - **Headers:** `Authorization: Bearer {{token_admin_alpha}}`
  - **Request Payload:**
    ```json
    {
      "customerName": "Tariq Traders Branch 2",
      "contactPerson": "Tariq Mehmood",
      "email": "branch2@tariq.com",
      "mobileNo": "03001234567",
      "phone": "051-4455667",
      "address": "Shop 4, Commercial Market",
      "city": "Rawalpindi",
      "country": "Pakistan",
      "isWalkIn": false
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Dispatch the customer creation request with duplicate mobile.
  2. Inspect response HTTP status code and error details.
- **Expected Results (Hardened Target):**
  - **HTTP Status Code:** `422 Unprocessable Entity` (or `409 Conflict`).
  - **Error Message:** `"Mobile number '03001234567' is already registered to another customer."`
- **Defect Verification (N-29 Unhandled 500 Crash):**
  - In unfixed code, `AddCustomerCommandHandler` only checks `CustomerName` for duplicates, completely skipping `MobileNo`.
  - The insert hits the database unique index `IX_Customers_TenantId_MobileNo`, throwing `DbUpdateException` and returning `HTTP 500 Internal Server Error`.
- **QA Pass/Fail Checklist:**
  - [ ] Duplicate mobile returns clean 422/409 validation.
  - [ ] Flag critical bug N-29 if server crashes with 500.

---

### QA-CRM-002 — Customer Credit Limit Validation at POS (BIZ-07 Finding)
- **Aspect / Sub-Module:** Credit Control & Risk Management
- **Test Type:** Business Rule & Boundary Validation (BIZ-07)
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.MediatR/SalesOrder/Add/AddSalesOrderCommandHandler.cs`
- **Preconditions:**
  - Customer `Fatima Bakers & Cafe` (`CUST-002`) has `CreditLimit = 25,000.00`.
  - Current Outstanding Balance in Customer Ledger = 23,000.00.
  - Remaining Available Credit = 2,000.00.
- **Concrete Test Data:**
  - Attempting to place an unpaid credit sales order of `5,000.00` (exceeds remaining credit by 3,000.00).
  - **Endpoint:** `POST /api/SalesOrder`
  - **Payload:**
    ```json
    {
      "orderNumber": "SO-CREDIT-EXCEED",
      "customerId": "CUST-002-GUID",
      "totalAmount": 5000.00,
      "totalPaidAmount": 0.00,
      "paymentStatus": 0
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit credit sale order exceeding credit limit.
  2. Inspect response status code and alert message.
- **Expected Results (Credit Control Target):**
  - Order rejected with `422 Unprocessable Entity` or flagged with warning: `"Customer credit limit exceeded. Outstanding: 23,000.00, Requested: 5,000.00, Limit: 25,000.00."`
- **Defect Verification (BIZ-07 Gap):**
  - If server allows order creation with zero payment without checking balance, document BIZ-07 credit risk gap.
- **QA Pass/Fail Checklist:**
  - [ ] System identifies customer balance exceeding credit limit.
  - [ ] Prevents unauthorized credit extension.

---

### QA-CRM-003 — Inquiry Lifecycle Progression & Quotation Conversion
- **Aspect / Sub-Module:** Inquiry Pipeline Management
- **Test Type:** Functional Happy Path
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.API/Controllers/Inquiry/InquiryController.cs`
- **Preconditions:** Authenticated as `admin_alpha`.
- **Concrete Test Data:**
  - Lead from institutional customer requesting bulk pricing for 500 units of `PROD-001`.
  - **Endpoint:** `POST /api/Inquiry`
  - **Request Payload:**
    ```json
    {
      "title": "Bulk Rice Supply for Army Public School",
      "companyName": "APS Peshawar Road",
      "contactPerson": "Maj. Tariq",
      "email": "purchase@aps.edu.pk",
      "phone": "03331122334",
      "inquirySourceId": "SRC-DIRECT-CALL-GUID",
      "inquiryStatusId": "STATUS-NEW-LEAD-GUID",
      "remarks": "Requires quote for 500 packs of 1kg Basmati Rice by Friday."
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Create inquiry record.
  2. Update inquiry status to "Quoted" and add a follow-up note.
  3. Trigger conversion to Sales Order Quotation (SOR).
- **Expected Results:**
  - Inquiry created successfully with ID e.g. `INQ-2026-0001`.
  - Activity log records status transitions.
  - Quotation generated referencing the source inquiry ID.
- **QA Pass/Fail Checklist:**
  - [ ] Inquiry pipeline transitions operate smoothly.
  - [ ] Conversion preserves customer details and item requirements.

---

### QA-CRM-004 — Hangfire Reminder Scheduler & Day-Clamping Bug (RT-02 Finding)
- **Aspect / Sub-Module:** Background Task Reminders & Notifications
- **Test Type:** Scheduler Boundary & Logic Defect (RT-02)
- **Priority & Severity:** P2 (Medium)
- **Source & References:** `POS.Domain/Services/ReminderSchedulerService.cs`
- **Preconditions:**
  - Recurring monthly reminder created on January 31st.
  - Month transitions to February (28/29 days).
- **Concrete Test Data:**
  - Reminder: "Monthly Rent Payment Due on 31st of every month".
  - Trigger simulated in Hangfire dashboard.
- **Step-by-Step Execution Procedure:**
  1. Inspect reminder execution on month-end dates.
  2. Verify if reminder fires on February 28th/29th.
  3. Verify batch processing limit when more than 10 reminders are queued.
- **Expected Results:**
  - Reminder adjusts to last day of month (Feb 28).
  - All queued reminders processed without 10-row backlog bottleneck.
- **Defect Verification (RT-02):**
  - In unfixed code, scheduler skips reminders on shorter months and processes only 10 rows per 10 minutes.
- **QA Pass/Fail Checklist:**
  - [ ] Month-end recurring reminders fire predictably.
  - [ ] Batch processing clears queued reminders without backlog.

---

### QA-CRM-005 — ContactUs Public Vulnerability & Authorization Audit (N-42)
- **Aspect / Sub-Module:** Public Communication & Security
- **Test Type:** Security / Access Control Audit (N-42)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.API/Controllers/ContactUs/ContactUsController.cs`
- **Preconditions:** Unauthenticated client.
- **Concrete Test Data:**
  - **Probe 1 (List Messages):** `GET /api/ContactUs`
  - **Probe 2 (Delete Message):** `DELETE /api/ContactUs/MSG-001-GUID`
- **Step-by-Step Execution Procedure:**
  1. Call `GET /api/ContactUs` without authorization token.
  2. Call `DELETE /api/ContactUs/MSG-001-GUID` without authorization token.
- **Expected Results (Secure Target):**
  - Both endpoints return `401 Unauthorized`.
- **Defect Verification (N-42 Bug):**
  - In unfixed code, anyone on the internet can view all incoming contact messages and delete them without any authentication.
- **QA Pass/Fail Checklist:**
  - [ ] Sensitive customer contact messages are protected by authorization.
  - [ ] Flag N-42 if anonymous reading or deletion succeeds.
