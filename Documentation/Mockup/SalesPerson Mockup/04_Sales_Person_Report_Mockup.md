# 4. Sales Person Report Mockup
**File:** `04_Sales_Person_Report_Mockup.md`
**Objective:** Visualize a new reporting dashboard that allows Admins/Managers to track performance by Sales Person and Region.

---

### Wireframe Representation

```text
+-----------------------------------------------------------------------------------+
|  [☰]  Reports -> Sales by Sales Person                          [ Export ▼ ]      |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  Filters                                                                          |
|  -------------------------------------------------------------------------------  |
|  Date Range:           [ This Month ▼ ]   (01/10/2023 - 31/10/2023)               |
|  Region / Location:    [ All Regions ▼ ]                                          |
|  Sales Person:         [ All Sales Persons ▼ ]                                    |
|                                                                                   |
|  [ Filter Report ]                                                                |
|                                                                                   |
|  Summary Cards                                                                    |
|  -------------------------------------------------------------------------------  |
|  +--------------------+  +--------------------+  +--------------------+           |
|  | Top Performer      |  | Total Sales        |  | Total Commissions  |           |
|  | Michael Scott      |  | $45,200.00         |  | $4,520.00          |           |
|  | $15,000 Revenue    |  | 120 Transactions   |  | (Estimated 10%)    |           |
|  +--------------------+  +--------------------+  +--------------------+           |
|                                                                                   |
|  Detailed Data Table                                                              |
|  -------------------------------------------------------------------------------  |
|  Sales Person    | Region                 | Orders | Gross Sales | Net Profit     |
|  ----------------|------------------------|--------|-------------|--------------- |
|  Michael Scott   | North America - East   | 45     | $15,000.00  | $3,500.00      |
|  Jim Halpert     | North America - East   | 30     | $10,500.00  | $2,100.00      |
|  Pam Beesly      | North America - East   | 25     | $8,000.00   | $1,600.00      |
|  Dwight Schrute  | North America - West   | 20     | $11,700.00  | $2,800.00      |
|                                                                                   |
|  < Prev  [ 1 ] [ 2 ] [ 3 ] Next >                                                 |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### UI Behavior & Logic
1. **Grouping:** The backend query (`GetSalesBySalesPersonQuery`) groups all `SalesOrder` entities by the newly added `SalesPersonId` foreign key.
2. **Filtering:** Admins can drill down to see performance per region or per individual rep.
3. **Visibility:** If a Sales Person logs in and tries to access this report, the backend forces the `SalesPersonId` filter to their own ID. They will only see their own row, not the entire company's performance.