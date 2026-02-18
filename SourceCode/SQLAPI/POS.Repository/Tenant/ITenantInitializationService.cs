using System;
using System.Threading.Tasks;
using POS.Data.Entities;

namespace POS.Repository.Tenant
{
    public interface ITenantInitializationService
    {
        POS.Data.Entities.Tenant InitializeNewTenant(string name, string subdomain, string adminEmail, string phone, string address, string businessType = null);
    }
}
