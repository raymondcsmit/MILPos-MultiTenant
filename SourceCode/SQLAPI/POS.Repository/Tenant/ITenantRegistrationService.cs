using POS.Data.Dto.Tenant;
using POS.Data.Entities;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface ITenantRegistrationService
    {
        Task<Tenant> RegisterTenantAsync(RegisterTenantDto dto);
    }
}
