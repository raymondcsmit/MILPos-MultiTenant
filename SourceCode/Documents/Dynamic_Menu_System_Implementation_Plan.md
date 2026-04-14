# Dynamic Role-Based Menu System - Implementation Plan

## Executive Summary

Transform the hardcoded menu system (`menu-items.ts`) into a dynamic, database-driven menu configuration where menu visibility and permissions are controlled by roles. This enables administrators to customize menus without code deployment.

## Current State

### Frontend
- **File**: `Angular/src/app/core/sidebar/menu-items.ts` (1000+ lines)
- **Structure**: Hardcoded `MenuInfo[]` array
- **Permissions**: Static `hasClaims` arrays (e.g., `['PRO_VIEW_PRODUCTS']`)
- **Limitation**: Requires code changes to modify menu structure

### Backend
- **Entities**: `Page` and `Action` exist for permissions
- **Gap**: No menu hierarchy or role-menu mapping in database

## Proposed Architecture

```
[Admin UI] → [Menu API] → [Database]
                ↓
[User Login] → [Load Menu API] → [Filter by Role] → [Angular Sidebar]
```

---

## Database Schema

### New Entities

#### 1. MenuItem
```csharp
public class MenuItem : BaseEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Title { get; set; }        // Translation key
    public string Path { get; set; }         // Route path
    public string Icon { get; set; }         // Material icon name
    public string CssClass { get; set; }
    public int Order { get; set; }
    public Guid? ParentId { get; set; }      // For hierarchy
    public bool IsActive { get; set; }
    public bool IsVisible { get; set; }
    
    // Navigation
    public MenuItem Parent { get; set; }
    public List<MenuItem> Children { get; set; }
    public List<MenuItemAction> MenuItemActions { get; set; }
    public List<RoleMenuItem> RoleMenuItems { get; set; }
}
```

#### 2. MenuItemAction (Junction)
```csharp
public class MenuItemAction
{
    public Guid MenuItemId { get; set; }
    public Guid ActionId { get; set; }
    public bool IsRequired { get; set; }  // AND vs OR logic
}
```

#### 3. RoleMenuItem (Junction)
```csharp
public class RoleMenuItem
{
    public Guid RoleId { get; set; }
    public Guid MenuItemId { get; set; }
    public bool CanView { get; set; }
    public bool CanCreate { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
}
```

### Migration
```bash
dotnet ef migrations add AddDynamicMenuTables
dotnet ef database update
```

---

## Backend Implementation

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/MenuItems/user-menu` | Get menu for current user | User |
| GET | `/api/MenuItems` | Get all menu items | SuperAdmin |
| POST | `/api/MenuItems` | Create menu item | SuperAdmin |
| PUT | `/api/MenuItems/{id}` | Update menu item | SuperAdmin |
| DELETE | `/api/MenuItems/{id}` | Delete menu item | SuperAdmin |
| POST | `/api/MenuItems/assign-to-role` | Assign menu to role | SuperAdmin |

### Repository

**File**: `POS.Repository/MenuItem/IMenuItemRepository.cs`

```csharp
public interface IMenuItemRepository
{
    Task<List<MenuItem>> GetMenuItemsByRoleAsync(Guid roleId, Guid tenantId);
    Task<List<MenuItem>> GetMenuHierarchyAsync(Guid tenantId);
    Task<MenuItem> CreateMenuItemAsync(MenuItem menuItem);
    Task<MenuItem> UpdateMenuItemAsync(MenuItem menuItem);
    Task<bool> AssignMenuToRoleAsync(Guid roleId, Guid menuItemId, RoleMenuPermissions permissions);
}
```

### MediatR Query

**File**: `POS.MediatR/MenuItem/Queries/GetMenuItemsForUserQuery.cs`

```csharp
public class GetMenuItemsForUserQuery : IRequest<ServiceResponse<List<MenuItemDto>>>
{
    public Guid UserId { get; set; }
}

