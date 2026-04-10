# Dynamic Role-Based Menu System - Comprehensive Implementation Plan

## 1. Executive Summary

This document outlines the comprehensive strategy to transition from a hardcoded, static menu system to a fully dynamic, database-driven architecture. This change empowers the application with:

1.  **Role-Based Visibility**: Granular control over what each role can see and do.
2.  **No-Code Updates**: Administrators can modify menu structures without developer intervention.
3.  **Tenant Isolation**: Each tenant maintains their own menu configuration (with a system-level master for updates).
4.  **Security Integration**: Seamless synchronization between Visual Menu Permissions and Functional Claims/Policies.

---

## 2. Architecture Overview

The system bridges the gap between the **Visual UI** (Sidebar) and the **Security Layer** (Claims).

```mermaid
graph TD
    User[User Login] -->|Load Profile| API
    API -->|Query| DB[(Database)]
    DB -->|Fetch| Menu[MenuItem Table]
    DB -->|Fetch| Perms[RoleMenuItem Table]
    
    subgraph "Security Sync"
    Perms -->|Generates| Claims[User Claims (JWT)]
    end
    
    Menu -->|Filtered by Perms| Sidebar[Angular Sidebar]
    Claims -->|Enforces| Guards[Angular Guards]
    Claims -->|Enforces| Backend[API Authorization]
```

---

## 3. Database Schema Design

We will introduce three core entities to manage the menu and its permissions.

### 3.1. Entity: `MenuItem`
Represents a single node in the navigation tree.

```csharp
public class MenuItem : BaseEntity
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    
    // Display Properties
    public string Title { get; set; }        // Translation key (e.g., "MENU.PRODUCTS")
    public string Path { get; set; }         // Router path (e.g., "/products")
    public string Icon { get; set; }         // Material icon name
    public string CssClass { get; set; }     // Custom styling
    public int Order { get; set; }           // Sort order
    public Guid? ParentId { get; set; }      // Null for root items
    
    // State
    public bool IsActive { get; set; }       // Soft delete/hide
    public bool IsVisible { get; set; }      // Hard hide (e.g., for system pages)
    
    // Navigation
    public virtual MenuItem Parent { get; set; }
    public virtual ICollection<MenuItem> Children { get; set; }
    public virtual ICollection<MenuItemAction> MenuItemActions { get; set; }
    public virtual ICollection<RoleMenuItem> RoleMenuItems { get; set; }
}
```

### 3.2. Entity: `MenuItemAction`
Maps a Menu Item to specific System Actions (Claims). This is the critical link between "Seeing the page" and "Having permission to use it".

```csharp
public class MenuItemAction
{
    public Guid MenuItemId { get; set; }
    public Guid ActionId { get; set; }       // References the existing 'Actions' table
    
    // Defines which permission flag this action corresponds to
    public MenuOperationType Operation { get; set; } 
}

public enum MenuOperationType
{
    View = 1,
    Create = 2,
    Edit = 3,
    Delete = 4
}
```

### 3.3. Entity: `RoleMenuItem`
Defines the permissions a Role has for a specific Menu Item.

```csharp
public class RoleMenuItem
{
    public Guid RoleId { get; set; }
    public Guid MenuItemId { get; set; }
    
    // Granular Permissions
    public bool CanView { get; set; }
    public bool CanCreate { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    
    public virtual Role Role { get; set; }
    public virtual MenuItem MenuItem { get; set; }
}
```

---

## 4. Backend Implementation (ASP.NET Core)

### 4.1. Repository Layer (`IMenuItemRepository`)
We need specialized methods to handle the hierarchy and permission filtering efficiently.

-   `GetMenuHierarchyByRoleAsync(Guid roleId)`: Returns the tree structure filtered by `CanView = true`.
-   `SyncRoleClaimsAsync(Guid roleId)`: **Crucial**. Reads the `RoleMenuItem` table and updates the standard `RoleClaims` table.
    -   *Logic*: If `RoleMenuItem.CanCreate` is true for "Products", find the `MenuItemAction` for "Products" + "Create", get the associated `Action` (e.g., `PRO_CREATE`), and insert it into `RoleClaims`.

### 4.2. MediatR & CQRS

#### Command: `UpdateRoleMenuPermissionsCommand`
When an Admin updates permissions in the UI, this command does two things:
1.  Updates the `RoleMenuItem` table (for UI visibility).
2.  Triggers `SyncRoleClaimsAsync` to update the actual security claims.

```csharp
public class UpdateRoleMenuPermissionsCommandHandler : IRequestHandler<...>
{
    public async Task<Response> Handle(...)
    {
        // 1. Update Visual Permissions
        await _repo.UpdateRolePermissions(request.Permissions);
        
        // 2. Sync Functional Security
        // This ensures that if we uncheck "Can Create" in the Menu UI,
        // the user actually loses the "PRO_CREATE" claim in the backend.
        await _repo.SyncRoleClaimsAsync(request.RoleId);
        
        return Response.Success();
    }
}
```

#### Query: `GetUserMenuQuery`
Returns the tailored menu for the logged-in user.

-   **Caching**: This query is high-traffic (every login/refresh).
    -   Use `IDistributedCache` (Redis/SQL) with a key like `menu:{userId}`.
    -   Invalidate this cache whenever `UpdateRoleMenuPermissionsCommand` is executed.

