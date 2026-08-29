# MILPOS — Detailed System Understanding Document

**Version:** 1.0
**Date:** August 28, 2026
**Scope:** Comprehensive analysis of the MILPOS Point of Sale (POS) with Inventory Management repository

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Backend Design](#5-backend-design)
6. [Data Models & Database](#6-data-models--database)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Multi-Tenancy](#8-multi-tenancy)
9. [Features & Functionalities](#9-features--functionalities)
   - 9.1 Authentication & User Management
   - 9.2 Dashboard & Analytics
   - 9.3 Point of Sale (POS)
   - 9.4 Inventory Management
   - 9.5 Purchasing & Supply Chain
   - 9.6 Sales Orders & Returns
   - 9.7 Product Management
   - 9.8 Accounting & Financials
   - 9.9 Reports
   - 9.10 CRM & Customer Management
   - 9.11 Inquiry Management
   - 9.12 Reminders & Scheduling
   - 9.13 Email System
   - 9.14 FBR (Tax Authority) Integration
   - 9.15 Licensing & Subscriptions
   - 9.16 Storefront (Public Web)
   - 9.17 Logging & Auditing
   - 9.18 Offline Sync & Desktop
   - 9.19 Dynamic Menu & Permissions
   - 9.20 Import/Export
   - 9.21 Table Settings (Grid Customization)
   - 9.22 Calendar View
10. [Frontend Design](#10-frontend-design)
11. [Deployment & DevOps](#11-deployment--devops)
12. [Testing](#12-testing)
13. [Performance Considerations](#13-performance-considerations)
14. [Known Issues & Risks](#14-known-issues--risks)
15. [Enhancement Opportunities](#15-enhancement-opportunities)
16. [Documentation Inventory](#16-documentation-inventory)
17. [Project Roadmap Context](#17-project-roadmap-context)
18. [Appendix: Entity Catalog](#appendix-entity-catalog)

---

## 1. Executive Summary

MILPOS is a **comprehensive, multi-tenant Point of Sale (POS) system with integrated Inventory Management, Accounting, Purchasing, CRM, and Reporting** — an enterprise-grade retail operations platform. The system supports **two deployment modes**:

- **Cloud mode**: Multi-tenant web application using PostgreSQL/SQL Server with subdomain-based tenant resolution
- **Desktop mode**: Offline-capable Electron application with embedded ASP.NET Core API, using SQLite for local storage with cloud synchronization

The system is built on **Clean Architecture** with **CQRS + MediatR** backend patterns and an **Angular 20** frontend. It provides a complete retail lifecycle from product catalog management and stock control to sales, purchasing, accounting, customer relationship management, and statutory tax (FBR - Pakistan) compliance.

The application is authored by **Waqar Habib** (Architect and Developer) with **Muhammad Illyas** as the stakeholder and primary client.

---

## 2. System Overview

### 2.1 Purpose
MILPOS is designed to streamline full retail operations for small-to-medium businesses, covering:
- **POS** (Point of Sale) terminal operations with barcode scanning
- **Inventory** tracking across multiple business locations with batch and expiry management
- **Accounting** with double-entry ledger, financial reporting, payroll, and loans
- **Purchasing** from suppliers with a full requisition → order → receipt → return pipeline
- **CRM** with customer records, inquiry tracking, and customer ledgers
- **Reporting** across sales, purchases, inventory, expenses, taxes, and financial statements

### 2.2 Target Users & Roles

| Role | Description |
|---|---|
| **Super Admin** | Platform owner: manages all tenants, subscriptions, licenses |
| **Tenant Admin** | Business owner: full control of their tenant's configuration |
| **Store Manager** | Operational management: sales, inventory, staff oversight |
| **Accountant** | Financial management: ledgers, payroll, tax, closing |
| **Cashier** | Daily POS operations: take orders, process payments |
| **Inventory Clerk** | Stock operations: GRN, stock counting, adjustments, transfers |

### 2.3 Repository Structure

```
pos-with-inventory-management/
├── SourceCode/
│   ├── SQLAPI/                    # ASP.NET Core backend (Clean Architecture)
│   │   ├── POS.sln                # Solution file
│   │   ├── POS.API/               # Web host / API / Controllers
│   │   ├── POS.Common/            # UoW, Generic Repository, Dapper accessor
│   │   ├── POS.Data/              # Entities, DTOs, Enums
│   │   ├── POS.Domain/            # DbContext, tenant providers, sync engine, FBR services
│   │   ├── POS.Helper/            # ServiceResponse, file storage, security services
│   │   ├── POS.Repository/        # EF Core data access (190+ files)
│   │   ├── POS.MediatR/           # CQRS handlers (332 handlers, 736 files)
│   │   ├── POS.DataMigrationUtility/   # Standalone migration tool
│   │   ├── POS.Migrations.Sqlite/      # SQLite EF migrations
│   │   ├── POS.Migrations.SqlServer/   # SQL Server EF migrations
│   │   ├── POS.Migrations.PostgreSQL/  # PostgreSQL EF migrations
│   │   └── ApiAndQueriesProfiler/      # Custom performance profiler
│   ├── Angular/                   # Angular 20 frontend + Electron shell
│   ├── Documents/                 # Internal dev docs
│   ├── Mockups/                   # UI design mockups
│   ├── SeedData/                  # Database seed data
│   ├── Backups/                   # Data backups
│   └── Publish/                   # Build output
├── Documentation/                 # Strategy, BRD, enhancement plans
├── Deployment-Kit/                # Deployment resources
├── *.ps1                           # Build, deploy, and utility scripts
└── DETAILED_UNDERSTANDING.md      # This document
```

---

## 3. Architecture

### 3.1 Backend Architecture (Clean Architecture + CQRS)

The backend follows a strict layered Clean Architecture pattern with CQRS (Command Query Responsibility Segregation) via MediatR:

```
┌──────────────────────────────────────────────────────────────┐
│                      Presentation Layer                      │
│                   POS.API (Controllers, Middleware)          │
├──────────────────────────────────────────────────────────────┤
│                    Application Layer                         │
│      POS.MediatR (Commands, Queries, Handlers, Validators)   │
├──────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│      POS.Repository (EF Core)  |  POS.Domain (DbContext)     │
├──────────────────────────────────────────────────────────────┤
│                      Domain Layer                            │
│      POS.Data (Entities)  |  POS.Common (UoW, Repo)          │
│      POS.Helper (Utilities, FileStorage)                     │
└──────────────────────────────────────────────────────────────┘
```

**Dependency direction:** Inward only. Controllers depend on MediatR. MediatR handlers depend on Repository/Domain/Data. Domain entities have zero dependencies.

### 3.2 Frontend Architecture

- **Angular 20** with **Standalone components** (new Angular style, no NgModules for most features)
- **Angular Material** for UI components
- **Bootstrap 5** for layout/styling
- **NgRx SignalStore** (`@ngrx/signals`) for state management
- Lazy-loaded feature routes
- **Electron** shell for desktop distribution (with embedded .NET API process)

### 3.3 Key Design Patterns

| Pattern | Application |
|---|---|
| **CQRS** | Commands for writes, Queries for reads, segregated via MediatR |
| **Repository** | Per-aggregate repositories in POS.Repository |
| **Unit of Work** | `IUnitOfWork<T>` abstraction around DbContext for transaction management |
| **Strategy** | `ITransactionStrategy`/`IPaymentStrategy` factories for accounting operations |
| **Pipeline Behaviors** | Caching behavior + FluentValidation behavior on MediatR pipeline |
| **Global Query Filters** | EF Core for multi-tenant data isolation + soft-delete filtering |
| **Feature Flags** | `Features:Dapper` config to toggle EF vs Dapper for queries |
| **AutoMapper** | Entity ↔ DTO mapping |
| **FluentValidation** | Command/query validation |

---

## 4. Technology Stack

### 4.1 Backend
| Technology | Version/Detail |
|---|---|
| Language | C# (.NET 10.0) |
| Framework | ASP.NET Core Web API |
| ORM | EF Core 10.0.2 (3 providers: SQLite, SQL Server, PostgreSQL) |
| Micro-ORM | Dapper 2.1.72 (for performance-critical queries) |
| Query Builder | SqlKata (database-agnostic Dapper migration standard) |
| CQRS | MediatR 14 |
| Mapping | AutoMapper 14 |
| Validation | FluentValidation 12 |
| Background Jobs | Hangfire (multi-provider: SQLite/PostgreSQL/SqlServer) |
| Email | MailKit |
| Auth | JWT Bearer + API Key + X-Tenant-ID, HMAC-SHA256 |
| Real-time | SignalR (UserHub) |
| Excel Handling | EPPlus |
| CSV | CsvHelper |
| QR Codes | QRCoder (for FBR e-invoicing) |
| Logging | NLog |

### 4.2 Frontend
| Technology | Version/Detail |
|---|---|
| Framework | Angular 20.2 |
| UI Library | Angular Material 20 |
| CSS | Bootstrap 5.3, SCSS |
| State | NgRx Store (installed, minimal use) + NgRx SignalStore |
| Charts | ECharts (ngx-echarts), Chart.js |
| Calendar | FullCalendar 6.1 |
| PDF Generation | jsPDF + jsPDF-autotable |
| Barcode | JsBarcode |
| Excel | SheetJS (xlsx) |
| HTTP | HttpClient + Axios |
| Real-time | @microsoft/signalr 9 |
| i18n | @ngx-translate |
| WYSIWYG Editor | ngx-editor |
| Image Processing | Jimp, html2canvas |
| Desktop | Electron 40, electron-builder, electron-updater |

### 4.3 Databases
| Database | Usage |
|---|---|
| **PostgreSQL** | Primary cloud multi-tenant database |
| **SQL Server** | Alternative enterprise cloud database |
| **SQLite** | Desktop/offline mode, local storage `POSDb.db`, IndexedDB in browser |

### 4.4 Database Provider Selection
The `appsettings.json` → `DatabaseProvider` config determines which provider, migration assembly, and SqlKata compiler (`PostgresCompiler`, `SqlServerCompiler`, or `SqliteCompiler`) are injected.

---

## 5. Backend Design

### 5.1 Solution Projects (12 total)

| Project | Description |
|---|---|
| `POS.Common` | Unit of Work, generic repository, Dapper accessor, constants (`AppConstants`) |
| `POS.Data` | Entities (287 files), DTOs, Enums, Resources |
| `POS.Helper` | `ServiceResponse<T>`, `PathHelper`, `FileStorageService`, `AesOperation`, `ImageHelper`, `PagedList`, security/CSV services |
| `POS.Domain` | `POSDbContext` (1520 lines, 90 DbSet), tenant providers, sync engine, FBR services, import/export services |
| `POS.Repository` | ~190 files: per-aggregate EF Core repositories |
| `POS.MediatR` | 736 source files, **332 CQRS handlers**, validators, behaviors |
| `POS.API` | Web host, **80+ controllers**, middleware, `UserHub` SignalR hub, Swagger |
| `POS.DataMigrationUtility` | Standalone DB migration tool |
| `POS.Migrations.{Sqlite, SqlServer, PostgreSQL}` | Per-provider EF migrations |
| `Tests\POS.API.Tests` | xUnit + Moq + WebApplicationFactory integration tests |
| `ApiAndQueriesProfiler` | EF Core interceptor + middleware for diagnostics |

### 5.2 Dependency Injection

- `POS.API\Helpers\DependencyInjectionExtension.cs` registers **~100 scoped services** centrally
- `Startup.cs` registers MediatR (assembly `POS.MediatR`), pipeline behaviors, FluentValidation, tenant providers, sync services, Identity, AutoMapper, Hangfire, CORS, SignalR, Swagger

### 5.3 Middleware Pipeline (Startup.cs order)

```
UseApiAndQueriesProfiler
  → UseDeveloperExceptionPage
  → GlobalExceptionHandlerMiddleware
  → UseSwagger (+UI)
  → UseStaticFiles
  → CORS (Cloud or Desktop policy)
  → UseHttpsRedirection (cloud only)
  → UseAuthentication
  → ApiKeyAuthenticationMiddleware
  → TenantResolutionMiddleware (cloud only)
  → UseSession
  → UseRouting
  → UseAuthorization
  → TrialEnforcementMiddleware
  → UseResponseCompression
  → endpoints (controllers + SignalR)
```

### 5.4 API Response Wrapping

All controllers extend `BaseController` which wraps responses in **`ServiceResponse<T>`**, providing a consistent `{ data, success, message, statusCode }` envelope.

---

## 6. Data Models & Database

### 6.1 Base Entities

- **`BaseEntity`**: `Id`, `TenantId`, `CreatedBy`, `ModifiedBy`, `CreatedDate`, `ModifiedDate`, `IsDeleted`, `SyncVersion` — all tenant-scoped entities derive from this
- **`SharedBaseEntity`**: global shared data (countries, cities, currencies) with only soft-delete filtering

### 6.2 Entity Catalog (Grouped by Aggregate)

#### Identity & Security
`User`, `Role`, `UserClaim`, `UserRole`, `UserLogin`, `UserToken`, `UserLocation`, `RoleClaim`, `LoginAudit`, `Action`, `Page`, `MenuItem`, `MenuItemAction`, `RoleMenuItem`

#### Multi-Tenancy
`Tenant`, `CompanyProfile`, `License`

#### Product & Inventory
`Product`, `ProductTax`, `ProductStock`, `DailyProductPrice`, `InventoryBatch`, `Brand`, `Variant`, `VariantItem`, `UnitConversation`, `ProductCategory`, `DamagedStock`, `StockTransfer`, `StockTransferItem`

#### Sales
`SalesOrder`, `SalesOrderItem`, `SalesOrderItemTax`, `SalesOrderPayment`
Statuses: `SalesOrderStatus`, `SalesDeliveryStatus`

#### Purchasing
`PurchaseOrder`, `PurchaseOrderItem`, `PurchaseOrderItemTax`, `PurchaseOrderPayment`
Statuses: `PurchaseOrderStatus`, `PurchaseDeliveryStatus`, `PurchaseSaleItemStatusEnum`

#### Accounting
`AccountingEntry`, `LedgerAccount`, `Transaction`, `TransactionItem`, `TransactionItemTax`, `PaymentEntry`, `StockAdjustment`, `TaxEntry`, `FinancialYear`, `Payroll`, `LoanDetail`, `LoanRepayment`, `CustomerLedger`

#### CRM & CMS
`Customer` (+ `ContactAddress`), `Supplier` (+ `SupplierAddress`), `Inquiry`, `InquiryActivity`, `InquiryNote`, `InquiryProduct`, `InquirySource`, `InquiryStatus`, `InquiryAttachment`, `ContactUs`, `ContactRequest`

#### Reminders
`Reminder`, `DailyReminder`, `QuarterlyReminder`, `HalfYearlyReminder`, `ReminderScheduler`, `ReminderNotification`, `ReminderUser`

#### Email
`EmailTemplate`, `EmailLog`, `EmailLogAttachment`, `EmailSMTPSetting`, `SendEmail`

#### Lookups / Global
`Country`, `City`, `Currency`, `Language`, `Location`, `Tax`, `PaymentMethod`, `PaymentStatus`, `Operator`, `Pagehelper`, `TableSetting`

#### Syncing
`EntityChange`, `SyncLog`, `SyncMetadata`

#### FBR (Tax)
`FBRSubmissionLog`, `FBRSubmissionStatus`

#### Cross-cutting
`NLog`, `Expense`, `ExpenseCategory`, `ExpenseTax`

### 6.3 Database Configuration — POSDbContext (1520 lines)

- Extends `IdentityDbContext<User, Role, Guid, UserClaim, UserRole, UserLogin, RoleClaim, UserToken>`
- **90 DbSet** properties covering all aggregates
- **`ApplyTenantQueryFilters`**: Global `TenantId == CurrentTenantId && !IsDeleted` filter on every `BaseEntity`, EXCEPT global entities (`Country`, `City`, `Currency`) which use only the not-deleted filter
- **SaveChanges interception**: Auto-stamps `TenantId` (only if empty), `CreatedBy/ModifiedBy`, `CreatedDate/ModifiedDate`
- SQLite `NOCASE` collation for user lookup

### 6.4 Indexing Strategy

Comprehensive `Database_Indexing_Strategy.md` defines:
- Every `BaseEntity` must have at minimum a non-unique index on `TenantId`
- Preferred composite pattern: `(TenantId, [SearchColumn])`
- Critical uniques:
  - `User`: `(TenantId, Email)`, `(TenantId, UserName)`
  - `Product`: `(TenantId, Code)`
  - `ProductStock`: `(TenantId, ProductId, LocationId)`
  - `SalesOrder`: `(TenantId, OrderNumber)`
  - `PurchaseOrder`: `(TenantId, OrderNumber)`
  - `Customer`: `(TenantId, Email)`, `(TenantId, MobileNo)`

---

## 7. Authentication & Authorization

### 7.1 Authentication Schemes (Multi-Scheme)

**1. JWT Bearer** (primary web/cloud auth)
- Custom scheme "JwtBearer", HMAC-SHA256 symmetric key
- `OnTokenValidated` populates `UserInfoToken` (Id from `sub` claim, Email, locationIds) into DI scoped context
- Token lifetime: 720 minutes (12 hours) default
- Claims embedded: `USR_*`, `PRO_*`, `SO_*`, `isSuperAdmin`, `TenantId`, `locationIds`, `licensekey`, `purchasecode`, `ApiKey`

**2. X-API-Key** (API/sync clients)
- `ApiKeyAuthenticationMiddleware` validates `X-API-Key` header against `Tenants.ApiKey`
- Stamps `TenantId`, `SyncClient`, `SyncAgent` claims
- Updates `ApiKeyLastUsedDate`

**3. X-Tenant-ID** (desktop/super-admin impersonation)
- For desktop clients and cross-tenant super-admin operations
- Validates tenant exists + active, sets `Items["TenantId"]`

### 7.2 Authorization

- **`ClaimCheckAttribute`**: Action filter decoding the JWT, denies 403 unless required claim == "true" (e.g., `[ClaimCheck("USR_ADD_USER")]`)
- **`SuperAdminPolicy`**: Claims-based policy for `isSuperAdmin == true`
- **Role-based menu rendering**: `BuildUserAuthObject` combines user claims + role claims to build the dynamic menu tree returned at login

### 7.3 Login Flow

```
1. Username/Email lookup
2. SignInManager password check
3. LoginAudit recorded (IP address, success/failure)
4. UserInfoToken built (claims + menus)
5. Returns UserAuthDto with BearerToken + permissions
```

### 7.4 Password Reset Flow

- `POST forgotpassword` → sends reset link via email
- `GET resetpassword/{token}` → validates token
- `POST recoverpassword/{token}` → sets new password

---

## 8. Multi-Tenancy

### 8.1 Isolation Strategy
**Shared Database, Shared Schema** with `TenantId` discriminator column on all business tables. Isolation is enforced entirely at the application layer via EF Core **Global Query Filters**.

### 8.2 Tenant Resolution Priority
1. **JWT claim** `TenantId` (logged-in users)
2. **`X-Tenant-ID` header** (login endpoint, public endpoints, third-party sync, super-admin impersonation)
3. **Subdomain** (e.g., `tenant-a.pos-system.com`) parsed by `TenantResolutionMiddleware`

### 8.3 Tenant Provisioning
- `TenantRegistrationService` — register new tenants
- `TenantDataCloner` — clone master data (products, categories, defaults) per tenant
- `TenantInitializationService` — set up tenant baseline
- `TenantDataMigrationService` — migrate legacy single-tenant data into tenant scope

### 8.4 Tenant Context Providers
- **`TenantProvider`** (cloud): `_tenantId` field → JWT `TenantId` claim → SuperAdmin `X-Tenant-ID` impersonation
- **`SingleTenantProvider`** (desktop): cached first tenant, fallback fixed GUID

### 8.5 License & Trial Enforcement
- `TrialEnforcementMiddleware` enforces trial/license state
- Checks `CompanyProfile` license state (cached 10 min)
- Checks `License` table (Active status)
- Checks tenant `SubscriptionPlan == "Master"` or `LicenseType` (Paid/Trial) vs `TrialPeriodDays`
- Blocks POST/PUT/DELETE with 403 `isTrialExpired` when expired
- Allowlist for auth, sync, license, registration endpoints

### 8.6 Super Admin Capabilities
- `TenantsController` with SuperAdminPolicy:
  - CRUD tenants
  - `{id}/switch` — impersonation token
  - `{id}/license/generate` — generate licenses
  - `{id}/export-sqlite` — export tenant DB as zip

---

## 9. Features & Functionalities

### 9.1 Authentication & User Management
**Backend:** `UserController`, `AuthenticationController`
**Frontend:** `login/`, `user/`, `role/` modules

- Login with username/email + password
- Token refresh via long-lived JWT
- Password change & recovery (email-based)
- User profile with photo upload
- User CRUD with role assignment
- Role CRUD with granular claim-based permissions
- User location assignment (multi-location support)
- Login audit trail (who, when, from where)
- Paginated user listing with search/filter
- `X-Pagination` response headers for grid pagination

### 9.2 Dashboard & Analytics
**Backend:** `DashboardController` + `POS.MediatR/Dashboard/` handlers
**Frontend:** `dashboard/` module

Widgets:
- **Statistics**: total sales, purchases, expenses, profit (period comparison)
- **Best Selling Products**: ranked by revenue/quantity
- **Recent Sales Order Shipments**: real-time view of recently shipped orders
- **Recent Purchase Order Deliveries**: GRN activity
- **Product Stock Alerts**: low-stock items requiring reorder
- **Income Comparison**: period-over-period income analysis
- **Sales vs Purchase Report**: revenue vs. procurement comparison
- **Product Sales Comparison**: product-level trends
- **Reminders**: one-time, daily, weekly, monthly, quarterly, half-yearly, yearly notifications

Performance optimization: Dapper-backed queries for heavy aggregation widgets with `Task.WhenAll` parallelization + `AsNoTracking()`.

### 9.3 Point of Sale (POS)
**Backend:** `SalesOrderController` (POS-related endpoints)
**Frontend:** `pos/` module (route `pos` with resolvers)

- **Touch-friendly interface** for cashier operations
- **Barcode scanning** support
- Product grid with search (name, code, barcode)
- **Multiple payment methods**: cash, card, bank transfer, credit
- **Partial payments** with payment tracking
- **Hold/Resume transactions** for interrupted sales
- **Sales Order Request → Sales Order** workflow
- Tax calculation per line item with item-level tax records
- **FBR e-invoice** submission (Pakistan tax compliance)
- **FBR QR code** generation printed on receipts
- Receipt printing (barcode, invoice number, FBR invoice number)
- Discounts and price overrides (permission-controlled)
- Shopping cart with quantity adjustment
- Customer selection for credit sales
- `newOrderNumber` generation (sequential per tenant)
- Sales return handling with `returnItems` endpoint

### 9.4 Inventory Management
**Backend:** `ProductStockController`, `StockController`, `StockTransferController`, `InventoryBatchController`, `PricingController`, `InventoryHistory`
**Frontend:** `inventory/`, `stock-transfer/`, `damaged-stock/`, `daily-price-manager/`, `barcode-generator/` modules

- **Multi-location stock** tracking (per-location quantities)
- **Batch tracking** with manufacturing & expiry dates (`InventoryBatch`)
- **Stock transfers** between locations (`StockTransfer` with items)
- **Stock adjustments** (increase/decrease with reason)
- **Damaged stock** management and write-off
- **Low-stock alerts** with threshold configuration
- **Opening stock** setup on product creation
- **Daily Price Manager** for volatile commodities (commodity pricing with multi-day price lists)
- **Cost price / Sales price / MRP (Maximum Retail Price)** triple pricing
- **Unit conversions** between base and secondary units
- **Barcode generation** and label printing (JsBarcode)
- **Inventory history** — full audit trail of stock movements
- **Stock report** generation

### 9.5 Purchasing & Supply Chain
**Backend:** `PurchaseOrderController`, `PurchaseOrderPaymentController`, `SupplierController`
**Frontend:** `purchase-order/`, `purchase-order-request/`, `purchase-order-return/`, `supplier/` modules

Workflow:
```
Purchase Request → Purchase Order → Goods Receipt (GRN) → Purchase Return
```

- **Supplier management** with addresses, contact info
- **Purchase Order Request** creation and approval
- **Purchase Order** with multiple line items, taxes
- **Partial deliveries** tracking (GRN on part-receive)
- **Purchase Order Payment** processing (full/partial)
- **Purchase Returns** with item-level tracking
- **Purchase Order Reports**: item-level, date-range
- **Pending Purchase Orders** view
- **Recent deliveries** dashboard feed

### 9.6 Sales Orders & Returns
**Backend:** `SalesOrderController` (20+ endpoints)
**Frontend:** `sales-order/`, `sales-order-request/`, `sale-order-return/`, `customer-sales-order/`, `customer-payment` modules

- **Sales Order Request** workflow (pre-order capture)
- **Sales Order** with multiple line items
- **Item-level taxes** (`SalesOrderItemTax`)
- **Sales Order Payments** (full/partial/credit)
- **Sales Returns** with full item-level processing
- **Sales delivery status** tracking
- **Customer pending payments** monitoring
- **New order number generation** (sequential, per tenant)
- **Tax/Profit/Loss** computation per order
- **Pending sales orders** queue
- **Customer payment** history

### 9.7 Product Management
**Backend:** `ProductController`, `ProductCategoryController`, `TaxController`, `BrandController`, `VariantController`, `UnitConversationController`
**Frontend:** `product/`, `product-category/`, `tax/`, `brand/`, `variants/`, `unit-conversation/` modules

- **Product CRUD** with SKU, barcode, code
- **Product variants** (parent-child: size, color, etc.)
- **Brands** management
- **Categories** (hierarchical)
- **Per-product tax** assignment (`ProductTax`)
- **Unit conversions** (base unit ↔ conversion unit)
- **Pricing**: cost, sale, MRP
- **Multi-location stock** per product
- **Barcode printing** with labels
- **Product dropdowns** for forms
- **Import/Export** products via CSV/Excel
- **Product resource parameters** for filtering (SKU, name, category, brand, etc.)

### 9.8 Accounting & Financials
**Backend:** `Accounting/` controllers + `POS.MediatR/Accouting/` handlers + Strategy pattern
**Frontend:** `accounting/`, `pay-roll/`, `customer-ladger/` modules

#### Chart of Accounts & Ledger
- `LedgerAccount` hierarchy
- **Double-entry accounting** via `LedgerAccount` and `AccountingEntry`

#### Transactions with Strategy Pattern
Different transaction types have dedicated accounting strategies via `ITransactionStrategy` + `ITransactionStrategyFactory`:
- **SaleStrategy** — revenue recognition for sales
- **PurchaseStrategy** — cost recognition for purchases
- **SaleReturnStrategy** — reversal of sales
- **PurchaseReturnStrategy** — reversal of purchases
- **ExpenseStrategy** — expense booking
- **StockAdjustmentStrategy** — inventory valuation adjustments
- **FullPaymentStrategy** — full payment settlement
- **PartialPaymentStrategy** — partial payments
- **PayrollStrategy** — salary disbursement
- **LoanStrategy** — loan disbursement/repayment

#### Financial Statements & Reports
- **Trial Balance** (`GetTrialBalanceCommand`)
- **Balance Sheet** (`GetBalanceSheetReportCommand`)
- **Profit & Loss** (`GetProfitLossReportCommand`)
- **Cash Flow** (`GetCashFlowReportCommand`)
- **Cash & Bank** (`GetCashBankReportCommand`)
- **General Entry** (`GetGeneralEntryCommand`)
- **Ledger Account Balances** (`GetLedgerAccountBalancesCommand`)
- **Payment Entry Lists** (`GetPaymentEntryListCommand`)
- **Tax Report** (`GetTaxReportCommand`)

#### Other Financial Features
- **Financial Year** management (`FinancialYear`)
- **Year-End Closing** (`YearEndClosing`)
- **Payroll** processing (`Payroll`)
- **Loans** with repayment schedules (`LoanDetail`, `LoanRepayment`)
- **Customer Ledger** — per-customer A/R tracking
- **Expense tracking** with categories and taxes
- **Daily Reports**

### 9.9 Reports
**Frontend:** `reports/` module

Available reports (all with date-range filtering, CSV/Excel export, print):
- **Sales Order Report**
- **Sales Order Items Report**
- **Purchase Order Report**
- **Purchase Order Items Report**
- **Sales Payment Report**
- **Purchase Payment Report**
- **Customer Payment Report**
- **Supplier Payments Report**
- **Product Sales Report**
- **Product Purchase Report**
- **Profit & Loss Report**
- **Expense Report**
- **Expense Tax Report**
- **Input Tax Report**
- **Output Tax Report**
- **Stock Report**
- **Inventory History Report**

### 9.10 CRM & Customer Management
**Backend:** `CustomerController`, `SupplierController`, `CustomerLedgerController`
**Frontend:** `customer/`, `supplier/` modules

- **Customer records** with contact addresses
- **Customer ledgers** (A/R tracking)
- **Credit limits** per customer
- **Customer pending payments**
- **Supplier records** with addresses
- **ContactUs** and **ContactRequest** CMS forms (public)
- **Customer/Site public forms**

### 9.11 Inquiry Management
**Backend:** `InquiryController`, `InquiryActivityController`, `InquiryAttachmentController`, `InquiryNoteController`, `InquirySourceController`, `InquiryStatusController`
**Frontend:** `inquiry/`, `inquiry-source/`, `inquiry-status/` modules

- **Inquiry** tracking with products, statuses, sources
- **Inquiry activities** — timeline of interactions
- **Inquiry notes** — internal/external notes
- **Inquiry attachments** — file uploads
- **Inquiry status** & **source** management (customizable)
- **Inquiry tasks** with assignments
- **Inquiry product** association

### 9.12 Reminders & Scheduling
**Backend:** `ReminderController`, `ReminderSchedulerController`
**Frontend:** `reminder/`, `calendar-view/` modules

- **One-time reminders**
- **Recurring reminders**: daily, weekly, monthly, quarterly, half-yearly, yearly
- **Reminder scheduling** with Hangfire background jobs (dedicated `reminder` queue)
- **Reminder notifications** to users
- **Calendar view** (FullCalendar) for visualization
- **Reminder users** — assignment/notification routing

### 9.13 Email System
**Backend:** `EmailController`, `EmailTemplateController`, `EmailLogController`
**Frontend:** `email-send/`, `email-template/`, `email-smtp-setting/`, `email-logs/` modules

- **SMTP settings** (per tenant: host, port, credentials, security)
- **Email templates** with variables
- **Send email** with attachments
- **Email logs** with attachment tracking
- Email uses MailKit library

### 9.14 FBR (Federal Board of Revenue) Integration
**Backend:** `FBRController`, `FBRInvoiceService`, `FBRQRCodeService`
**Frontend:** FBR submission status views

- **Real-time invoice submission** to Pakistan's FBR e-invoicing system
- Endpoint: `https://esp.fbr.gov.pk:8244/FBR/v1/api/Live/PostData`
- **FBR QR code** generation for receipts (with FBR invoice number)
- **FBR submission logs** with status tracking
- **Background retry/sync service** (`FBRSyncBackgroundService`)
- Commands: `SubmitFBRInvoiceCommand`, status query per `SalesOrderId`

### 9.15 Licensing & Subscriptions
**Backend:** `WrLicenseController`, `TenantsController` (license endpoints)
**Frontend:** `activate-license/`, `subscription/`, `remove-license-key/` modules

- **License key validation** (`ValidateLicenseCommand`)
- **License generation** by Super Admin
- **Subscription plan** management (Master, paid, trial)
- **Trial period** enforcement with grace days
- **License state caching** (10 min)
- **Activation/license removal** UI

### 9.16 Storefront (Public Web)
**Backend:** `StoreController` (MVC views)
**Frontend:** server-rendered storefront

- **Public storefront** at `store/{tenantName}`
- **Session-based cart** (add-to-cart, checkout)
- **`[StoreTenant]` filter** resolves tenant from route
- Live customer-facing ordering capability

### 9.17 Logging & Auditing
**Backend:** `NLogController`, `LoginAuditController`
**Frontend:** `n-log/`, `login-audit/` modules

- **NLog** structured logging (file + database)
- **NLog viewer** — browse application logs in UI
- **Login audit** — track all login attempts (success/failure, IP)
- **Email logs** — email delivery tracking
- **Entity sync logs** — sync operation records

### 9.18 Offline Sync & Desktop
**Backend:** `SyncController`, `SyncEngine`, `EntityChange`, `SyncLog`, `SyncMetadata`
**Desktop:** Electron app (main.js, preload.js, encryption.js)

- **Cloud-to-desktop sync**: desktop app downloads tenant database to local SQLite
- **Bi-directional sync**: changes tracked via `EntityChange`, synced with `modifiedSince` metadata
- **Conflict resolution**: `ConflictResolutionService` (ServerWins default)
- **Device identification**: `DeviceIdentifier` hardware-based
- **Cloud API Client**: `CloudApiClient` (HttpClient REST to cloud URL)
- **Automated DB migration**: API runs `context.Database.Migrate()` on startup for SQLite
- **Credential encryption**: DPAPI (`@primno/dpapi`) encrypts auth tokens in `auth.json`
- **Auto-update**: `electron-updater` with GitHub Releases provider (differential updates via blockmaps)
- **Splash/download progress** UI for first-time DB provisioning
- **`ExportTenantToSqliteCommand`**: server-side export of tenant DB as zip download

### 9.19 Dynamic Menu & Permissions
**Backend:** `MenuItemController`, `Role` + claim infrastructure
**Frontend:** `menu/`, `role/` modules

- **`MenuItem` / `MenuItemAction` / `RoleMenuItem`** — fully dynamic menu tree
- **`MenuItemSeedingService`** — seed default menus
- **`ProcessMenuDeduplication`** — avoid duplicate menu entries
- **Menu tree built at login** based on user's roles and claims
- **Super Admin** can manage menus and role permissions via UI

### 9.20 Import/Export
**Backend:** `ImportExportController`
**Frontend:** `core/services/import-export.service.ts`

- **Import products** from CSV/Excel (EPPlus + CsvHelper)
- **Import customers**
- **Import suppliers**
- **Export templates** download
- **Validation** on import (invalid rows reported)
- **Export data** to Excel/CSV

### 9.21 Table Settings (Grid Customization)
**Backend:** `TableSettingsController`
**Frontend:** `table-setting/` module

- Per-screen column visibility/shown columns configuration
- `TableSetting` entity stores JSON of grid settings
- `TableSettingsGuard` guards access

### 9.22 Calendar View
**Frontend:** `calendar-view/` module

- Reminder/scheduling visualization via FullCalendar
- Day/Month/Agenda views
- Integrated with reminder system

---

## 10. Frontend Design

### 10.1 Module Structure (60 feature modules/folders)

**Core modules:**
`core/` (layout, header, sidebar, footer, guards, interceptors, services, error handling, domain classes)

**Feature modules:**
`accounting/`, `activate-license/`, `barcode-generator/`, `brand/`, `business-location/`, `calculator/`, `calendar-view/`, `city/`, `company-profile/`, `country/`, `customer/`, `customer-ladger/`, `customer-sales-order/`, `daily-price-manager/`, `damaged-stock/`, `dashboard/`, `email-logs/`, `email-send/`, `email-smtp-setting/`, `email-template/`, `expense/`, `expense-category/`, `forgot-password/`, `inquiry/`, `inquiry-source/`, `inquiry-status/`, `inventory/`, `languages/`, `login/`, `login-audit/`, `menu/`, `n-log/`, `notification/`, `page/`, `page-helper/`, `pay-roll/`, `pos/`, `product/`, `product-category/`, `purchase-order/`, `purchase-order-request/`, `purchase-order-return/`, `recover-password/`, `register-tenant/`, `reminder/`, `remove-license-key/`, `reports/`, `role/`, `sale-order-return/`, `sales-order/`, `sales-order-request/`, `shared/`, `stock-transfer/`, `subscription/`, `supplier/`, `table-setting/`, `tax/`, `tenant/`, `unit-conversation/`, `user/`, `variants/`

### 10.2 Routing (app.routes.ts, 641 lines)

- Public routes: `register`, `login`, `activate-license`, `subscription`, `forgot-password`, `reset-password/:link`, `error-msg`
- Authenticated routes under `LayoutComponent` shell (~60 routes), all lazy-loaded
- Each route has `claimType` for **claim-based access control** (e.g., `POS_POS`, `PRO_ADD_PRODUCT`, `REP_*`, `DB_*`)
- Route resolvers (e.g., `salesOrderUnitResolver`, `salesOrderTaxResolver`)
- Guards: `AuthGuard` (auth), `TableSettingsGuard` (grid settings access)
- Wildcard `**` → dashboard redirect

### 10.3 State Management & Services

**Services (in `core/services/`):**
- `SecurityService` — login, profile, claims, session persistence
- `CommonService` — shared data (locations, dropdowns)
- `CacheSyncService` — IndexedDB-based offline cache
- `IndexedDbService` — IndexedDB wrapper (`idb` library)
- `LoadingService` / `loading.interceptor` — global loading indicator
- `CacheInterceptor` — HTTP caching (tenant-scoped)
- `SignalRService` — real-time notifications (UserHub)
- `TranslationService` — i18n (English, Arabic, French, Spanish per BRD)
- `ThemeService` — theme management
- `ToastrService` — toast notifications
- `MenuService` — navigation/menu
- Plus feature-specific services (100+ domain services)

### 10.4 Interceptors
- **`cache.interceptor.ts`** — HTTP response caching (tenant-scoped cache keys)
- **`loading.interceptor.ts`** — global loading spinner
- **HTTP error handling** — centralized error service

### 10.5 Domain Classes
150+ TypeScript domain model files in `core/domain-classes/` mirroring the backend entities.

### 10.6 i18n
- `@ngx-translate` with JSON files in `public/i18n/`
- Supported languages per BRD: English, Arabic, French, Spanish

### 10.7 Desktop (Electron) Details
- `main.js` — window management, API process lifecycle, auth config encryption
- `preload.js` — contextBridge for cloud login IPC
- `encryption.js` — DPAPI-based token encryption
- `splash.html` / `setup-splash.html` — startup splash screens with progress
- `login-cloud.html` — first-run cloud login modal
- Cloud mode: downloads database zip from `/api/tenants/my-database`, extracts to local SQLite

---

## 11. Deployment & DevOps

### 11.1 Deployment Modes

**Cloud Deployment:**
- PostgreSQL (or SQL Server) on IIS/Azure/Kestrel
- Subdomain-based tenant routing
- `UseHttpsRedirection`, CORS Cloud policy
- PowerShell scripts: `publish-web.ps1`, `deploy-web-remote.ps1`

**Desktop Deployment:**
- Electron + embedded .NET 10 self-contained API (`win-x64`)
- SQLite local database
- Auto-updates via GitHub Releases
- PowerShell: `electron:package`, `electron:publish`

### 11.2 Build Scripts (root level)
- `build-only.ps1` — API build
- `configure_remote_deployment.ps1` — remote server configuration
- `deploy-web-remote.ps1` — remote web deployment
- `fix_migrations_*.ps1/py` — migration fixes
- `convert_v1_data.ps1` — legacy data conversion
- `server-setup.ps1`, `setup_server.ps1`, `setup-winrm.ps1` — server provisioning
- `generate_role_menus.js`, `update_namespaces.*`, `replace_import.py` — code utilities

### 11.3 CI/CD
- `.github/` workflows (noted in repo)
- `CONTRIBUTING.md` with contribution guidelines
- `publish-release.ps1` for automated GitHub Releases

### 11.4 Database Migrations
- Per-provider migration assemblies (`POS.Migrations.Sqlite/SqlServer/PostgreSQL`)
- In desktop mode, `context.Database.Migrate()` runs on startup (auto-schema-update)

---

## 12. Testing

### 12.1 Backend Tests (`Tests\POS.API.Tests`)
- **xUnit** + **Moq**
- **WebApplicationFactory** integration tests
- `TestWebApplicationFactory` using in-memory SQLite, seeding off
- Handler tests (e.g., `GetIncomeComparisonQueryHandlerTests` with Dapper)

### 12.2 Current Coverage (Limited)
- Only a handful of test files exist
- Migration flows, authentication, and multi-tenancy isolation are NOT adequately covered
- No frontend end-to-end (E2E) tests; only a few component `.spec.ts` files

### 12.3 Testing Strategy Docs
- `SourceCode/Documents/Testing` — testing documentation
- `Documentation/Strategy/BestApproach/04_The_Verification_Loop.md` — mandatory verification loop
- `Documentation/Strategy/BestApproach/03_Vertical_Slice_Execution.md` — micro-TDD guidance

---

## 13. Performance Considerations

### 13.1 Optimizations Already Applied
- **Dapper for heavy aggregate queries** (dashboard statistics, income comparison, best-selling, etc.) — feature-flagged via `Features:Dapper`
- **SqlKata** as standard for all Dapper SQL (database-agnostic)
- **Parallelized dashboard aggregates** with `Task.WhenAll` + `AsNoTracking()`
- **`AsSplitQuery()`** on deep EF Include graphs
- **Response compression** middleware
- **Caching behavior** in MediatR pipeline (tenant-scoped cache keys)
- **Pagination** with `X-Pagination` headers + `PagedList<T>`
- **Filtered indexes** recommended in indexing strategy
- **`ApiAndQueriesProfiler`** for query performance diagnostics

### 13.2 Identified Performance Issues (per `Database_Performance_Bottlenecks_Analysis.md`)
1. **Soft-delete + multi-tenancy indexing** (Critical): filtered indexes needed
2. **Missing FK indexes** on join tables (High)
3. **`Count()` vs `Any()`** (Medium): use AnyAsync where possible
4. **Massive AutoMapper payloads** (High): push mapping into SQL via `.Select()`/`.ProjectTo<T>()`
5. **String matching/collation** (Medium): ILike/trigram for PostgreSQL
6. **Cartesian explosion** — fixed with AsSplitQuery
7. **Sequential aggregate queries** — fixed with parallelization

---

## 14. Known Issues & Risks

### 14.1 Security Concerns
1. **Hardcoded credentials** *(INTENTIONAL — retained by design, will stay like this for a while)*: PostgreSQL password `ChangeMe123!` and SQL Server `sa/Admin@123` in `appsettings.json`. These are deliberately left in place and NOT to be treated as a bug.
2. **Credential exposure in `Optimization/Slow running Api.md`** *(INTENTIONAL — retained by design, will stay like this for a while)*: contains JWT tokens and a plaintext admin password. Deliberately left in the repo; not to be scrubbed or treated as an actionable issue.
3. **`GlobalExceptionHandlerMiddleware` leaks `exception.Message`** to clients — should be generic in production
4. **`JwtMiddleware` is dead no-op code** — should be removed
5. **`showCloudLogin()` has `devTools: false` comment but `openDevTools()` is explicitly called** — devtools always open in login window
6. **Empty GUID tenant fallback** `00000000-0000-0000-0000-000000000001` — some filters treat as null
7. **Electron `nodeIntegration: true, contextIsolation: false`** in `createMainWindow()` — security risk for desktop app

### 14.2 Code Quality Concerns
1. **`POS.Domain` has EF Core dependencies** (Accessing `Microsoft.EntityFrameworkCore` in Domain project) — violation of Clean Architecture; enhancement plan Phase 3 addresses this
2. **Controllers leaking `POSDbContext`** directly (`TenantsController`, `FBRController`, `InventoryBatchController`) — bypasses MediatR
3. **Multiple `SaveAsync()` calls without transactions** in several handlers (`UpdateExpenseCommandHandler`, `UpdatePurchaseOrderReturnCommandHandler`, `AddStockTransferCommandHandler`) — risk of partial commits
4. **DTO fragmentation**: 5+ variants of `ProductDto` (`ProductDto`, `ProductShortDto`, `DailyProductPriceDto`, `ProductStockDto`, `ProductInventoryStockDto`) causing mismatch
5. **`Enhancement/03_Domain_Entanglement_Refactoring.md` is truncated/corrupted** — content lost
6. **NgRx Store and Chart.js/axios declared but barely used** — unused dependencies

### 14.3 Documentation Inconsistencies
- BRD describes .NET 6/7/8; actual code is .NET 10
- BRD lists SQL Server/SQLite; code adds PostgreSQL as primary cloud DB
- Offline/desktop capability marked "to be confirmed" in BRD but fully implemented
- Strategy docs reference a separate project's paths (`d:\VibeCodingApproach\BestApproach`)

### 14.4 Test Coverage Risk
- Only a handful of tests; no coverage for auth, multi-tenancy isolation, accounting strategies, POS flows
- Frontend has almost no test coverage
- No E2E tests

---

## 15. Enhancement Opportunities

### 15.1 Critical / High-Priority (Architecture & Data Integrity)

**E1. Transaction Safety for Multi-Save Handlers**
- Wrap handlers that call `SaveAsync()` multiple times in explicit `BeginTransactionAsync`/`CommitTransactionAsync`/`RollbackTransactionAsync`
- Target: `UpdateExpenseCommandHandler`, `UpdatePurchaseOrderReturnCommandHandler`, `AddStockTransferCommandHandler`, and others
- Add integration tests that throw mid-handler and assert no partial commit

**E2. Clean Architecture Compliance (Domain Entanglement)**
- Remove `Microsoft.EntityFrameworkCore` usage from `POS.Domain`
- Migrate `POSDbContext`, `POSDbContextFactory`, `SingleTenantProvider`, `ChangeTrackingService`, `FBRInvoiceService` into `POS.Infrastructure` (new project) or `POS.Data`
- Update namespaces / imports accordingly
- Restore lost content of `Enhancement/03_Domain_Entanglement_Refactoring.md`

**E3. Controller Cleanup — Remove DbContext Leaks**
- Remove direct `POSDbContext` injection from `TenantsController`, `FBRController`, `InventoryBatchController`
- Replace with MediatR commands/queries + repositories + AutoMapper DTOs
- Standardize all controllers on `ServiceResponse<T>` wrapper
- Remove raw `new { error = ... }` anonymous object returns in `ImportExportController`/`DailyProductPriceController`

**E4. Security Hardening**
- *(Note: hardcoded DB passwords and the `Slow running Api.md` credentials are intentional and will remain for a while — excluded from this item.)*
- Make `GlobalExceptionHandlerMiddleware` return generic errors in production (log internals, don't expose `exception.Message`)
- Remove dead `JwtMiddleware` no-op
- Electron: enable `contextIsolation: true`, `nodeIntegration: false` in main window
- Add rate-limiting middleware to login endpoints
- Make `ClaimCheckAttribute` and auth flows audited with tests

**E5. Fundamental Testing Expansion**
- Establish the test infrastructure per the TDD strategy documents (already defined)
- Priority: authentication flows, multi-tenancy isolation (Tenant A data invisible to Tenant B), accounting strategies, POS checkout flow, FBR integration (mock), sync engine
- Add coverage gate in CI per the `BestApproach/04` quality targets

### 15.2 High-Priority (Functional & Business Value)

**E6. DTO Consolidation**
- Merge 5+ `ProductDto` variants using inheritance (`BaseProductDto`)
- Update AutoMapper profiles
- Mirror consolidated DTOs in Angular `product.model.ts`

**E7. Payments Integration**
- Add support for payment gateways (Stripe, Razorpay, JazzCash, Easypaisa)
- Digital wallet / QR payment options for POS

**E8. E-commerce Integration (Roadmap Item)**
- Shopify/WooCommerce sync for online sales
- Two-way inventory and order sync

**E9. AI-Powered Features**
- Demand forecasting for reorder suggestions (roadmap item in BRD)
- Intelligent low-stock prediction
- Sales anomaly detection

**E10. Advanced Reporting / BI**
- Custom report builder (user-defined fields + dimensions)
- Pivot-style analysis
- Export to scheduled emails

**E11. PDF Invoice / A4 Receipt Templates**
- Customizable invoice templates (branding, logo, layout)
- E-mail invoices automatically
- A4 / thermal / 80mm receipt formats

### 15.3 Medium-Priority (UX & Product)

**E12. Dynamic Theming Engine (already designed in `THEMING_STRATEGY.md`)**
- Implement CSS Custom Properties variable bridge
- ThemeService singleton with localStorage persistence
- Material multi-theme SCSS refactoring (Light/Blue, Dark/Purple, Light/Green)
- Settings → Appearance UI

**E13. Mobile Responsiveness**
- Touch-optimized POS layout already exists; extend responsive design to all modules
- Native mobile app via Capacitor (wrap Angular)

**E14. Notification Center**
- Extend beyond reminders: order status changes, stock alerts, due payments
- Web push notifications + in-app notification center

**E15. Keyboard Shortcuts & POS Efficiency**
- Configurable keyboard shortcuts for POS operations
- Quick-find product global search (Ctrl+K)

**E16. Offline PWA (Cloud Mode)**
- Service worker caching for reduced latency
- Partial offline capability with queued mutations

**E17. Audit Trail & Change History**
- Generic entity change history viewer
- Who-changed-what-when for all key business documents

### 15.4 Low-Priority / Backlog

**E18. Multi-currency & Multi-language refinements**
**E19. Barcode scanner configuration UI**
**E20. Bulk price update / seasonal pricing rules**
**E21. Supplier portal (self-service)**
**E22. Customer loyalty / rewards program**
**E23. Return merchandise authorization (RMA) workflows**
**E24. Cross-tenant analytics for Super Admin**
**E25. API versioning**
**E26. OpenAPI client generation for Angular**
**E27. Performance: filtered indexes + FK indexes migration**
**E28. Performance: `.ProjectTo<TDto>()` for high-traffic endpoints**
**E29. Webhooks for third-party integration (documented as future in API guide)**
**E30. Documentation: reconcile BRD with actual .NET 10 + PostgreSQL stack**

---

## 16. Documentation Inventory

| Document | Purpose |
|---|---|
| `README.md` | Quick start, architecture overview, standardization references |
| `AI_DECISIONS.md` | Durable technical decisions (ADR-style log) |
| `CONTRIBUTING.md` | Contribution guidelines, verification checklist |
| `Documentation/BRD.md` | Business Requirements Document (v1.0 draft) |
| `Documentation/DeveloperGuide.md` | Onboarding guide with code recipes |
| `Documentation/API_Integration_Guide.md` | Multi-tenant API integration guide (Chinese) |
| `Documentation/Database_Indexing_Strategy.md` | Multi-tenant index plan |
| `Documentation/Multitenancy_Migration_Plan.md` | Single→multi-tenant migration architecture |
| `Documentation/Migration_Operations_Manual.md` | Production migration runbook |
| `Documentation/THEMING_STRATEGY.md` | Dynamic theming engine plan |
| `Documentation/UPDATE_STRATEGY.md` | Electron auto-update strategy |
| `Documentation/Strategy/` | AI-Optimized Development methodology + BestApproach suite (12 docs) |
| `Documentation/Enhancement/` | Vibe Drift remediation master plan (4 phases) |
| `Documentation/Optimization/` | DB performance bottlenecks + slow API logs |
| `Documentation/Bugs/` | Store location dropdown bug remediation |
| `Documentation/Verification/` | Verification checklists |
| `SourceCode/Documents/Testing/` | Testing strategy |
| `SourceCode/Documents/Api Performance Issues/` | Dapper integration strategy + snippets |

---

## 17. Project Roadmap Context

### 17.1 Out-of-Scope (per BRD, potential future):
- E-commerce sync (Shopify/WooCommerce)
- Native mobile application
- AI demand forecasting

### 17.2 In-Progress / Planned:
- Multi-tenancy migration (docs complete, operational manual ready)
- Enhancement phases 1–4 (data integrity, controller cleanup, domain refactoring, DTO consolidation)
- Dynamic theming
- Dapper optimization (SqlKata standard already mandated)
- Indexed migration for filtered indexes

### 17.3 Development Methodology
The project follows the **"AI-Optimized Vibe Coding — Best Approach v2.1"** methodology:
- 6-Phase SDLC (Discovery → Vertical Slices → TDD Generation → State Machine Hardening → Adversarial Verification → Polish/Commit)
- Micro-TDD loop (acceptance criteria → failing tests → implement → refactor)
- Mandatory `AI_DECISIONS.md` per slice
- Drift detection every 3rd slice
- Atomic git commits (tests first, then implementation)

---

## Appendix: Entity Catalog

### Comprehensive list of all database entities by domain:

**Identity & Security (15):**
User, Role, UserClaim, UserRole, UserLogin, UserToken, UserLocation, RoleClaim, LoginAudit, Action, Page, MenuItem, MenuItemAction, RoleMenuItem

**Multi-Tenancy & Licensing (3):**
Tenant, CompanyProfile, License

**Product & Pricing (10):**
Product, ProductTax, ProductStock, DailyProductPrice, InventoryBatch, Brand, Variant, VariantItem, UnitConversation, ProductCategory

**Sales (4 + 2 status):**
SalesOrder, SalesOrderItem, SalesOrderItemTax, SalesOrderPayment, SalesOrderStatus, SalesDeliveryStatus

**Purchasing (4 + 3 status):**
PurchaseOrder, PurchaseOrderItem, PurchaseOrderItemTax, PurchaseOrderPayment, PurchaseOrderStatus, PurchaseDeliveryStatus, PurchaseSaleItemStatusEnum

**Accounting (12):**
AccountingEntry, LedgerAccount, Transaction, TransactionItem, TransactionItemTax, PaymentEntry, StockAdjustment, TaxEntry, FinancialYear, Payroll, LoanDetail, LoanRepayment

**CRM (4):**
Customer, ContactAddress, CustomerLedger, ContactRequest

**Suppliers (2):**
Supplier, SupplierAddress

**Inquiry (7):**
Inquiry, InquiryActivity, InquiryNote, InquiryProduct, InquirySource, InquiryStatus, InquiryAttachment

**Reminders & Scheduling (8):**
Reminder, DailyReminder, QuarterlyReminder, HalfYearlyReminder, ReminderScheduler, ReminderNotification, ReminderUser, Frequency (enum)

**Email (5):**
EmailTemplate, EmailLog, EmailLogAttachment, EmailSMTPSetting, SendEmail

**Lookups / Global (11):**
Country, City, Currency, Language, Location, Tax, PaymentMethod, PaymentStatus, Operator, Pagehelper, TableSetting

**Inventory & Stock (4):**
DamagedStock, StockTransfer, StockTransferItem, StockAdjustment

**Expense (3):**
Expense, ExpenseCategory, ExpenseTax

**Sync (3):**
EntityChange, SyncLog, SyncMetadata

**FBR (2):**
FBRSubmissionLog, FBRSubmissionStatus

**Cross-cutting (6):**
NLog, LoginAudit, CompanyProfile, DeploymentSettings, TableSetting, ObjectState / ApplicationEnums

**Base classes (3):**
BaseEntity, SharedBaseEntity, ISoftDelete

---

*End of Document. This analysis is based on a thorough exploration of the repository at `/pos-with-inventory-management` as of August 28, 2026.*