public class Handler : IRequestHandler<GetMenuItemsForUserQuery, ServiceResponse<List<MenuItemDto>>>
{
    public async Task<ServiceResponse<List<MenuItemDto>>> Handle(...)
    {
        // 1. Get user's roles
        var userRoles = await _userRepository.GetUserRolesAsync(request.UserId);
        
        // 2. Get menu items for those roles
        var menuItems = new List<MenuItem>();
        foreach (var role in userRoles)
        {
            var roleMenus = await _menuItemRepository.GetMenuItemsByRoleAsync(role.Id, tenantId);
            menuItems.AddRange(roleMenus);
        }
        
        // 3. Build hierarchy and return
        return BuildHierarchy(menuItems.Distinct());
    }
}
```

### Controller

**File**: `POS.API/Controllers/MenuItemsController.cs`

```csharp
[Route("api/[controller]")]
public class MenuItemsController : ControllerBase
{
    [HttpGet("user-menu")]
    [Authorize]
    public async Task<ActionResult<List<MenuItemDto>>> GetUserMenu()
    {
        var userId = User.FindFirstValue("sub");
        var query = new GetMenuItemsForUserQuery { UserId = Guid.Parse(userId) };
        var response = await _mediator.Send(query);
        return Ok(response.Data);
    }

    [HttpPost]
    [Authorize(Policy = "SuperAdminPolicy")]
    public async Task<ActionResult<MenuItemDto>> CreateMenuItem([FromBody] CreateMenuItemCommand command)
    {
        var response = await _mediator.Send(command);
        return Ok(response.Data);
    }
}
```

---

## Frontend Implementation

### Menu Service

**File**: `Angular/src/app/core/services/menu.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class MenuService {
  private menuItemsSubject = new BehaviorSubject<MenuItemDto[]>([]);
  public menuItems$ = this.menuItemsSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadUserMenu(): Observable<MenuItemDto[]> {
    return this.http.get<MenuItemDto[]>('/api/MenuItems/user-menu').pipe(
      tap(menuItems => this.menuItemsSubject.next(menuItems))
    );
  }

  createMenuItem(menuItem: CreateMenuItemDto): Observable<MenuItemDto> {
    return this.http.post<MenuItemDto>('/api/MenuItems', menuItem);
  }

  assignMenuToRole(roleId: string, menuItemId: string, permissions: MenuPermissions) {
    return this.http.post('/api/MenuItems/assign-to-role', {
      roleId, menuItemId, permissions
    });
  }
}
```

### Update Sidebar Component

**File**: `Angular/src/app/core/sidebar/sidebar.component.ts`

```typescript
export class SidebarComponent implements OnInit {
  public sidebarItems: MenuItemDto[] = [];

  constructor(private menuService: MenuService) {}

  ngOnInit() {
    // Load dynamic menu from API
    this.menuService.loadUserMenu().subscribe(menuItems => {
      this.sidebarItems = menuItems;
    });
  }
}
```

### Menu Interface

**File**: `Angular/src/app/core/domain-classes/menu-item.ts`

```typescript
export interface MenuItemDto {
  id: string;
  title: string;
  path: string;
  icon: string;
  cssClass: string;
  order: number;
  parentId?: string;
  children: MenuItemDto[];
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}
```

---

## Admin UI

### Menu Management Component

**Features:**
- Tree view of menu hierarchy
- Drag-and-drop reordering
- Add/Edit/Delete menu items
- Icon picker
- Parent menu selector

**UI Mockup:**
```
┌─────────────────────────────────────────────────┐
│ Menu Management              [+ Add Menu]       │
├─────────────────────────────────────────────────┤
│ ▼ 📊 Dashboard                [Edit] [Delete]   │
│ ▼ 📦 Product                  [Edit] [Delete]   │
│   ├─ 📋 List                  [Edit] [Delete]   │
│   ├─ ➕ Add New               [Edit] [Delete]   │
│   └─ 🏷️ Category              [Edit] [Delete]   │
│ ▼ 👥 Customer                 [Edit] [Delete]   │
└─────────────────────────────────────────────────┘
```

### Role-Menu Assignment Component

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
│ Customer      │  ☑   │   ☑    │  ☑   │   ☐      │
└──────────────────────────────────────────────────┘
```

