# Seeding Service Fix for Duplicate Key Errors

I have resolved the `SQLite Error 19: 'UNIQUE constraint failed...'` errors that were occurring during database seeding.

## The Issue
The previous incremental seeding logic only correctly handled entities that inherited from `BaseEntity` (having a single `Id` property). It failed to check for existing records for:
1.  Entities not inheriting from `BaseEntity` (e.g., `Tenant`).
2.  Entities with composite keys (e.g., `UserRoles`, `UserLocations`, `ProductStocks`).
3.  Entities where the key name was different or the generic constraint check failed.

This caused the seeding service to attempt to insert duplicate records, leading to Unique Constraint violations.

## The Fix

I replaced the flawed logic in `SeedingService.cs` with a robust, generic approach using EF Core's `FindEntityType` and `FindPrimaryKey` metadata.

### Modified `SeedTable<T>` in `SeedingService.cs`

```csharp
// Old Logic (Removed)
// if (typeof(BaseEntity).IsAssignableFrom(typeof(T))) { ... }

// New Logic (Added)
var entityType = _context.Model.FindEntityType(typeof(T));
var primaryKey = entityType.FindPrimaryKey();
var keyProperties = primaryKey.Properties;

foreach (var entity in entities)
{
    // Get primary key values using reflection based on EF metadata
    var keyValues = keyProperties
        .Select(p => p.PropertyInfo.GetValue(entity))
        .ToArray();

    // Check if it exists in the database using FindAsync
    // This supports both Single Config Keys (Id) and Composite Keys (UserId, RoleId)
    var existing = await _context.Set<T>().FindAsync(keyValues);

    if (existing == null)
    {
        newEntities.Add(entity);
    }
}
```

This change ensures that for every record in the CSV, we check if it already exists in the database using its correct Primary Key definition before attempting to insert it.

## Verification
You can now run the application. The seeding process should skip existing records and only insert new ones without throwing `UNIQUE constraint failed` exceptions in the log.
