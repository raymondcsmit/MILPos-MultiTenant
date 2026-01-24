# Multi-Tenant Implementation Plan
## Shared Database Multi-Tenancy for POS Application

---

## Executive Summary

This plan outlines the conversion of the existing POS (Point of Sale) application to a **shared database multi-tenant architecture**. The implementation will allow multiple tenants (organizations/companies) to use the same application instance while maintaining complete data isolation at the database level through tenant-specific filtering.

### Current Architecture Analysis

The application is built with:
- **Framework**: ASP.NET Core API (.NET 10.0)
- **Database**: SQL Server / SQLite with Entity Framework Core
- **Authentication**: ASP.NET Core Identity
- **Architecture**: CQRS pattern with MediatR
- **Entities**: 40+ domain entities (Products, Orders, Customers, Inventory, Accounting, etc.)
- **Base Infrastructure**: `BaseEntity` with audit fields, global query filters for soft deletes
- **Repository Pattern**: Implemented across all entities

### Multi-Tenancy Approach

**Shared Database with Tenant Discriminator Column**
- Single database instance shared across all tenants
- Each tenant-specific table includes a `TenantId` column
- Global query filters ensure automatic tenant isolation
- Tenant context resolved via middleware from JWT claims or custom headers

---

## User Review Required

> [!IMPORTANT]
> **Tenant Identification Strategy**
> 
> The plan proposes using **subdomain-based tenant identification** (e.g., `tenant1.yourdomain.com`) as the primary method, with fallback to custom HTTP headers for API clients. Alternative approaches include:
> - Path-based routing (`yourdomain.com/tenant1/api`)
> - Database lookup by user email domain
> - Explicit tenant selection after login
> 
> Please confirm the preferred tenant identification strategy.

> [!WARNING]
> **Breaking Changes**
> 
> This implementation will introduce breaking changes:
> 1. All existing data will need to be associated with a default tenant
> 2. API authentication will require tenant context
> 3. Database schema will change significantly (new tables, columns added to all tenant-specific tables)
> 4. Existing API clients may need updates to pass tenant information

> [!CAUTION]
> **Data Migration Required**
> 
> All existing data must be migrated to include `TenantId` values. A default tenant will be created, and all current data will be assigned to this tenant. This operation should be performed during a maintenance window with a full database backup.

---

## Proposed Changes

### Component 1: Tenant Management Core

#### [NEW] [Tenant.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Entities/Tenant/Tenant.cs)

Create new tenant entity to manage tenant information:

```csharp
public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Subdomain { get; set; }
    public string ContactEmail { get; set; }
    public string ContactPhone { get; set; }
    public string Address { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? SubscriptionStartDate { get; set; }
    public DateTime? SubscriptionEndDate { get; set; }
    public string SubscriptionPlan { get; set; }
    public int MaxUsers { get; set; }
    public string ConnectionString { get; set; } // For future database-per-tenant migration
    public string LogoUrl { get; set; }
    public string TimeZone { get; set; }
    public string Currency { get; set; }
}
```

#### [NEW] [ITenantProvider.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Helper/ITenantProvider.cs)

Interface for tenant context resolution:

```csharp
public interface ITenantProvider
{
    Guid? GetTenantId();
    Task<Tenant> GetCurrentTenantAsync();
    void SetTenantId(Guid tenantId);
}
```

#### [NEW] [TenantProvider.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Helper/TenantProvider.cs)

Implementation of tenant context provider using `IHttpContextAccessor`:

```csharp
public class TenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private Guid? _tenantId;

    public TenantProvider(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? GetTenantId()
    {
        // Try to get from current context
        if (_tenantId.HasValue)
            return _tenantId;

        // Try to get from HTTP context claims
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = httpContext.User.FindFirst("TenantId");
            if (tenantClaim != null && Guid.TryParse(tenantClaim.Value, out var tenantId))
            {
                return tenantId;
            }
        }

        // Try to get from custom header
        if (httpContext?.Request?.Headers?.ContainsKey("X-Tenant-ID") == true)
        {
            if (Guid.TryParse(httpContext.Request.Headers["X-Tenant-ID"], out var tenantId))
            {
                return tenantId;
            }
        }

        return null;
    }

    public void SetTenantId(Guid tenantId)
    {
        _tenantId = tenantId;
    }

    public async Task<Tenant> GetCurrentTenantAsync()
    {
        // Implementation to fetch tenant from database
    }
}
```