---

## Caching Strategy

### Overview
Implement multi-level caching to minimize database load and improve performance. Menu data is relatively static and perfect for aggressive caching.

### Cache Layers

#### 1. Redis Distributed Cache (Primary)

**Configuration**: `appsettings.json`
```json
{
  "Redis": {
    "ConnectionString": "localhost:6379",
    "InstanceName": "POSMenu:",
    "MenuCacheDurationMinutes": 60,
    "RoleCacheDurationMinutes": 120
  }
}
```

**Implementation**: `POS.Repository/MenuItem/MenuItemRepository.cs`

```csharp
public class MenuItemRepository : IMenuItemRepository
{
    private readonly IDistributedCache _cache;
    private readonly POSDbContext _context;
    private readonly ILogger<MenuItemRepository> _logger;
    private const string MENU_CACHE_KEY_PREFIX = "menu:tenant:";
    private const string ROLE_MENU_CACHE_KEY_PREFIX = "menu:role:";

    public async Task<List<MenuItem>> GetMenuItemsByRoleAsync(Guid roleId, Guid tenantId)
    {
        var cacheKey = $"{ROLE_MENU_CACHE_KEY_PREFIX}{tenantId}:{roleId}";
        
        // Try get from cache
        var cachedData = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrEmpty(cachedData))
        {
            _logger.LogInformation("Menu cache HIT for role {RoleId}", roleId);
            return JsonSerializer.Deserialize<List<MenuItem>>(cachedData);
        }

        _logger.LogInformation("Menu cache MISS for role {RoleId}", roleId);
        
        // Load from database
        var menuItems = await _context.MenuItems
            .Include(m => m.Children)
            .Include(m => m.MenuItemActions)
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
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60)
        };
        
        await _cache.SetStringAsync(
            cacheKey, 
            JsonSerializer.Serialize(menuItems),
            cacheOptions
        );

        return menuItems;
    }

    public async Task InvalidateMenuCacheAsync(Guid tenantId)
    {
        // Invalidate all menu caches for this tenant
        var pattern = $"{MENU_CACHE_KEY_PREFIX}{tenantId}:*";
        await _cache.RemoveAsync(pattern);
        
        _logger.LogInformation("Invalidated menu cache for tenant {TenantId}", tenantId);
    }
}
```

#### 2. In-Memory Cache (Secondary)

**For frequently accessed data within a single request**

```csharp
public class MenuService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IMenuItemRepository _repository;

    public async Task<List<MenuItemDto>> GetUserMenuAsync(Guid userId)
    {
        var cacheKey = $"user_menu_{userId}";
        
        if (_memoryCache.TryGetValue(cacheKey, out List<MenuItemDto> cachedMenu))
        {
            return cachedMenu;
        }

        var menu = await _repository.GetMenuItemsByUserAsync(userId);
        
        _memoryCache.Set(cacheKey, menu, TimeSpan.FromMinutes(15));
        
        return menu;
    }
}
```

#### 3. Browser Cache (Client-Side)

**HTTP Cache Headers**

```csharp
[HttpGet("user-menu")]
[ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
public async Task<ActionResult<List<MenuItemDto>>> GetUserMenu()
{
    // Cache for 5 minutes on client side
    Response.Headers["Cache-Control"] = "private, max-age=300";
    Response.Headers["ETag"] = GenerateMenuETag();
    
    var menu = await _mediator.Send(new GetMenuItemsForUserQuery { ... });
    return Ok(menu);
}
```

**Angular Service with Local Storage**

```typescript
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly CACHE_KEY = 'user_menu_cache';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  loadUserMenu(): Observable<MenuItemDto[]> {
    // Check localStorage cache
    const cached = this.getCachedMenu();
    if (cached) {
      return of(cached);
    }

    // Load from API
    return this.http.get<MenuItemDto[]>('/api/MenuItems/user-menu').pipe(
      tap(menu => this.cacheMenu(menu))
    );
  }

  private getCachedMenu(): MenuItemDto[] | null {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > this.CACHE_DURATION) {
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    }

    return data;
  }

  private cacheMenu(menu: MenuItemDto[]): void {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      data: menu,
      timestamp: Date.now()
    }));
  }

  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }
}
```

