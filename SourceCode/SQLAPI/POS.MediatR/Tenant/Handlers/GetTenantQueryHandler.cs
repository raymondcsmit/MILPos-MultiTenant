using POS.Helper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.MediatR.Tenant.Queries;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class GetTenantQueryHandler : IRequestHandler<GetTenantQuery, ServiceResponse<Data.Entities.Tenant>>
    {
        private readonly POSDbContext _context;

        public GetTenantQueryHandler(POSDbContext context)
        {
            _context = context;
        }

        public async Task<ServiceResponse<Data.Entities.Tenant>> Handle(GetTenantQuery request, CancellationToken cancellationToken)
        {
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (tenant == null)
            {
                return ServiceResponse<Data.Entities.Tenant>.Return404("Tenant not found");
            }

            return ServiceResponse<Data.Entities.Tenant>.ReturnResultWith200(tenant);
        }
    }
}