---

### Component 2: Entity Model Updates

#### [MODIFY] [BaseEntity.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Entities/BaseEntity.cs)

Add `TenantId` property to base entity:

```csharp
public abstract class BaseEntity
{
    // Add TenantId for multi-tenancy
    public Guid TenantId { get; set; }
    
    // Existing properties...
    public DateTime CreatedDate { get; set; }
    public Guid CreatedBy { get; set; }
    // ... rest of existing properties
}
```

#### [MODIFY] [User.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Data/Entities/User/User.cs)

Add `TenantId` to User entity (does not inherit from BaseEntity):

```csharp
public class User : IdentityUser<Guid>
{
    public Guid TenantId { get; set; }
    
    [ForeignKey("TenantId")]
    public Tenant Tenant { get; set; }
    
    // Existing properties...
}
```

#### Entity Changes Summary

All entities inheriting from `BaseEntity` will automatically get `TenantId`. The following entities need special attention:

**Entities NOT requiring TenantId** (Global/Shared Data):
- `Country` - Shared reference data
- `City` - Shared reference data
- `Currency` - Shared reference data
- `Language` - Shared reference data
- `NLog` - System logging
- `LoginAudit` - System audit (but should track TenantId for reporting)

**Entities requiring TenantId** (40+ entities including):
- `Product`, `ProductCategory`, `ProductTax`, `ProductStock`
- `Customer`, `Supplier`, `ContactAddress`
- `PurchaseOrder`, `PurchaseOrderItem`, `PurchaseOrderPayment`
- `SalesOrder`, `SalesOrderItem`, `SalesOrderPayment`
- `Expense`, `ExpenseCategory`, `ExpenseTax`
- `Inquiry`, `InquiryProduct`, `InquiryActivity`
- `Location`, `StockTransfer`, `DamagedStock`
- `Transaction`, `TransactionItem`, `AccountingEntry`, `LedgerAccount`
- `Reminder`, `EmailTemplate`, `CompanyProfile`
- And all other business entities

---

### Component 3: Database Context Updates

#### [MODIFY] [POSDbContext.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Context/POSDbContext.cs)

Add tenant configuration and global query filters:

