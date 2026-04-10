using POS.Helper;
using MediatR;
using POS.Common.UnitOfWork;
using POS.Data.Dto;
using POS.Data.Entities;
using System;

namespace POS.MediatR.Tenant.Queries
{
    public class GetTenantQuery : IRequest<ServiceResponse<Data.Entities.Tenant>> 
    { 
        public Guid Id { get; set; }
    }
}

