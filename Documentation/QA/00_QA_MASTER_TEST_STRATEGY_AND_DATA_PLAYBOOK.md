# QA Master Test Strategy & Test Data Playbook

**Application:** MILPOS — Multi-Tenant Point of Sale with Inventory Management, Accounting & CRM  
**Target Environment:** Cloud (.NET 10 Web API + PostgreSQL / SQL Server + Angular 20 SPA) and Desktop (.NET 10 Embedded + SQLite + Electron Shell)  
**Location:** `Documentation/QA/00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md`  
**Purpose:** Establish the master quality assurance charter, test execution standards, environment topology, shared golden test datasets, and defect triage rubric specifically designed to uncover system defects, exceptions, concurrency bugs, and data corruptions.

---

## 1. Quality Assurance Charter & Objectives

The primary objective of the MILPOS QA testing suite is to validate functional correctness, business logic accuracy, regulatory compliance, data isolation, and operational resilience across all retail, inventory, and financial paths.

### Core Testing Pillars:
1. **Financial & Accounting Integrity:** Ensure every business transaction (sale, purchase, return, adjustment, damage, expense) maintains double-entry balance, debit/credit parity, proper GL account assignment, and accurate sub-ledger FIFO allocations.
2. **Inventory Stock Consistency:** Guarantee that stock deductions, increments, transfers, unit conversions, and damaged stock adjustments remain synchronized with physical counts and double-entry valuation without allowing uncontrolled negative inventory or silent ledger divergence.
3. **Multi-Tenant Isolation & Security:** Verify that tenant data boundaries are strictly impermeable via Global Query Filters, API key validation, claim enforcement (`[ClaimCheck]`), and token lifecycle controls.
4. **Exception & Bug Hunting:** Specifically probe known architectural vulnerabilities, unhandled NullReferenceExceptions, missing transaction scopes, unhandled SQLite foreign key locks, arithmetic bugs, and race conditions.
5. **Offline & Hybrid Cloud Synchronization:** Verify Electron desktop offline continuity, local SQLite data persistence, export template compatibility, and bidirectional cloud sync conflict resolution.

---

## 2. Test Environment Topology & Architecture

| Environment Layer | Cloud Mode Specification | Desktop (Offline) Mode Specification |
|---|---|---|
| **Host Application** | ASP.NET Core 10 Web API on Kestrel / IIS | Embedded ASP.NET Core 10 API launched via Electron main process |
| **Frontend Client** | Angular 20 Standalone SPA (Google Chrome / Edge) | Angular 20 embedded in Electron shell (`nodeIntegration: true`) |
| **Database Engine** | PostgreSQL 16 / SQL Server 2022 | SQLite 3 (local file `pos.db` with WAL mode) |
| **Tenant Resolution** | Subdomain (`tenant1.milpos.com`) / Header `X-Tenant-Id` | Single-tenant local database with static tenant binding |
| **Authentication** | Bearer JWT (HS256, 60–720 min validity) | DPAPI-encrypted token + offline token validation |
| **Background Jobs** | Hangfire with SQL Server / PostgreSQL Storage | In-process timer loops / Hangfire SQLite storage |
| **Real-Time Layer** | SignalR WebSocket hub (`/userHub`) | In-process SignalR fallback |
| **Tax Engine** | Live FBR Fiscal Sandbox (`/api/fbr`) | Staged FBR queues for delayed cloud dispatch |

---

## 3. Master Golden Test Data Blueprint

All QA test cases across files `01` through `11` share the standardized, code-verified test data fixtures defined below. Testers and automation scripts must rely on these exact IDs, codes, names, and financial amounts.

### 3.1 Master Test Tenants

| Tenant Name | Tenant ID | Domain / Subdomain | Status | Licensing Tier | Locations |
|---|---|---|---|---|---|
| **Retail Corp Alpha** | `a1111111-1111-1111-1111-111111111111` | `alpha.milpos.com` | Active | Enterprise (Licensed: `LIC-ALPHA-9999`) | L1, L2, L-FBR |
| **Wholesale Mart Beta** | `b2222222-2222-2222-2222-222222222222` | `beta.milpos.com` | Active | Standard Trial (Expires in 14 days) | L-BETA-1 |
| **Deactivated Gamma** | `c3333333-3333-3333-3333-333333333333` | `gamma.milpos.com` | Inactive | Expired / Suspended | L-GAMMA-1 |