```csharp
public class POSDbContext : IdentityDbContext<User, Role, Guid, UserClaim, UserRole, UserLogin, RoleClaim, UserToken>
{
    private readonly ITenantProvider _tenantProvider;

    public POSDbContext(DbContextOptions options, ITenantProvider tenantProvider) : base(options)
    {
        _tenantProvider = tenantProvider;
    }

    // Add Tenant DbSet
    public DbSet<Tenant> Tenants { get; set; }

    // Existing DbSets...

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configure Tenant entity
        builder.Entity<Tenant>(b =>
        {
            b.HasKey(t => t.Id);
            b.HasIndex(t => t.Subdomain).IsUnique();
            b.Property(t => t.Name).IsRequired().HasMaxLength(200);
            b.Property(t => t.Subdomain).IsRequired().HasMaxLength(100);
        });

        // Configure User-Tenant relationship
        builder.Entity<User>(b =>
        {
            b.HasOne(u => u.Tenant)
                .WithMany()
                .HasForeignKey(u => u.TenantId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Existing configurations...
        });

        // Apply global query filters for multi-tenancy
        ApplyTenantQueryFilters(builder);

        // Existing configurations...
        builder.DefalutMappingValue();
        builder.DefalutDeleteValueFilter();
    }

    private void ApplyTenantQueryFilters(ModelBuilder builder)
    {
        var tenantId = _tenantProvider.GetTenantId();

        // Apply to all entities inheriting from BaseEntity
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var tenantProperty = Expression.Property(parameter, nameof(BaseEntity.TenantId));
                var tenantValue = Expression.Constant(tenantId);
                var tenantFilter = Expression.Equal(tenantProperty, tenantValue);

                var lambda = Expression.Lambda(tenantFilter, parameter);
                builder.Entity(entityType.ClrType).HasQueryFilter(lambda);
            }
        }

        // Apply to User entity separately
        builder.Entity<User>()
            .HasQueryFilter(u => u.TenantId == tenantId);

        // Apply to Role entity
        builder.Entity<Role>()
            .HasQueryFilter(r => r.TenantId == tenantId);
    }

    public override int SaveChanges()
    {
        ApplyTenantId();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantId();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTenantId()
    {
        var tenantId = _tenantProvider.GetTenantId();
        if (!tenantId.HasValue)
        {
            throw new InvalidOperationException("TenantId is not set in the current context.");
        }

        foreach (var entry in ChangeTracker.Entries<BaseEntity>()
            .Where(e => e.State == EntityState.Added))
        {
            entry.Entity.TenantId = tenantId.Value;
        }

        foreach (var entry in ChangeTracker.Entries<User>()
            .Where(e => e.State == EntityState.Added))
        {
            entry.Entity.TenantId = tenantId.Value;
        }

        foreach (var entry in ChangeTracker.Entries<Role>()
            .Where(e => e.State == EntityState.Added))
        {
            entry.Entity.TenantId = tenantId.Value;
        }
    }
}
```

#### [MODIFY] [DefaultEntityMappingExtension.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/DefaultEntityMappingExtension.cs)

Update query filters to work with tenant filters:

```csharp
public static void DefalutDeleteValueFilter(this ModelBuilder modelBuilder)
{
    // Existing soft delete filters need to be combined with tenant filters
    // This will be handled by the global query filter in POSDbContext
    // Keep existing implementation but note that filters will be combined
}
```

---

### Component 4: Middleware & Authentication

#### [NEW] [TenantResolutionMiddleware.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Middleware/TenantResolutionMiddleware.cs)

Middleware to resolve tenant from subdomain or header:

```csharp
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolutionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantProvider tenantProvider, POSDbContext dbContext)
    {
        // Try to resolve tenant from subdomain
        var host = context.Request.Host.Host;
        var subdomain = ExtractSubdomain(host);

        Guid? tenantId = null;

        if (!string.IsNullOrEmpty(subdomain))
        {
            // Look up tenant by subdomain
            var tenant = await dbContext.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Subdomain == subdomain && t.IsActive);
            
            if (tenant != null)
            {
                tenantId = tenant.Id;
            }
        }

        // Fallback to header
        if (!tenantId.HasValue && context.Request.Headers.ContainsKey("X-Tenant-ID"))
        {
            if (Guid.TryParse(context.Request.Headers["X-Tenant-ID"], out var headerTenantId))
            {
                tenantId = headerTenantId;
            }
        }

        // Fallback to user claim (if authenticated)
        if (!tenantId.HasValue && context.User?.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = context.User.FindFirst("TenantId");
            if (tenantClaim != null && Guid.TryParse(tenantClaim.Value, out var claimTenantId))
            {
                tenantId = claimTenantId;
            }
        }

        if (tenantId.HasValue)
        {
            tenantProvider.SetTenantId(tenantId.Value);
        }

        await _next(context);
    }

    private string ExtractSubdomain(string host)
    {
        // Extract subdomain from host (e.g., "tenant1.yourdomain.com" -> "tenant1")
        var parts = host.Split('.');
        if (parts.Length >= 3)
        {
            return parts[0];
        }
        return null;
    }
}
```

#### [MODIFY] [Startup.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Startup.cs)

