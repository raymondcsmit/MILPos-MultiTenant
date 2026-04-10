# Reports & Dashboard - Comprehensive Test Suite

## 1. Test Objectives & Scope
**Module**: Reports_Dashboard
**Description**: Handles data aggregation, statistical reporting, trial balances, and dashboard charts.
**Objective**: Ensure complete end-to-end reliability, data integrity, and UI/UX correctness for all features within this module.

## 2. Test Data Sets
This module requires specific data setups before execution.

### 2.1 Normal Operations
* **Data**: Standard date ranges (This Week, This Month).
* **Purpose**: Verify standard "happy path" workflows.

### 2.2 Boundary Conditions
* **Data**: Date range of exactly 1 day (00:00:00 to 23:59:59).
* **Purpose**: Verify system stability at the absolute limits of acceptable input.

### 2.3 Error Scenarios & Edge Cases
* **Data**: End date precedes Start date. | Database contains 1,000,000 records (test query timeout limits).
* **Purpose**: Ensure the system gracefully handles invalid states, rejects bad data with standard `ApiResponse`, and maintains ACID properties.

---

## 3. Unit Tests (White-Box)
*Validates internal logic, isolated methods, utility calculations, and specific code paths without database access.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| REP-UT-01 | Validate Profit/Loss calculation | Mock Sales of $500, Expenses of $200 | Calculated Net Profit = $300 | [ ] | [ ] |
| REP-UT-02 | Validate Date Range filtering | Mock records spanning 3 years, filter by 'This Month' | Only records matching current month's bounds returned | [ ] | [ ] |

## 4. Integration Tests (White-Box / Black-Box)
*Verifies interaction between API Controllers, MediatR Handlers, EF Core Repositories, and the underlying Database.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| REP-IT-01 | Verify Best Selling Products Query | Seed DB with 10 sales of Product A, 2 of Product B. Execute query. | Product A listed first with count 10 | [ ] | [ ] |
| REP-IT-02 | Verify Trial Balance Export | Execute Trial Balance query with CSV export flag | Returns a valid CSV file stream | [ ] | [ ] |

## 5. System Tests (Black-Box / End-to-End)
*Examines application flows from a strictly end-user perspective via the Angular Frontend or Postman API calls.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| REP-BB-01 | View Dashboard Charts | Login, navigate to Dashboard | Charts render correctly, API calls return 200 OK | [ ] | [ ] |
| REP-BB-02 | Generate Stock Report | Navigate to Reports -> Stock, select filters, click Generate | Data table populates with correct stock levels | [ ] | [ ] |

## 6. Internal Logic Tests (White-Box)
*Deep-dive validation of transaction scopes, concurrency, security policies, and architectural constraints.*

| Test ID | Objective | Steps | Expected Result | Actual Result | Pass/Fail |
|---------|-----------|-------|-----------------|---------------|-----------|
| REP-WB-01 | Validate Query Execution Plan (EF Core) | Execute GetDashboardStatisticsQuery | Query translates to a single efficient SQL statement without N+1 issues | [ ] | [ ] |
| REP-WB-02 | Validate Timezone adjustments | Execute report spanning UTC midnight boundary | Records are grouped correctly according to the Tenant's local timezone | [ ] | [ ] |
