using POS.Common.GenericRepository;
using POS.Data;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.Repository
{
    public interface IMenuItemRepository : IGenericRepository<MenuItem>
    {
        Task<List<MenuItem>> GetMenuItemsByRoleAsync(Guid roleId);
        Task<List<MenuItem>> GetMenuItemsByRolesAsync(List<Guid> roleIds);
    }
}
