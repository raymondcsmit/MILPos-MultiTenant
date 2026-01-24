using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using POS.Data.Entities;
using POS.Domain;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Middleware
{
    /// <summary>
    /// Middleware for authenticating requests using TenantId
    /// Used by Desktop to sync with Cloud using TenantId as API key
    /// </summary>
    public class TenantIdAuthenticationMiddleware
    {
        private readonly RequestDelegate _next;

        public TenantIdAuthenticationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, POSDbContext dbContext)
        {
            // Skip authentication for certain paths
            var path = context.Request.Path.Value?.ToLower();
            if (path.Contains("/swagger") || 
                path.Contains("/api/auth") || 
                path.Contains("/api/account"))
            {
                await _next(context);
                return;
            }

            // Extract TenantId from header or query string
            var tenantIdStr = context.Request.Headers["X-Tenant-ID"].FirstOrDefault()
                ?? context.Request.Query["tenantId"].FirstOrDefault();

            if (string.IsNullOrEmpty(tenantIdStr))
            {
                // No TenantId provided - proceed normally (might be authenticated via JWT)
                await _next(context);
                return;
            }

            if (!Guid.TryParse(tenantIdStr, out var tenantId))
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Invalid TenantId format");
                return;
            }

            // Validate TenantId exists and is active
            var tenant = await dbContext.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == tenantId && t.IsActive);

            if (tenant == null)
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsync("Invalid or inactive TenantId");
                return;
            }

            // Set tenant context for this request
            context.Items["TenantId"] = tenantId;
            context.Items["TenantIdAuthenticated"] = true;

            await _next(context);
        }
    }
}
