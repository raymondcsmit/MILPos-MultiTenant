using POS.Data.Dto;
using MediatR;
using System.Collections.Generic;
using POS.Helper;
using System;

namespace POS.MediatR.CommandAndQuery
{
    public class AddRoleCommand : IRequest<ServiceResponse<RoleDto>>
    {
        public string Name { get; set; }
        public List<RoleClaimDto> RoleClaims { get; set; } = new List<RoleClaimDto>();
        public Guid TenantId { get; set; }
        public bool IsSuperRole { get; set; }
    }
}
