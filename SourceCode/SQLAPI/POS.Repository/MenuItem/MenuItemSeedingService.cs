using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Domain;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class MenuItemSeedingService
    {
        private readonly POSDbContext _context;

        public MenuItemSeedingService(POSDbContext context)
        {
            _context = context;
        }

        public async Task SeedMenuItemsAsync(Guid tenantId, Guid userId)
        {
            if (await _context.MenuItems.AnyAsync(m => m.TenantId == tenantId))
                return;

            var dashboard = new MenuItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Title = "DASHBOARD",
                Path = "/dashboard",
                Icon = "dashboard",
                Order = 1,
                IsActive = true,
                IsVisible = true,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                ObjectState = ObjectState.Added
            };

            var product = new MenuItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Title = "PRODUCT",
                Icon = "widgets",
                Order = 2,
                IsActive = true,
                IsVisible = true,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                ObjectState = ObjectState.Added
            };

             var productList = new MenuItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ParentId = product.Id,
                Title = "LIST",
                Path = "/products",
                Icon = "target",
                Order = 1,
                IsActive = true,
                IsVisible = true,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow,
                ObjectState = ObjectState.Added
            };

            _context.MenuItems.AddRange(dashboard, product, productList);
            await _context.SaveChangesAsync();
            
            // Assign to SuperAdmin Role (Assuming RoleId is known or found)
            var superAdminRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Super Admin" && r.TenantId == tenantId);
            if (superAdminRole != null)
            {
                var permissions = new List<RoleMenuItem>();
                foreach (var item in new[] { dashboard, product, productList })
                {
                    permissions.Add(new RoleMenuItem
                    {
                        Id = Guid.NewGuid(),
                        RoleId = superAdminRole.Id,
                        MenuItemId = item.Id,
                        CanView = true,
                        CanCreate = true,
                        CanEdit = true,
                        CanDelete = true,
                        AssignedBy = userId,
                        AssignedDate = DateTime.UtcNow
                    });
                }
                _context.RoleMenuItems.AddRange(permissions);
                await _context.SaveChangesAsync();
            }
        }
    }
}
