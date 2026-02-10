using Microsoft.EntityFrameworkCore;
using POS.Common.GenericRepository;
using POS.Common.UnitOfWork;
using POS.Data;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class MenuItemRepository : GenericRepository<MenuItem, POSDbContext>, IMenuItemRepository
    {
        public MenuItemRepository(IUnitOfWork<POSDbContext> uow) : base(uow)
        {
        }

        public async Task<List<MenuItem>> GetMenuItemsByRoleAsync(Guid roleId)
        {
            return await Context.MenuItems
                .Include(m => m.RoleMenuItems)
                .Where(m => m.RoleMenuItems.Any(rm => rm.RoleId == roleId && rm.CanView))
                .OrderBy(m => m.Order)
                .ToListAsync();
        }

        public async Task<List<MenuItem>> GetMenuItemsByRolesAsync(List<Guid> roleIds)
        {
            return await Context.MenuItems
                .Include(m => m.RoleMenuItems)
                .Where(m => m.RoleMenuItems.Any(rm => roleIds.Contains(rm.RoleId) && rm.CanView))
                .OrderBy(m => m.Order)
                .ToListAsync();
        }
    }
}
