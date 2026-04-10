# 06. Accounting and Expenses Test Cases

**Module:** Ledger Accounts, General Entries, Expenses
**Prerequisites:** Completed Sales and Purchases from prior test cases. Logged in as Admin or Manager.

---

## Test Case 6.1: Chart of Accounts Setup
**Objective:** Verify that default and custom ledger accounts can be managed.

**Steps:**
1. Navigate to Accounting -> Ledger Accounts.
2. Verify that system-generated accounts exist (e.g., Cash in Hand, Sales Revenue, Accounts Receivable).
3. Click "Add Account".
4. Enter Account Name: "Office Rent", Type: "Expense".
5. Save the Account.
6. Repeat for "Utilities", Type: "Expense".

**Expected Result:**
- Accounts are created successfully.
- They appear under the correct classification in the Chart of Accounts.

---

## Test Case 6.2: Create Expense Categories
**Objective:** Verify that expenses can be categorized for reporting.

**Steps:**
1. Navigate to Expenses -> Categories.
2. Click "Add Category".
3. Enter Name: "Office Maintenance".
4. Link it to the "Utilities" Ledger Account (if required by the system).
5. Save Category.

**Expected Result:**
- Category is created and visible in the dropdowns for new expenses.

---

## Test Case 6.3: Record a Direct Expense
**Objective:** Verify that an expense reduces available cash or bank balance.

**Steps:**
1. Navigate to Expenses -> All Expenses.
2. Click "Add Expense".
3. Select Category: "Office Maintenance".
4. Enter Amount: $150.
5. Select Payment Account: "Cash in Hand".
6. Add Note: "Plumbing repairs".
7. Save the Expense.

**Expected Result:**
- The expense is recorded.
- The "Cash in Hand" ledger decreases by $150.
- The "Office Maintenance / Utilities" expense ledger increases by $150.

---

## Test Case 6.4: Manual Journal Entry
**Objective:** Verify that accountants can make manual adjustments via General Journal Entries.

**Steps:**
1. Navigate to Accounting -> General Entry.
2. Click "New Journal Entry".
3. Select Debit Account: "Office Rent", Amount: $1000.
4. Select Credit Account: "Bank Account (Chase)", Amount: $1000.
5. Enter Description: "Monthly Rent Payment".
6. Save the Entry.

**Expected Result:**
- Journal Entry is successfully posted.
- Debits and Credits must match (system validation).
- Trial Balance and Ledger reports reflect the $1000 adjustment.
