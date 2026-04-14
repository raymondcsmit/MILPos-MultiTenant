# Core Module Registry & Vibe Coding Orchestration

**Location:** `f:\MIllyass\pos-with-inventory-management\Documentation\Verification\00_Module_Registry_and_Overview.md`

## 1. Purpose & Scope
This registry serves as the master index for the vertical-slice analysis of the POS & Inventory Management system. It is generated under the **Vibe Coding Framework**, meaning every module is documented end-to-end (API Controller -> Application Handler -> Domain Entity -> Infrastructure) to facilitate AI-driven regeneration, refactoring, and testing.

## 2. Core Modules Indexed
The application is logically partitioned into the following macro-modules. Each module operates with strict multi-tenant isolation and leverages MediatR for CQRS execution.

1. **[01. Tenant Management & Licensing](01_Tenant_Management_and_Licensing.md)**
   - Tenant isolation, subdomain resolution, SaaS subscription enforcement, DB context switching.
2. **[02. Authentication & Security](02_Authentication_and_Security.md)**
   - JWT generation, Role-Based Access Control (RBAC), User/Claim management, Login Audits.
3. **[03. Inventory & Product Management](03_Inventory_and_Product_Management.md)**
   - Brands, Categories, UOMs, Products, Variants, Stock Transfers, Damaged Stock.
4. **[04. Sales & POS Terminal](04_Sales_and_POS_Terminal.md)**
   - B2B and Walk-in Customers, POS checkout flow, Sales Orders, Payments.
5. **[05. Purchasing & Supplier Management](05_Purchasing_and_Supplier_Management.md)**
   - Suppliers, Purchase Orders, Goods Receipt, Supplier Payments.
6. **[06. Accounting & Financials](06_Accounting_and_Financials.md)**
   - Ledger Accounts, Chart of Accounts, General Entries, Expenses, Profit/Loss, Trial Balance.
7. **[07. CRM & Inquiries](07_CRM_and_Inquiries.md)**
   - Lead tracking, Inquiry Statuses, Follow-ups, Reminders.
8. **[08. System Settings & Logs](08_System_Settings_and_Logs.md)**
   - NLog, Email Settings, SMTP, Error Logs, Global Configuration.

## 3. The Vertical Analysis Blueprint (Vibe Strategy)
Every linked document in this directory adheres to the **AI-Optimized Development Approach**:
- **Entry Point:** ASP.NET Core `[ApiController]`
- **Application Layer:** CQRS `IRequest<T>` and `IRequestHandler<T, R>`
- **Domain Layer:** EF Core `BaseEntity` and strongly-typed models
- **Infrastructure Layer:** Repositories and `POSDbContext`
- **Verification Gate:** `POS.API.Tests` WebApplicationFactory integration tests

## 4. Universal Configuration Requirements
- **.NET SDK:** `net10.0`
- **Database:** PostgreSQL / SQL Server / SQLite (Configured via `appsettings.json`)
- **Architecture:** Clean Architecture + CQRS (MediatR) + EF Core Global Query Filters (`TenantId`)
- **Frontend:** Angular 17+ (Standalone Components, RxJS, TailwindCSS)

## 5. Change History
| Date | Version | Author | Notes |
|---|---|---|---|
| Today | 1.0.0 | AI Pair-Programmer | Initial Vibe Coding structural index generation. |