---

### 3.2 User Personas & Role Claims Matrix

Default Password for all seed users: `Admin@123!` (or `Password123!`).

| User Name | Email | Assigned Role | Location Scope | Primary Claims / Permissions | Intended QA Purpose |
|---|---|---|---|---|---|
| `superadmin` | `super@milpos.com` | `SuperAdmin` | All Locations | `IsSuperAdmin = true`, all system actions | Multi-tenant administration, licensing, system config |
| `admin_alpha` | `admin@alpha.com` | `StoreAdmin` | All Locations | All Tenant Claims (`USR_*`, `POS_*`, `SO_*`, `PO_*`, `INVE_*`, `ACC_*`) | Tenant operations, user creation, settings |
| `cashier_l1` | `cashier1@alpha.com` | `Cashier` | Location L1 Only | `POS_POS`, `SO_VIEW_SALES_ORDER`, `SO_ADD_SO_PAYMENT` | POS sales, cash register, returns, split tenders |
| `inventory_clerk` | `inventory@alpha.com` | `StockManager` | L1, L2 | `INVE_MANAGE_INVENTORY`, `INVE_VIEW_INVENTORY`, `DMG_ST_MANAGE_DMG_ST` | Goods receipt, transfers, damage, adjustments |
| `accountant_alpha` | `accounts@alpha.com` | `Accountant` | All Locations | `ACC_VIEW_ACCOUNTING`, `ACC_MANAGE_ACCOUNTING`, `EXP_VIEW_EXPENSE` | General entries, ledger reconciliation, reports, closing |
| `auditor_readonly`| `auditor@alpha.com` | `Auditor` | All Locations | View claims only (`*_VIEW_*`), zero write claims | Read-only verification, permission denial tests |
| `unauthorized_user`| `guest@alpha.com` | `NoClaimsRole` | None Assigned | Authenticated JWT, but 0 role claims (`[]`) | 403 Forbidden validation across all secured endpoints |

---

### 3.3 Business Locations

| Location Code | Location Name | Address | FBR Fiscal Enabled | POS Enabled | Default Cash Drawer Account |
|---|---|---|---|---|---|
| **L1** | Alpha Flagship Store | 100 Commercial Plaza, Sector F-7, Islamabad | False | True | 1050 (Cash in Hand - Main) |
| **L2** | Alpha Central Warehouse | Industrial Area, Sector I-9, Islamabad | False | False | None (Warehouse Only) |
| **L-FBR** | Alpha Tax Fiscal Outlet | Mall of Lahore, Cantt, Lahore | True (`POS_ID: 101928`) | True | 1051 (Cash in Hand - Mall Outlet) |

---

### 3.4 Standard Chart of Accounts (COA) Hierarchy

Double-entry accounting requires strict balance and account existence. The following accounts must exist in the active financial year:

| Account Code | Account Name | Category | Normal Balance | Parent Account Code | Notes |
|---|---|---|---|---|---|
| **1050** | Cash in Hand (Main Drawer) | Current Asset | Debit | 1000 (Current Assets) | Primary POS cash tender destination |
| **1060** | Bank Current Account (Meezan) | Current Asset | Debit | 1000 (Current Assets) | Card, bank transfer, and online checkout |
| **1100** | Accounts Receivable (Debtors) | Current Asset | Debit | 1000 (Current Assets) | Unpaid credit sales, customer sub-ledger control |
| **1150** | GST Input Tax Receivable (17%)| Current Asset | Debit | 1000 (Current Assets) | Purchase tax paid to suppliers |
| **1200** | Merchandise Inventory Asset | Current Asset | Debit | 1000 (Current Assets) | Real-time stock valuation on balance sheet |
| **2100** | Accounts Payable (Creditors) | Current Liability | Credit | 2000 (Current Liabilities) | Supplier unpaid purchases control |
| **2150** | GST Output Tax Payable (17%) | Current Liability | Credit | 2000 (Current Liabilities) | Sales tax collected from retail customers |
| **2150-01** | GST Output Federal (17%) | Current Liability | Credit | 2150 | Child account for tax report rollup |
| **2150-02** | PST Output Provincial (5%) | Current Liability | Credit | 2150 | Child account for provincial service tax |
| **3000** | Owner's Capital / Equity | Equity | Credit | None | Retained earnings and tenant equity |
| **4100** | Merchandise Sales Revenue | Income / Revenue | Credit | 4000 (Operating Revenue) | Gross retail product sales revenue |
| **4200** | Purchase Discounts Received | Income / Revenue | Credit | 4000 (Operating Revenue) | Discount taken on supplier PO settlement |
| **5100** | Cost of Goods Sold (COGS) | Cost of Sales | Debit | 5000 (Expenses) | Expense booked at delivery/sale |
| **5200** | Sales Discounts Allowed | Operating Expense| Debit | 5000 (Expenses) | Line-item and order-level customer discounts |
| **5300** | Operating Expenses (General)| Operating Expense| Debit | 5000 (Expenses) | Utility bills, office supplies, operational rent |
| **5400** | Damaged & Lost Stock Expense| Operating Expense| Debit | 5000 (Expenses) | Written-off damaged inventory cost |
| **5500** | Stock Adjustment Loss | Operating Expense| Debit | 5000 (Expenses) | Inventory count discrepancy loss |
| **5555** | Opening Balance Adjustment | Equity / Capital | Credit | 3000 | Mandatory partner account for opening balance |
| **5900** | Cash Round-Off / Variance | Expense / Other | Debit/Credit | 5000 (Expenses) | Decimal rounding remainder on checkout |

---

### 3.5 Units of Measure & Conversion Matrix

| Unit Code | Base Unit Name | Operator | Factor | Equivalent Math | Usage Domain |
|---|---|---|---|---|---|
| **PC** | Piece (Base Unit) | None | 1.00 | 1 PC = 1 Piece | Standard single retail items |
| **DZ** | Dozen | Multiply (`*`) | 12.00 | 1 DZ = 12 PC | Packaged wholesale goods |
| **BOX-24** | Box of 24 | Multiply (`*`) | 24.00 | 1 BOX = 24 PC | Case beverage / snacks |
| **KG** | Kilogram (Base Unit) | None | 1.00 | 1 KG = 1,000 GM | Bulk weighed items |
| **GM100** | 100 Grams Pack | Divide (`/`) | 10.00 | 1 GM100 = 0.1 KG | Spices, dry fruits, delicatessen |

---

### 3.6 Tax Profiles

| Tax ID / Code | Tax Name | Rate (%) | Type | Accounting Input GL | Accounting Output GL |
|---|---|---|---|---|---|
| **TAX-GST17** | General Sales Tax Standard | 17.00% | Flat / Percentage | 1150 (Input Tax) | 2150-01 (Output Tax) |
| **TAX-PST05** | Provincial Sales Tax | 5.00% | Flat / Percentage | None | 2150-02 (PST Payable) |
| **TAX-ZERO** | Zero Rated Goods | 0.00% | Zero Rated | None | None |
| **TAX-EXEMPT**| Statutorily Exempt Goods | 0.00% | Exempt | None | None |

---

### 3.7 Master Product Catalog Fixtures

