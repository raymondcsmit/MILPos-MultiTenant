# Global Data Export Verification

## Concern
The user requested verification that global data (LedgerAccounts, Products, Brands, Categories, Units) is correctly exported to the tenant's SQLite database.

## Entity Analysis
I examined the definitions of the critical entities:
-   `LedgerAccount`: Inherits `BaseEntity`. `IsSystem` flag exists.
-   `Product`: Inherits `BaseEntity`.
-   `Brand`: Inherits `BaseEntity`.
-   `ProductCategory`: Inherits `BaseEntity`.
-   `UnitConversation`: Inherits `BaseEntity`.

**BaseEntity Definition**:
```csharp
public abstract class BaseEntity : ISoftDelete
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; } // Non-nullable Guid
    // ...
}
```
Since `TenantId` is non-nullable, "Global" data is represented by `TenantId = Guid.Empty` (00000000-0000-0000-0000-000000000000).

## Export Logic Verification
I reviewed `ExportTenantToSqliteCommandHandler.cs`.

### Filtering Strategy
The `CopyEntity` method constructs a dynamic LINQ query to filter data.

**Line 318-326 (Guid TenantId Handling)**:
```csharp
// Standard Guid TenantId
constant = System.Linq.Expressions.Expression.Constant(tenantId);
equality = System.Linq.Expressions.Expression.Equal(property, constant);

var emptyGuid = System.Linq.Expressions.Expression.Constant(Guid.Empty);
equalityEmpty = System.Linq.Expressions.Expression.Equal(property, emptyGuid);
orExpression = System.Linq.Expressions.Expression.Or(equality, equalityEmpty);
```
**Logic**: `WHERE TenantId = @TenantId OR TenantId = '00000000-0000-0000-0000-000000000000'`

### Conclusion
The export handler **explicitly includes** records where `TenantId` is `Guid.Empty`. Therefore, global `LedgerAccounts`, `Products`, `Brands`, `Categories`, and `Units` (which are created with `Guid.Empty` as system/global data) **will be exported** correctly.

No code changes are required for this specific request, as the mechanism is already in place.
