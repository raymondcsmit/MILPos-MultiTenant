# Dynamic Role-Based Menu System - FINAL Implementation Plan

> **Status**: Consolidated from two previous plans  
> **Last Updated**: 2026-02-10  
> **Estimated Effort**: 10-14 weeks

## Executive Summary

Transform the hardcoded menu system (`menu-items.ts`) into a dynamic, database-driven architecture with:
- **Role-based visibility** with granular permissions (View, Create, Edit, Delete)
- **No-code updates** via admin UI
- **Multi-level caching** to prevent database overload
- **Automatic seeding** for default roles (SuperAdmin, Admin, Employee, Staff)
- **Security synchronization** between menu permissions and functional claims

---

## Architecture

```
┌─────────────┐
│ User Login  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Load Menu API (/api/MenuItems/user-menu)  │
│  - Checks user roles                 │
│  - Queries RoleMenuItem table        │
│  - Returns filtered menu hierarchy   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Multi-Level Cache                   │
│  1. Redis (60 min)                   │
│  2. Memory (15 min)                  │
│  3. Browser (5 min)                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Angular Sidebar                     │
│  - Renders dynamic menu              │
│  - Applies HasClaim directive        │
└──────────────────────────────────────┘
```

---

## Database Schema

### 1. MenuItem
```csharp
public class MenuItem : BaseEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Title { get; set; }        // Translation key
    public string Path { get; set; }         // Route path
    public string Icon { get; set; }         // Material icon
    public string CssClass { get; set; }
    public int Order { get; set; }
    public Guid? ParentId { get; set; }      // Hierarchy
    public bool IsActive { get; set; }
    public bool IsVisible { get; set; }
    
    // Navigation
    public MenuItem Parent { get; set; }
    public List<MenuItem> Children { get; set; }
    public List<MenuItemAction> MenuItemActions { get; set; }
    public List<RoleMenuItem> RoleMenuItems { get; set; }
}
```

### 2. MenuItemAction (Junction)
```csharp
public class MenuItemAction
{
    public Guid MenuItemId { get; set; }
    public Guid ActionId { get; set; }       // Links to Action.Code (e.g., PRO_VIEW_PRODUCTS)
    public MenuOperationType Operation { get; set; }  // View, Create, Edit, Delete
}

public enum MenuOperationType
{
    View = 1,
    Create = 2,
    Edit = 3,
    Delete = 4
}
```

### 3. RoleMenuItem (Junction)
```csharp
public class RoleMenuItem
{
    public Guid RoleId { get; set; }
    public Guid MenuItemId { get; set; }
    public bool CanView { get; set; }
    public bool CanCreate { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    public DateTime AssignedDate { get; set; }
    public Guid AssignedBy { get; set; }
}
```

---

## Caching Strategy

### Redis (Primary Cache)
**Duration**: 60 minutes  
**Key Pattern**: `menu:role:{tenantId}:{roleId}`

```csharp
public async Task<List<MenuItem>> GetMenuItemsByRoleAsync(Guid roleId, Guid tenantId)
{
    var cacheKey = $"menu:role:{tenantId}:{roleId}";
    
    // Try cache
    var cached = await _cache.GetStringAsync(cacheKey);
    if (cached != null)
        return JsonSerializer.Deserialize<List<MenuItem>>(cached);
    
    // Load from DB
    var menuItems = await _context.MenuItems
        .Include(m => m.Children)
        .Where(m => m.TenantId == tenantId && m.IsActive)
        .Join(_context.RoleMenuItems,
            menu => menu.Id,
            roleMenu => roleMenu.MenuItemId,
            (menu, roleMenu) => new { menu, roleMenu })
        .Where(x => x.roleMenu.RoleId == roleId && x.roleMenu.CanView)
        .Select(x => x.menu)
        .OrderBy(m => m.Order)
        .ToListAsync();
    
    // Cache for 60 minutes
    await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(menuItems),
        new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60) });
    
    return menuItems;
}
```

