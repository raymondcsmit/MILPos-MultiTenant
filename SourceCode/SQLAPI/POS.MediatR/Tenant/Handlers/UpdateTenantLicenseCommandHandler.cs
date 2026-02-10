using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data;
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

        public UpdateTenantLicenseCommandHandler(
            IGenericRepository<POS.Data.Entities.Tenant> tenantRepository,
            IUnitOfWork<POSDbContext> uow)
        {
            _tenantRepository = tenantRepository;
            _uow = uow;
        }

        public async Task<ServiceResponse<bool>> Handle(UpdateTenantLicenseCommand request, CancellationToken cancellationToken)
        {
            var tenant = await _tenantRepository.All.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);
            if (tenant == null) return ServiceResponse<bool>.ReturnFailed(404, "Tenant not found");

            tenant.LicenseType = request.LicenseType;
            if (request.LicenseType == "Trial")
            {
                tenant.TrialExpiryDate = DateTime.UtcNow.AddDays(14);
            }
            else
            {
                tenant.TrialExpiryDate = null;
            }

            _tenantRepository.Update(tenant);
            await _uow.SaveAsync();

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}
