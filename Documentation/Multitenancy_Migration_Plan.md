# Multitenancy Architecture Migration Plan

## 1. Current State Analysis

Based on an in-depth review of the `f:\MIllyass\pos-with-inventory-management\SourceCode` codebase, the current system architecture assessment is as follows:

### 1.1 Technology Stack Overview
- **Backend Framework**: .NET Core (ASP.NET Core Web API)
- **ORM**: Entity Framework Core (Supports SQL Server and SQLite)
- **Database Design**: Code-First, using Identity framework for user management.
- **Architecture Pattern**: Clean Architecture (API, Domain, Data, Repository, MediatR).
- **Data Access**: UnitOfWork + GenericRepository pattern.
- **Authentication/Authorization**: JWT Bearer Token, custom `UserInfoToken` for passing current user information.

### 1.2 Existing Code Structure Analysis
- **Base Entity (`BaseEntity`)**: Contains audit fields (`CreatedBy`, `ModifiedBy`, etc.), but lacks tenant identification.
- **User Model (`User`)**: Inherits from `IdentityUser<Guid>`, currently globally unique, not associated with a specific organization or tenant.
- **Data Context (`POSDbContext`)**: Standard EF Core implementation, no multitenancy filtering logic configured.
- **Data Persistence (`UnitOfWork`)**: Intercepts `SaveChanges` to populate audit fields. This is an ideal entry point for automatically populating `TenantId`.
- **File Storage**: Relies on local file system paths (`PathHelper`), all files are mixed, lacking isolation.

### 1.3 Migration Challenges
- **Data Isolation**: Current queries (`GenericRepository.All`) default to querying all data. A global filtering mechanism must be introduced to prevent data leakage.
- **User System**: Need to transform users from "System Users" to "Tenant Users", meaning a user must belong to one or more tenants.
- **Static Resources**: Uploaded images and documents currently lack tenant isolation, leading to potential unauthorized resource access.

---

## 2. Multitenancy Architecture Design

### 2.1 Strategy Selection: Shared Database, Shared Schema
Given that the system uses EF Core and the business logic is tightly coupled, we recommend the **Shared Database, Shared Schema with Discriminator Column (`TenantId`) Isolation** strategy.

*   **Pros**: Lowest operational cost, easy database migration, high resource utilization.
*   **Cons**: Data isolation relies entirely on code logic (EF Core Query Filters), requiring developers to strictly follow standards.
*   **Applicability**: Highly suitable for SaaS POS systems, supporting a large number of small to medium-sized tenants.

### 2.2 Core Design Components

#### 2.2.1 Tenant Entity and Interface
Introduce a `Tenant` entity to manage tenant lifecycle (registration, payment, expiration). Introduce an `IMustHaveTenant` interface to mark business data requiring isolation.

```csharp
public interface IMustHaveTenant
{
    Guid TenantId { get; set; }
}
```

#### 2.2.2 Tenant Identification Mechanism
In the HTTP request lifecycle, resolve the tenant with the following priority:
1.  **Authenticated User**: Parse `TenantId` from the JWT Token Claims.
2.  **Unauthenticated Request**: Parse from HTTP Header `X-Tenant-ID`.
3.  **Domain (Optional)**: Parse from subdomain (e.g., `tenant1.pos.com`).

#### 2.2.3 Data Isolation Mechanism
*   **Query Isolation**: Utilize EF Core's **Global Query Filters** to automatically attach `WHERE TenantId = @CurrentTenantId` condition to all entities implementing `IMustHaveTenant`.
*   **Write Isolation**: In `UnitOfWork.SaveChanges()`, automatically detect and populate `TenantId` to prevent manual assignment errors by developers.

---

## 3. Detailed Implementation Steps

### Phase 1: Infrastructure Transformation

#### 1.1 Define Core Interfaces
Define interfaces in `POS.Data` or `POS.Common`:

```csharp
// POS.Data/Interfaces/IMustHaveTenant.cs
public interface IMustHaveTenant
{
    Guid TenantId { get; set; }
}

// POS.Common/Services/ICurrentTenantService.cs
public interface ICurrentTenantService
{
    Guid? TenantId { get; }
    bool SetTenant(Guid tenantId);
}
```

#### 1.2 Implement Tenant Service
Implement the service in `POS.API`, retrieving tenant info from `IHttpContextAccessor`.

```csharp
public class CurrentTenantService : ICurrentTenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    public CurrentTenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? TenantId
    {
        get
        {
            // 1. Try to get from User Claims
            var claimId = _httpContextAccessor.HttpContext?.User?.FindFirst("TenantId")?.Value;
            if (!string.IsNullOrEmpty(claimId) && Guid.TryParse(claimId, out var tenantId))
            {
                return tenantId;
            }

            // 2. Try to get from Header
            if (_httpContextAccessor.HttpContext?.Request.Headers.TryGetValue("X-Tenant-ID", out var headerId) == true)
            {
                if (Guid.TryParse(headerId, out var headerTenantId))
                {
                    return headerTenantId;
                }
            }
            
            return null;
        }
    }
}
```

#### 1.3 Register Service
Register in `Startup.cs`:
```csharp
services.AddScoped<ICurrentTenantService, CurrentTenantService>();
```

### Phase 2: Database Schema Transformation