### Cache Invalidation Strategy

#### Automatic Invalidation

```csharp
public class UpdateMenuItemCommandHandler : IRequestHandler<UpdateMenuItemCommand, ServiceResponse<MenuItemDto>>
{
    private readonly IMenuItemRepository _repository;
    private readonly IDistributedCache _cache;

    public async Task<ServiceResponse<MenuItemDto>> Handle(UpdateMenuItemCommand request, CancellationToken cancellationToken)
    {
        // Update menu item
        var menuItem = await _repository.UpdateMenuItemAsync(request);

        // Invalidate cache for this tenant
        await _repository.InvalidateMenuCacheAsync(menuItem.TenantId);

        // Publish cache invalidation event (for distributed systems)
        await _eventBus.PublishAsync(new MenuCacheInvalidatedEvent 
        { 
            TenantId = menuItem.TenantId 
        });

        return ServiceResponse<MenuItemDto>.ReturnResultWith200(menuItem);
    }
}
```

#### Manual Invalidation Endpoint

```csharp
[HttpPost("clear-cache")]
[Authorize(Policy = "SuperAdminPolicy")]
public async Task<ActionResult> ClearMenuCache([FromQuery] Guid? tenantId)
{
    if (tenantId.HasValue)
    {
        await _menuItemRepository.InvalidateMenuCacheAsync(tenantId.Value);
    }
    else
    {
        // Clear all menu caches (use with caution)
        await _cache.RemoveAsync("menu:*");
    }

    return Ok(new { message = "Cache cleared successfully" });
}
```

### Cache Warming

**Preload cache on application startup**

```csharp
public class MenuCacheWarmingService : IHostedService
{
    private readonly IServiceProvider _serviceProvider;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IMenuItemRepository>();
        var context = scope.ServiceProvider.GetRequiredService<POSDbContext>();

        // Get all active tenants
        var tenants = await context.Tenants
            .Where(t => t.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var tenant in tenants)
        {
            // Get all roles for this tenant
            var roles = await context.Roles
                .Where(r => r.TenantId == tenant.Id)
                .ToListAsync(cancellationToken);

            // Warm cache for each role
            foreach (var role in roles)
            {
                await repository.GetMenuItemsByRoleAsync(role.Id, tenant.Id);
            }
        }
    }
}
```

**Register in Program.cs**

```csharp
builder.Services.AddHostedService<MenuCacheWarmingService>();
```

### Performance Metrics

**Expected Performance:**
- **Cache Hit**: < 10ms
- **Cache Miss (DB Query)**: < 100ms
- **Cache Invalidation**: < 50ms

**Monitoring:**

```csharp
public class MenuPerformanceMiddleware
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api/MenuItems"))
        {
            var sw = Stopwatch.StartNew();
            await _next(context);
            sw.Stop();

            _logger.LogInformation(
                "Menu API {Path} completed in {ElapsedMs}ms",
                context.Request.Path,
                sw.ElapsedMilliseconds
            );
        }
    }
}
```

### Cache Configuration Summary

| Cache Type | Duration | Invalidation | Use Case |
|------------|----------|--------------|----------|
| Redis | 60 min | On menu update | Role-based menus |
| Memory | 15 min | On app restart | User-specific menus |
| Browser | 5 min | Manual/ETag | Client-side caching |
| LocalStorage | 5 min | Manual | Offline support |

---

## Data Migration

### Export Current Menu

**Script**: `scripts/export-menu.js`

```javascript
// Read menu-items.ts and export to JSON
const ROUTES = require('../menu-items.ts');
const fs = require('fs');

const menuItems = ROUTES.map(route => ({
  title: route.title,
  path: route.path,
  icon: route.icon,
  cssClass: route.class,
  hasClaims: route.hasClaims,
  children: route.submenu
}));

fs.writeFileSync('MenuItems.json', JSON.stringify(menuItems, null, 2));
```

