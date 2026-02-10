using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class GenerateTenantLicenseKeysCommand : IRequest<ServiceResponse<TenantLicenseDto>>
    {
        public Guid TenantId { get; set; }
    }
}
