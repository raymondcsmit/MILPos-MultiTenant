# 06 — QA Test Suite: Double-Entry Accounting & Financial Ledger

**Module:** General Ledger, Chart of Accounts, Journal Entries, Customer/Supplier Sub-Ledgers, Year-End Closing & Payroll  
**Location:** `Documentation/QA/06_QA_DOUBLE_ENTRY_ACCOUNTING_FINANCIALS_TESTS.md`  
**Prerequisites:** Master Golden Data from `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Targeted Findings:** ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-09, ACC-10, INT-01, INT-02, N-07, N-37, N-39

---

## 1. Module Overview & Quality Objectives
The Double-Entry Accounting subsystem is the financial backbone of MILPOS. It maintains balance sheet integrity, chart of accounts hierarchies, automated transaction journals (sales, purchases, returns, expenses, payroll), direct general journal entries, customer/supplier sub-ledger reconciliations, and fiscal year-end book closing.

### Primary Risks & Failure Modes:
- **Loan Interest Entry Severe Bug (ACC-01):** Loan repayment handler books `LoanDetail.LoanAmount` (e.g. 500,000) instead of `InterestAmount` (e.g. 5,000) to the interest expense account, massively distorting the P&L statement.
- **Customer Ledger Date Sorting 500 Crash (N-37):** Calling `GET /api/CustomerLedger` crashes with an unhandled 500 error (`"Key mapping for accountDate is missing"`) because `PropertyMappingService` lacks the mapping.
- **Customer Ledger Authorization & Negative Amount Gaps (N-07):** Customer ledger DELETE and overdue endpoints have missing claim checks, and the system accepts negative payment amounts.
- **Opening Balance "5555" Account Crash:** `AddOpeningBalanceCommandHandler` crashes with unhandled 500 error if equity account `5555` ("Opening Balance Adjustment") is missing from the database.
- **Direct General Entry Data Model Oddity (N-39):** Handler writes `ReferenceNumber` into the `TransactionNumber` column while leaving `ReferenceNumber` null, and persists a single `AccountingEntry` row with dual debit/credit account IDs instead of paired rows.
- **Year-End Closing Branch-Filtering Leak (ACC-10):** Year-end closing loop fails to filter income/expense totals per branch, duplicating balances.

---

## 2. Test Cases with Concrete Execution Data

### QA-ACC-001 — Opening Balance Posting & Account "5555" Requirement
- **Aspect / Sub-Module:** Opening Balance Setup
- **Test Type:** Functional & Dependency Verification
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/OpeningBalance/Handlers/AddOpeningBalanceCommandHandler.cs`
- **Preconditions:**
  - Account `5555` ("Opening Balance Adjustment", Equity) exists in Chart of Accounts.
  - Bank Account `1060` has zero balance.
- **Concrete Test Data:**
  - Inject opening balance of 250,000.00 into Bank Account `1060`.
  - **Endpoint:** `POST /api/OpeningBalance`
  - **Headers:** `Authorization: Bearer {{token_accountant_alpha}}`
  - **Request Payload:**
    ```json
    {
      "ledgerAccountId": "ACCOUNT-1060-GUID",
      "accountCode": "1060",
      "amount": 250000.00,
      "date": "2026-01-01T00:00:00Z",
      "financialYearId": "FY-2026-GUID"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit the opening balance request.
  2. Inspect HTTP status code and response body.
  3. Query `AccountingEntries` and `Transactions` tables.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`.
  - **Double-Entry Journal Assertions:**
    - `Dr 1060 (Bank Current Account)`: 250,000.00
    - `Cr 5555 (Opening Balance Adjustment)`: 250,000.00
  - **Defect Verification:** If account `5555` is deleted from COA, handler must return clean validation failure rather than crashing with unhandled 500 NRE (`"error while saving Opning balance"`).
- **QA Pass/Fail Checklist:**
  - [ ] Opening balance posts successfully with 200 OK.
  - [ ] Debits equal credits between asset account and 5555 equity account.

---