### Comprehensive Seeding Strategy

#### Overview
When a new tenant is created, automatically seed:
1. All menu items from hardcoded `menu-items.ts`
2. Default roles (SuperAdmin, Admin, Employee, Staff)
3. Menu-to-role assignments based on business logic

#### Step 1: Export Hardcoded Menu to JSON

**Script**: `scripts/export-menu-to-json.ts`

```typescript
import { ROUTES } from '../src/app/core/sidebar/menu-items';
import * as fs from 'fs';

interface MenuExport {
  title: string;
  path: string;
  icon: string;
  cssClass: string;
  order: number;
  parentId?: string;
  hasClaims: string[];
  children: MenuExport[];
}

function flattenMenu(routes: any[], parentId: string | null = null, order: number = 0): MenuExport[] {
  const result: MenuExport[] = [];
  
  routes.forEach((route, index) => {
    const menuItem: MenuExport = {
      title: route.title,
      path: route.path || '',
      icon: route.icon || '',
      cssClass: route.class || '',
      order: order + index,
      parentId: parentId,
      hasClaims: route.hasClaims || [],
      children: []
    };
    
    result.push(menuItem);
    
    // Process children recursively
    if (route.submenu && route.submenu.length > 0) {
      const children = flattenMenu(route.submenu, route.title, 0);
      result.push(...children);
    }
  });
  
  return result;
}

const menuItems = flattenMenu(ROUTES);
fs.writeFileSync(
  'SourceCode/SeedData/MenuItems.json', 
  JSON.stringify(menuItems, null, 2)
);

console.log(`Exported ${menuItems.length} menu items to MenuItems.json`);
```

**Run Script:**
```bash
cd SourceCode/Angular
npx ts-node scripts/export-menu-to-json.ts
```

#### Step 2: Create Menu Seeding Service

**File**: `POS.Repository/MenuItem/MenuItemSeedingService.cs`

