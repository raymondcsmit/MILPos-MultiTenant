using MediatR;
using POS.Data;
using POS.Helper;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class UpdateTenantLicenseCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid TenantId { get; set; }
        public string LicenseType { get; set; }
        public DateTime? TrialExpiryDate { get; set; }
    }
}
