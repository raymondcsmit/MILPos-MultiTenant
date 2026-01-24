using POS.Data.Entities;
using System;
using System.Threading.Tasks;

namespace POS.Domain
{
    /// <summary>
    /// Single-tenant provider for desktop deployment mode.
    /// Always returns a fixed tenant ID for single-tenant scenarios.
    /// </summary>
    public class SingleTenantProvider : ITenantProvider
    {
        private static readonly Guid DefaultTenantId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        
        public Guid? GetTenantId()
        {
            return DefaultTenantId;
        }

        public void SetTenantId(Guid tenantId)
        {
            // No-op for single tenant mode
            // Desktop applications don't need to switch tenants
        }

        public Task<Tenant> GetCurrentTenantAsync()
        {
            return Task.FromResult(new Tenant
            {
                Id = DefaultTenantId,
                Name = "Default Tenant",
                Subdomain = "default",
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                MaxUsers = 999,
                SubscriptionPlan = "Desktop"
            });
        }
    }
}
