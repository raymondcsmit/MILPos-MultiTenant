using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class SwitchTenantCommand : IRequest<ServiceResponse<UserAuthDto>>
    {
        public Guid TenantId { get; set; }
        public string Email { get; set; } // Current user email to impersonate/login as in new tenant
    }
}
