using POS.Helper;
using MediatR;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using System.Collections.Generic;
using POS.Helper;

namespace POS.MediatR.Tenant.Queries
{
    public class GetAllTenantsQuery : IRequest<ServiceResponse<List<Data.Entities.Tenant>>> { }
}

