using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Data.Dto;
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
    public class GenerateTenantLicenseKeysCommandHandler : IRequestHandler<GenerateTenantLicenseKeysCommand, ServiceResponse<TenantLicenseDto>>
    {
        private readonly IGenericRepository<POS.Data.Entities.Tenant> _tenantRepository;
        private readonly ICompanyProfileRepository _companyProfileRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;

        public GenerateTenantLicenseKeysCommandHandler(
            IGenericRepository<POS.Data.Entities.Tenant> tenantRepository,
            ICompanyProfileRepository companyProfileRepository,
            IUnitOfWork<POSDbContext> uow)
        {
            _tenantRepository = tenantRepository;
            _companyProfileRepository = companyProfileRepository;
            _uow = uow;
        }

        public async Task<ServiceResponse<TenantLicenseDto>> Handle(GenerateTenantLicenseKeysCommand request, CancellationToken cancellationToken)
        {
            var tenant = await _tenantRepository.All.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);
            if (tenant == null) return ServiceResponse<TenantLicenseDto>.ReturnFailed(404, "Tenant not found");

            var licenseKey = Guid.NewGuid().ToString("N").ToUpper();
            var purchaseCode = Guid.NewGuid().ToString("N").ToUpper();

            var companyProfile = await _companyProfileRepository.All.IgnoreQueryFilters().FirstOrDefaultAsync(cp => cp.TenantId == request.TenantId, cancellationToken);

            if (companyProfile == null)
            {
                companyProfile = new CompanyProfile
                {
                    Id = Guid.NewGuid(),
                    TenantId = request.TenantId,
                    Title = tenant.Name,
                    Email = tenant.ContactEmail,
                    CreatedDate = DateTime.UtcNow,
                    ModifiedDate = DateTime.UtcNow
                };
                _companyProfileRepository.Add(companyProfile);
            }

            companyProfile.LicenseKey = licenseKey;
            companyProfile.PurchaseCode = purchaseCode;
            companyProfile.ModifiedDate = DateTime.UtcNow;

            await _uow.SaveAsync();

            return ServiceResponse<TenantLicenseDto>.ReturnResultWith200(new TenantLicenseDto
            {
                TenantId = request.TenantId,
                LicenseKey = licenseKey,
                PurchaseCode = purchaseCode
            });
        }
    }
}