```csharp
public class MenuItemSeedingService
{
    private readonly POSDbContext _context;
    private readonly string _seedDataPath;

    public async Task SeedMenuItemsForTenantAsync(Tenant tenant, User adminUser)
    {
        Console.WriteLine($"Seeding menu items for tenant {tenant.Name}...");
        
        // 1. Read menu items from JSON
        var menuItemsData = ReadMenuItemsFromJson();
        
        // 2. Create menu items with hierarchy
        var menuItemMap = await CreateMenuItemsAsync(menuItemsData, tenant, adminUser);
        
        // 3. Link menu items to actions
        await LinkMenuItemsToActionsAsync(menuItemsData, menuItemMap);
        
        // 4. Assign menus to default roles
        await AssignMenusToDefaultRolesAsync(tenant, menuItemMap);
        
        Console.WriteLine($"Successfully seeded {menuItemMap.Count} menu items");
    }

    private List<MenuItemSeedData> ReadMenuItemsFromJson()
    {
        var path = Path.Combine(_seedDataPath, "MenuItems.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<List<MenuItemSeedData>>(json);
    }

    private async Task<Dictionary<string, Guid>> CreateMenuItemsAsync(
        List<MenuItemSeedData> menuData, 
        Tenant tenant, 
        User adminUser)
    {
        var menuItemMap = new Dictionary<string, Guid>(); // Title -> NewId
        var menuItems = new List<MenuItem>();

        // First pass: Create all menu items
        foreach (var data in menuData)
        {
            var menuItem = new MenuItem
            {
                Id = Guid.NewGuid(),
                TenantId = tenant.Id,
                Title = data.Title,
                Path = data.Path,
                Icon = data.Icon,
                CssClass = data.CssClass,
                Order = data.Order,
                ParentId = null, // Will set in second pass
                IsActive = true,
                IsVisible = true,
                CreatedDate = DateTime.UtcNow,
                CreatedBy = adminUser.Id
            };

            menuItems.Add(menuItem);
            menuItemMap[data.Title] = menuItem.Id;
        }

        // Second pass: Set parent relationships
        for (int i = 0; i < menuData.Count; i++)
        {
            if (!string.IsNullOrEmpty(menuData[i].ParentId))
            {
                if (menuItemMap.TryGetValue(menuData[i].ParentId, out var parentId))
                {
                    menuItems[i].ParentId = parentId;
                }
            }
        }

        _context.MenuItems.AddRange(menuItems);
        await _context.SaveChangesAsync();

        return menuItemMap;
    }

    private async Task LinkMenuItemsToActionsAsync(
        List<MenuItemSeedData> menuData,
        Dictionary<string, Guid> menuItemMap)
    {
        var menuItemActions = new List<MenuItemAction>();

        foreach (var data in menuData)
        {
            if (data.HasClaims == null || !data.HasClaims.Any())
                continue;

            var menuItemId = menuItemMap[data.Title];

            foreach (var claimCode in data.HasClaims)
            {
                // Find action by code
                var action = await _context.Actions
                    .FirstOrDefaultAsync(a => a.Code == claimCode);

                if (action != null)
                {
                    menuItemActions.Add(new MenuItemAction
                    {
                        Id = Guid.NewGuid(),
                        MenuItemId = menuItemId,
                        ActionId = action.Id,
                        IsRequired = false // OR logic by default
                    });
                }
            }
        }

        _context.MenuItemActions.AddRange(menuItemActions);
        await _context.SaveChangesAsync();
    }

    private async Task AssignMenusToDefaultRolesAsync(
        Tenant tenant,
        Dictionary<string, Guid> menuItemMap)
    {
        // Get default roles
        var roles = await _context.Roles
            .Where(r => r.TenantId == tenant.Id)
            .ToListAsync();

        var superAdminRole = roles.FirstOrDefault(r => r.Name == "Super Admin");
        var adminRole = roles.FirstOrDefault(r => r.Name == "Admin");
        var employeeRole = roles.FirstOrDefault(r => r.Name == "Employee");
        var staffRole = roles.FirstOrDefault(r => r.Name == "Staff");

        var roleMenuItems = new List<RoleMenuItem>();

        // SuperAdmin: Full access to all menus
        if (superAdminRole != null)
        {
            foreach (var menuId in menuItemMap.Values)
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
            var excludedMenus = new[] { "SYSTEM_SETTINGS", "USER_MANAGEMENT" };
            
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
}

public class MenuItemSeedData
{
    public string Title { get; set; }
    public string Path { get; set; }
    public string Icon { get; set; }
    public string CssClass { get; set; }
    public int Order { get; set; }
    public string ParentId { get; set; }
    public List<string> HasClaims { get; set; }
}
```

#### Step 3: Update Tenant Registration Service

**File**: `POS.Repository/Tenant/TenantRegistrationService.cs`

```csharp
public class TenantRegistrationService : ITenantRegistrationService
{
    private readonly MenuItemSeedingService _menuSeedingService;

    private async Task SeedTenantDataAsync(Tenant tenant, User adminUser)
    {
        Console.WriteLine($"Starting seeding for tenant {tenant.Id} ({tenant.Name})");
        
        Console.WriteLine("Seeding CompanyProfile...");
        await SeedCompanyProfileAsync(tenant, adminUser);
        
        Console.WriteLine("Seeding Roles...");
        var roleMap = await SeedRolesAsync(tenant, adminUser);
        
        Console.WriteLine("Seeding Master Data...");
        await SeedMasterDataAsync(tenant, adminUser);
        
        Console.WriteLine("Seeding Financial Data...");
        await SeedFinancialDataAsync(tenant, adminUser);
        
        // NEW: Seed Menu Items
        Console.WriteLine("Seeding Menu Items...");
        await _menuSeedingService.SeedMenuItemsForTenantAsync(tenant, adminUser);
        
        Console.WriteLine($"Seeding completed successfully for tenant {tenant.Id}");
    }
}
```

#### Step 4: Default Role Menu Assignments

