# MILPOS — Workflow Documentation Suite

**Version:** 1.0
**Date:** August 28, 2026
**Purpose:** Complete, code-verified documentation of every workflow in the MILPOS application. This suite is the foundation for defining the enhancement plan — every document ends with observed gaps that feed directly into enhancement candidates.

---

## How This Documentation Was Produced

Every workflow documented here was traced through the **actual source code** (Angular components → controllers → MediatR handlers → repositories → EF Core → database), with exact file paths and line numbers cited. No workflow is described from assumption — each was read from the implementing handler/service/component.

**Conventions used:**
- `WF-x.y` = Workflow number (x = document, y = workflow within that document)
- File paths are relative to `SourceCode/` unless noted
- **⚠ GAP** markers = observed defect, dead code, missing validation, or design fragility — these are the raw material for the enhancement plan (consolidated in document 11)
- Journal entries are shown as `Dr Account / Cr Account`

---

## Document Index

| # | Document | Workflows Covered |
|---|----------|-------------------|
| 01 | [Authentication & Authorization Workflows](01_Authentication_Authorization_Workflows.md) | Login (JWT + claims + menu tree), password reset, user management, role/claim management, permission pipeline (Role → JWT → Angular → API), company profile |
| 02 | [Multi-Tenancy & Licensing Workflows](02_MultiTenancy_Licensing_Workflows.md) | Tenant registration & data seeding/cloning, tenant resolution middleware chain, tenant switching (impersonation), trial & license enforcement, license activation/generation |
| 03 | [POS & Sales Workflows](03_POS_Sales_Workflows.md) | POS screen checkout, sales order create/update/delete, sales order request (quotation), request→order conversion, sales return + refund, sales payments |
| 04 | [Purchasing Workflows](04_Purchasing_Workflows.md) | Purchase order create/update/delete, PO request, PO return + supplier refund, supplier payments |
| 05 | [Inventory & Stock Workflows](05_Inventory_Stock_Workflows.md) | Manual gain/loss adjustment, bulk adjustments, absolute stock correction, damaged stock, stock transfers, inventory batches (FEFO), stock alerts |
| 06 | [Accounting & Finance Workflows](06_Accounting_Finance_Workflows.md) | Central transaction pipeline, all strategy journal-entry mappings (sale/purchase/returns/expense/adjustment/payroll/loan), payment processing, customer ledger, opening balances, year-end closing |
| 07 | [Reporting Workflows](07_Reporting_Workflows.md) | Trial balance, balance sheet, P&L, cash flow, cash & bank, general journal, ledger balances, GST/tax reports, operational reports (sales/purchase/payments/stock/tax-item), dashboard widgets |
| 08 | [CRM, Inquiry & Reminder Workflows](08_CRM_Inquiry_Reminder_Workflows.md) | Customer management, customer ledger payments (FIFO application), supplier management, inquiry lifecycle, reminders (creation → Hangfire fan-out → dispatch → notification) |
| 09 | [Infrastructure Services Workflows](09_Infrastructure_Services_Workflows.md) | FBR e-invoicing, email, SignalR real-time notifications, Hangfire background jobs (complete inventory), import/export, storefront, caching (server + client), dashboard data |
| 10 | [Desktop & Offline Sync Workflows](10_Desktop_Offline_Sync_Workflows.md) | Electron first-run & cloud login, tenant DB export/provisioning, API process lifecycle, auto-update, ongoing bi-directional sync, conflict resolution |
| 11 | [Workflow Gaps & Enhancement Signals](11_Workflow_Gaps_Enhancement_Signals.md) | Consolidated catalog of every ⚠ GAP found across all workflows, organized by severity and domain — the direct input for the enhancement plan |

---

## System Workflow Map (Bird's-Eye View)