### Cache Invalidation
```csharp
// Automatic invalidation on menu update
public async Task UpdateMenuItemAsync(MenuItem menuItem)
{
    await _context.SaveChangesAsync();
    
    // Invalidate all caches for this tenant
    await _cache.RemoveAsync($"menu:*:{menuItem.TenantId}:*");
}
```

### Browser Cache
```typescript
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly CACHE_KEY = 'user_menu_cache';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 min

  loadUserMenu(): Observable<MenuItemDto[]> {
    const cached = this.getCachedMenu();
    if (cached) return of(cached);

    return this.http.get<MenuItemDto[]>('/api/MenuItems/user-menu').pipe(
      tap(menu => this.cacheMenu(menu))
    );
  }

  private cacheMenu(menu: MenuItemDto[]): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      data: menu,
      timestamp: Date.now()
    }));
  }
}
```

---

## Data Seeding

> **CRITICAL**: When a new tenant is registered, ALL menu items must be automatically seeded into the database for that tenant. This is NOT optional - every tenant MUST have the complete menu structure from day one.

### Automatic Seeding During Tenant Registration

**Trigger**: When `TenantRegistrationService.RegisterTenantAsync()` is called

**Process**:
1. Tenant record created
2. Admin user created
3. Roles seeded (SuperAdmin, Admin, Employee, Staff)
4. **Menu items seeded** ← NEW STEP
5. Company profile seeded
6. Master data seeded
7. Financial data seeded

### Export Script
**File**: `scripts/export-menu-to-json.ts`

```typescript
import { ROUTES } from '../src/app/core/sidebar/menu-items';
import * as fs from 'fs';

function flattenMenu(routes: any[], parentId: string | null = null): any[] {
  const result: any[] = [];
  
  routes.forEach((route, index) => {
    result.push({
      title: route.title,
      path: route.path || '',
      icon: route.icon || '',
      cssClass: route.class || '',
      order: index,
      parentId: parentId,
      hasClaims: route.hasClaims || []
    });
    
    if (route.submenu?.length > 0) {
      result.push(...flattenMenu(route.submenu, route.title));
    }
  });
  
  return result;
}

const menuItems = flattenMenu(ROUTES);
fs.writeFileSync('SourceCode/SeedData/MenuItems.json', JSON.stringify(menuItems, null, 2));
```

### Seeding Service
**File**: `POS.Repository/MenuItem/MenuItemSeedingService.cs`

