using POS.Data.Entities;
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace POS.Domain
{
    /// <summary>
    /// Single-tenant provider for desktop deployment mode.
    /// Always returns a fixed tenant ID for single-tenant scenarios.
    /// </summary>
    /// <summary>
    /// Single-tenant provider for desktop deployment mode.
    /// Dynamically fetches the first tenant from the database.
    /// </summary>
    public class SingleTenantProvider : ITenantProvider
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly Microsoft.Extensions.Configuration.IConfiguration _configuration;
        private Guid? _cachedTenantId;
        private Tenant _cachedTenant;
        private static readonly object _lock = new object();
        private static readonly Guid DefaultFallbackId = Guid.Parse("00000000-0000-0000-0000-000000000001");

        public SingleTenantProvider(IServiceProvider serviceProvider = null, Microsoft.Extensions.Configuration.IConfiguration configuration = null)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
        }
        
        public Guid? GetTenantId()
        {
            if (_cachedTenantId.HasValue)
                return _cachedTenantId;

            lock (_lock)
            {
                if (_cachedTenantId.HasValue)
                    return _cachedTenantId;

                // 1. Try to get TenantId from AppSettings
                if (_configuration != null)
                {
                    var configuredTenantId = _configuration.GetValue<string>("TenantId");
                    if (!string.IsNullOrEmpty(configuredTenantId) && Guid.TryParse(configuredTenantId, out var parsedId))
                    {
                        _cachedTenantId = parsedId;
                        return _cachedTenantId;
                    }
                }

                // 2. Fallback to Database
                try 
                {
                    // Create a scope to resolve DbContext to avoid circular dependency
                    // (DbContext -> TenantProvider -> DbContext)
                    if (_serviceProvider != null)
                    {
                        using (var scope = _serviceProvider.CreateScope())
                        {
                            var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();
                            // Use IgnoreQueryFilters to ensure we can see tenants even if some filter interferes
                            var tenant = context.Tenants.IgnoreQueryFilters().FirstOrDefault();
                            
                            if (tenant != null)
                            {
                                _cachedTenantId = tenant.Id;
                                _cachedTenant = tenant;
                                return _cachedTenantId;
                            }
                        }
                    }
                }
                catch (Exception)
                {
                    // Fallback if DB is not ready or other error
                    // Console.WriteLine($"Error fetching tenant in SingleTenantProvider: {ex.Message}");
                }

                // 3. Fallback to default
                _cachedTenantId = DefaultFallbackId;
                return _cachedTenantId;
            }
        }

        public void SetTenantId(Guid tenantId)
        {
            // No-op for single tenant mode
        }

        public async Task<Tenant> GetCurrentTenantAsync()
        {
             if (_cachedTenant != null) return _cachedTenant;
             
             var tenantId = GetTenantId(); // This will populate _cachedTenant if found in DB
             
             if (_cachedTenant != null) return _cachedTenant;

             // Fallback dummy tenant if nothing in DB
             return new Tenant
             {
                Id = tenantId ?? DefaultFallbackId,
                Name = "Default Tenant",
                Subdomain = "default",
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                MaxUsers = 999,
                SubscriptionPlan = "Desktop"
             };
        }
    }
}
