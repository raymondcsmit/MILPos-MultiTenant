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
                var tenantClaim = httpContext.User.FindFirst("TenantId");
                if (tenantClaim != null && Guid.TryParse(tenantClaim.Value, out var tenantId))
                {
                    return tenantId;
                }
            }

            // Try to get from custom header
            if (httpContext?.Request?.Headers?.ContainsKey("X-Tenant-ID") == true)
            {
                if (Guid.TryParse(httpContext.Request.Headers["X-Tenant-ID"].FirstOrDefault(), out var tenantId))
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
