using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using POS.Common;
using POS.Common.UnitOfWork;
using POS.Domain;
using POS.Data.Entities;
using POS.Repository;
using System;
using System.Threading;
using System.Threading.Tasks;
using TenantEntity = POS.Data.Entities.Tenant;

namespace POS.MediatR;
internal class UpdateActivatedLicenseCommandHandler(ICompanyProfileRepository companyProfileRepository, IUnitOfWork<POSDbContext> _uow, ITenantProvider tenantProvider, IMemoryCache cache, ILogger<UpdateActivatedLicenseCommandHandler> logger) : IRequestHandler<UpdateActivatedLicenseCommand, bool>
{
    public async Task<bool> Handle(UpdateActivatedLicenseCommand request, CancellationToken cancellationToken)
    {
        var companyProfile = await companyProfileRepository.GetCompanyProfile();
        if (companyProfile == null)
        {
            return false;
        }
        companyProfile.PurchaseCode = request.PurchaseCode;
        companyProfile.LicenseKey = request.LicenseKey;
        companyProfileRepository.Update(companyProfile);

        var tenantId = tenantProvider.GetTenantId();
        if (tenantId.HasValue)
        {
            var tenant = await _uow.Context.Set<TenantEntity>()
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == tenantId.Value, cancellationToken);

            if (tenant != null)
            {
                tenant.LicenseType = LicenseType.Paid.ToString();
                tenant.TrialExpiryDate = null;
                tenant.SubscriptionEndDate = null;
                if (!tenant.SubscriptionStartDate.HasValue)
                {
                    tenant.SubscriptionStartDate = DateTime.UtcNow;
                }
                if (string.Equals(tenant.SubscriptionPlan, AppConstants.TenantConfig.TrialPlan, StringComparison.OrdinalIgnoreCase))
                {
                    tenant.SubscriptionPlan = LicenseType.Paid.ToString();
                }
            }
        }

        if (await _uow.SaveAsync() <= -1)
        {
            return false;
        }

        if (tenantId.HasValue)
        {
            cache.Remove($"CompanyProfile_License:{tenantId.Value}");
            cache.Remove($"Tenant_Subscription:{tenantId.Value}");
        }
        cache.Remove("CompanyProfile_License:global");
        cache.Remove("CompanyProfile_License");

        logger.LogInformation("License activated via CompanyProfile.activate_license for TenantId={TenantId}", tenantId);

        return true;
    }
}
