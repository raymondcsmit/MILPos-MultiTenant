# 08. Reports and Dashboard Test Cases

**Module:** Dashboard Metrics, Daily Reports, Financial Reports
**Prerequisites:** All previous test cases (01 to 07) have been executed to generate data. Logged in as Admin (`admin@techcorp.com`).

---

## Test Case 8.1: Dashboard Metrics Accuracy
**Objective:** Verify that the main dashboard correctly summarizes system activity.

**Steps:**
1. Navigate to the main Dashboard.
2. Check the "Total Sales" or "Revenue" widget.
3. Check the "Total Purchases" widget.
4. Check the "Total Customers" and "Total Products" widgets.
5. Check the "Recent Transactions" or "Recent Sales" list.

**Expected Result:**
- The Total Sales should equal the sum of the POS sale ($2400 + Tax) and the B2B sale ($2000 + Tax).
- Total Purchases should reflect the $33,000 + Tax PO from Global Tech.
- Customers count should be at least 2 (Walk-in + Alice).
- Products count should be 2.
- The widgets load quickly and do not display errors.

---

## Test Case 8.2: Daily Report Generation
**Objective:** Verify that daily summaries of cash flow and transactions are generated accurately.

**Steps:**
1. Navigate to Reports -> Daily Report (or Day Close).
2. Select today's date.
3. Click "Generate Report".

**Expected Result:**
- The report shows Cash Inflow from the POS sale ($2500 tendered, $100 change).
- The report shows Cash Outflow from the $150 Expense.
- The Net Cash matches the physical drawer expectations.

---

## Test Case 8.3: Inventory Valuation & Stock Report
**Objective:** Verify the accuracy of current stock levels and their financial value.

**Steps:**
1. Navigate to Reports -> Inventory / Stock Report.
2. Filter by Category "Electronics".
3. Click "Generate".

**Expected Result:**
- The report shows "iPhone 15 Pro" with 48 units in stock (50 adjusted - 2 sold).
- The report shows "Dell XPS 15" with 9 units in stock (10 received - 1 sold).
- The Total Valuation matches `(48 * $900) + (9 * $1500) = $43,200 + $13,500 = $56,700`.

---

## Test Case 8.4: Customer Ledger / Statement
**Objective:** Verify that a customer's financial statement is accurate.

**Steps:**
1. Navigate to Reports -> Customer Ledger (or Accounts Receivable).
2. Select Customer: "Alice Johnson".
3. Generate the statement for the current month.

**Expected Result:**
- The statement shows an opening balance of $0.
- It shows an invoice/debit of $2000 + Tax (from the Sales Order).
- It shows a payment/credit of $2000.
- The closing balance is correctly calculated ($0 or the remaining tax balance).

---

## Test Case 8.5: Export Reports to PDF/Excel
**Objective:** Verify that reports can be downloaded for offline use.

**Steps:**
1. Open the Inventory Report from Test Case 8.3.
2. Click the "Export to PDF" button.
3. Click the "Export to Excel / CSV" button.

**Expected Result:**
- Both files download successfully.
- The PDF formatting is clean and readable.
- The Excel file contains the correct raw data matching the on-screen report.
