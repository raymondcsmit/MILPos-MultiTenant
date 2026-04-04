using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using POS.Common;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Entities;
using POS.Domain;
using POS.Helper;
using POS.MediatR.Tenant.Commands;
using POS.Repository;
using POS.Common.GenericRepository;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class UpdateTenantLicenseCommandHandler : IRequestHandler<UpdateTenantLicenseCommand, ServiceResponse<bool>>
    {
        private readonly IGenericRepository<POS.Data.Entities.Tenant> _tenantRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;
        private readonly IMemoryCache _cache;

        public UpdateTenantLicenseCommandHandler(
            IGenericRepository<POS.Data.Entities.Tenant> tenantRepository,
            IUnitOfWork<POSDbContext> uow,
            IMemoryCache cache)
        {
            _tenantRepository = tenantRepository;
            _uow = uow;
            _cache = cache;
        }

        public async Task<ServiceResponse<bool>> Handle(UpdateTenantLicenseCommand request, CancellationToken cancellationToken)
        {
            var tenant = await _tenantRepository.All.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);
            if (tenant == null) return ServiceResponse<bool>.ReturnFailed(404, "Tenant not found");

            tenant.LicenseType = request.LicenseType;
            if (string.Equals(request.LicenseType, LicenseType.Trial.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                tenant.SubscriptionStartDate = DateTime.UtcNow;
                tenant.TrialExpiryDate = DateTime.UtcNow.AddDays(AppConstants.TenantConfig.TrialPeriodDays);
                tenant.SubscriptionEndDate = tenant.TrialExpiryDate;
                if (string.IsNullOrWhiteSpace(tenant.SubscriptionPlan) || string.Equals(tenant.SubscriptionPlan, LicenseType.Paid.ToString(), StringComparison.OrdinalIgnoreCase))
                {
                    tenant.SubscriptionPlan = AppConstants.TenantConfig.TrialPlan;
                }
            }
            else
            {
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

            _tenantRepository.Update(tenant);
            await _uow.SaveAsync();
            _cache.Remove($"Tenant_Subscription:{request.TenantId}");

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