Register tenant services and middleware:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    // Add tenant provider as scoped service
    services.AddScoped<ITenantProvider, TenantProvider>();

    // Update DbContext registration to include ITenantProvider
    services.AddDbContextPool<POSDbContext>((serviceProvider, options) =>
    {
        var tenantProvider = serviceProvider.GetRequiredService<ITenantProvider>();
        var configuration = serviceProvider.GetRequiredService<IConfiguration>();
        
        // Configure database options...
    });

    // Existing services...
}

public void Configure(IApplicationBuilder app, IWebHostEnvironment env, ILoggerFactory loggerFactory)
{
    // Add tenant resolution middleware BEFORE authentication
    app.UseMiddleware<TenantResolutionMiddleware>();

    app.UseAuthentication();
    app.UseRouting();
    app.UseAuthorization();

    // Existing middleware...
}
```

#### [MODIFY] JWT Token Generation

Update token generation to include TenantId claim:

```csharp
// In your token generation logic (likely in a UserRepository or AuthService)
var claims = new List<Claim>
{
    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
    new Claim(ClaimTypes.Email, user.Email),
    new Claim("TenantId", user.TenantId.ToString()), // Add tenant claim
    // Other existing claims...
};
```

---

### Component 5: Repository Pattern Updates

#### [MODIFY] Repository Implementations

All repository implementations should be tenant-aware. The global query filters will handle most cases, but explicit tenant checks may be needed for cross-tenant operations (admin scenarios).

Example updates for repositories:

```csharp
public class ProductRepository : IProductRepository
{
    private readonly POSDbContext _context;
    private readonly ITenantProvider _tenantProvider;

    public ProductRepository(POSDbContext context, ITenantProvider tenantProvider)
    {
        _context = context;
        _tenantProvider = tenantProvider;
    }

    // Most queries will automatically filter by tenant due to global query filters
    public async Task<List<Product>> GetAllAsync()
    {
        // Automatically filtered by TenantId via global query filter
        return await _context.Products.ToListAsync();
    }

    // For admin scenarios where cross-tenant access is needed
    public async Task<List<Product>> GetAllTenantsAsync()
    {
        // Explicitly ignore tenant filter
        return await _context.Products.IgnoreQueryFilters().ToListAsync();
    }
}
```

---

### Component 6: MediatR Command/Query Handlers

#### Updates for CQRS Handlers

MediatR handlers will automatically benefit from global query filters. However, ensure that:

1. Commands that create entities don't explicitly set `TenantId` (handled by `SaveChanges`)
2. Queries don't need modification (global filters apply)
3. Cross-tenant admin operations use `IgnoreQueryFilters()` when appropriate

Example:

```csharp
public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, ServiceResponse<ProductDto>>
{
    private readonly POSDbContext _context;
    private readonly ITenantProvider _tenantProvider;

    public async Task<ServiceResponse<ProductDto>> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var product = new Product
        {
            Name = request.Name,
            // Don't set TenantId - it will be set automatically in SaveChanges
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync(cancellationToken);

        return ServiceResponse<ProductDto>.ReturnSuccess();
    }
}
```

---

### Component 7: Data Migration

#### [NEW] Migration Script

Create EF Core migration for tenant support:

```bash
dotnet ef migrations add AddMultiTenantSupport --project POS.Domain --startup-project POS.API
```

#### [NEW] [TenantDataMigrationService.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Helper/TenantDataMigrationService.cs)

Service to migrate existing data to default tenant:

```csharp
public class TenantDataMigrationService
{
    private readonly POSDbContext _context;

    public async Task MigrateExistingDataToDefaultTenant()
    {
        // 1. Create default tenant
        var defaultTenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = "Default Tenant",
            Subdomain = "default",
            IsActive = true,
            CreatedDate = DateTime.UtcNow,
            ContactEmail = "admin@default.com"
        };

        _context.Tenants.Add(defaultTenant);
        await _context.SaveChangesAsync();

