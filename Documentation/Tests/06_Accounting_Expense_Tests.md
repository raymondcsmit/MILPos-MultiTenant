# Accounting & Expense Management - Comprehensive Test Suite

## 1. Test Objectives & Scope
**Module**: Accounting_Expense
**Description**: Handles double-entry ledgers, manual expenses, financial years, and chart of accounts.
**Objective**: Ensure complete end-to-end reliability, data integrity, and UI/UX correctness for all features within this module.

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data**: Standard expense with receipt, balanced journal entry.
* **Purpose**: Verify standard "happy path" workflows.

### 2.2 Boundary Conditions
* **Data**: Expense of $0.01.
* **Purpose**: Verify system stability at the absolute limits of acceptable input.

### 2.3 Error Scenarios & Edge Cases
* **Data**: Unbalanced journal entry, closing an already closed financial year. | Logging an expense on the exact millisecond a financial year is being closed.
* **Purpose**: Ensure the system gracefully handles invalid states, rejects bad data with standard `ApiResponse`, and maintains ACID properties.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| ACC-UT-01 | Validate Double-Entry balance | Create a manual journal entry with Debit $100 and Credit $90 | Validation fails: Debits must equal Credits | [ ] | [ ] |
| ACC-UT-02 | Validate Expense category mapping | Create expense for 'Office Supplies' | Correct Ledger Account ID is assigned | [ ] | [ ] |

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| ACC-IT-01 | Verify Financial Year closure | Dispatch CloseFinancialYearCommand | All nominal accounts zeroed out, Retained Earnings updated, new Year created | [ ] | [ ] |
| ACC-IT-02 | Verify Expense transaction flow | Add $50 Expense via API | Expense table updated, Transaction table updated, 2 AccountingEntries created | [ ] | [ ] |

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| ACC-BB-01 | Log a new Expense | Go to Expenses -> Add, select category, enter amount, attach receipt, submit | Expense listed, Cash account balance reduced on Dashboard | [ ] | [ ] |
| ACC-BB-02 | View Trial Balance | Navigate to Reports -> Trial Balance | Total Debits perfectly match Total Credits | [ ] | [ ] |

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| ACC-WB-01 | Validate AccountingService.ProcessTransactionAsync | Trace the generation of ledger entries for a complex Sale with Tax | Accounts Receivable (Dr), Sales Revenue (Cr), Tax Payable (Cr) are correctly instantiated | [ ] | [ ] |
| ACC-WB-02 | Validate Rollback on Ledger Failure | Force a DB error during the 2nd ledger entry insertion | The entire Expense and 1st ledger entry are rolled back | [ ] | [ ] |
