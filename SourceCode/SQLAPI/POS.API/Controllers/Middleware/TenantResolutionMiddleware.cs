using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using POS.Domain;
using POS.Helper;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Middleware
{
    public class TenantResolutionMiddleware
    {
        private readonly RequestDelegate _next;

        public TenantResolutionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, ITenantProvider tenantProvider, POSDbContext dbContext)
        {
            // Try to resolve tenant from subdomain
            var host = context.Request.Host.Host;
            var subdomain = ExtractSubdomain(host);

            Guid? tenantId = null;

            if (!string.IsNullOrEmpty(subdomain))
            {
                // Look up tenant by subdomain
                var tenant = await dbContext.Tenants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Subdomain == subdomain && t.IsActive);
                
                if (tenant != null)
                {
                    tenantId = tenant.Id;
                }
            }

            // Fallback to header
            if (!tenantId.HasValue && context.User?.Identity?.IsAuthenticated == true)
            {
                var isSuperAdminClaim = context.User.FindFirst("isSuperAdmin");
                bool isSuperAdmin = isSuperAdminClaim?.Value?.ToLower() == "true";

                if (isSuperAdmin && context.Request.Headers.ContainsKey("X-Tenant-ID") &&
                    Guid.TryParse(context.Request.Headers["X-Tenant-ID"].FirstOrDefault(), out var headerTenantId))
                {
                    tenantId = headerTenantId;
                }
            }

            // Fallback to user claim (if authenticated)
            if (!tenantId.HasValue && context.User?.Identity?.IsAuthenticated == true)
            {
                var tenantClaim = context.User.FindFirst("TenantId");
                if (tenantClaim != null && Guid.TryParse(tenantClaim.Value, out var claimTenantId))
                {
                    tenantId = claimTenantId;
                }
            }

            if (tenantId.HasValue)
            {
                tenantProvider.SetTenantId(tenantId.Value);
            }

            await _next(context);
        }

        private string ExtractSubdomain(string host)
        {
            // Extract subdomain from host (e.g., "tenant1.yourdomain.com" -> "tenant1")
            // Skip localhost and IP addresses
            if (host.Contains("localhost") || host.Contains("127.0.0.1") || System.Net.IPAddress.TryParse(host, out _))
            {
                return null;
            }

            var parts = host.Split('.');
            if (parts.Length >= 3)
            {
                return parts[0];
            }
            return null;
        }
    }
}
