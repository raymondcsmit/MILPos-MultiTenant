using MediatR;
using POS.Helper;

namespace POS.MediatR.Tenant.Commands
{
    public class CreateTenantCommand : IRequest<ServiceResponse<POS.Data.Entities.Tenant>>
    {
        public string Name { get; set; }
        public string Subdomain { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
        public string Address { get; set; }
        public string AdminEmail { get; set; }
        public string AdminPassword { get; set; }
        public string BusinessType { get; set; } = "Retail"; // Default to Retail
    }
}
