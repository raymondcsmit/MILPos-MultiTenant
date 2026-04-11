# Sales Person & Dedicated Regions Integration Plan

## 0. Evaluation Summary (Fit With Current Application)

### 0.1 What Already Exists (Good News)
- **Multi-tenant separation** already exists via `BaseEntity.TenantId` and global filtering.
- **Regions/territories** can be implemented using the existing `Location` entity.
- **User-to-Region assignment** already exists via `UserLocation` (many-to-many between `User` and `Location`).
- **Orders already have a region**:
  - `SalesOrder` has `LocationId`.
  - `PurchaseOrder` has `LocationId`.

### 0.2 What Is Missing (Core Gap)
- The system currently tracks **who created a record** (`CreatedBy`) but does not track **who should be credited/associated as the Sales Person** when an Admin or back-office user creates an order “on behalf of” a Sales Person.
- `Customer` currently has no native linkage to:
  - a **dedicated region** (`Location`)
  - an **assigned Sales Person** (`User`)

### 0.3 Recommended Minimal Data Model (Best ROI)
To satisfy tenant requirements without destabilizing the codebase:
- Add `SalesPersonId` to `SalesOrder` and `PurchaseOrder`.
- Add `SalesPersonId` and `LocationId` to `Customer`.

This keeps:
- `CreatedBy` = **operator** who entered the transaction (Admin / cashier / back-office).
- `SalesPersonId` = **business attribution** (the Sales Person responsible for that customer/order).

### 0.4 Important Clarification About “Purchase on behalf of Sales Persons”
There are two interpretations. The implementation should support both, but start with the one your tenants actually mean:
- **Interpretation A (Common):** Sales Person requests stock (internal requisition). In your codebase, this aligns with `IsPurchaseOrderRequest` / `IsSalesOrderRequest` flows.
- **Interpretation B:** Sales Person directly purchases from suppliers, and the business wants to attribute that procurement to them.

The proposed `SalesPersonId` fields support either model.

### 0.5 Tenant Variants (Because Requirements Differ)
Different tenants may want slightly different rules. Instead of forking the codebase, support these as **per-tenant configuration**:

- **Customer ownership mode**
  - **Strict:** Sales Person can only sell to customers assigned directly to them (`Customer.SalesPersonId`).
  - **Region pool:** Sales Person can sell to any customer in their assigned locations (`Customer.LocationId` in `UserLocations`).
- **Order override mode**
  - **Sales Person locked:** Sales Person cannot select another Sales Person in UI; backend enforces it.
  - **Admin on-behalf-of enabled:** Admin/Manager can set `SalesPersonId`.

Implementation options:
- **Option 1 (Simplest):** Store these flags in `Tenant` as boolean fields (requires migration).
- **Option 2 (More scalable):** Add `TenantSettings` table (Key/Value or JSON) to avoid frequent schema changes.

## 1. Requirement Analysis
**Client Request:** 
- "Sales persons" make sales and purchases on behalf of themselves.
- They have respective customers from their dedicated regions.