```csharp
public async Task SeedMenuItemsForTenantAsync(Tenant tenant, User adminUser)
{
    // 1. Read menu items from JSON
    var menuData = ReadMenuItemsFromJson();
    
    // 2. Create menu items with hierarchy
    var menuItemMap = await CreateMenuItemsAsync(menuData, tenant, adminUser);
    
    // 3. Link menu items to actions
    await LinkMenuItemsToActionsAsync(menuData, menuItemMap);
    
    // 4. Assign menus to default roles
    await AssignMenusToDefaultRolesAsync(tenant, menuItemMap);
}

private async Task AssignMenusToDefaultRolesAsync(Tenant tenant, Dictionary<string, Guid> menuItemMap)
{
    var roles = await _context.Roles.Where(r => r.TenantId == tenant.Id).ToListAsync();
    var superAdminRole = roles.FirstOrDefault(r => r.Name == "SuperAdmin");
    var adminRole = roles.FirstOrDefault(r => r.Name == "Admin");
    var employeeRole = roles.FirstOrDefault(r => r.Name == "Employee");
    var staffRole = roles.FirstOrDefault(r => r.Name == "Staff");

    var roleMenuItems = new List<RoleMenuItem>();

    // SuperAdmin: Full access to everything
    if (superAdminRole != null)
    {
        foreach (var (title, menuId) in menuItemMap)
        {
            roleMenuItems.Add(new RoleMenuItem
            {
                Id = Guid.NewGuid(),
                RoleId = superAdminRole.Id,
                MenuItemId = menuId,
                CanView = true,
                CanCreate = true,
                CanEdit = true,
                CanDelete = true,
                AssignedDate = DateTime.UtcNow,
                AssignedBy = tenant.CreatedBy
            });
        }
    }

    // Admin: Full access except system settings
    if (adminRole != null)
    {
        var excludedMenus = new[] { "SYSTEM_SETTINGS" };
        
        foreach (var (title, menuId) in menuItemMap)
        {
            if (excludedMenus.Contains(title))
                continue;

            roleMenuItems.Add(new RoleMenuItem
            {
                Id = Guid.NewGuid(),
                RoleId = adminRole.Id,
                MenuItemId = menuId,
                CanView = true,
                CanCreate = true,
                CanEdit = true,
                CanDelete = true,
                AssignedDate = DateTime.UtcNow,
                AssignedBy = tenant.CreatedBy
            });
        }
    }

    // Employee: Limited access (view + create)
    if (employeeRole != null)
    {
        var allowedMenus = new[] 
        { 
            "DASHBOARD", "PRODUCT", "CUSTOMER", "SUPPLIER",
            "SALES_ORDER", "PURCHASE_ORDER", "INVENTORY",
            "EXPENSE", "REPORTS"
        };

        foreach (var (title, menuId) in menuItemMap)
        {
            if (!allowedMenus.Contains(title))
                continue;

            roleMenuItems.Add(new RoleMenuItem
            {
                Id = Guid.NewGuid(),
                RoleId = employeeRole.Id,
                MenuItemId = menuId,
                CanView = true,
                CanCreate = true,
                CanEdit = false,
                CanDelete = false,
                AssignedDate = DateTime.UtcNow,
                AssignedBy = tenant.CreatedBy
            });
        }
    }

    // Staff: View-only access
    if (staffRole != null)
    {
        var allowedMenus = new[] 
        { 
            "DASHBOARD", "PRODUCT", "CUSTOMER",
            "SALES_ORDER", "INVENTORY", "REPORTS"
        };

        foreach (var (title, menuId) in menuItemMap)
        {
            if (!allowedMenus.Contains(title))
                continue;

            roleMenuItems.Add(new RoleMenuItem
            {
                Id = Guid.NewGuid(),
                RoleId = staffRole.Id,
                MenuItemId = menuId,
                CanView = true,
                CanCreate = false,
                CanEdit = false,
                CanDelete = false,
                AssignedDate = DateTime.UtcNow,
                AssignedBy = tenant.CreatedBy
            });
        }
    }

    _context.RoleMenuItems.AddRange(roleMenuItems);
    await _context.SaveChangesAsync();

    Console.WriteLine($"Assigned menus to {roles.Count} default roles");
}
```

### Default Role Assignments

| Menu | SuperAdmin | Admin | Employee | Staff |
|------|------------|-------|----------|-------|
| Dashboard | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| Product | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| Customer | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| Sales Order | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| Purchase Order | ✅ Full | ✅ Full | ✅ View+Create | ❌ None |
| Accounting | ✅ Full | ✅ Full | ❌ None | ❌ None |
| User Management | ✅ Full | ✅ Full | ❌ None | ❌ None |

**Legend**: Full = CRUD, View+Create = View+Create only, View = Read-only, None = Hidden

---

