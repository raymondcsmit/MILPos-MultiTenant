# Work Document - Public MVC & Tenant Store Implementation

## Overview
This document summarizes the implementation of the Public MVC pages and the Tenant-specific Store for the POS system.

## Key Components

### MVC & SPA Integration
- **Relocation**: The Angular application now resides under the `/app` prefix.
- **Routing**: Root domain requests are handled by MVC (`HomeController`).
- **Session**: Enabled server-side session to manage shopping carts for non-authenticated guest users.

### Multi-Tenant Shop
- **Store URL**: Each tenant has a public shop at `/store/{tenantName}`.
- **Tenant Context**: Managed by `StoreTenantAttribute` which sets the tenant ID for MediatR handlers.
- **Cart Logic**: Implemented in `StoreController` using Session storage.
- **Order Flow**: Guests can browse products and submit "Order Requests" (Sales Orders with `IsSalesOrderRequest = true`).

### Implementation Details
- **Thin Controllers**: MVC controllers act as bridges to `POS.MediatR`.
- **View Components**: Used Razor syntax and Bootstrap 5 for the public UI.
- **Safe Handling**: Fixed issues with missing image URLs and unformatted prices in templates.

## Verification
- **Build**: Successfully compiled `POS.API` with all new components.
- **Compatibility**: Reuses existing business logic (MediatR) ensuring no duplication of rules.

## Future Recommendations
- **Guest Customer Auto-Creation**: Implement logic to create a temporary `Customer` entity for guest orders if real-time tracking is needed.
- **Real Payment Gateway**: Integrate Stripe or another provider in `PricingController`.
- **Custom Domains**: Allow tenants to map their own domains to their store.