### QA-ACC-002 — Direct General Journal Entry Creation (N-39 Finding)
- **Aspect / Sub-Module:** Manual General Journal Voucher
- **Test Type:** Financial Integrity & Data Quality (N-39)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/GeneralEntry/Handlers/AddGeneralEntryCommandHandler.cs`
- **Preconditions:**
  - Office Utility Expense Account `5300` and Bank Account `1060` exist.
- **Concrete Test Data:**
  - Record electricity bill payment: 18,500.00.
  - **Endpoint:** `POST /api/GeneralEntry`
  - **Headers:** `Authorization: Bearer {{token_accountant_alpha}}`
  - **Request Payload:**
    ```json
    {
      "debitLedgerAccountId": "ACCOUNT-5300-GUID",
      "creditLedgerAccountId": "ACCOUNT-1060-GUID",
      "amount": 18500.00,
      "referenceNumber": "BILL-IESCO-AUG2026",
      "entryDate": "2026-09-06T14:30:00Z",
      "remarks": "August 2026 Head Office electricity bill paid via online banking"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Submit general entry request.
  2. Query `Transactions` table and `AccountingEntries` table.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`.
  - **Data Structure Verification (N-39):**
    - Exactly **ONE row** created in `AccountingEntries` containing:
      - `DebitLedgerAccountId = ACCOUNT-5300-GUID`
      - `CreditLedgerAccountId = ACCOUNT-1060-GUID`
      - `Amount = 18500.00`
    - `Transactions` table row has `TransactionNumber = "BILL-IESCO-AUG2026"` (N-39 note: reference number is placed into `TransactionNumber` column).
- **QA Pass/Fail Checklist:**
  - [ ] Entry posts with balanced debit and credit accounts.
  - [ ] Single row dual-account structure verified.

---

### QA-ACC-003 — Loan Interest Entry Calculation Defect Verification (ACC-01)
- **Aspect / Sub-Module:** Loan Management & Repayment Schedule
- **Test Type:** Calculation Bug & Financial Audit (ACC-01)
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/Loan/Handlers/AddLoanPaymentCommandHandler.cs`
- **Preconditions:**
  - Commercial Bank Loan setup: Principal = 500,000.00.
  - Current Installment Due: Principal Component = 25,000.00, Interest Component = 4,500.00. Total Paid = 29,500.00.
  - GL Accounts: Loan Liability `2200`, Loan Interest Expense `5600`, Bank `1060`.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/Loan/payment`
  - **Request Payload:**
    ```json
    {
      "loanId": "LOAN-COMMERCIAL-GUID",
      "paymentDate": "2026-09-06T15:00:00Z",
      "principalAmount": 25000.00,
      "interestAmount": 4500.00,
      "totalAmount": 29500.00,
      "paymentAccount": "1060"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Post the loan repayment.
  2. Query `AccountingEntries` table for the interest expense entry.
- **Expected Results (Correct Accounting Target):**
  - `Dr 2200 (Loan Liability)`: 25,000.00
  - `Dr 5600 (Interest Expense)`: 4,500.00
  - `Cr 1060 (Bank Current Account)`: 29,500.00
- **Defect Verification (Severe Bug ACC-01):**
  - In unfixed code, the handler books `LoanDetail.LoanAmount` (500,000.00) instead of `InterestAmount` (4,500.00) to account `5600`!
  - P&L is instantly ruined by an erroneous 500,000 expense entry.
  - QA verifies whether interest amount is 4,500 or 500,000.
- **QA Pass/Fail Checklist:**
  - [ ] Verify interest entry amount is strictly 4,500.00.
  - [ ] Flag critical bug ACC-01 if principal loan amount is booked as interest.

---

### QA-ACC-004 — Customer Ledger Sort Mapping Crash (N-37 Fix Verification)
- **Aspect / Sub-Module:** Customer Sub-Ledger API
- **Test Type:** Exception & Property Mapping (N-37)
- **Priority & Severity:** P1 (High)
- **Source & References:** `POS.API/Controllers/CustomerLedger/CustomerLedgerController.cs`, `PropertyMappingService.cs`
- **Preconditions:**
  - Customer `CUST-001` (`Tariq Commercial Mart`) has sales transactions.
- **Concrete Test Data:**
  - **Endpoint:** `GET /api/CustomerLedger?customerId=CUST-001-GUID&orderBy=accountDate`
  - **Headers:** `Authorization: Bearer {{token_accountant_alpha}}`
- **Step-by-Step Execution Procedure:**
  1. Call `GET /api/CustomerLedger` with default sort `orderBy=accountDate`.
  2. Inspect response status code and headers.
- **Expected Results:**
  - **HTTP Status Code:** `200 OK`.
  - Response contains JSON array of ledger rows sorted by date.
  - Header `X-Pagination` present.
  - Defect Check (N-37): Must NOT throw `500 Internal Server Error (Key mapping for accountDate is missing)`.
- **QA Pass/Fail Checklist:**
  - [ ] Customer ledger returns HTTP 200.
  - [ ] Sorting by accountDate succeeds cleanly.

---

### QA-ACC-005 — Customer Ledger Security & Negative Amount Rejection (N-07)
- **Aspect / Sub-Module:** Customer Sub-Ledger Security & Data Validation
- **Test Type:** Negative & Security Probe (N-07)
- **Priority & Severity:** P1 (High)
- **Source & References:** `CustomerLedgerController.cs`
- **Preconditions:**
  - Authenticated as `unauthorized_user` (No accounting claims).
- **Concrete Test Data:**
  - **Probe 1 (Unclaimed Delete Attempt):** `DELETE /api/CustomerLedger/LEDGER-ROW-GUID`
  - **Probe 2 (Negative Payment Entry):**
    - `POST /api/CustomerLedger`
    - Payload: `{ "customerId": "CUST-001-GUID", "amount": -5000.00 }`
- **Step-by-Step Execution Procedure:**
  1. Dispatch Probe 1 using unprivileged token.
  2. Dispatch Probe 2 attempting to submit a negative ledger amount.
- **Expected Results:**
  - **Probe 1:** HTTP `403 Forbidden` (Must NOT allow unclaimed delete).
  - **Probe 2:** HTTP `422 Unprocessable Entity` (`"Amount must be greater than zero."`).
- **QA Pass/Fail Checklist:**
  - [ ] Ledger DELETE route enforces claim protection.
  - [ ] Negative amounts strictly rejected.

---

### QA-ACC-006 — Fiscal Year-End Closing & Retained Earnings Transfer (ACC-10)
- **Aspect / Sub-Module:** Fiscal Year Closing & P&L Transfer
- **Test Type:** Financial Closing Lifecycle
- **Priority & Severity:** P0 (Blocker)
- **Source & References:** `POS.MediatR/BookClose/Handlers/AddBookCloseCommandHandler.cs`
- **Preconditions:**
  - Financial Year `FY-2025` closed. Total Revenue = 1,500,000.00; Total Expenses = 900,000.00; Net Profit = 600,000.00.
  - Equity Retained Earnings Account: `3000`.
- **Concrete Test Data:**
  - **Endpoint:** `POST /api/BookClose`
  - **Payload:**
    ```json
    {
      "financialYearId": "FY-2025-GUID",
      "closingDate": "2025-12-31T23:59:59Z",
      "retainedEarningsAccountId": "ACCOUNT-3000-GUID",
      "notes": "Annual fiscal closing FY-2025"
    }
    ```
- **Step-by-Step Execution Procedure:**
  1. Execute year-end closing command.
  2. Query `AccountingEntries` and verify closing voucher.
  3. Verify whether branch loop properly filters income/expenses per location (ACC-10).
- **Expected Results:**
  - HTTP `200 OK`.
  - Closing voucher zero-balances temporary income/expense accounts and credits 600,000.00 to Retained Earnings `3000`.
  - Financial Year `FY-2025` marked `isClosed = true`.
- **QA Pass/Fail Checklist:**
  - [ ] Book closing executes successfully.
  - [ ] Retained earnings calculated and posted accurately.
