using MediatR;
using POS.Helper;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class ExportTenantToSqliteCommand : IRequest<ServiceResponse<ExportTenantToSqliteCommandResponse>>
    {
        public Guid TenantId { get; set; }
    }
}