| SKU / Code | Barcode | Product Name | Base Unit | Cost Price | Retail Price | Assigned Taxes | Reorder Alert Qty | Initial Stock (L1 / L2) |
|---|---|---|---|---|---|---|---|---|
| **PROD-001** | `8901001001` | Super Basmati Rice 1kg | PC | 120.00 | 180.00 | TAX-GST17 (17%) | 15 | L1: 100 / L2: 500 |
| **PROD-002** | `8901001002` | Refined Cooking Oil 1L | PC | 350.00 | 480.00 | TAX-GST17 (17%) | 20 | L1: 50 / L2: 200 |
| **PROD-003** | `8901001003` | Organic Green Tea 100g | PC | 200.00 | 320.00 | TAX-GST17 + TAX-PST05 (22% total) | 10 | L1: 40 / L2: 100 |
| **PROD-004** | `8901001004` | Fresh Farm Milk 1L | PC | 90.00 | 130.00 | TAX-EXEMPT (0%) | 30 | L1: 80 / L2: 0 |
| **PROD-005** | `8901001005` | Premium Ballpoint Pen | PC | 15.00 | 30.00 | TAX-GST17 (17%) | 50 | L1: 300 / L2: 1,000 |
| **PROD-VAR** | `8902000000` | Cotton Polo T-Shirt | PC | 600.00 | 1,200.00 | TAX-GST17 (17%) | 10 | Parent (0 stock) |
| **PROD-VAR-S**| `8902000001` | Cotton Polo - Small Blue | PC | 600.00 | 1,200.00 | TAX-GST17 (17%) | 5 | L1: 15 / L2: 50 |
| **PROD-VAR-M**| `8902000002` | Cotton Polo - Med Blue | PC | 600.00 | 1,200.00 | TAX-GST17 (17%) | 5 | L1: 25 / L2: 60 |
| **PROD-VAR-L**| `8902000003` | Cotton Polo - Large Blue | PC | 600.00 | 1,200.00 | TAX-GST17 (17%) | 5 | L1: 20 / L2: 40 |
| **PROD-ZERO** | `8903000001` | Zero Stock Promo Item | PC | 50.00 | 100.00 | TAX-GST17 (17%) | 5 | L1: 0 / L2: 0 |

---

### 3.8 Master Customers & Suppliers

| Entity Code | Entity Name | Type | Phone / Mobile | NTN / CNIC | Credit Limit | Payment Terms |
|---|---|---|---|---|---|---|
| **CUST-WALK** | Walk-in Retail Customer | Customer | `03000000000` | N/A | 0.00 | Immediate Cash/Card |
| **CUST-001** | Tariq Commercial Mart | Customer | `03001234567` | `35202-1234567-1` | 50,000.00 | Net 30 Days |
| **CUST-002** | Fatima Bakers & Cafe | Customer | `03219876543` | `35201-9876543-9` | 25,000.00 | Net 15 Days |
| **SUPP-001** | National Grain Wholesalers | Supplier | `03335551234` | `NTN-8877665-1` | 500,000.00 | Net 45 Days |
| **SUPP-002** | Premier Beverage Distributors| Supplier | `03454449876` | `NTN-1122334-4` | 200,000.00 | Net 30 Days |

---

## 4. Test Case Rigor & Specification Standard

Every QA test case documented in files `01` through `11` follows this strict structural format:

```markdown
### QA-XXX-NNN — [Clear, Action-Oriented Test Title]
- **Aspect / Sub-Module:** [e.g. POS Real-Time Checkout / Split Payment]
- **Test Type:** [Functional Happy Path | Boundary Value | Negative / Abuse | Security | Concurrency | Exception / Fault Injection]
- **Priority & Severity:** [P0 (Blocker) | P1 (High) | P2 (Medium) | P3 (Low)]
- **Source & References:** [File paths in SourceCode/SQLAPI or Angular, controller endpoints, MediatR handlers]
- **Preconditions:** [Exact initial state of tenant, authenticated user, cash drawer, product stock, account balances]
- **Concrete Test Data:**
  - Headers: `Authorization: Bearer {{token}}`, `X-Tenant-Id: {{tenantId}}`, etc.
  - Payload (JSON) / Form inputs with explicit values for every property.
- **Step-by-Step Execution Procedure:**
  1. Detailed step 1...
  2. Detailed step 2...
- **Expected Results:**
  - UI Feedback: [Toast message, dialog state, route transition]
  - API HTTP Response: [Status Code e.g. 200/201/400/401/409/422, JSON response structure and keys]
  - Database Row Assertions: [Exact table, columns, and values persisted]
  - Inventory Stock Changes: [ProductStock.CurrentStock before and after]
  - Accounting Journal Entries: [Debit/Credit accounts, amounts, narration, balance check]
- **Defects & Exceptions Targeted:** [Exact code bug, NRE risk, race condition, or silent failure being probed]
- **QA Pass/Fail Checklist:** [Specific verification points for sign-off]
```

