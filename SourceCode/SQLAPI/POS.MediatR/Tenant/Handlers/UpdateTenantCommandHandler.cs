using POS.Helper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Data.Dto;
using POS.Domain;
using POS.MediatR.Tenant.Commands;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class UpdateTenantCommandHandler : IRequestHandler<UpdateTenantCommand, ServiceResponse<POS.Data.Entities.Tenant>>
    {
        private readonly POSDbContext _context;

        public UpdateTenantCommandHandler(POSDbContext context)
        {
            _context = context;
        }

        public async Task<ServiceResponse<POS.Data.Entities.Tenant>> Handle(UpdateTenantCommand request, CancellationToken cancellationToken)
        {
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (tenant == null)
            {
                return ServiceResponse<POS.Data.Entities.Tenant>.Return404("Tenant not found");
            }

            tenant.Name = request.Name ?? tenant.Name;
            tenant.ContactEmail = request.ContactEmail ?? tenant.ContactEmail;
            tenant.ContactPhone = request.ContactPhone ?? tenant.ContactPhone;
            tenant.Address = request.Address ?? tenant.Address;
            tenant.IsActive = request.IsActive ?? tenant.IsActive;
            tenant.MaxUsers = request.MaxUsers ?? tenant.MaxUsers;
            tenant.SubscriptionPlan = request.SubscriptionPlan ?? tenant.SubscriptionPlan;

            await _context.SaveChangesAsync(cancellationToken);

            return ServiceResponse<POS.Data.Entities.Tenant>.ReturnResultWith200(tenant);
        }
    }
}

