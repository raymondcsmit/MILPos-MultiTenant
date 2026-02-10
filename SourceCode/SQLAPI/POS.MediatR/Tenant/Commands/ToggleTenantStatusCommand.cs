using MediatR;
using POS.Helper;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class ToggleTenantStatusCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid TenantId { get; set; }
    }
}