### 4.3. Data Seeding & Propagation Strategy
Since we are moving to a tenant-isolated menu system, we need a robust way to push updates to *existing* tenants (e.g., when you release a new feature).

**The "Feature Propagator" Service**:
Runs on startup or via a specific Admin API.
1.  Iterates all Tenants.
2.  Checks for the existence of "Standard" menu items (defined in a `MasterMenu.json`).
3.  If a tenant is missing a standard item (matched by `Path` or unique `Code`), it inserts it.
4.  **Crucial**: Does *not* overwrite custom changes (like renamed titles or reordered items) made by the tenant, unless forced.

---

## 5. Frontend Implementation (Angular)

### 5.1. State Management (Signals)
Adhering to modern Angular best practices, we will use **Signals** instead of `BehaviorSubject`.

**`MenuService`**:
```typescript
@Injectable({ providedIn: 'root' })
export class MenuService {
  // State
  private readonly _menuItems = signal<MenuItemDto[]>([]);
  
  // Selectors
  public readonly menuItems = this._menuItems.asReadonly();
  public readonly visibleMenuItems = computed(() => 
    this._menuItems().filter(item => !item.hidden)
  );

  // Actions
  async loadUserMenu() {
    const menu = await firstValueFrom(this.http.get<MenuItemDto[]>('/api/menu/user'));
    this._menuItems.set(menu);
  }
}
```

### 5.2. Sidebar Component
The sidebar will iterate over the signal.

```html
<!-- sidebar.component.html -->
@for (item of menuService.visibleMenuItems(); track item.id) {
  <app-nav-item [item]="item"></app-nav-item>
}
```

### 5.3. Permission Guard
We need a Guard that checks the *Dynamic* menu permissions, not just the static claims (though they should be synced).

```typescript
export const dynamicMenuGuard: CanActivateFn = (route, state) => {
  const menuService = inject(MenuService);
  const path = route.routeConfig?.path;
  
  // Check if the user has a menu item for this path with 'CanView'
  // Alternatively, rely on the standard ClaimGuard since we sync permissions.
  // Relying on ClaimGuard is safer and cleaner.
  return true; 
};
```

---

## 6. Admin UI (Menu & Permission Management)

We need a dedicated module `MenuManagementModule` with two key views:

### 6.1. Menu Builder (Drag & Drop)
-   **Library**: `@angular/cdk/drag-drop`.
-   **Features**:
    -   Tree view of current menu.
    -   Drag to reorder or reparent (nesting).
    -   Edit properties (Title, Icon, Path).
    -   **Icon Picker**: A visual selector for Material Icons.

### 6.2. Role Permission Matrix
-   **Layout**: A Data Grid / Table.
-   **Rows**: Menu Items (indented for hierarchy).
-   **Columns**: Roles (Admin, Manager, Cashier).
-   **Cells**: 4 Checkboxes (View, Create, Edit, Delete).
-   **Interaction**: Checking a box immediately calls the API to update `RoleMenuItem` and sync Claims.

---

## 7. Migration Plan (Step-by-Step)

### Phase 1: Database & Backend Core
1.  Create `MenuItem`, `MenuItemAction`, `RoleMenuItem` entities.
2.  Run EF Core Migrations.
3.  Implement `MenuItemRepository` and `MenuItemSeedingService`.
4.  **Data Migration Script**:
    -   Read the existing `menu-items.ts`.
    -   Generate a `MasterMenu.json`.
    -   Write a script to populate the DB for all existing tenants based on this JSON.

### Phase 2: Admin API & Sync Logic
1.  Implement `MenuItemsController`.
2.  Implement the `SyncRoleClaimsAsync` logic (Bridging Menu -> Claims).
3.  Add Caching layers (Redis/Memory).

### Phase 3: Admin UI Construction
1.  Build the Menu Builder (Tree View).
2.  Build the Permission Matrix.

### Phase 4: Client Switchover
1.  Update `MenuService` to fetch from API instead of `menu-items.ts`.
2.  Update Sidebar to use the new Signal-based service.
3.  **Feature Flag**: Wrap the switch in `environment.useDynamicMenu`.

---

## 8. Verification & Testing

### 8.1. Test Cases
-   **TC-01 (Sync)**: Assign "Can Create" on "Products" menu to Role X. Verify Role X now has `PRO_CREATE` claim in `UserClaims`/`RoleClaims` table.
-   **TC-02 (Visibility)**: Uncheck "Can View" for "Settings". Login as that role. Verify "Settings" is absent from Sidebar. verify accessing `/settings` URL returns 403 Forbidden.
-   **TC-03 (Tenant Isolation)**: Rename "Products" to "Merchandise" in Tenant A. Verify Tenant B still sees "Products".

### 8.2. Performance Benchmarks
-   **Menu API Latency**: < 50ms (Cached).
-   **Login Impact**: Syncing claims should add < 200ms to the login/token generation process (only if permissions changed).

---

## 9. Rollback Strategy

1.  **Code**: Revert the `useDynamicMenu` flag to `false`. The app will fall back to `menu-items.ts`.
2.  **Database**: The new tables are additive. They can remain in the DB without breaking the old logic.

