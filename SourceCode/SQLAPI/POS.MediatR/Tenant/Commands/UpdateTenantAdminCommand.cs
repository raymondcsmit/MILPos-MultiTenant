using MediatR;
using POS.Helper;
using System;
using System.ComponentModel.DataAnnotations;

namespace POS.MediatR.Tenant.Commands
{
    public class UpdateTenantAdminCommand : IRequest<ServiceResponse<bool>>
    {
        public Guid TenantId { get; set; }
        [Required]
        public string AdminEmail { get; set; }
        public string NewPassword { get; set; }
    }
}
