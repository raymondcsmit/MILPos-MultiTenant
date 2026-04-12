using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Data.Entities;
using POS.Domain;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace POS.API.Middleware
{
    /// <summary>
    /// Middleware for authenticating requests using X-API-Key header
    /// Used by synced clients to authenticate securely
    /// </summary>
    public class ApiKeyAuthenticationMiddleware
    {
        private readonly RequestDelegate _next;

        public ApiKeyAuthenticationMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, POSDbContext dbContext)
        {
            // Check if X-API-Key header exists
            var apiKey = context.Request.Headers["X-API-Key"].FirstOrDefault();

            if (!string.IsNullOrEmpty(apiKey))
            {
                // Validate API key and get tenant
                var tenant = await dbContext.Tenants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.ApiKey == apiKey && t.ApiKeyEnabled);

                if (tenant != null)
                {
                    // Update last used date
                    tenant.ApiKeyLastUsedDate = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync();

                    // Create Identity for [Authorize] attribute
                    var claims = new[]
                    {
                        new System.Security.Claims.Claim("TenantId", tenant.Id.ToString()),
                        new System.Security.Claims.Claim("ApiKeyAuthenticated", "true"),
                        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, "SyncClient"),
                        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "SyncAgent") 
                    };
                    var identity = new System.Security.Claims.ClaimsIdentity(claims, "ApiKey");
                    context.User = new System.Security.Claims.ClaimsPrincipal(identity);

                    // Set TenantId in context for downstream use (legacy)
                    context.Items["TenantId"] = tenant.Id;
                    context.Items["AuthenticatedViaApiKey"] = true;
                    context.Items["TenantIdAuthenticated"] = true;
                }
                else
                {
                    // Invalid API Key provided
                    context.Response.StatusCode = 401;
                    await context.Response.WriteAsync("Invalid API Key");
                    return;
                }
            }

            await _next(context);
        }
    }
}
