# Master Enhancement Plan: Vibe Drift Remediation

**Location:** `f:\MIllyass\pos-with-inventory-management\Documentation\Enhancement\00_Master_Enhancement_Plan.md`

## 1. Objective
To systematically remediate all 32 occurrences of "Vibe Drift" Anti-Patterns identified during the comprehensive static code audit (`VibeDriftAudit`). This plan outlines the end-to-end refactoring strategy for the backend API, MediatR application layer, Domain entities, and frontend DTO alignment.

## 2. Remediation Phases

### Phase 1: Data Integrity & Transactions (High Priority)
**Goal:** Ensure database atomicity in complex MediatR Command Handlers to prevent partial commits.
**Target Modules:** `Expense`, `PurchaseOrder`, `StockTransfer`
**Actions:**
- Refactor `UpdateExpenseCommandHandler`, `UpdatePurchaseOrderReturnCommandHandler`, and `AddStockTransferCommandHandler`.
- Inject `IUnitOfWork` transaction boundaries (`BeginTransactionAsync`, `CommitTransactionAsync`, `RollbackTransactionAsync`).
- See details in `01_Backend_Data_Integrity_and_Transactions.md`.

### Phase 2: Controller Leaks & Response Wrappers (High Priority)
**Goal:** Remove direct `POSDbContext` dependencies from API controllers and enforce standard `ApiResponse<T>` wrappers.
**Target Modules:** `Tenants`, `FBR`, `InventoryBatch`, `ImportExport`, `DailyProductPrice`
**Actions:**
- Create new MediatR Queries/Commands to replace direct DB access (e.g., `GetAllTenantsQuery`).
- Refactor endpoints returning raw anonymous objects (`new { error = ... }`) to use `ServiceResponse<T>` or `ApiResponse`.
- See details in `02_Backend_Controller_Leaks_and_Wrappers.md`.

### Phase 3: Domain Entanglement Refactoring (Critical Priority)
**Goal:** Restore Clean Architecture by removing `Microsoft.EntityFrameworkCore` dependencies from the `POS.Domain` project.
**Target Modules:** `POS.Domain` -> `POS.Data` / `POS.Infrastructure`
**Actions:**
- Migrate `POSDbContext`, `POSDbContextFactory`, `SingleTenantProvider`, `ChangeTrackingService`, and `FBRInvoiceService` from `POS.Domain` to `POS.Data` or a new `POS.Infrastructure` project.
- Update namespace references across the solution.
- See details in `03_Domain_Entanglement_Refactoring.md`.

### Phase 4: DTO Consolidation & Frontend Alignment (Medium/Low Priority)
**Goal:** Reduce cognitive load and maintenance overhead by merging duplicate DTOs.
**Target Modules:** `Product`, `PurchaseOrder`, `SalesOrder`
**Actions:**
- Consolidate `ProductDto`, `ProductShortDto`, `DailyProductPriceDto`, `ProductStockDto`, and `ProductInventoryStockDto` into a unified `ProductDto` with optional include flags or an inheritance hierarchy (`BaseProductDto`).
- Update Angular frontend models (`product.model.ts`) to match the consolidated backend DTOs.
- See details in `04_Frontend_DTO_Alignment.md`.

## 3. Success Criteria
- Zero instances of `_uow.SaveAsync()` multiple times without an explicit transaction.
- Zero instances of `private readonly POSDbContext _context;` in `POS.API.Controllers`.
- Zero instances of `using Microsoft.EntityFrameworkCore;` in `POS.Domain`.
- `dotnet test` and `npm test` passing successfully across all standardized pipelines.
