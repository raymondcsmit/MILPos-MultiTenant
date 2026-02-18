using POS.Data.Entities;
using System;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface ITenantDataCloner
    {
        Task CloneTenantDataAsync(Guid sourceTenantId, POS.Data.Entities.Tenant targetTenant);
    }
}
