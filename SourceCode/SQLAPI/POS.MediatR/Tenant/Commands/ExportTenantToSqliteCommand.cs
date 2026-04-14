using POS.Helper;
using MediatR;
using POS.Helper;
using System;

namespace POS.MediatR.Tenant.Commands
{
    public class ExportTenantToSqliteCommand : IRequest<ServiceResponse<ExportTenantToSqliteCommandResult>>
    {
        public Guid TenantId { get; set; }
        public string CloudApiUrl { get; set; }
        public string ApiKey { get; set; } // Needed for appsettings.json
    }

    public class ExportTenantToSqliteCommandResult
    {
        public string FilePath { get; set; }
        public string FileName { get; set; }
    }
}