```
                            ┌─────────────────────────────┐
                            │      CLOUD (PostgreSQL)     │
                            │   Multi-tenant, shared DB   │
                            └──────────────▲──────────────┘
                                           │ sync (pull/push) / DB export
┌──────────────────────┐          ┌────────┴─────────┐
│  Electron Desktop    │          │   Web Browser    │
│  ┌────────────────┐  │          │  Angular 20 SPA  │
│  │ Angular SPA    │  │          └────────┬─────────┘
│  │ (localhost UI) │  │                   │ HTTPS + JWT
│  └───────┬────────┘  │                   │
│          │ HTTP      │                   │
│  ┌───────▼────────┐  │                   │
│  │ POS.API.exe    │  │                   │
│  │ (SQLite local) │──┘                   │
│  └────────────────┘                      │
└──────────────────────┘          ┌───────┴────────────────┐
                                  │   ASP.NET Core API     │
                                  │  Middleware chain:     │
                                  │  Exception→CORS→Auth→  │
                                  │  ApiKey→Tenant→Session │
                                  │  →Route→AuthZ→Trial    │
                                  └───────┬────────────────┘
                                          │ MediatR pipeline
                                          │ (Caching → Validation)
                          ┌───────────────▼───────────────────┐
                          │        CQRS Handlers (332)        │
                          │  ┌─────────────────────────────┐  │
                          │  │  AccountingService (hub)    │  │
                          │  │  ├─ StrategyFactory         │  │
                          │  │  │   ├ SaleStrategy         │  │
                          │  │  │   ├ PurchaseStrategy     │  │
                          │  │  │   ├ Returns/Expense/...  │  │
                          │  │  ├─ InventoryService  ◄──────┼──┼── ALL stock mutations
                          │  │  ├─ TaxService               │  │
                          │  │  └─ PaymentService           │  │
                          │  └─────────────────────────────┘  │
                          └───────┬──────────┬────────────────┘
                                  │          │
                        ┌─────────▼──┐   ┌───▼─────────────┐
                        │ EF Core /  │   │ Hangfire +      │
                        │ Dapper     │   │ SignalR +       │
                        │ (repositories) │ │ BackgroundServices │
                        └────────────┘   └─────────────────┘
```

**The single most important architectural fact:** every inventory-affecting business event (sale, purchase, return, adjustment, transfer) flows through **one chokepoint** — `AccountingService.ProcessTransactionAsync` — which atomically (well, see gaps) creates the accounting `Transaction`, dispatches a strategy to write double-entry `AccountingEntry` rows, calls `InventoryService` to mutate `ProductStock.CurrentStock`, and writes `TaxEntry` rows. Understanding this hub is the key to understanding the whole system.

---

## Cross-Cutting Workflow Chains

Three chains appear repeatedly and are worth internalizing before reading the domain documents:

### Chain 1 — The Business-Event Chain (every sale/purchase/return)
```
Angular form computes totals client-side
  → POST to controller [ClaimCheck(permission)]
  → MediatR handler:
      1. Duplicate-number check (409 on conflict)
      2. Map DTO → entity, stamp defaults
      3. Persist business document (SalesOrder/PurchaseOrder/...)
      4. Build TransactionItemDtos (base-unit conversion via UnitConversationRepository)
      5. AccountingService.ProcessTransactionAsync:
           a. Resolve open FinancialYear
           b. Create Transaction + TransactionItems (recompute tax/line totals)
           c. StrategyFactory → strategy → AccountingEntry rows (double entry)
           d. InventoryService.ProcessInventoryChangesAsync → ProductStock ±qty
           e. TaxService.ProcessTaxEntriesAsync → TaxEntry rows
      6. Optional: auto-payment dispatch (POS cash sales)
  → Response 201 → Angular invoice/receipt render
```

### Chain 2 — The Permission Chain
```
Admin assigns RoleClaims / RoleMenuItems / UserClaims
  → Login: claims merged → JWT (each claim = "true") + dynamic menu tree
  → Angular: AuthGuard checks route data.claimType; sidebar renders from menu tree
  → API: [ClaimCheck] re-decodes JWT per request → 403 if claim missing
  → Live permission changes pushed via SignalR OnUserPermissionChange
```

### Chain 3 — The Tenant-Context Chain
```
Request arrives → TenantResolutionMiddleware:
    subdomain → X-Tenant-ID (SuperAdmin) → JWT TenantId claim
  → TenantProvider.SetTenantId
  → POSDbContext global query filter: TenantId == current && !IsDeleted
  → SaveChanges interception auto-stamps TenantId on new entities
```

---

## Deployment-Mode Behavior Differences

Many workflows branch on deployment mode. The authoritative differences:

| Aspect | Cloud Mode | Desktop Mode |
|---|---|---|
| Database | PostgreSQL (or SQL Server) | SQLite (`POSDb.db` in userData) |
| Tenant resolution | Subdomain / X-Tenant-ID / JWT claim | `SingleTenantProvider` (fixed tenant) |
| MVC | `AddControllersWithViews()` (storefront available) | `AddControllers()` only (no storefront) |
| HTTPS redirect | Yes | No (localhost) |
| Hangfire storage | PostgreSQL/SqlServer | SQLite (`%APPDATA%/milpos/HangFireDB.db`) |
| Sync | n/a (source of truth) | `ScheduledSyncService` loop (default 5 min) |
| FBR QR path | `wwwroot/qrcodes` | `%APPDATA%/milpos/qrcodes` |
| Middleware | TenantResolutionMiddleware active | Skipped |
| Boot | IIS/Kestrel | Electron spawns `POS.API.exe`, env vars `TENANT_ID`/`API_KEY`/`CLOUD_API_URL` |

---

*Start with document 11 if your goal is the enhancement plan — it consolidates every gap found. Read documents 03–06 together: they describe one integrated pipeline (sales → stock → ledger).*
