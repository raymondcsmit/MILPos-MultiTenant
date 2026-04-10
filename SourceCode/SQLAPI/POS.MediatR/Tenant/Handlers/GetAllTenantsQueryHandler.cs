using POS.Helper;
using MediatR;
using Microsoft.EntityFrameworkCore;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Domain;
using POS.MediatR.Tenant.Queries;
using System.Collections.Generic;
using POS.Helper;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Tenant.Handlers
{
    public class GetAllTenantsQueryHandler : IRequestHandler<GetAllTenantsQuery, ServiceResponse<List<Data.Entities.Tenant>>>
    {
        private readonly POSDbContext _context;

        public GetAllTenantsQueryHandler(POSDbContext context)
        {
            _context = context;
        }

        public async Task<ServiceResponse<List<Data.Entities.Tenant>>> Handle(GetAllTenantsQuery request, CancellationToken cancellationToken)
        {
            var tenants = await _context.Tenants
                .IgnoreQueryFilters()
                .OrderBy(t => t.Name)
                .ToListAsync(cancellationToken);

            return ServiceResponse<List<Data.Entities.Tenant>>.ReturnResultWith200(tenants);
        }
    }
}

