# End-to-End Testing, Bug Discovery, Documentation & Fixing (SQLite) — Implementation Plan

## 1. Executive Summary & Objectives
The user has requested to:
1. **Configure & Launch:** Run MILPOS in the browser with both Backend (.NET 10 API) and Frontend (Angular 20 SPA), configuring SQLite as the active database provider.
2. **End-to-End Browser Testing:** Perform live end-to-end testing of the application in the browser using the QA Test Suites in `Documentation/QA` across all major functional journeys (Authentication, POS Terminal, Sales Orders, Purchasing, Inventory, Accounting, Customers, Suppliers, Reports).
3. **Bug & Exception Documentation:** Document every bug, issue, or exception discovered inside `Documentation/Bugs-Issues/` with complete reproduction steps, payloads, error traces, and root-cause analysis.
4. **Bug Fixing & Automated Tests:** Fix the discovered bugs in the backend and frontend codebases, and write corresponding Unit and Integration tests in `POS.MediatR.Tests` and `POS.API.Tests` to pin and verify each fix.
5. **Demonstration & Verification:** Run the tests and demonstrate the results.

---

## 2. Technical Approach & Execution Strategy

### Step 1: Environment & Database Configuration (SQLite)
- Update `SourceCode/SQLAPI/POS.API/appsettings.Development.json` to set `"DatabaseProvider": "Sqlite"`.
- Ensure connection string points to `POSDb.db` and Hangfire connection string is properly configured.
- Verify `POSDb.db` schema and seeds are loaded via `Program.cs` startup pipeline (`context.Database.Migrate()` + `seedingService.SeedAsync()`).

### Step 2: Application Launch (Backend & Frontend Daemons)
- **Backend API:** Launch ASP.NET Core 10 API via `dotnet run --project SourceCode/SQLAPI/POS.API` on `http://localhost:5000` as a background process.
  - Verify API startup and Swagger endpoint at `http://localhost:5000/swagger`.
- **Frontend SPA:** Launch Angular 20 development server via `npm start` in `SourceCode/Angular` on `http://localhost:4200` as a background process.
  - Verify Angular serves the application and connects to `http://localhost:5000/`.

### Step 3: End-to-End Browser Testing & Defect Discovery
- Use `browser_subagent` and Chrome DevTools MCP tools to execute end-to-end user journeys in the live browser:
  1. **Journey 1: Authentication & Navigation:** Login as `admin@gmail.com` with `Admin@123` (or `admin_alpha`), inspect JWT in storage, verify dashboard widgets and menu rendering.
  2. **Journey 2: Product & Inventory Management:** Create and update products, test variant expansion, test stock adjustments, test damaged stock entries, and inspect console/network errors.
  3. **Journey 3: POS Terminal & Checkout (The Money Path):** Add items to cart, test unit conversions (e.g. Dozen multiplier `UX-02`), test discounts and tax computations, perform cash and split tender checkout, test receipt generation.
  4. **Journey 4: Sales Orders & Returns:** Query order list, process full and partial sales returns, probe over-return boundary (`N-04`), test payment deletion (`N-05`).
  5. **Journey 5: Purchasing & Supply Chain:** Create purchase order, test supplier creation with address constraints (`N-27`), test purchase return with refund (`N-16 / N-20`), test supplier payment settlement and overpayment guard (`INT-06`).
  6. **Journey 6: Double-Entry Accounting & Sub-Ledgers:** Record general journal entry (`N-39`), inspect customer ledger sorting (`N-37`), test loan repayment schedule (`ACC-01`), verify ledger account dependencies (accounts `2100`, `4200`, `5555`).
  7. **Journey 7: Reports & Analytics:** View Profit & Loss report (`REP-01`), Daily Sales report, Tax report rollup, and Dashboard tile caches.

### Step 4: Document Discovered Bugs in `Documentation/Bugs-Issues/`
- For each bug, issue, or exception found during E2E testing:
  - Create a dedicated markdown defect document in `f:\MIllyass\pos-with-inventory-management\Documentation\Bugs-Issues\`:
    - `BUG-01-[Feature]-[ShortDescription].md`
    - Sections: Bug Title, Severity (P0/P1/P2), Affected Component, Steps to Reproduce, Expected vs Actual Behavior, Browser Console / Network Logs, Server Stack Trace, Root Cause Analysis, and Remediation Strategy.
  - Maintain a master `00_BUGS_AND_ISSUES_INDEX.md` cataloging all findings.

### Step 5: Bug Fixing in Backend & Frontend
- Apply surgical fixes to the root cause files in `SourceCode/SQLAPI` (MediatR handlers, controllers, validators, repositories) and `SourceCode/Angular` (components, pipes, services).
- Maintain all existing coding conventions and Clean Architecture boundaries.

### Step 6: Automated Unit & Integration Tests
- In `SourceCode/SQLAPI/Tests/POS.MediatR.Tests` (Unit tests) and `SourceCode/SQLAPI/Tests/POS.API.Tests` (Integration tests):
  - Add test methods covering the exact failure scenarios.
  - Verify that tests reproduce the defect before the fix (RED) and pass after the fix (GREEN).
  - Ensure zero regressions across existing test suites.

### Step 7: Demonstration & Verification
- Re-run browser verification to demonstrate the resolved behavior in the UI.
- Execute `dotnet test` to demonstrate all unit and integration tests passing.
- Create post-implementation work document in `SourceCode/SQLAPI/Document/QA_E2E_Bug_Fixing_WorkDocument.md` per `<RULE[user_global]>`.

---

## 3. Verification Plan

### Automated Testing:
```powershell
# Run all MediatR unit tests
dotnet test SourceCode/SQLAPI/Tests/POS.MediatR.Tests/POS.MediatR.Tests.csproj

# Run all API integration tests
dotnet test SourceCode/SQLAPI/Tests/POS.API.Tests/POS.API.Tests.csproj
```

### Browser Verification:
- Launch browser subagent to verify successful execution of core workflows on `http://localhost:4200` with zero console errors and clean HTTP 200 responses.
