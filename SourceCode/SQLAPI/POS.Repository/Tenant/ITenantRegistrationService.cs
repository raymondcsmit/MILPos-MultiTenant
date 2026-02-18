using POS.Data;
using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface ITenantRegistrationService
    {
        Task SeedTenantDataAsync(POS.Data.Entities.Tenant tenant, User adminUser);
    }
}
