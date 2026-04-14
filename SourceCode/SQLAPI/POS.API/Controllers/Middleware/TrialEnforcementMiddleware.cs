using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using POS.Repository;
using POS.Data;
using System;
using System.Threading.Tasks;
using System.Linq;
using Newtonsoft.Json;
using System.Collections.Generic;
using POS.Domain;
using Microsoft.EntityFrameworkCore;
using POS.Common;
using POS.Data.Entities;
using POS.Data.Entities.Licensing;
using POS.Common.Services;

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
            "/api/WrLicense/validate",
            "/api/CompanyProfile/activate_license",
            "/api/Tenants/register",
            "/api/Sync" // Allow all sync operations for now, or refine to specific endpoints
        };

        public TrialEnforcementMiddleware(RequestDelegate next, IMemoryCache cache)
        {
            _next = next;
            _cache = cache;
        }

        public async Task InvokeAsync(HttpContext context, ICompanyProfileRepository companyProfileRepository, ITenantProvider tenantProvider, POSDbContext dbContext, IDbUtilityService dbUtilityService)
        {
            var path = context.Request.Path.Value;
            var method = context.Request.Method.ToUpperInvariant();

            if (method == "OPTIONS" || method == "HEAD")
            {
                await _next(context);
                return;
            }

            // 1. Allowlist Check
            // Check for exact match or starts with for controllers check
            if (_allowedPaths.Contains(path) || 
                path.StartsWith("/api/Sync/", StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            var isSuperAdmin = context.User?.Claims?.Any(c => string.Equals(c.Type, "isSuperAdmin", StringComparison.OrdinalIgnoreCase) && string.Equals(c.Value, "true", StringComparison.OrdinalIgnoreCase)) == true;
            if (isSuperAdmin)
            {
                await _next(context);
                return;
            }

            var tenantId = tenantProvider.GetTenantId();
            var cacheKey = tenantId.HasValue ? $"CompanyProfile_License:{tenantId.Value}" : "CompanyProfile_License:global";

            // 2. Retrieve CompanyProfile (Cache -> DB)
            if (!_cache.TryGetValue(cacheKey, out CompanyProfile profile))
            {
                profile = await companyProfileRepository.GetCompanyProfile(); 
                
                if (profile != null)
                {
                    _cache.Set(cacheKey, profile, TimeSpan.FromMinutes(10));
                }
            }

            // If still null (initial setup?), allow to proceed (or block?)
            if (profile == null)
            {
                await _next(context);
                return;
            }

            if (!_cache.TryGetValue("LicensingSchemaEnsured", out bool licensingSchemaEnsured) || !licensingSchemaEnsured)
            {
                await dbUtilityService.EnsureLicensingSchemaAsync(dbContext);
                _cache.Set("LicensingSchemaEnsured", true, TimeSpan.FromHours(6));
            }

            if (tenantId.HasValue)
            {
                var activeLicense = await dbContext.Set<License>()
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .Where(l => l.TenantId == tenantId.Value && !l.IsDeleted && l.Status == "Active")
                    .OrderByDescending(l => l.IssuedAt)
                    .FirstOrDefaultAsync();

                if (activeLicense != null)
                {
                    if (!activeLicense.ExpiresAt.HasValue || DateTime.UtcNow <= activeLicense.ExpiresAt.Value)
                    {
                        await _next(context);
                        return;
                    }

                    if (method == "POST" || method == "PUT" || method == "DELETE" || method == "PATCH")
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";

                        var response = new
                        {
                            message = "License Expired. Please Renew License.",
                            isTrialExpired = true
                        };

                        await context.Response.WriteAsync(JsonConvert.SerializeObject(response));
                        return;
                    }
                }
            }

            var hasActivatedLicense = !string.IsNullOrWhiteSpace(profile.LicenseKey) &&
                                      !string.Equals(profile.LicenseKey, AppConstants.Seeding.DefaultLicenseKey, StringComparison.OrdinalIgnoreCase);

            if (hasActivatedLicense)
            {
                await _next(context);
                return;
            }

            Tenant tenant = null;
            if (tenantId.HasValue)
            {
                var tenantCacheKey = $"Tenant_Subscription:{tenantId.Value}";
                if (!_cache.TryGetValue(tenantCacheKey, out tenant))
                {
                    tenant = await dbContext.Tenants.IgnoreQueryFilters().AsNoTracking().FirstOrDefaultAsync(t => t.Id == tenantId.Value);
                    if (tenant != null)
                    {
                        _cache.Set(tenantCacheKey, tenant, TimeSpan.FromMinutes(5));
                    }
                }
            }

            if (tenant != null)
            {
                if (string.Equals(tenant.SubscriptionPlan, "Master", StringComparison.OrdinalIgnoreCase))
                {
                    await _next(context);
                    return;
                }

                if (string.Equals(tenant.LicenseType, "Paid", StringComparison.OrdinalIgnoreCase))
                {
                    await _next(context);
                    return;
                }

                if (string.Equals(tenant.LicenseType, "Trial", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(tenant.LicenseType))
                {
                    var expiresAt = tenant.TrialExpiryDate ?? tenant.SubscriptionEndDate;
                    if (!expiresAt.HasValue)
                    {
                        expiresAt = profile.CreatedDate.AddDays(AppConstants.TenantConfig.TrialPeriodDays);
                    }

                    if (DateTime.UtcNow > expiresAt.Value)
                    {
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
            }
            else
            {
                var isTrial = string.IsNullOrEmpty(profile.LicenseKey) || profile.LicenseKey == AppConstants.Seeding.DefaultLicenseKey;
                if (isTrial)
                {
                    var daysSinceCreation = (DateTime.UtcNow - profile.CreatedDate).TotalDays;
                    if (daysSinceCreation > AppConstants.TenantConfig.TrialPeriodDays)
                    {
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
            }

            await _next(context);
        }
    }
}
