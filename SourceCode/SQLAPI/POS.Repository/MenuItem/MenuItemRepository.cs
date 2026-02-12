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

        public List<MenuItem> ProcessMenuDeduplication(List<MenuItem> allMenuItems)
        {
            var groupedItems = allMenuItems.GroupBy(x => new { x.Title, x.Path }).ToList();
            var distinctMenuItems = new List<MenuItem>();
            var idMap = new Dictionary<Guid, Guid>();

            foreach (var group in groupedItems)
            {
                var winner = group.OrderByDescending(x => x.TenantId.HasValue).ThenBy(x => x.Id).First();
                if (winner.RoleMenuItems == null)
                {
                    winner.RoleMenuItems = new List<RoleMenuItem>();
                }

                var mergedPermissions = group
                     .SelectMany(x => x.RoleMenuItems ?? Enumerable.Empty<RoleMenuItem>())
                     .GroupBy(rm => rm.RoleId)
                     .Select(g => g.First())
                     .ToList();

                winner.RoleMenuItems = mergedPermissions;
                distinctMenuItems.Add(winner);

                foreach (var item in group)
                {
                    if (!idMap.ContainsKey(item.Id))
                    {
                        idMap[item.Id] = winner.Id;
                    }
                }
            }

            foreach (var item in distinctMenuItems)
            {
                if (item.ParentId.HasValue && idMap.ContainsKey(item.ParentId.Value))
                {
                    item.ParentId = idMap[item.ParentId.Value];
                }
            }

            return distinctMenuItems.OrderBy(c => c.Order).ToList();
        }
    }
}