## Backend Implementation

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/MenuItems/user-menu` | User | Get menu for current user |
| GET | `/api/MenuItems` | SuperAdmin | Get all menu items |
| POST | `/api/MenuItems` | SuperAdmin | Create menu item |
| PUT | `/api/MenuItems/{id}` | SuperAdmin | Update menu item |
| DELETE | `/api/MenuItems/{id}` | SuperAdmin | Delete menu item |
| POST | `/api/MenuItems/assign-to-role` | SuperAdmin | Assign menu to role |
| POST | `/api/MenuItems/clear-cache` | SuperAdmin | Clear menu cache |

### MediatR Query
```csharp
public class GetMenuItemsForUserQueryHandler : IRequestHandler<GetMenuItemsForUserQuery, ServiceResponse<List<MenuItemDto>>>
{
    public async Task<ServiceResponse<List<MenuItemDto>>> Handle(...)
    {
        // 1. Get user's roles
        var userRoles = await _userRepository.GetUserRolesAsync(request.UserId);
        
        // 2. Get menu items for those roles (with caching)
        var menuItems = new List<MenuItem>();
        foreach (var role in userRoles)
        {
            var roleMenus = await _menuItemRepository.GetMenuItemsByRoleAsync(role.Id, tenantId);
            menuItems.AddRange(roleMenus);
        }
        
        // 3. Build hierarchy and return
        var hierarchicalMenu = BuildMenuHierarchy(menuItems.Distinct());
        return ServiceResponse<List<MenuItemDto>>.ReturnResultWith200(hierarchicalMenu);
    }
}
```

---

## Frontend Implementation

### Menu Service (Signals)
```typescript
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly _menuItems = signal<MenuItemDto[]>([]);
  
  public readonly menuItems = this._menuItems.asReadonly();
  public readonly visibleMenuItems = computed(() => 
    this._menuItems().filter(item => !item.hidden)
  );

  async loadUserMenu() {
    const menu = await firstValueFrom(this.http.get<MenuItemDto[]>('/api/MenuItems/user-menu'));
    this._menuItems.set(menu);
  }
}
```

### Sidebar Component
```typescript
export class SidebarComponent implements OnInit {
  constructor(public menuService: MenuService) {}

  ngOnInit() {
    this.menuService.loadUserMenu();
  }
}
```

```html
@for (item of menuService.visibleMenuItems(); track item.id) {
  <app-nav-item [item]="item"></app-nav-item>
}
```

---

## Admin UI

### Menu Management Component
**Features:**
- Tree view with drag-and-drop reordering
- Add/Edit/Delete menu items
- Icon picker (Material Icons)
- Parent menu selector

### Role-Menu Assignment Matrix
**Features:**
- Matrix view: Roles × Menus
- Permission checkboxes (View, Create, Edit, Delete)
- Bulk assign/unassign
- Copy permissions from another role

**UI Mockup:**
```
┌──────────────────────────────────────────────────┐
│ Role: [Admin ▼]         [Copy from Role ▼]      │
├──────────────────────────────────────────────────┤
│ Menu          │ View │ Create │ Edit │ Delete   │
├───────────────┼──────┼────────┼──────┼──────────┤
│ Dashboard     │  ☑   │   ☐    │  ☐   │   ☐      │
│ Product       │  ☑   │   ☑    │  ☑   │   ☑      │
│  ├─ List      │  ☑   │   ☐    │  ☐   │   ☐      │
│  ├─ Add New   │  ☑   │   ☑    │  ☐   │   ☐      │
└──────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database (Week 1-2)
- [ ] Create entities (MenuItem, MenuItemAction, RoleMenuItem)
- [ ] Create migrations
- [ ] Create repositories with caching
- [ ] Write unit tests

### Phase 2: Backend API (Week 2-3)
- [ ] Create MediatR commands/queries
- [ ] Create API controllers
- [ ] Implement cache invalidation
- [ ] Write integration tests

### Phase 3: Data Migration (Week 3-4)
- [ ] Export current menu to JSON
- [ ] Create seeding service
- [ ] Seed default role assignments
- [ ] Test migration on dev environment

### Phase 4: Frontend Service (Week 4-5)
- [ ] Create MenuService with Signals
- [ ] Update sidebar component
- [ ] Add browser caching
- [ ] Write unit tests

### Phase 5: Admin UI (Week 5-7)
- [ ] Create menu management module
- [ ] Create menu list with drag-drop
- [ ] Create role-menu assignment matrix
- [ ] Write E2E tests

### Phase 6: Testing & Deployment (Week 7-8)
- [ ] End-to-end testing
- [ ] Performance testing (cache hit rates)
- [ ] Security testing
- [ ] Production deployment

---

## Verification Plan

