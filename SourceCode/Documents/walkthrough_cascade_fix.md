# Cascade Delete Cycle Fix

I have resolved the SQL Server error: `Introducing FOREIGN KEY constraint 'FK_InventoryBatches_Users_CreatedBy' on table 'InventoryBatches' may cause cycles or multiple cascade paths.`

## Changes

### 1. Modified `POSDbContext.cs`
I added explicit configuration for the `InventoryBatch` entity in `OnModelCreating` to set `OnDelete(DeleteBehavior.Restrict)` for its relationships. This prevents the multiple cascade paths that were causing the cycle.

#### [POSDbContext.cs](file:///f:/MIllyass/pos-with-inventory-management/SourceCode/SQLAPI/POS.Domain/Context/POSDbContext.cs)
```csharp
            // Configure InventoryBatch to prevent cycles
            builder.Entity<InventoryBatch>(b =>
            {
                b.HasOne(e => e.Product)
                    .WithMany()
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.Location)
                    .WithMany()
                    .HasForeignKey(e => e.LocationId)
                    .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });
```

### 2. Regenerated Migration
I regenerated the `MainInitSQLServer` migration to reflect these changes.

`dotnet ef migrations add MainInitSQLServer --project POS.Migrations.SqlServer --startup-project POS.API --context POSDbContext`

## Next Steps
You can now retry applying the migration to the database:
`dotnet ef database update MainInitSQLServer -c POSDbContext -p POS.Migrations.SqlServer/POS.Migrations.SqlServer.csproj --startup-project POS.API/POS.API.csproj`
