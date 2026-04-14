# Accounting & Expense Management - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles double-entry ledgers, manual expenses, financial years, and chart of accounts.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

### Test Case: ACC-BB-01 - Log a new Expense
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
Any money leaving the business that isn't for buying inventory is an Expense. Common examples are 'Electricity Bill' or 'Office Supplies'.

#### 🛠 Preconditions
- Logged in as Admin.
- An Expense Category named 'Utilities' exists.

#### 📦 Test Data (Concrete Input Values)
- **Category:** `Utilities`
- **Amount:** `$150.00`
- **Notes:** `Electricity Bill for June`

#### 🚀 Step-by-Step Execution
1. Navigate to 'Expenses -> Add Expense'.
2. Select `Utilities` from the category dropdown.
3. Enter `$150.00` in the Amount field.
4. Enter `Electricity Bill for June` in the Reference/Notes.
5. Click 'Save'.

#### ✅ Expected Results
- Success toast notification appears.
- Redirects back to the Expense List where the new entry is visible.

#### 🔍 Post-Execution Verification Criteria
- Verify on the Dashboard that 'Cash in Hand' has decreased by $150.00.

### Test Case: ACC-BB-02 - View Trial Balance
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
A Trial Balance is an accounting report proving that Total Debits exactly equal Total Credits. If they don't, the accounting logic is broken.

#### 🛠 Preconditions
- At least 5 varied transactions (Sales, Purchases, Expenses) exist.

#### 📦 Test Data (Concrete Input Values)
- **Date Range:** `This Month`

#### 🚀 Step-by-Step Execution
1. Navigate to 'Reports -> Accounting -> Trial Balance'.
2. Select `This Month` from the date picker.
3. Click 'Generate'.

#### ✅ Expected Results
- A table appears listing all Ledger Accounts (Cash, Sales Revenue, Utility Expense, etc.).

#### 🔍 Post-Execution Verification Criteria
- Verify the 'Total Debits' column exactly equals the 'Total Credits' column at the bottom of the table.

### Test Case: ACC-IT-01 - Verify Financial Year closure
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
Closing a financial year wipes clean temporary accounts (like Revenue and Expenses) and moves the net profit into a permanent 'Retained Earnings' account.

#### 🛠 Preconditions
- Database has an active Financial Year ending on Dec 31st with a net profit of $5,000.

#### 📦 Test Data (Concrete Input Values)
- **Command:** `CloseFinancialYearCommand`

#### 🚀 Step-by-Step Execution
1. Run integration test `Verify_YearClosure_TransfersProfit`.
2. The test dispatches the command via the API.

#### ✅ Expected Results
- 200 OK. The old year is marked 'Closed'. A new active year is created starting Jan 1st.

#### 🔍 Post-Execution Verification Criteria
- Assert that Revenue and Expense ledger balances are strictly $0.00 for the new year.
- Assert that Retained Earnings increased by exactly $5,000.

### Test Case: ACC-IT-02 - Verify Expense transaction flow
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
When an expense is saved, the system must write the expense record AND generate the double-entry accounting logs simultaneously.

#### 🛠 Preconditions
- Test database running.

#### 📦 Test Data (Concrete Input Values)
- **Expense:** $50 for Office Supplies.

#### 🚀 Step-by-Step Execution
1. Run test `Verify_ExpenseCreation_GeneratesLedgerEntries`.
2. Send POST request to `/api/expenses`.

#### ✅ Expected Results
- 200 OK.

#### 🔍 Post-Execution Verification Criteria
- Query `AccountingEntries` table. Verify 2 records: Debit Office Supplies ($50) and Credit Cash ($50).

### Test Case: ACC-UT-01 - Validate Double-Entry balance logic
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Double-entry bookkeeping mandates that Debits must equal Credits. Our code must refuse to save any transaction that is unbalanced.

#### 🛠 Preconditions
- Unit test project built.

#### 📦 Test Data (Concrete Input Values)
- **Debits:** $100
- **Credits:** $90

#### 🚀 Step-by-Step Execution
1. Run `Validate_UnbalancedJournalEntry_ThrowsError`.
2. Pass the unbalanced arrays to the accounting validator.

#### ✅ Expected Results
- The method throws an `UnbalancedTransactionException`.

#### 🔍 Post-Execution Verification Criteria
- Test passes, proving the accounting engine is mathematically sound.

### Test Case: ACC-UT-02 - Validate Expense category mapping
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
An Expense Category (like 'Rent') must map precisely to a specific Ledger Account ID so the accounting reports work correctly.

#### 🛠 Preconditions
- Mocked `ExpenseCategory` entity.

#### 📦 Test Data (Concrete Input Values)
- **Category:** Rent (Ledger ID: `GUID-456`)

#### 🚀 Step-by-Step Execution
1. Run `Validate_ExpenseMapper_AssignsLedgerId`.
2. Call the MediatR handler.

#### ✅ Expected Results
- The resulting AccountingEntry correctly references `GUID-456` for the Debit side.

#### 🔍 Post-Execution Verification Criteria
- Verify the Credit side correctly maps to the selected Payment Method's Ledger ID.

### Test Case: ACC-WB-01 - Validate AccountingService ProcessTransactionAsync
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
A complex sale with taxes requires a 3-way split: Debit Cash (Total), Credit Sales Revenue (Subtotal), Credit Tax Payable (Tax).

#### 🛠 Preconditions
- Service injected with mocked repositories.

#### 📦 Test Data (Concrete Input Values)
- **Sale:** Total = $110, Subtotal = $100, Tax = $10

#### 🚀 Step-by-Step Execution
1. Execute `Validate_ComplexSale_GeneratesTripleEntry`.
2. Pass the sale details to the service.

#### ✅ Expected Results
- Three `AccountingEntry` objects are instantiated in memory.

#### 🔍 Post-Execution Verification Criteria
- Verify Cash Debit == $110.
- Verify Revenue Credit == $100.
- Verify Tax Payable Credit == $10.

### Test Case: ACC-WB-02 - Validate Rollback on Ledger Failure
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
If the database crashes while saving the second ledger entry, the first entry AND the expense record must vanish. Otherwise, the accounting is corrupted.

#### 🛠 Preconditions
- `DbContext.SaveChangesAsync` mocked to throw an exception on the 3rd internal call.

#### 📦 Test Data (Concrete Input Values)
- **Valid Expense Payload**

#### 🚀 Step-by-Step Execution
1. Execute `Validate_ExpenseRollback_OnLedgerCrash`.
2. Dispatch the command.

#### ✅ Expected Results
- Exception is caught, transaction is rolled back.

#### 🔍 Post-Execution Verification Criteria
- Ensure the database is entirely clean of the partial transaction.

