using System;
using POS.Common;
using POS.Common.Services;
using POS.Data.Entities;

namespace POS.Repository.Tenant
{
    public class TenantInitializationService : ITenantInitializationService
    {
        private readonly ISecurityService _securityService;

        public TenantInitializationService(ISecurityService securityService)
        {
            _securityService = securityService;
        }

        public POS.Data.Entities.Tenant InitializeNewTenant(string name, string subdomain, string adminEmail, string phone, string address, string businessType = null)
        {
            var tenantId = Guid.NewGuid();
            var trialEndsAt = DateTime.UtcNow.AddDays(AppConstants.TenantConfig.TrialPeriodDays);
            return new POS.Data.Entities.Tenant
            {
                Id = tenantId,
                Name = name,
                Subdomain = subdomain,
                ContactEmail = adminEmail,
                ContactPhone = phone,
                Address = address,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
                SubscriptionPlan = AppConstants.TenantConfig.TrialPlan,
                SubscriptionStartDate = DateTime.UtcNow,
                SubscriptionEndDate = trialEndsAt,
                TrialExpiryDate = trialEndsAt,
                LicenseType = LicenseType.Trial.ToString(),
                MaxUsers = AppConstants.TenantConfig.DefaultMaxUsers,
                BusinessType = businessType ?? AppConstants.BusinessType.Retail,
                ApiKey = _securityService.GenerateSecureApiKey(),
                ApiKeyCreatedDate = DateTime.UtcNow,
                ApiKeyEnabled = true
            };
        }
    }
}
