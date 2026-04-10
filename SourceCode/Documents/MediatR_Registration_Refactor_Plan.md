# Refactor Tenant Registration to MediatR

Move the tenant registration logic from direct service calls in the controller to a MediatR command/handler pattern to maintain architectural consistency.

## Proposed Changes

### [POS.MediatR]

#### [NEW] [RegisterTenantCommand.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Tenant/Commands/RegisterTenantCommand.cs)
- Create `RegisterTenantCommand` implementing `IRequest<ServiceResponse<TenantDto>>`.
- Inherit properties from `RegisterTenantDto`.

#### [NEW] [RegisterTenantCommandHandler.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.MediatR/Tenant/Handlers/RegisterTenantCommandHandler.cs)
- Implement `IRequestHandler<RegisterTenantCommand, ServiceResponse<TenantDto>>`.
- Inject `ITenantRegistrationService`.

### [POS.API]

#### [MODIFY] [TenantsController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/TenantsController.cs)
- Inject `IMediator`.
- Replace `_registrationService.RegisterTenantAsync(dto)` with `_mediator.Send(command)`.

## Verification Plan

### Automated Tests
- Run build and ensure no compilation errors.

### Manual Verification
- Test registration endpoint `/api/Tenants/register`.
- Verify database entries for Tenant, Admin User, and seeded data.
