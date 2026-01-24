using POS.Data.Entities;
using System;
using System.Threading.Tasks;

namespace POS.Domain
{
    public interface ITenantProvider
    {
        Guid? GetTenantId();
        Task<Tenant> GetCurrentTenantAsync();
        void SetTenantId(Guid tenantId);
    }
}
