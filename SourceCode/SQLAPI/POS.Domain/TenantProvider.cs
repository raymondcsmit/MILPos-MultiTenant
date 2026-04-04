using Microsoft.AspNetCore.Http;
using POS.Data.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Domain
{
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
                // Check if user is SuperAdmin
                var isSuperAdminClaim = httpContext.User.FindFirst("isSuperAdmin");
                bool isSuperAdmin = isSuperAdminClaim?.Value?.ToLower() == "true";
                
                // SuperAdmin can override TenantId via X-Tenant-ID header for impersonation
                if (isSuperAdmin && httpContext.Request.Headers.ContainsKey("X-Tenant-ID"))
                {
                    if (Guid.TryParse(httpContext.Request.Headers["X-Tenant-ID"].FirstOrDefault(), out var headerTenantId))
                    {
                        return headerTenantId; // SuperAdmin impersonating this tenant
                    }
                }
                
                // Read TenantId from JWT claims
                var tenantClaim = httpContext.User.FindFirst("TenantId");
                if (tenantClaim != null && Guid.TryParse(tenantClaim.Value, out var tenantId))
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

        public Task<Tenant> GetCurrentTenantAsync()
        {
            // This method will be implemented in a service layer that has access to DbContext
            // For now, return null
            return Task.FromResult<Tenant>(null);
        }
    }
}
