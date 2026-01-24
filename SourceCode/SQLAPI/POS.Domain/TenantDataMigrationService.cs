using Microsoft.EntityFrameworkCore;
using POS.Data.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Domain
{
    public class TenantDataMigrationService
    {
        private readonly POSDbContext _context;
        private readonly ITenantProvider _tenantProvider;

        public TenantDataMigrationService(POSDbContext context, ITenantProvider tenantProvider)
        {
            _context = context;
            _tenantProvider = tenantProvider;
        }

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
                ContactEmail = "admin@default.com",
                MaxUsers = 100,
                SubscriptionPlan = "Standard"
            };

            // Set tenant context to allow creating the tenant
            _tenantProvider.SetTenantId(defaultTenant.Id);

            _context.Tenants.Add(defaultTenant);
            await _context.SaveChangesAsync();

            // 2. Update all existing records with default tenant ID using raw SQL
            // This bypasses the query filters and entity tracking

            // Update Users
            await _context.Database.ExecuteSqlRawAsync(
                $"UPDATE Users SET TenantId = '{defaultTenant.Id}' WHERE TenantId = '00000000-0000-0000-0000-000000000000' OR TenantId IS NULL");

            // Update Roles
            await _context.Database.ExecuteSqlRawAsync(
                $"UPDATE Roles SET TenantId = '{defaultTenant.Id}' WHERE TenantId = '00000000-0000-0000-0000-000000000000' OR TenantId IS NULL");

            // Update all entities inheriting from BaseEntity
            var entityTypes = _context.Model.GetEntityTypes()
                .Where(t => typeof(POS.Data.BaseEntity).IsAssignableFrom(t.ClrType))
                .Select(t => t.GetTableName())
                .Where(tableName => !string.IsNullOrEmpty(tableName))
                .Distinct();

            foreach (var tableName in entityTypes)
            {
                try
                {
                    await _context.Database.ExecuteSqlRawAsync(
                        $"UPDATE {tableName} SET TenantId = '{defaultTenant.Id}' WHERE TenantId = '00000000-0000-0000-0000-000000000000' OR TenantId IS NULL");
                }
                catch (Exception ex)
                {
                    // Log error but continue with other tables
                    Console.WriteLine($"Error updating table {tableName}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
        }

        public async Task<Tenant> CreateTenant(string name, string subdomain, string contactEmail)
        {
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = name,
                Subdomain = subdomain,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                ContactEmail = contactEmail,
                MaxUsers = 50,
                SubscriptionPlan = "Basic"
            };

            // Temporarily set tenant context to allow creating the tenant
            var currentTenantId = _tenantProvider.GetTenantId();
            _tenantProvider.SetTenantId(tenant.Id);

            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            // Restore previous tenant context
            if (currentTenantId.HasValue)
            {
                _tenantProvider.SetTenantId(currentTenantId.Value);
            }

            return tenant;
        }
    }
}