        // 2. Update all existing records with default tenant ID
        await UpdateEntityTenantId<Product>(defaultTenant.Id);
        await UpdateEntityTenantId<Customer>(defaultTenant.Id);
        await UpdateEntityTenantId<Supplier>(defaultTenant.Id);
        // ... update all other tenant-specific entities

        // 3. Update users
        await _context.Database.ExecuteSqlRawAsync(
            $"UPDATE Users SET TenantId = '{defaultTenant.Id}' WHERE TenantId IS NULL");

        await _context.SaveChangesAsync();
    }

    private async Task UpdateEntityTenantId<T>(Guid tenantId) where T : BaseEntity
    {
        var tableName = _context.Model.FindEntityType(typeof(T)).GetTableName();
        await _context.Database.ExecuteSqlRawAsync(
            $"UPDATE {tableName} SET TenantId = '{tenantId}' WHERE TenantId IS NULL OR TenantId = '00000000-0000-0000-0000-000000000000'");
    }
}
```

---

### Component 8: API Controllers

#### [MODIFY] Controller Base Class

Create or update base controller to provide tenant context:

```csharp
[ApiController]
public class TenantAwareController : ControllerBase
{
    protected readonly ITenantProvider _tenantProvider;

    public TenantAwareController(ITenantProvider tenantProvider)
    {
        _tenantProvider = tenantProvider;
    }

    protected Guid CurrentTenantId => _tenantProvider.GetTenantId() 
        ?? throw new UnauthorizedAccessException("Tenant context not found");
}
```

#### [NEW] [TenantsController.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/Controllers/TenantsController.cs)

Controller for tenant management (admin only):

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin")]
public class TenantsController : ControllerBase
{
    private readonly POSDbContext _context;

    [HttpGet]
    public async Task<ActionResult<List<Tenant>>> GetAllTenants()
    {
        return await _context.Tenants.IgnoreQueryFilters().ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Tenant>> CreateTenant([FromBody] CreateTenantDto dto)
    {
        var tenant = new Tenant
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Subdomain = dto.Subdomain,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Tenant>> GetTenant(Guid id)
    {
        var tenant = await _context.Tenants.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == id);
        
        if (tenant == null)
            return NotFound();

        return tenant;
    }
}
```

---

### Component 9: Configuration Updates

#### [MODIFY] [appsettings.json](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.API/appsettings.json)

Add multi-tenancy configuration:

```json
{
  "MultiTenancy": {
    "Enabled": true,
    "TenantResolutionStrategy": "Subdomain",
    "DefaultTenantId": "00000000-0000-0000-0000-000000000000",
    "AllowTenantSwitching": false
  }
}
```

---

## Verification Plan

### Automated Tests

#### 1. Unit Tests for Tenant Provider

**Test File**: Create `POS.Tests/TenantProviderTests.cs`

```bash
# Run unit tests
dotnet test POS.Tests --filter "FullyQualifiedName~TenantProviderTests"
```

**Test Cases**:
- Verify tenant resolution from JWT claims
- Verify tenant resolution from HTTP headers
- Verify tenant resolution from subdomain
- Verify fallback behavior when tenant not found

#### 2. Integration Tests for Query Filters

**Test File**: Create `POS.Tests/Integration/MultiTenantQueryFilterTests.cs`

```bash
# Run integration tests
dotnet test POS.Tests --filter "FullyQualifiedName~MultiTenantQueryFilterTests"
```

**Test Cases**:
- Create products for Tenant A and Tenant B
- Query products as Tenant A - should only see Tenant A products
- Query products as Tenant B - should only see Tenant B products
- Verify cross-tenant isolation for all major entities

#### 3. Migration Tests

**Test File**: Create `POS.Tests/Integration/TenantMigrationTests.cs`

```bash
# Run migration tests
dotnet test POS.Tests --filter "FullyQualifiedName~TenantMigrationTests"
```

**Test Cases**:
- Verify default tenant creation
- Verify existing data migration to default tenant
- Verify all entities have TenantId after migration

### Manual Verification

#### 1. Database Schema Verification

After running migrations:

