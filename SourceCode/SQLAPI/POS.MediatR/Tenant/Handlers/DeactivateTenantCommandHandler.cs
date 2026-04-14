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
    public class DeactivateTenantCommandHandler : IRequestHandler<DeactivateTenantCommand, ServiceResponse<bool>>
    {
        private readonly POSDbContext _context;

        public DeactivateTenantCommandHandler(POSDbContext context)
        {
            _context = context;
        }

        public async Task<ServiceResponse<bool>> Handle(DeactivateTenantCommand request, CancellationToken cancellationToken)
        {
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (tenant == null)
            {
                return ServiceResponse<bool>.Return404("Tenant not found");
            }

            tenant.IsActive = false;
            await _context.SaveChangesAsync(cancellationToken);

            return ServiceResponse<bool>.ReturnResultWith200(true);
        }
    }
}