---

## 5. Defect Severity & Priority Rubric

| Level | Severity Definition | Application Impact Examples | Target Resolution |
|---|---|---|---|
| **P0 — Critical (Blocker)** | Complete failure of primary function, data corruption, financial imbalance, or remote unauthenticated data breach. | Accounting journal does not balance; stock count becomes corrupted; PO return crash causes total transaction loss; unauthenticated endpoint leaks database. | Immediate hotfix; blocks deployment. |
| **P1 — High (Major)** | Core workflow blocked with no viable workaround, silent data omission, or permission bypass for authenticated roles. | Overpayment validation fails; sales return accepts infinite quantity; missing ClaimCheck allows any user to mutate stock; customer mobile collision yields 500 error. | Fix in current release sprint. |
| **P2 — Medium (Normal)** | Workflow defect with existing workaround, cosmetic report discrepancy, or inconsistent validation code. | Dashboard cache TTL 15 min instead of 24h; report date filter midnight UTC misalignment; customer ledger sorting mismatch; unhandled null in non-critical filter. | Scheduled fix in next maintenance cycle. |
| **P3 — Low (Minor)** | Minor UI alignment, typo in narration string, or non-functional aesthetic quirk. | Typo in "Adavance Salary"; print receipt spacing; button hover micro-animation glitch. | Polish backlog. |

---

## 6. QA Suite Document Index & Architecture Map

| Document Code | File Path | Focus & Coverage |
|---|---|---|
| **00** | `00_QA_MASTER_TEST_STRATEGY_AND_DATA_PLAYBOOK.md` | Master QA Strategy, Golden Datasets, Defect Rubric (This Document) |
| **01** | `01_QA_AUTH_USERS_ROLES_SECURITY_TESTS.md` | Authentication, Passwords, Role Claims, Route Security, Presence Hub |
| **02** | `02_QA_TENANT_LICENSING_COMPANY_PROFILE_TESTS.md` | Multi-Tenant Onboarding, Data Isolation, Licensing, Company Profile |
| **03** | `03_QA_POS_TERMINAL_AND_SALES_ORDERS_TESTS.md` | Real-time POS, Barcodes, Pricing Math, Payments, Sales Orders, Returns |
| **04** | `04_QA_PURCHASING_SUPPLIERS_SUPPLY_CHAIN_TESTS.md` | Purchase Orders, Goods Receipt, PO Returns, Supplier Payments, Requisitions |
| **05** | `05_QA_INVENTORY_STOCK_TRANSFERS_DAMAGED_TESTS.md` | Product Catalog, Stock Adjustments, Damaged Stock, Branch Transfers, FEFO |
| **06** | `06_QA_DOUBLE_ENTRY_ACCOUNTING_FINANCIALS_TESTS.md` | General Journal, Sales/Purchase Journals, Sub-Ledgers, Year-End, Payroll |
| **07** | `07_QA_REPORTING_ANALYTICS_DASHBOARDS_TESTS.md` | P&L, Balance Sheet, Trial Balance, Sales/Tax Reports, Dashboard Caching |
| **08** | `08_QA_CRM_INQUIRIES_REMINDERS_NOTIFICATIONS_TESTS.md` | Customers, Credit Limits, Inquiries, Task Scheduler, SignalR Alerts |
| **09** | `09_QA_INTEGRATIONS_FBR_EMAIL_JOBS_IMPORTEXPORT_TESTS.md` | FBR Tax Fiscalization, SMTP Emails, Hangfire Jobs, CSV Bulk Operations |
| **10** | `10_QA_DESKTOP_ELECTRON_OFFLINE_SYNC_TESTS.md` | Electron Desktop Shell, Offline SQLite, DB Download, Delta Cloud Sync |
| **11** | `11_QA_DEFECT_CATALOG_AND_BUG_HUNTING_PLAYBOOK.md` | Master Defect Catalog (N-01 to N-45) & Reproducible Bug-Hunting Scripts |
