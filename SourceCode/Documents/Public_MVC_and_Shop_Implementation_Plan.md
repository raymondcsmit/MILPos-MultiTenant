# Implementation Plan - Public MVC Pages & Tenant E-commerce

## Goal Description
Implement a public-facing website using ASP.NET Core MVC within the existing `POS.API` project. 
**Architectural Principle**: Keep MVC Controllers "Thin". Reuse existing `MediatR` Commands and Queries from `POS.MediatR` to ensure consistency with the existing API architecture.
This includes:
1.  **Public Website**: Home, Contact, Support pages served at the root domain.
2.  **Purchase Plan**: A pricing page allowing users to subscribe and automatically register a new tenant.
3.  **Tenant Public Store**: An e-commerce interface for specific tenants to list products and receive sales order requests.
4.  **App Relocation**: Move the existing Angular SPA to the `/app` sub-path to allow the Public Website to occupy the root.

## User Review Required
> [!IMPORTANT]
> **Breaking Change for Existing Users**: The Angular Application will be moved from the root URL `/` to `/app/`. Existing bookmarks to `/` will load manual Public Home page. Users must navigate to `/app/` to log in.

> [!WARNING]
> **Static Associations & Base HREF**: 
> 1. Angular build artifacts in `ClientApp/dist` must be served under `/app`.
> 2. The Angular application must be built with `--base-href /app/` to ensure assets (JS, CSS) are loaded correctly.
> 3. `SpaStartup` must be strictly configured to only handle requests starting with `/app`.

## Proposed Changes

### Frontend Configuration (Angular)

#### [MODIFY] Angular Build Script
- Update `package.json` or build pipeline to include base-href:
    - Command: `ng build --configuration production --base-href /app/ --deploy-url /app/`
- Ensure `index.html` generated in `dist` contains `<base href="/app/">`.
- **CRITICAL**: Verify `deploy-url` is set so lazy-loaded chunks are requested from `/app/` and not root.

### Backend Configuration

#### [MODIFY] [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)
- **Service Configuration**:
    - Add `services.AddControllersWithViews()` to enable MVC.
    - Add `services.AddSession()` to support Shopping Cart state.
- **Middleware Pipeline**:
    - Add `services.AddHttpContextAccessor()` (if not present) for accessing Session in Views/Services.
