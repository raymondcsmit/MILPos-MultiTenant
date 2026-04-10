using POS.Helper;
using MediatR;
using POS.Data.Dto;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class UpdateTenantCommand : IRequest<ServiceResponse<POS.Data.Entities.Tenant>>
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
        public string Address { get; set; }
        public bool? IsActive { get; set; }
        public int? MaxUsers { get; set; }
        public string SubscriptionPlan { get; set; }
    }
}

