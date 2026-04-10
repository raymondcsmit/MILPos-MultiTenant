using POS.Helper;
using MediatR;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using POS.Helper;

namespace POS.MediatR.Tenant.Commands
{
    public class RegisterTenantCommand : IRequest<ServiceResponse<POS.Data.Entities.Tenant>>
    {
        public string Name { get; set; }
        public string Subdomain { get; set; }
        public string AdminEmail { get; set; }
        public string AdminPassword { get; set; }
        public string Phone { get; set; }
        public string Address { get; set; }
        public string BusinessType { get; set; }
    }
}

