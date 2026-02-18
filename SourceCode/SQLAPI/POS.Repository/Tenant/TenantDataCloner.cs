using Microsoft.EntityFrameworkCore;
using POS.Data;
using POS.Domain;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace POS.Repository
{
    public class TenantDataCloner : ITenantDataCloner
    {
        private readonly POSDbContext _context;

        public TenantDataCloner(POSDbContext context)
        {
            _context = context;
        }

        public async Task CloneTenantDataAsync(Guid sourceTenantId, POS.Data.Entities.Tenant targetTenant)
        {
            var idMap = new Dictionary<Guid, Guid>(); // Map SourceID -> TargetID

            // 0. Company Profile (Single record, usually)
            await CloneTableAsync<CompanyProfile>(sourceTenantId, targetTenant, idMap);
            
            // 1. Locations (Essential for Stocks)
            await CloneTableAsync<Location>(sourceTenantId, targetTenant, idMap);
            
            // 1.5. UserLocations (Admin should have access to new locations)
            // But UserLocations links User (Global/Tenant) to Location (Cloned).
            // The Admin User is NEW (created in RegistrationService).
            // We might need to handle this in RegistrationService or here if we pass the Admin User.
            // For now, RegistrationService handles UserLocations for the Main Location it creates.
            // BUT if we clone locations, we might want to assign them to the Admin?
            // Let's skip UserLocations for now, assuming Admin gets "IsAllLocations = true".

            // 2. Settings & Independent Lookups
            await CloneTableAsync<FinancialYear>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<Tax>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<Brand>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<UnitConversation>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<ExpenseCategory>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<InquirySource>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<InquiryStatus>(sourceTenantId, targetTenant, idMap);
            // Warehouse? Typically Location.

            // 3. Hierarchical Entities
            await CloneRecursiveAsync<ProductCategory>(sourceTenantId, targetTenant, idMap);
            await CloneRecursiveAsync<MenuItem>(sourceTenantId, targetTenant, idMap);

            // 4. Products & Inventory
            await CloneProductsAsync(sourceTenantId, targetTenant, idMap); 
            await CloneTableAsync<ProductTax>(sourceTenantId, targetTenant, idMap);
            
            // Stocks depend on Products and Locations
            await CloneProductStocksAsync(sourceTenantId, targetTenant, idMap);

            // 5. CRM
            await CloneTableAsync<Supplier>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<SupplierAddress>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<Customer>(sourceTenantId, targetTenant, idMap);
            await CloneTableAsync<ContactAddress>(sourceTenantId, targetTenant, idMap);

            // 6. Access Control
            await CloneRolesAsync(sourceTenantId, targetTenant, idMap);
            
            // 7. Pages & PageHelpers - If they have TenantId.
            // Checked: Page is SharedBaseEntity (Global). PageHelper is?
            // Let's check PageHelper.
            await CloneTableAsync<PageHelper>(sourceTenantId, targetTenant, idMap); // Assuming it has TenantId, if not it will skip.
        }

        private async Task CloneTableAsync<T>(Guid sourceTenantId, POS.Data.Entities.Tenant targetTenant, Dictionary<Guid, Guid> idMap) where T : class
        {
            var dbSet = _context.Set<T>();
            var entityType = _context.Model.FindEntityType(typeof(T));
            var tenantIdProp = entityType.GetProperty("TenantId"); // Will be null if not found
            
            if (tenantIdProp == null) return; // Skip global entities

            // Get all entities from source tenant
            var sourceEntities = await dbSet
                .Where(e => EF.Property<Guid>(e, "TenantId") == sourceTenantId)
                .AsNoTracking()
                .ToListAsync();

            if (!sourceEntities.Any()) return;

            var newEntities = new List<T>();

            foreach (var entity in sourceEntities)
            {
                var newEntity = CloneEntity(entity, targetTenant.Id, idMap);
                newEntities.Add(newEntity);
            }

            dbSet.AddRange(newEntities);
            await _context.SaveChangesAsync();
        }

        private async Task CloneRecursiveAsync<T>(Guid sourceTenantId, POS.Data.Entities.Tenant targetTenant, Dictionary<Guid, Guid> idMap) where T : class
        {
             var dbSet = _context.Set<T>();
             
             // Check if T has TenantId
             var tenantIdProp = typeof(T).GetProperty("TenantId");
             if (tenantIdProp == null) return;

             var sourceEntities = await dbSet
                .Where(e => EF.Property<Guid>(e, "TenantId") == sourceTenantId)
                .AsNoTracking()
                .ToListAsync();

             if (!sourceEntities.Any()) return;

             // Pass 1: Clone & Map IDs
             var newEntities = new List<T>();
             foreach (var entity in sourceEntities)
             {
                 var newEntity = CloneEntity(entity, targetTenant.Id, idMap);
                 newEntities.Add(newEntity);
             }

             // Pass 2: Fix hierarchies (ParentId)
             var parentIdProp = typeof(T).GetProperty("ParentId");
             if (parentIdProp != null)
             {
                 foreach (var entity in newEntities)
                 {
                     var oldParentId = (Guid?)parentIdProp.GetValue(entity); 
                     
                     // If ParentId was copied from Source, it points to OLD Parent.
                     // We need to remap it to NEW Parent.
                     
                     if (oldParentId.HasValue)
                     {
                         if (idMap.TryGetValue(oldParentId.Value, out var newParentId))
                         {
                             parentIdProp.SetValue(entity, newParentId);
                         }
                         else
                         {
                             // Parent not found in this batch. 
                             // Might be a root or parent not cloned. Set to null.
                             parentIdProp.SetValue(entity, null);
                         }
                     }
                 }
             }

             dbSet.AddRange(newEntities);
             await _context.SaveChangesAsync();
        }

        private async Task CloneProductsAsync(Guid sourceTenantId, POS.Data.Entities.Tenant targetTenant, Dictionary<Guid, Guid> idMap)
        {
            var sourceProducts = await _context.Products
                .Where(p => p.TenantId == sourceTenantId)
                .AsNoTracking()
                .ToListAsync();

            var newProducts = new List<Product>();

            foreach (var p in sourceProducts)
            {
                var newP = CloneEntity(p, targetTenant.Id, idMap);

                // Remap FKs
                if (newP.CategoryId != Guid.Empty && idMap.TryGetValue(newP.CategoryId, out var newCatId)) newP.CategoryId = newCatId;
                if (newP.BrandId.HasValue && idMap.TryGetValue(newP.BrandId.Value, out var newBrandId)) newP.BrandId = newBrandId;
                if (newP.UnitId != Guid.Empty && idMap.TryGetValue(newP.UnitId, out var newUnitId)) newP.UnitId = newUnitId;

                newProducts.Add(newP);
            }

            _context.Products.AddRange(newProducts);
            await _context.SaveChangesAsync();
        }
        
        private async Task CloneProductStocksAsync(Guid sourceTenantId, POS.Data.Entities.Tenant targetTenant, Dictionary<Guid, Guid> idMap)
        {
            var sourceStocks = await _context.ProductStocks
                .Include(s => s.Product)
                .Where(s => s.Product.TenantId == sourceTenantId)
                .AsNoTracking()
                .ToListAsync();
            
            if (!sourceStocks.Any()) return;

            var newStocks = new List<ProductStock>();
            foreach (var s in sourceStocks)
            {
                if (idMap.TryGetValue(s.ProductId, out var newProductId))
                {
                    // Map LocationId
                    // If Location was cloned, its ID is in idMap
                    var newLocationId = s.LocationId;
                    if (idMap.TryGetValue(s.LocationId, out var mappedLocId))
                    {
                        newLocationId = mappedLocId;
                    }
                    else
                    {
                        // Fallback: If location not found (maybe not cloned?), try finding ANY location of new tenant
                        // For now, let's assume we cloned locations and map contains it.
                    }

                    var newStock = new ProductStock
                    {
                        Id = Guid.NewGuid(),
                        ProductId = newProductId,
                        LocationId = newLocationId,
                        CurrentStock = 0, 
                        PurchasePrice = 0,
                        CreatedBy = Guid.Empty, // Unknown
                        ModifiedDate = DateTime.UtcNow
                    };
                    newStocks.Add(newStock);
                }
            }
            
            _context.ProductStocks.AddRange(newStocks);
            await _context.SaveChangesAsync();
        }

        private async Task CloneRolesAsync(Guid sourceTenantId, POS.Data.Entities.Tenant targetTenant, Dictionary<Guid, Guid> idMap)
        {
            // Clone Roles
            var sourceRoles = await _context.Roles
                .Where(r => r.TenantId == sourceTenantId)
                .AsNoTracking()
                .ToListAsync();

            foreach (var role in sourceRoles)
            {
                 var newRole = new Role
                 {
                     Id = Guid.NewGuid(),
                     TenantId = targetTenant.Id,
                     Name = role.Name,
                     NormalizedName = role.NormalizedName,
                     CreatedDate = DateTime.UtcNow
                 };
                 
                 idMap[role.Id] = newRole.Id;
                 _context.Roles.Add(newRole);
                 
                 // 1. RoleClaims
                 var sourceClaims = await _context.RoleClaims
                    .Where(rc => rc.RoleId == role.Id)
                    .AsNoTracking()
                    .ToListAsync();
                 
                 foreach (var claim in sourceClaims)
                 {
                     // ActionId is Global. Copy as is.
                     _context.RoleClaims.Add(new RoleClaim
                     {
                         RoleId = newRole.Id,
                         ClaimType = claim.ClaimType,
                         ClaimValue = claim.ClaimValue,
                         ActionId = claim.ActionId 
                     });
                 }
                 
                 // 2. RoleMenuItems
                 // Need to map MenuItemId if MenuItems were cloned
                 var sourceRoleMenus = await _context.RoleMenuItems
                     .Where(rm => rm.RoleId == role.Id)
                     .AsNoTracking()
                     .ToListAsync();
                     
                 foreach (var rm in sourceRoleMenus)
                 {
                     var newMenuItemId = rm.MenuItemId;
                     if (idMap.TryGetValue(rm.MenuItemId, out var mappedMenuId))
                     {
                         newMenuItemId = mappedMenuId;
                     }
                     // If not mapped, it might be a global menu item (if any). Keep as is.
                     
                     _context.RoleMenuItems.Add(new RoleMenuItem
                     {
                         Id = Guid.NewGuid(),
                         RoleId = newRole.Id,
                         MenuItemId = newMenuItemId,
                         CanView = rm.CanView,
                         CanCreate = rm.CanCreate,
                         CanEdit = rm.CanEdit,
                         CanDelete = rm.CanDelete,
                         AssignedDate = DateTime.UtcNow
                     });
                 }
            }
            await _context.SaveChangesAsync();
        }

        private T CloneEntity<T>(T source, Guid targetTenantId, Dictionary<Guid, Guid> idMap) where T : class
        {
            var target = Activator.CreateInstance<T>();
            var properties = typeof(T).GetProperties();

            // Store the OLD ID to allow correct mapping later
            var idProp = typeof(T).GetProperty("Id");
            Guid oldId = Guid.Empty;
            if (idProp != null && idProp.PropertyType == typeof(Guid))
            {
                oldId = (Guid)idProp.GetValue(source);
            }

            foreach (var prop in properties)
            {
                if (!prop.CanWrite) continue;
                
                // Do NOT copy Navigation Properties (Virtual ICollection, classes, etc.)
                if (prop.GetMethod.IsVirtual && !prop.PropertyType.IsValueType && prop.PropertyType != typeof(string)) continue;

                var val = prop.GetValue(source);

                if (prop.Name == "Id" && prop.PropertyType == typeof(Guid))
                {
                    var newId = Guid.NewGuid();
                    prop.SetValue(target, newId);
                    if (oldId != Guid.Empty) idMap[oldId] = newId;
                }
                else if (prop.Name == "TenantId")
                {
                     // Always set to Target Tenant
                    prop.SetValue(target, targetTenantId);
                }
                else if (prop.Name == "CreatedDate" || prop.Name == "ModifiedDate")
                {
                    prop.SetValue(target, DateTime.UtcNow);
                }
                else if (prop.Name == "ParentId" || prop.Name == "ParentAccountId")
                {
                    // Copy OLD Guid for now. It will be remapped by the caller or specialized method.
                    // If we remap here, we might not have the ID yet (if parent is processed later).
                    prop.SetValue(target, val);
                }
                else if (prop.PropertyType == typeof(Guid) || prop.PropertyType == typeof(Guid?))
                {
                     // This is a generic FK (like CategoryId, BrandId).
                     // If it's not ID/TenantId/ParentId, it's an FK.
                     // Clone independent properties AS IS.
                     // Caller must Remap if needed (like CloneProductsAsync). 
                     // But for generic tables where we don't have specialized Clone method, we can try to Remap here if map exists!
                     // But we must be careful not to remap Global IDs if they happen to collide (unlikely with Guid).
                     
                     prop.SetValue(target, val);
                }
                else
                {
                    // Copy simple properties (Name, Code, Enums, etc.)
                    prop.SetValue(target, val);
                }
            }
            
            // Auto Remap for simple FKs in generic CloneTable?
            // If we are in CloneTableAsync, we processed Dependencies FIRST.
            // So `idMap` should already contain the new IDs for referenced entities.
            // Let's try to remap any Guid property if it exists in idMap.
            
            foreach (var prop in properties)
            {
                if (!prop.CanWrite) continue;
                if (prop.Name == "Id" || prop.Name == "TenantId" || prop.Name == "ParentId") continue;

                if (prop.PropertyType == typeof(Guid))
                {
                    var g = (Guid)prop.GetValue(target);
                    if (idMap.TryGetValue(g, out var newG))
                    {
                        prop.SetValue(target, newG);
                    }
                }
                else if (prop.PropertyType == typeof(Guid?))
                {
                    var g = (Guid?)prop.GetValue(target);
                    if (g.HasValue && idMap.TryGetValue(g.Value, out var newG))
                    {
                        prop.SetValue(target, newG);
                    }
                }
            }

            return target;
        }
    }
}