**Menu Access Matrix:**

| Menu Item | SuperAdmin | Admin | Employee | Staff |
|-----------|------------|-------|----------|-------|
| **Dashboard** | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| **Product** | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| **Customer** | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| **Supplier** | ✅ Full | ✅ Full | ✅ View+Create | ❌ None |
| **Sales Order** | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| **Purchase Order** | ✅ Full | ✅ Full | ✅ View+Create | ❌ None |
| **Accounting** | ✅ Full | ✅ Full | ❌ None | ❌ None |
| **Payroll** | ✅ Full | ✅ Full | ❌ None | ❌ None |
| **Inventory** | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| **Expense** | ✅ Full | ✅ Full | ✅ View+Create | ❌ None |
| **Reports** | ✅ Full | ✅ Full | ✅ View | ✅ View |
| **Inquiry** | ✅ Full | ✅ Full | ✅ View+Create | ❌ None |
| **Reminder** | ✅ Full | ✅ Full | ✅ View+Create | ✅ View |
| **User Management** | ✅ Full | ❌ None | ❌ None | ❌ None |
| **System Settings** | ✅ Full | ❌ None | ❌ None | ❌ None |

**Permission Legend:**
- ✅ **Full**: View + Create + Edit + Delete
- ✅ **View+Create**: View + Create only
- ✅ **View**: View only
- ❌ **None**: No access

#### Step 5: Verification Queries

**Check Menu Seeding:**
```sql
-- Count menu items per tenant
SELECT TenantId, COUNT(*) as MenuCount
FROM MenuItems
GROUP BY TenantId;

-- Check menu hierarchy
SELECT 
    m.Title,
    p.Title as ParentTitle,
    m.Order,
    m.IsActive
FROM MenuItems m
LEFT JOIN MenuItems p ON m.ParentId = p.Id
WHERE m.TenantId = '<TENANT_ID>'
ORDER BY m.Order;
```

**Check Role Assignments:**
```sql
-- Count menu assignments per role
SELECT 
    r.Name as RoleName,
    COUNT(rm.MenuItemId) as AssignedMenus,
    SUM(CASE WHEN rm.CanView THEN 1 ELSE 0 END) as CanView,
    SUM(CASE WHEN rm.CanCreate THEN 1 ELSE 0 END) as CanCreate,
    SUM(CASE WHEN rm.CanEdit THEN 1 ELSE 0 END) as CanEdit,
    SUM(CASE WHEN rm.CanDelete THEN 1 ELSE 0 END) as CanDelete
FROM Roles r
LEFT JOIN RoleMenuItems rm ON r.Id = rm.RoleId
WHERE r.TenantId = '<TENANT_ID>'
GROUP BY r.Name;
```

**Check Menu-Action Links:**
```sql
-- Verify menu items have required actions
SELECT 
    m.Title,
    COUNT(ma.ActionId) as ActionCount,
    STRING_AGG(a.Code, ', ') as ActionCodes
FROM MenuItems m
LEFT JOIN MenuItemActions ma ON m.Id = ma.MenuItemId
LEFT JOIN Actions a ON ma.ActionId = a.Id
WHERE m.TenantId = '<TENANT_ID>'
GROUP BY m.Title
ORDER BY m.Order;
```



---

## Implementation Phases

### Phase 1: Database (Week 1-2)
- [ ] Create entities (MenuItem, MenuItemAction, RoleMenuItem)
- [ ] Create migrations
- [ ] Create repositories
- [ ] Write unit tests

### Phase 2: Backend API (Week 2-3)
- [ ] Create MediatR commands/queries
- [ ] Create API controllers
- [ ] Create DTOs
- [ ] Write integration tests

### Phase 3: Frontend Service (Week 3-4)
- [ ] Create MenuService
- [ ] Update sidebar component
- [ ] Create menu interfaces
- [ ] Write unit tests

### Phase 4: Admin UI (Week 4-6)
- [ ] Create menu management module
- [ ] Create menu list component
- [ ] Create menu add/edit dialog
- [ ] Create role-menu assignment component
- [ ] Write E2E tests

