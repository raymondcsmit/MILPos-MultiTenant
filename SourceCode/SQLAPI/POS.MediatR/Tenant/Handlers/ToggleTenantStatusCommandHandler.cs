using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Helper;
using POS.MediatR.Tenant.Commands;
using POS.Repository;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Domain;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class ToggleTenantStatusCommandHandler : IRequestHandler<ToggleTenantStatusCommand, ServiceResponse<bool>>
    {
        private readonly IGenericRepository<POS.Data.Entities.Tenant> _tenantRepository;
        private readonly IUnitOfWork<POSDbContext> _uow;

        public ToggleTenantStatusCommandHandler(
            IGenericRepository<POS.Data.Entities.Tenant> tenantRepository,
            IUnitOfWork<POSDbContext> uow)
        {
            _tenantRepository = tenantRepository;
            _uow = uow;
        }

        public async Task<ServiceResponse<bool>> Handle(ToggleTenantStatusCommand request, CancellationToken cancellationToken)
        {
            var tenant = await _tenantRepository.All.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.Id == request.TenantId, cancellationToken);
            if (tenant == null) return ServiceResponse<bool>.ReturnFailed(404, "Tenant not found");

            tenant.IsActive = !tenant.IsActive;
            _tenantRepository.Update(tenant);
            await _uow.SaveAsync();

            return ServiceResponse<bool>.ReturnResultWith200(tenant.IsActive);
        }
    }
}