### Test Case 1: Load Dynamic Menu
1. Login as Admin
2. Open browser DevTools → Network tab
3. Verify API call to `/api/MenuItems/user-menu`
4. Verify menu items match role permissions
5. Check Redis cache: `redis-cli KEYS "menu:*"`

### Test Case 2: Cache Performance
1. First load: Measure response time (should be < 100ms from DB)
2. Second load: Measure response time (should be < 10ms from cache)
3. Update menu item
4. Verify cache invalidated
5. Next load should hit DB again

### Test Case 3: Role Permissions
1. Navigate to Role-Menu Assignment
2. Select "Employee" role
3. Uncheck "Product > Add New"
4. Save changes
5. Login as Employee user
6. Verify "Add New" is hidden in sidebar
7. Try accessing `/products/add` directly → should get 403

### Test Case 4: Default Role Seeding
1. Create new tenant via API
2. Check database:
   ```sql
   SELECT r.Name, COUNT(rm.MenuItemId) as MenuCount
   FROM Roles r
   LEFT JOIN RoleMenuItems rm ON r.Id = rm.RoleId
   WHERE r.TenantId = '<NEW_TENANT_ID>'
   GROUP BY r.Name;
   ```
3. Verify counts match expected assignments

### Performance Targets
- Menu API (cached): < 10ms
- Menu API (uncached): < 100ms
- Sidebar render: < 100ms
- Cache hit rate: > 95%

---

## Security Considerations

1. **Authorization**
   - Only SuperAdmin can manage menus
   - Users see only assigned menus
   - Tenant isolation enforced

2. **Claim Synchronization**
   - When menu permissions change, sync to RoleClaims
   - Ensures backend API authorization matches UI visibility

3. **Input Validation**
   - Sanitize menu titles/descriptions
   - Validate icon names against whitelist
   - Validate paths against route configuration

---

## Rollback Plan

1. **Feature Flag**
   ```typescript
   // environment.ts
   useDynamicMenu: false  // Revert to hardcoded menu
   ```

2. **Database Rollback**
   ```bash
   dotnet ef migrations remove --project POS.Migrations.SqlServer
   ```

3. **Cache Clear**
   ```bash
   redis-cli FLUSHDB
   ```

---

## Files to Create

### Backend
- `POS.Data/Entities/Permission/MenuItem.cs`
- `POS.Data/Entities/Permission/MenuItemAction.cs`
- `POS.Data/Entities/Permission/RoleMenuItem.cs`
- `POS.Repository/MenuItem/IMenuItemRepository.cs`
- `POS.Repository/MenuItem/MenuItemRepository.cs`
- `POS.Repository/MenuItem/MenuItemSeedingService.cs`
- `POS.MediatR/MenuItem/Commands/CreateMenuItemCommand.cs`
- `POS.MediatR/MenuItem/Queries/GetMenuItemsForUserQuery.cs`
- `POS.API/Controllers/MenuItemsController.cs`

### Frontend
- `Angular/src/app/core/services/menu.service.ts`
- `Angular/src/app/core/domain-classes/menu-item.ts`
- `Angular/src/app/menu-management/menu-management.module.ts`
- `Angular/src/app/menu-management/menu-list/menu-list.component.ts`
- `Angular/src/app/menu-management/role-menu-assignment/role-menu-assignment.component.ts`

### Data
- `SourceCode/SeedData/MenuItems.json`
- `scripts/export-menu-to-json.ts`

---

## Success Criteria

- ✅ Users see only menus for their roles
- ✅ SuperAdmin can manage menus via UI
- ✅ No code deployment needed for menu changes
- ✅ Cache hit rate > 95%
- ✅ All existing menus migrated successfully
- ✅ Performance: < 10ms (cached), < 100ms (uncached)
- ✅ Zero downtime deployment
- ✅ Backward compatible (feature flag)

---

## Next Steps

1. Review and approve this plan
2. Create database entities and migrations
3. Implement caching layer
4. Implement backend API
5. Create seeding service
6. Implement frontend service
7. Create admin UI
8. Test and deploy