### Phase 5: Migration (Week 6)
- [ ] Export current menu to JSON
- [ ] Create migration service
- [ ] Update tenant seeding
- [ ] Test migration

### Phase 6: Testing & Deployment (Week 7)
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Security testing
- [ ] Production deployment

---

## Verification

### Test Cases

#### TC1: Load Dynamic Menu
1. Login as Admin
2. Verify sidebar loads from API
3. Check network tab for `/api/MenuItems/user-menu`
4. Verify menu matches role permissions

#### TC2: Create Menu Item
1. Navigate to Menu Management
2. Click "Add Menu"
3. Fill form and save
4. Verify new menu appears in sidebar

#### TC3: Assign Menu to Role
1. Navigate to Role-Menu Assignment
2. Select "Employee" role
3. Uncheck "Product > Add New"
4. Login as Employee
5. Verify "Add New" is hidden

#### TC4: Reorder Menus
1. Drag "Customer" above "Product"
2. Save order
3. Refresh page
4. Verify new order persists

### Performance Targets
- Menu API response: < 500ms
- Sidebar render: < 100ms
- Admin UI load: < 1s

---

## Security

1. **Authorization**
   - Only SuperAdmin can manage menus
   - Users see only assigned menus
   - Tenant isolation enforced

2. **Input Validation**
   - Sanitize menu titles/descriptions
   - Validate icon names
   - Validate paths

3. **SQL Injection Prevention**
   - Use parameterized queries
   - Use EF Core LINQ

---

## Rollback Plan

1. **Feature Flag**
   ```typescript
   // environment.ts
   useDynamicMenu: false  // Revert to hardcoded menu
   ```

2. **Database Rollback**
   ```bash
   dotnet ef migrations remove
   ```

3. **Code Rollback**
   - Revert Git commit
   - Redeploy application

---

## Files to Create

### Backend
- `POS.Data/Entities/Permission/MenuItem.cs`
- `POS.Data/Entities/Permission/MenuItemAction.cs`
- `POS.Data/Entities/Permission/RoleMenuItem.cs`
- `POS.Data/Dto/MenuItem/MenuItemDto.cs`
- `POS.Repository/MenuItem/IMenuItemRepository.cs`
- `POS.Repository/MenuItem/MenuItemRepository.cs`
- `POS.MediatR/MenuItem/Commands/CreateMenuItemCommand.cs`
- `POS.MediatR/MenuItem/Queries/GetMenuItemsForUserQuery.cs`
- `POS.API/Controllers/MenuItemsController.cs`
- `POS.Migrations.SqlServer/Migrations/*_AddDynamicMenuTables.cs`

### Frontend
- `Angular/src/app/core/services/menu.service.ts`
- `Angular/src/app/core/domain-classes/menu-item.ts`
- `Angular/src/app/menu-management/menu-management.module.ts`
- `Angular/src/app/menu-management/menu-list/menu-list.component.ts`
- `Angular/src/app/menu-management/role-menu-assignment/role-menu-assignment.component.ts`

### Data
- `SourceCode/SeedData/MenuItems.json`

---

## Success Criteria

- ✅ Users see only menus for their roles
- ✅ SuperAdmin can manage menus via UI
- ✅ No code deployment needed for menu changes
- ✅ Menu changes reflect immediately
- ✅ All existing menus migrated successfully
- ✅ Performance: < 500ms menu load
- ✅ Zero downtime deployment
- ✅ Backward compatible (feature flag)

---

## Estimated Effort

- **Backend**: 3-4 weeks
- **Frontend**: 3-4 weeks
- **Admin UI**: 2-3 weeks
- **Testing**: 1-2 weeks
- **Total**: 10-14 weeks

---

## Next Steps

1. Review and approve this plan
2. Create database entities and migrations
3. Implement backend API
4. Implement frontend service
5. Create admin UI
6. Migrate existing menu data
7. Test and deploy

---

## Questions?

Contact the development team for clarification or to discuss implementation details.