```sql
-- Verify Tenants table exists
SELECT * FROM Tenants;

-- Verify TenantId column added to all tenant-specific tables
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE COLUMN_NAME = 'TenantId';

-- Verify all existing records have TenantId
SELECT COUNT(*) FROM Products WHERE TenantId IS NULL; -- Should be 0
SELECT COUNT(*) FROM Customers WHERE TenantId IS NULL; -- Should be 0
```

#### 2. API Testing with Postman/Swagger

1. **Create Test Tenants**:
   - POST `/api/tenants` with SuperAdmin credentials
   - Create Tenant A (subdomain: `tenant-a`)
   - Create Tenant B (subdomain: `tenant-b`)

2. **Create Users for Each Tenant**:
   - POST `/api/users` for Tenant A user
   - POST `/api/users` for Tenant B user

3. **Test Data Isolation**:
   - Login as Tenant A user → Create products
   - Login as Tenant B user → Create products
   - Verify Tenant A user can only see Tenant A products
   - Verify Tenant B user can only see Tenant B products

4. **Test Subdomain Resolution**:
   - Access `http://tenant-a.localhost:5000/api/products`
   - Access `http://tenant-b.localhost:5000/api/products`
   - Verify correct tenant data returned

5. **Test Header-Based Resolution**:
   - Send request with header `X-Tenant-ID: {Tenant-A-GUID}`
   - Verify correct tenant data returned

#### 3. Performance Testing

```bash
# Use a load testing tool like k6 or Apache JMeter
# Test query performance with tenant filters
# Verify indexes on TenantId columns
```

### Rollback Plan

If issues are encountered:

1. **Database Rollback**:
   ```bash
   # Revert migration
   dotnet ef database update <PreviousMigrationName> --project POS.Domain --startup-project POS.API
   ```

2. **Code Rollback**:
   - Revert all code changes via Git
   - Restore database from backup taken before migration

3. **Gradual Rollout**:
   - Deploy to staging environment first
   - Test thoroughly before production deployment
   - Use feature flags to enable/disable multi-tenancy

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- Create `Tenant` entity and related infrastructure
- Implement `ITenantProvider` and `TenantProvider`
- Add `TenantId` to `BaseEntity` and `User`
- Create database migration

### Phase 2: Core Implementation (Week 2)
- Update `POSDbContext` with global query filters
- Implement `TenantResolutionMiddleware`
- Update `Startup.cs` with tenant services
- Update JWT token generation

### Phase 3: Data Migration (Week 3)
- Implement `TenantDataMigrationService`
- Create default tenant
- Migrate existing data
- Verify data integrity

### Phase 4: Testing & Validation (Week 4)
- Write and run unit tests
- Write and run integration tests
- Perform manual testing
- Performance testing
- Security audit

### Phase 5: Deployment (Week 5)
- Deploy to staging
- User acceptance testing
- Production deployment
- Monitor and fix issues

---

## Security Considerations

1. **Tenant Isolation**: Global query filters ensure data isolation
2. **Authentication**: JWT tokens include TenantId claim
3. **Authorization**: Verify user belongs to tenant before granting access
4. **SQL Injection**: Use parameterized queries (EF Core handles this)
5. **Tenant Switching**: Prevent unauthorized tenant switching
6. **Audit Logging**: Track cross-tenant access attempts

---

## Performance Considerations

1. **Indexes**: Add indexes on `TenantId` columns for all tenant-specific tables
2. **Query Optimization**: Global filters are applied at SQL level (efficient)
3. **Caching**: Implement tenant-aware caching strategies
4. **Connection Pooling**: Shared database benefits from connection pooling

---

## Future Enhancements

1. **Database-Per-Tenant**: Use `ConnectionString` field in `Tenant` table for future migration
2. **Tenant-Specific Features**: Feature flags per tenant
3. **Tenant Analytics**: Usage tracking and reporting per tenant
4. **Tenant Branding**: Custom themes and logos per tenant
5. **Tenant Billing**: Integration with payment systems
