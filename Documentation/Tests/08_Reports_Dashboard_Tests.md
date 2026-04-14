# Reports & Dashboard - Enhanced End-to-End Test Suite

## 1. Module Overview
**Description:** Handles data aggregation, statistical reporting, trial balances, and dashboard charts.

> **Note for Junior Testers:** The test cases below provide concrete, step-by-step instructions. Please read the "Domain Context" to understand *why* we test this feature, and strictly follow the exact values provided in "Test Data".

---

### Test Case: REP-BB-01 - View Dashboard Charts
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
The dashboard is the first screen a manager sees. It aggregates total sales, expenses, and profit for quick visual analysis.

#### 🛠 Preconditions
- Logged in as Admin.
- Sales and Expenses exist for the current month.

#### 📦 Test Data (Concrete Input Values)
- **View:** Default Dashboard load.

#### 🚀 Step-by-Step Execution
1. Navigate to `/dashboard`.
2. Wait for the page to load completely.

#### ✅ Expected Results
- The top summary cards display numeric values (e.g., Total Sales, Net Profit).
- The bar chart renders visually without crashing.

#### 🔍 Post-Execution Verification Criteria
- Open Chrome DevTools -> Network. Verify the `/api/dashboard/statistics` call returned a 200 OK.

### Test Case: REP-BB-02 - Generate Stock Report
**Test Type:** System Test (Black-Box)

#### 🧠 Domain Context for Junior Testers
A stock report helps managers physically audit their warehouse by listing exactly how much of every product the system thinks they have.

#### 🛠 Preconditions
- Logged in as Admin.

#### 📦 Test Data (Concrete Input Values)
- **Filters:** `Category = Beverages`, `Stock < 10`

#### 🚀 Step-by-Step Execution
1. Navigate to 'Reports -> Stock Report'.
2. Select `Beverages` from the category dropdown.
3. Check the 'Low Stock Only' box.
4. Click 'Generate'.

#### ✅ Expected Results
- The data table populates exclusively with Beverage products that have less than 10 items in stock.

#### 🔍 Post-Execution Verification Criteria
- Verify the 'Export' button successfully downloads these filtered results to CSV.

### Test Case: REP-IT-01 - Verify Best Selling Products Query
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
The dashboard highlights the top 5 most popular products. The backend must efficiently query the sales history to calculate this.

#### 🛠 Preconditions
- Database seeded with 10 sales of Product A, and 2 sales of Product B.

#### 📦 Test Data (Concrete Input Values)
- **Date Range:** `All Time`

#### 🚀 Step-by-Step Execution
1. Run `Verify_BestSelling_OrdersByCount`.
2. Dispatch `GetBestSellingProductsQuery`.

#### ✅ Expected Results
- The API returns a list of products.

#### 🔍 Post-Execution Verification Criteria
- Assert that Product A is at `Index[0]` and Product B is at `Index[1]`.

### Test Case: REP-IT-02 - Verify Trial Balance Export
**Test Type:** Integration Test

#### 🧠 Domain Context for Junior Testers
Accountants require physical copies of the Trial Balance. The system must convert the raw ledger data into a formatted Excel or CSV file.

#### 🛠 Preconditions
- Ledger contains varied transactions.

#### 📦 Test Data (Concrete Input Values)
- **Format:** `Excel`

#### 🚀 Step-by-Step Execution
1. Run `Verify_TrialBalance_GeneratesExcelStream`.
2. Call the export endpoint.

#### ✅ Expected Results
- 200 OK. The response Content-Type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

#### 🔍 Post-Execution Verification Criteria
- Assert the byte array stream length is > 0.

### Test Case: REP-UT-01 - Validate Profit/Loss calculation
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Net Profit is strictly `Total Revenue - Total Expenses - Cost of Goods Sold`. The math engine must be flawless.

#### 🛠 Preconditions
- Mocked sales ($500), expenses ($100), and COGS ($200).

#### 📦 Test Data (Concrete Input Values)
- **Inputs:** $500, $100, $200

#### 🚀 Step-by-Step Execution
1. Run `Validate_ProfitLoss_MathEngine`.
2. Pass inputs to the calculation service.

#### ✅ Expected Results
- The service returns exactly `$200` Net Profit.

#### 🔍 Post-Execution Verification Criteria
- Test passes successfully.

### Test Case: REP-UT-02 - Validate Date Range filtering
**Test Type:** Unit Test (White-Box)

#### 🧠 Domain Context for Junior Testers
When a user asks for 'This Month's Sales', the system must accurately define the 1st and last day of the current month.

#### 🛠 Preconditions
- Mocked records spanning 3 years.

#### 📦 Test Data (Concrete Input Values)
- **Filter:** `ThisMonth` enum.

#### 🚀 Step-by-Step Execution
1. Run `Validate_DateHelper_CalculatesCurrentMonth`.
2. Apply the filter to the mocked list.

#### ✅ Expected Results
- Only records matching the current calendar month are returned.

#### 🔍 Post-Execution Verification Criteria
- Verify leap years (e.g., Feb 29) are handled correctly if the test runs in a leap year.

### Test Case: REP-WB-01 - Validate EF Core Execution Plan
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
Dashboard queries scan thousands of sales records. If written poorly (N+1 query problem), it will freeze the server.

#### 🛠 Preconditions
- Query logging is enabled.

#### 📦 Test Data (Concrete Input Values)
- **Query:** `GetDashboardStatisticsQuery`

#### 🚀 Step-by-Step Execution
1. Run `Validate_DashboardQuery_UsesSingleSQL`.
2. Execute the dashboard statistics fetch.

#### ✅ Expected Results
- The intercepted EF Core log shows a single, optimized SQL statement utilizing `GROUP BY` and `SUM`.

#### 🔍 Post-Execution Verification Criteria
- Assert that no N+1 loop occurs (e.g., the DB is not hit 500 times for 500 sales).

### Test Case: REP-WB-02 - Validate Timezone adjustments
**Test Type:** Internal Logic Test (White-Box)

#### 🧠 Domain Context for Junior Testers
If a tenant in New York makes a sale at 11:00 PM EST, it is 4:00 AM UTC the next day. The report must group the sale under the correct local date.

#### 🛠 Preconditions
- A sale exists at 03:00 UTC (10:00 PM EST the previous day).

#### 📦 Test Data (Concrete Input Values)
- **Tenant Timezone:** `Eastern Standard Time`

#### 🚀 Step-by-Step Execution
1. Run `Validate_Timezone_GroupsByLocalDate`.
2. Generate a daily sales report.

#### ✅ Expected Results
- The sale is correctly attributed to the previous calendar day for that specific tenant.

#### 🔍 Post-Execution Verification Criteria
- Test passes, proving `DateTimeOffset` conversions work.

