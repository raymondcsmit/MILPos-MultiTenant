# Backend Controller Leaks & Wrappers (Phase 2)

**Location:** `f:\MIllyass\pos-with-inventory-management\Documentation\Enhancement\02_Backend_Controller_Leaks_and_Wrappers.md`

## 1. Problem Statement
The Vibe Drift Audit detected high-risk Controller Leaks (`TenantsController`, `FBRController`, `InventoryBatchController`) and medium-risk Response Wrappers (`TenantsController`, `FBRController`, `ImportExportController`, `DailyProductPriceController`). These anti-patterns bypass the MediatR pipeline and inject `POSDbContext` directly, fragmenting business logic across the application. Endpoints returning raw EF Core entities instead of strongly-typed DTOs leak database schemas and navigation properties to the client frontend.

## 2. Affected Components
- `SourceCode\SQLAPI\POS.API\Controllers\TenantsController.cs`
- `SourceCode\SQLAPI\POS.API\Controllers\FBR\FBRController.cs`
- `SourceCode\SQLAPI\POS.API\Controllers\InventoryBatchController.cs`
- `SourceCode\SQLAPI\POS.API\Controllers\ImportExportController.cs`
- `SourceCode\SQLAPI\POS.API\Controllers\DailyProductPrice\DailyProductPriceController.cs`

## 3. Remediation Strategy

**Objective:** Remove `POSDbContext` dependencies from API controllers and enforce standard `ApiResponse<T>` / `ServiceResponse<T>` wrappers.

### 3.1 Refactoring Steps for Controllers
1. Identify all `[ApiController]` classes injecting `POSDbContext`.
2. Remove `private readonly POSDbContext _context;` and its constructor injection.
3. For each endpoint accessing `_context`:
   - Create a corresponding MediatR Query (e.g., `GetAllTenantsQuery`) or Command.
   - Move the EF Core logic to a new `IRequestHandler` in the `POS.MediatR` project.
   - Use the injected `IUnitOfWork` or specific repositories within the handler.
4. Replace raw `Ok(await _context...)` with `await _mediator.Send(...)`.
5. Ensure all responses are wrapped in the application's standard response format (e.g., `ServiceResponse<T>`).

### 3.2 Refactoring Steps for Response Wrappers
1. Locate endpoints returning anonymous objects like `return BadRequest(new { error = ex.Message });`.
2. Replace them with standardized responses: `return BadRequest(ServiceResponse<string>.ReturnFailed(400, ex.Message));` or the project's equivalent wrapper.
3. Locate endpoints returning raw EF Core entities.
4. Ensure the MediatR handlers map entities to DTOs (using AutoMapper) before returning the response.

### 3.3 Code Example (Remediation Pattern)

**Before (Controller Leak):**
```csharp
[HttpGet]
public async Task<ActionResult<List<Tenant>>> GetAllTenants()
{
    var tenants = await _context.Tenants.IgnoreQueryFilters().ToListAsync();
    return Ok(tenants);
}
```

**After (Clean Architecture):**
```csharp
// In POS.MediatR/Tenant/Queries/GetAllTenantsQuery.cs
public class GetAllTenantsQuery : IRequest<ServiceResponse<List<TenantDto>>> { }

// In POS.MediatR/Tenant/Handlers/GetAllTenantsQueryHandler.cs
public async Task<ServiceResponse<List<TenantDto>>> Handle(GetAllTenantsQuery request, CancellationToken cancellationToken)
{
    var tenants = await _tenantRepository.All.IgnoreQueryFilters().ToListAsync(cancellationToken);
    var tenantDtos = _mapper.Map<List<TenantDto>>(tenants);
    return ServiceResponse<List<TenantDto>>.ReturnResultWith200(tenantDtos);
}

// In POS.API/Controllers/TenantsController.cs
[HttpGet]
public async Task<ActionResult<ServiceResponse<List<TenantDto>>>> GetAllTenants()
{
    var query = new GetAllTenantsQuery();
    var response = await _mediator.Send(query);
    if (response.StatusCode == 200) return Ok(response);
    return BadRequest(response);
}
```

## 4. Verification & Testing
- Run `dotnet build` to ensure no controller references `POSDbContext`.
- Run API integration tests to verify endpoint responses match the expected `ServiceResponse<T>` schema.
- Update frontend Angular models to expect the wrapped response format if necessary.