#### 2.1 Create Tenant Entity
Add `Tenant` class in `POS.Data`:
```csharp
public class Tenant : BaseEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Host { get; set; } // For subdomain binding
    public bool IsActive { get; set; }
    public string ConnectionString { get; set; } // Reserved for future standalone DB extension
}
```

#### 2.2 Modify User Entity
Modify `POS.Data/Entities/User/User.cs`, adding `TenantId`:
```csharp
public class User : IdentityUser<Guid>, IMustHaveTenant
{
    // ... existing properties ...
    public Guid TenantId { get; set; }
}
```

#### 2.3 Modify Business Entities
Modify `BaseEntity` or specific business entities (like `Product`, `Order`, `Customer`) to implement `IMustHaveTenant` interface.
**Recommendation**: If all business data needs isolation, modify `BaseEntity` directly.

```csharp
public abstract class BaseEntity : IMustHaveTenant
{
    // ... existing properties ...
    public Guid TenantId { get; set; }
}
```

#### 2.4 Generate Migration Scripts
Run EF Core Migration:
```bash
dotnet ef migrations add AddMultitenancy
dotnet ef database update
```

### Phase 3: Data Access Layer (DAL) Transformation

#### 3.1 Configure Global Query Filters
Modify `POS.Domain/Context/POSDbContext.cs`:

```csharp
public class POSDbContext : IdentityDbContext<User, ...>
{
    private readonly ICurrentTenantService _currentTenantService;

    public POSDbContext(DbContextOptions options, ICurrentTenantService currentTenantService) 
        : base(options)
    {
        _currentTenantService = currentTenantService;
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Automatically apply filter to all entities implementing IMustHaveTenant
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(IMustHaveTenant).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(POSDbContext)
                    .GetMethod(nameof(ConfigureGlobalFilters), BindingFlags.NonPublic | BindingFlags.Instance)
                    ?.MakeGenericMethod(entityType.ClrType);
                method?.Invoke(this, new object[] { builder });
            }
        }
    }

    private void ConfigureGlobalFilters<T>(ModelBuilder builder) where T : class, IMustHaveTenant
    {
        builder.Entity<T>().HasQueryFilter(e => e.TenantId == _currentTenantService.TenantId);
    }
}
```

#### 3.2 Auto-populate TenantId
Modify `SetModifiedInformation` method in `POS.Common/UnitOfWork/UnitOfWork.cs`:

```csharp
private void SetModifiedInformation()
{
    var currentTenantId = _currentTenantService.TenantId;
    if (currentTenantId == null) 
    {
        // Allow some operations without tenant context (e.g., system background tasks), or throw exception
        // throw new Exception("Tenant context is missing");
    }

    foreach (var entry in Context.ChangeTracker.Entries<IMustHaveTenant>())
    {
        if (entry.State == EntityState.Added)
        {
            entry.Entity.TenantId = currentTenantId.Value;
        }
    }
    
    // ... existing audit code ...
}
```

### Phase 4: Authentication and API Transformation

#### 4.1 Login Logic (`AuthenticationController`)
*   When a user logs in, validate if the username belongs to the specific tenant.
*   Common approach: Login request must carry `TenantId` (or resolved via domain), `UserManager` needs to add `TenantId` filtering when finding user.
*   When generating JWT Token, write `TenantId` into Claim.

```csharp
// UserRepository.cs - BuildUserAuthObject
claims.Add(new Claim("TenantId", appUser.TenantId.ToString()));
```

#### 4.2 File Path Isolation
Modify `POS.Helper/PathHelper.cs` to include tenant directory when generating paths:

```csharp
public string GetTenantFilePath(string relativePath)
{
    var tenantId = _currentTenantService.TenantId;
    return Path.Combine("Tenants", tenantId.ToString(), relativePath);
}
```

---

## 4. Migration and Rollback Strategy

### 4.1 Data Migration Plan
Since this is a retrofit of an existing system, existing data must be handled.
1.  **Create Default Tenant**: Insert a record in the `Tenant` table (e.g., "Default Tenant").
2.  **Data Attribution**: Write SQL scripts to update `TenantId` of all existing table data to the Default Tenant's ID.
    ```sql
    UPDATE Users SET TenantId = 'DEFAULT-GUID';
    UPDATE Products SET TenantId = 'DEFAULT-GUID';
    -- Execute for all business tables
    ```
3.  **Enable Constraints**: After data population, set `TenantId` column to `NOT NULL` and add foreign key constraints.

### 4.2 Rollback Plan
*   **Database Backup**: Perform a full database backup before any operation.
*   **Code Branch**: All modifications should be done in a separate Feature Branch (`feature/multitenancy`).
*   **Feature Flag**: Add `MultitenancyEnabled` toggle in `appsettings.json`. If critical issues arise, configure the code to disable Query Filter logic (requires code support).

---

## 5. Testing Strategy

*   **Unit Tests**:
    *   Test if `UnitOfWork` correctly auto-populates `TenantId`.
    *   Test if `POSDbContext` filters out non-current tenant data.
*   **Integration Tests**:
    *   Simulate Tenant A login, create data.
    *   Simulate Tenant B login, attempt to query Tenant A's data, assert result is empty.
*   **Security Tests**:
    *   Attempt to tamper with `X-Tenant-ID` in Header, verify if unauthorized access is possible (should be combined with Auth validation, allowing access only if Token's TenantId matches Header, or trusting Token completely).