**Context within Current Codebase:**
- The system is built on a multi-tenant **Clean Architecture** utilizing **MediatR** for CQRS.
- **Regions** can be directly mapped to the existing `Location` entity.
- **Sales Persons** are essentially users in the system, currently represented by the `User` entity and managed via `Role` and `UserLocation` (which ties a user to specific regions/locations).
- Currently, `Customer`, `SalesOrder`, and `PurchaseOrder` entities lack direct attribution to a specific "Sales Person" (they only track `CreatedBy`, which isn't sufficient for admin-level "on behalf of" entries).

---

## 2. Architectural Design & Entity Mapping

### A. Database Entity Modifications (`POS.Data`)
To establish the relationship between Sales Persons, Regions, Customers, and Orders, we need to introduce Foreign Keys to existing entities:

1. **Customer Entity (`Customer.cs`)**
   - Add `Guid? SalesPersonId` (ForeignKey to `User.Id`)
   - Add `Guid? LocationId` (ForeignKey to `Location.Id` representing the "Dedicated Region")
   *Purpose:* Ties a customer to a specific region and optionally to a specific sales person.

2. **SalesOrder Entity (`SalesOrder.cs`)**
   - Add `Guid? SalesPersonId` (ForeignKey to `User.Id`)
   *Purpose:* Tracks who should be credited for the sale, even if a centralized admin data-entry clerk physically created the record "on behalf of" the sales person.
   *Note:* `SalesOrder` already has `LocationId`. Do not re-add region fields here.

3. **PurchaseOrder Entity (`PurchaseOrder.cs`)**
   - Add `Guid? SalesPersonId` (ForeignKey to `User.Id`)
   *Purpose:* Tracks purchases made on behalf of the sales person.
   *Note:* `PurchaseOrder` already has `LocationId`. Do not re-add region fields here.

### B. DTO & Command Updates (`POS.Data/Dto` & `POS.MediatR`)
1. **Data Transfer Objects:**
   - Update `CustomerDto`, `SalesOrderDto`, and `PurchaseOrderDto` to include `SalesPersonId` and `SalesPersonName`.
2. **Commands:**
   - Update `AddSalesOrderCommand` and `AddPurchaseOrderCommand` to accept `SalesPersonId`.
   - Update `AddCustomerCommand` to accept `LocationId` (Region) and `SalesPersonId`.

---

## 3. Application Logic Integration (`POS.MediatR` Handlers)

### A. Customer Management
- **Read (Query):** Modify `GetCustomersQueryHandler`. 
  - If the logged-in user has the role `"Sales Person"`, automatically filter the query to only return customers where `SalesPersonId == LoggedInUserId` OR `LocationId` is within the Sales Person's assigned `UserLocations`.
  - If the user is an `"Admin"`, return all customers.
- **Write (Command):** When a Sales Person creates a customer, the backend should automatically enforce that the `LocationId` belongs to their dedicated region.

**Recommended rule (to avoid ambiguity):**
- Prefer **strict assignment**: a Sales Person can only create orders for customers where `Customer.SalesPersonId == LoggedInUserId`.
- If a tenant wants region-based pooling, allow: `Customer.LocationId` is within the Sales Person’s `UserLocations`.
- Make the stricter rule the default and allow tenant override via configuration.

### B. Order Management (Sales & Purchases)
- **"On Behalf Of" Logic:**
  - When creating a `SalesOrder` or `PurchaseOrder`, the system must check the payload for `SalesPersonId`.
  - If the logged-in user is an Admin, they can supply any valid `SalesPersonId` (acting "on behalf of").
  - If the logged-in user is a Sales Person, the backend must override the payload and enforce `SalesPersonId = LoggedInUserId` to prevent spoofing.

**Recommended additional integrity checks:**
- If an Admin selects `SalesPersonId`, the system should validate that:
  - The Sales Person belongs to the same tenant (`User.TenantId == CurrentTenantId`).
  - The order `LocationId` is one of that Sales Person’s assigned `UserLocations` (unless tenant explicitly disables this).
- If the order has a `CustomerId`, validate `Customer.SalesPersonId` matches the selected Sales Person (unless tenant uses region pooling).

---

## 4. Frontend Integration Plan (Angular)

### A. UI Components
1. **Customer Form:**
   - Add a "Region/Location" dropdown.
   - Add an "Assigned Sales Person" dropdown (Visible only to Admins/Managers).
2. **POS / Checkout Screen:**
   - Add a "Sales Person" dropdown to the cart/checkout overlay.
   - **Behavior:** Auto-select and disable this dropdown if the logged-in user is a Sales Person. Keep it selectable if the user is an Admin acting "on behalf of".
3. **Purchase Order Screen:**
   - Add a "Sales Person" dropdown similar to the POS screen.

**UX recommendation for beginner users:**
- If `Customer` is selected first, auto-fill `Sales Person` and `Location` from the Customer assignment.
- If Admin manually changes `Sales Person`, show a warning if the chosen Sales Person does not match the Customer assignment.

### B. New Reports & Dashboards
- **Sales by Sales Person Report:** Create a new grid and chart in the Reports module grouped by `SalesPersonId`.
- **Commission/Target Tracking (Optional Future Feature):** With `SalesPersonId` now attached to the `SalesOrder`, you can easily calculate sales commissions or regional performance metrics.

---

## 5. Step-by-Step Implementation Roadmap

**Step 1: Database Schema & Migrations**
- Update `Customer`, `SalesOrder`, and `PurchaseOrder` in `POS.Data`.
- Run `dotnet ef migrations add AddSalesPersonAndRegion` in `POS.Domain` (Infrastructure).
- Run `dotnet ef database update`.

**Migration/backfill notes (important):**
- Existing records will have `SalesPersonId = NULL` initially.
- Recommended backfill strategy:
  - If `CreatedByUser` is a Sales Person role, set `SalesPersonId = CreatedBy`.
  - Otherwise leave NULL (Admin-created historical orders) until tenant decides how to assign attribution.
- For `Customer.LocationId`, backfill can be optional; allow NULL until the tenant configures regions.

**Step 2: Backend CQRS Pipeline**
- Update all relevant DTOs in `POS.Data/Dto`.
- Update `GetCustomersQueryHandler` to enforce region-based and sales-person-based data isolation.
- Update `AddSalesOrderCommandHandler` and `AddPurchaseOrderCommandHandler` to correctly map the `SalesPersonId`.

**Additional backend work that should be included in scope:**
- Add query filters/endpoints for Admins:
  - List Sales Persons by location
  - List Customers by Sales Person
- Update exports/reports to include `SalesPersonId` and `SalesPersonName`.

**Step 3: Frontend Form Updates**
- Update `customer-edit.component.ts/html` to include the new fields.
- Update `pos.component.ts/html` and `purchase-order-add.component.ts/html` to include the "Sales Person" dropdown.

**Step 4: Verification & Testing**
- Write Unit Tests to ensure a Sales Person cannot create an order on behalf of another Sales Person.
- Write Integration Tests to ensure Admins can successfully create orders on behalf of any Sales Person.

**Add these acceptance tests (recommended):**
- Sales Person can only view their customers (or their region pool, depending on tenant config).
- Admin can reassign a customer to another Sales Person, and future orders follow the new attribution.
- Reporting shows Sales totals grouped by Sales Person and by Location.
