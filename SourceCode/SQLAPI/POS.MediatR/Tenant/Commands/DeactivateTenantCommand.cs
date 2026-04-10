using POS.Helper;
using MediatR;
using POS.Data.Dto;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class DeactivateTenantCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid Id { get; set; }
    }
}

