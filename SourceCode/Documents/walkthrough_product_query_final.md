# Product List Query Fixes - Final Implementation

I have implemented two critical fixes to resolve the issue where the product list was returning empty results.

## 1. Dynamic SingleTenantProvider with AppSettings Override (Option B + E)

**Problem:** The `SingleTenantProvider` was hardcoded. We need it to be dynamic but also configurable via `appsettings.json` for specific deployments.

**Fix:**
Modified `SingleTenantProvider.cs` to:
1.  **Check `appsettings.json` first**: If `TenantId` is configured, use it.
2.  **Check Database**: If no config, fetch the first available `Tenant` from the database.
3.  **Fallback**: Default to a hardcoded ID if neither works.

```csharp
// SingleTenantProvider.cs
public SingleTenantProvider(IServiceProvider serviceProvider = null, IConfiguration configuration = null)
{
    _serviceProvider = serviceProvider;
    _configuration = configuration;
}

public Guid? GetTenantId()
{
    // 1. Check AppSettings
    if (_configuration != null)
    {
        var configuredId = _configuration.GetValue<string>("TenantId");
        if (Guid.TryParse(configuredId, out var parsedId)) return parsedId;
    }

    // 2. Check Database
    if (_serviceProvider != null)
    {
        using (var scope = _serviceProvider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();
            var tenant = context.Tenants.IgnoreQueryFilters().FirstOrDefault();
            if (tenant != null) return tenant.Id;
        }
    }
    
    // 3. Fallback
    return DefaultFallbackId;
}
```

**Configuration:**
To assume a specific tenant, add this to your `appsettings.json` or `appsettings.Desktop.json`:

```json
{
  "TenantId": "YOUR-TENANT-GUID-HERE"
}
```

## 2. ProductList Mapping Fix (Option D)

**Problem:** The `ProductList.cs` class was attempting to use AutoMapper (`_mapper.Map`) inside an EF Core LINQ projection (`.Select()`).
```csharp
// This caused a runtime exception or silent failure
ProductTaxes = _mapper.Map<List<ProductTaxDto>>(c.ProductTaxes)
```
EF Core cannot translate the `Map` method to SQL.

**Fix:**
Refactored `ProductList.GetDtos` to:
1. Fetch the `Product` entities from the database first (executing the SQL with `Include`s).
2. Perform the mapping to `ProductDto` in memory.

```csharp
// New Logic
var entities = await source
    .Skip(skip)
    .Take(pageSize)
    .AsNoTracking()
    .ToListAsync(); // Execute SQL

return _mapper.Map<List<ProductDto>>(entities); // Map in memory
```

## Verification

1. **Run the Application**: Start the API/Desktop app.
2. **Browse Products**: Navigate to the product list.
3. **Verify Data**: You should now see the seeded products. The diagnostic logs confirmed that 13 products exist and match the tenant filter; the mapping fix ensures they are correctly returned to the UI.

## Diagnostics Cleaned
I have removed the temporary diagnostic logging from `ProductRepository.cs` to keep the codebase clean.
