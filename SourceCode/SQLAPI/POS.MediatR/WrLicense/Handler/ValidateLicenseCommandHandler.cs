using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using POS.Common.UnitOfWork;
using POS.Common;
using POS.Data;
using POS.Data.Entities;
using POS.Data.Dto;
using POS.Domain;
using POS.Helper;
using POS.MediatR.WrLicense.Command;
using POS.Repository;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using TenantEntity = POS.Data.Entities.Tenant;

namespace POS.MediatR.WrLicense.Handler
{
    public class ValidateLicenseCommandHandler : IRequestHandler<ValidateLicenseCommand, ServiceResponse<UserAuthDto>>
    {
        private readonly ICompanyProfileRepository _companyProfileRepository;
        private readonly IUnitOfWork<POSDbContext> _unitOfWork;
        private readonly IMemoryCache _cache;
        private readonly ITenantProvider _tenantProvider;
        private readonly ILogger<ValidateLicenseCommandHandler> _logger;

        public ValidateLicenseCommandHandler(
            ICompanyProfileRepository companyProfileRepository,
            IUnitOfWork<POSDbContext> unitOfWork,
            IMemoryCache cache,
            ITenantProvider tenantProvider,
            ILogger<ValidateLicenseCommandHandler> logger)
        {
            _companyProfileRepository = companyProfileRepository;
            _unitOfWork = unitOfWork;
            _cache = cache;
            _tenantProvider = tenantProvider;
            _logger = logger;
        }

        public async Task<ServiceResponse<UserAuthDto>> Handle(ValidateLicenseCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.PurchaseCode))
            {
                return ServiceResponse<UserAuthDto>.Return409("Purchase Code is required.");
            }
           
            var profile = await _companyProfileRepository.GetCompanyProfile();
            
            if (profile != null)
            {
                var newLicenseKey = Guid.NewGuid().ToString("N").ToUpper(); 
                
                profile.PurchaseCode = request.PurchaseCode;
                profile.LicenseKey = newLicenseKey;
                
                _companyProfileRepository.Update(profile);
                
                var tenantId = _tenantProvider.GetTenantId();
                if (tenantId.HasValue)
                {
                    var tenant = await _unitOfWork.Context.Set<TenantEntity>()
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

                    _cache.Remove($"Tenant_Subscription:{tenantId.Value}");
                    _cache.Remove($"CompanyProfile_License:{tenantId.Value}");
                }
                _cache.Remove("CompanyProfile_License:global");
                _cache.Remove("CompanyProfile_License");

                await _unitOfWork.SaveAsync();

                _logger.LogInformation("License activated via WrLicense.Validate for TenantId={TenantId}", tenantId);
                
                var data = new UserAuthDto
                {
                    IsAuthenticated = true,
                    PurchaseCode = request.PurchaseCode,
                    LicenseKey = newLicenseKey,
                    BearerToken = "DUMMY_TOKEN_FOR_LICENSE_VALIDATION" 
                };
                
                return ServiceResponse<UserAuthDto>.ReturnResultWith200(data);
            }
            
            return ServiceResponse<UserAuthDto>.Return404("Company Profile not found.");
        }
    }
}