- **Middleware Pipeline**:
    - Add `app.UseSession()` before `UseRouting`.
    - Update `UseEndpoints` to map default Controller route: `{controller=Home}/{action=Index}/{id?}`.
    - **CRITICAL**: Ensure `MapControllerRoute` is registered **before** `SpaStartup`.
    - **Static Files**:
        - `app.UseStaticFiles()` (standard) serves from `wwwroot` (MVC Assets).
        - `app.UseSpaStaticFiles()` (if configured) serves from `ClientApp/dist` (Angular Assets).
        - Ensure names conflict check (e.g., don't have `styles.css` in both if they effectively merge at runtime, though path separation `/app` helps).

#### [MODIFY] [SpaStartup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/SpaStartup.cs)
- **SPA Mapping**:
    - Change `app.MapWhen` condition to strictly check if request path starts with `/app`.
    - Configure `UseSpaStaticFiles` to serve files from `ClientApp/dist` but mapped to `/app`.
    - Ensure 404s in `/app` are handled by the SPA (client-side routing), while 404s in root fall through to MVC (or 404 page).

#### [MODIFY] [GlobalExceptionHandlerMiddleware.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Middleware/GlobalExceptionHandlerMiddleware.cs)
- **Content Negotiation**:
    - Update `Invoke` to detect request type.
    - If request path starts with `/api`, return JSON (existing behavior).
    - If request is for a Page (HTML), redirect to `/Home/Error` or return a View.

### Controllers & Views

#### [NEW] [HomeController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/HomeController.cs)
- **Actions**: `Index`, `Contact`, `Support`, `Error`.
- **Views**: 
    - `Views/Home/Index.cshtml`: Landing page with SEO meta tags.
    - `Views/Home/Contact.cshtml`: Contact form.
    - `Views/Home/Support.cshtml`: Support resources.
    - `Views/Shared/Error.cshtml`: User-friendly error page.

#### [NEW] [PricingController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/PricingController.cs)
- **Actions**:
    - `Index`: Display subscription plans.
    - `Subscribe` (POST): Handle payment (mock) and trigger `TenantRegistrationService`.
- **Security**:
    - Apply `[ValidateAntiForgeryToken]` to POST actions.
- **Integration**:
    - `Subscribe` (POST): Handle payment (mock) and trigger Tenant Registration.
- **Integration**:
    - **Thin Controller Pattern**: Inject `IMediator`.
    - Construct `CreateTenantCommand` (from `POS.MediatR.Tenant.Commands`) using form data.
    - Execute `await _mediator.Send(command)`.
    - On success, redirect to Confirmation/Login.
    - **CRITICAL**: Reuses `CreateTenantCommand` logic identical to `TenantsController.CreateTenant`.

#### [NEW] [StoreBaseController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/StoreBaseController.cs)
- **Purpose**: Base controller for all Tenant Store related controllers.
- **Attributes**: Apply `[StoreTenant]` attribute here to ensure it propagates to all inheriting controllers.
- **Dependency Injection**: expose `ITenantProvider` and `IMediator` to common Views if needed.
- **View Data**: Populate `ViewBag.TenantName`, `ViewBag.TenantContact` in `OnActionExecuting`.

#### [NEW] [StoreController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/StoreController.cs)
- **Inheritance**: Inherits from `StoreBaseController`.
- **Route**: `[Route("store/{tenantName}")]`
- **Actions**:
    - `Index`: List products for the tenant.
    - `Details`: Product details.
    - `Cart`: Manage cart using `Session`.
    - `Checkout` (POST): Submit order request.
- **Security**:
    - Apply `[ValidateAntiForgeryToken]` to `Checkout`.
- **Logic**:
    - `Checkout` creates `SalesOrder` with `IsSalesOrderRequest = true`.
    - Public access (allow anonymous).
- **Data Access Strategy (Thin Controller)**:
    - **Product Listing**:
        - Inject `IMediator`.
        - Use `GetAllProductCommand` (from `POS.MediatR.Product.Command`) with `ProductResource` (PageSize, Filter).
        - Map `ProductDto` results to `StoreProductViewModel`.
    - **Checkout**:
        - Use `AddSalesOrderCommand` (from `POS.MediatR.SalesOrder.Commands`).
        - Map Cart ViewModel to `AddSalesOrderCommand`. Set `IsSalesOrderRequest = true`.
    - **Tenant Context**:
        - Ensure `ITenantProvider` (injected into Mediator handlers) is correctly set by `[StoreTenant]` filter before commands execute.

### Logic & Attributes

#### [NEW] [StoreTenantAttribute.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Filters/StoreTenantAttribute.cs)
- Action Filter to extract `tenantName` from route.
- Validate existence of Tenant.
- Set `ITenantProvider` Context.
- Handle "Tenant Not Found" (Redirect to 404 or specific error view).

### Frontend Assets (MVC)
- **Layout**: `Views/Shared/_Layout.cshtml` with Bootstrap 5.
- **ViewImports**: `Views/_ViewImports.cshtml` for TagHelpers (`@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers`).
- **Styles**: `wwwroot/css/site.css`.
- **SEO**: Ensure Layout supports dynamic `<title>` and `<meta>` tags.

## Verification Plan

### Automated Tests
- None currently (Project relies on Manual QA).

### Manual Verification
1.  **Public Routing & Error Handling**:
    - Run the API Project.
    - Navigate to `http://localhost:port/`. -> **Expected**: Load `HomeController.Index`.
    - Navigate to `http://localhost:port/random-page`. -> **Expected**: Load `Home/Error` or 404 View (Not JSON).
    - Navigate to `http://localhost:port/app/`. -> **Expected**: Load Angular App (Login Screen).
    - Navigate to `http://localhost:port/app/login`. -> **Expected**: Angular Client-side routing works (no 404).

2.  **Purchase Flow**:
    - Navigate to `/Pricing`.
    - Click "Subscribe".
    - Fill details (Business Name: "TestBiz", Email: "test@biz.com").
    - Submit.
    - **Expected**: Success page. Check Database `Tenants` table for "TestBiz".

3.  **Tenant Store & Cart**:
    - Note a Tenant Name (e.g., "defaults" or "TestBiz").
    - Navigate to `/store/defaults`.
    - **Expected**: List of products for "defaults" tenant.
    - Add item to cart. -> **Expected**: Item persists in Session (refresh page to verify).
    - Click Checkout.
    - Enter Guest Details (Name: "Guest User").
    - Submit.
    - **Expected**: Order Confirmation.
    - **Verification**: Log in to "defaults" tenant in Angular App. Go to "Sales Orders". Check for new order with "Requested" status.
