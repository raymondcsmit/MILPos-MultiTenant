using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Entities;
using Action = POS.Data.Action;

namespace POS.Domain
{
    public static class DefaultEntityMappingExtension
    {
        public static void DefalutMappingValue(this ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Action>()
               .Property(b => b.ModifiedDate)
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<Page>()
                .Property(b => b.ModifiedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<User>()
                .Property(b => b.ModifiedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<Role>()
                .Property(b => b.ModifiedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<Country>()
              .Property(b => b.ModifiedDate)
              .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<City>()
              .Property(b => b.ModifiedDate)
              .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<Supplier>()
              .Property(b => b.ModifiedDate)
              .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<ContactRequest>()
              .Property(b => b.ModifiedDate)
              .HasDefaultValueSql("CURRENT_TIMESTAMP");


            modelBuilder.Entity<ProductCategory>()
                .Property(b => b.ModifiedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");



            modelBuilder.Entity<PurchaseOrder>()
                .Property(b => b.ModifiedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<PurchaseOrderPayment>()
                .Property(b => b.ModifiedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<Expense>()
               .Property(b => b.ModifiedDate)
               .HasDefaultValueSql("CURRENT_TIMESTAMP");

            modelBuilder.Entity<ExpenseCategory>()
               .Property(b => b.ModifiedDate)
               .HasDefaultValueSql("CURRENT_TIMESTAMP");
        }

        public static void DefalutDeleteValueFilter(this ModelBuilder modelBuilder)
        {
            // Query filters are now handled globally in POSDbContext.ApplyTenantQueryFilters
            // to avoid conflicts between TenantId and IsDeleted filters.
        }
    }
}

