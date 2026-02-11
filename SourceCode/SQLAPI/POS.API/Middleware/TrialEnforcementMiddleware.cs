using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using POS.Repository;
using POS.Data;
using System;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json;
using System.Collections.Generic;

namespace POS.API.Middleware
{
    public class TrialEnforcementMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;
        
        // Critical paths that must always work
        private readonly HashSet<string> _allowedPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "/api/User/Login",
            "/api/authentication",
            "/api/authentication/login",
            "/api/User/RefreshToken",
            "/api/License/Validate",
            "/api/Sync" // Allow all sync operations for now, or refine to specific endpoints
        };

        public TrialEnforcementMiddleware(RequestDelegate next, IMemoryCache cache)
        {
            _next = next;
            _cache = cache;
        }

        public async Task InvokeAsync(HttpContext context, ICompanyProfileRepository companyProfileRepository)
        {
            var path = context.Request.Path.Value;

            // 1. Allowlist Check
            // Check for exact match or starts with for controllers check
            if (_allowedPaths.Contains(path) || 
                path.StartsWith("/api/Sync/", StringComparison.OrdinalIgnoreCase) ||
                context.Request.Method == "GET") 
            {
                await _next(context);
                return;
            }

            // 2. Retrieve CompanyProfile (Cache -> DB)
            if (!_cache.TryGetValue("CompanyProfile_License", out CompanyProfile profile))
            {
                // Assuming Single Tenant logic for Desktop, or getting the first one. 
                // For simplified single-tenant desktop: get the first profile.
                // NOTE: In Cloud/Multi-tenant, this needs to be Tenant-aware.
                // For now, assuming Current Tenant Resolution handles the scope,
                // but Repository might just return generic. 
                // Let's assume GetCompanyProfile returns the profile for the current tenant context.
                profile = await companyProfileRepository.GetCompanyProfile(); 
                
                if (profile != null)
                {
                    _cache.Set("CompanyProfile_License", profile, TimeSpan.FromMinutes(10));
                }
            }

            // If still null (initial setup?), allow to proceed (or block?)
            if (profile == null)
            {
                await _next(context);
                return;
            }

            // 3. Trial Mode Logic
            bool isTrial = string.IsNullOrEmpty(profile.LicenseKey) || profile.LicenseKey == "AAABBB";

            if (isTrial)
            {
                var daysSinceCreation = (DateTime.UtcNow - profile.CreatedDate).TotalDays;
                if (daysSinceCreation > 14)
                {
                    // Block WRITE operations
                    var method = context.Request.Method.ToUpper();
                    if (method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH")
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        
                        var response = new 
                        { 
                            message = "Trial Period Expired. Please Purchase License.", 
                            isTrialExpired = true 
                        };
                        
                        await context.Response.WriteAsync(JsonConvert.SerializeObject(response));
                        return;
                    }
                }
            }

            await _next(context);
        }
    }
}
