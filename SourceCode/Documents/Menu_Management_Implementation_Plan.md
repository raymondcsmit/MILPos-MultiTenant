# Menu Management Implementation Plan

## Objective
Enable dynamic Menu Management allowing:
1.  **Super Admin**: To manage Global Menu items (visible to all tenants) and their own Tenant-specific items.
2.  **Tenant Admin**: To manage Tenant-specific Menu items (visible only to their tenant) and customize visibility/permissions.

## 1. Backend Architecture

### 1.1. Entity Changes
Refactor `MenuItem` to support both Global (Shared) and Tenant-Specific scope.

*   **File**: `POS.Data\Entities\Permission\MenuItem.cs`
*   **Inheritance**: Change from `BaseEntity` to `SharedBaseEntity`.
*   **Properties**: Add `public Guid? TenantId { get; set; }`.
    *   `TenantId == null`: Global Item (Created by Super Admin).
    *   `TenantId == Guid`: Tenant Specific Item (Created by Admin or Super Admin for specific tenant).

### 1.2. Database Context Configuration
Update `POSDbContext` to handle the hybrid filtering logic for `MenuItem`.

*   **File**: `POS.Domain\Context\POSDbContext.cs`
*   **Query Filter**:
    ```csharp
    builder.Entity<MenuItem>().HasQueryFilter(m => 
        (m.TenantId == _tenantProvider.GetTenantId() || m.TenantId == null) 
        && !m.IsDeleted);
    ```
*   **Note**: Since `MenuItem` will inherit `SharedBaseEntity`, it won't be picked up by the automatic `BaseEntity` filter loop, preventing double filtering.

### 1.3. API Endpoints (MenuItemsController)
Expand `MenuItemsController` to support full CRUD operations.

*   **File**: `POS.API\Controllers\MenuItemsController.cs`
*   **Endpoints**:
    *   `GET /`: Get all menu items (Hierarchy).
    *   `GET /{id}`: Get single item.
    *   `POST /`: Create new item.
    *   `PUT /{id}`: Update item.
    *   `DELETE /{id}`: Delete item.
    *   `PUT /reorder`: Update order/hierarchy (Drag & Drop support).

### 1.4. MediatR Commands & Handlers
Implement missing commands/handlers.

*   **CreateMenuItem**: Update to handle `TenantId` assignment (Null for Global if requested by SuperAdmin).
*   **UpdateMenuItem**: Allow update. Prevent Tenant Admin from updating Global Items (except maybe visibility/claims?). *Decision: Tenant Admin cannot edit Global Items definition (Title, Path), only their local items.*
*   **DeleteMenuItem**: Allow delete. Prevent Tenant Admin from deleting Global Items.
*   **GetAllMenuItems**: Return flat list or hierarchy for management UI.

## 2. Frontend Implementation (Angular)

### 2.1. Menu Service
Update `MenuService` to handle CRUD operations.

*   **File**: `src\app\core\services\menu.service.ts`
*   **Methods**: `getMenuItems()`, `getMenuItem(id)`, `addMenuItem(item)`, `updateMenuItem(item)`, `deleteMenuItem(id)`.

### 2.2. Menu List Component (New)
Create a new component to list and manage menu hierarchy.

*   **Path**: `src\app\menu\menu-list`
*   **Features**:
    *   Tree View (using `mat-tree` or nested drag-drop list).
    *   Visual distinction between **Global** and **Tenant** items.
    *   Context Actions: Edit, Delete, Add Child.
    *   Drag & Drop for reordering (Updates `ParentId` and `Order`).

### 2.3. Manage Menu Component (New)
Create a dialog/page for Adding/Editing items.

*   **Path**: `src\app\menu\manage-menu`
*   **Fields**:
    *   Title (Translatable Key)
    *   Path (Route)
    *   Icon (Material Icon picker)
    *   Is Global (Checkbox - **Super Admin Only**)
    *   Claims/Permissions (Multi-select)
    *   Visible (Toggle)

### 2.4. Routing & Sidebar
*   Add route for `Menu Management` under `Settings` or `Super Admin` section.
*   Ensure `SidebarComponent` continues to render the menu correctly based on the updated API response.

## 3. Migration Strategy

### 3.1. Database Migration
*   Create EF Core migration to change `MenuItem` schema.
*   **Data Migration**: Update existing `MenuItem` records.
    *   If existing items are intended to be Global (Standard System Menu), set `TenantId = null`.
    *   If they are tenant-specific custom items, keep `TenantId`.
    *   *Script*: Update all default system menu items to `TenantId = NULL`.

### 3.2. Seeding
*   Update `SeedingService` to seed core menu items with `TenantId = null`.

## 4. Permission Logic Details

| Actor | Action | Target: Global Item | Target: Tenant Item |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Create | Allowed (Can set Global) | Allowed |
| **Super Admin** | Edit | Allowed | Allowed |
| **Super Admin** | Delete | Allowed | Allowed |
| **Tenant Admin** | Create | N/A | Allowed |
| **Tenant Admin** | Edit | **Denied** (Read-Only) | Allowed |
| **Tenant Admin** | Delete | **Denied** (Hide?) | Allowed |

*Note: To "Hide" a Global Item for a specific tenant without deleting it globally, we might need a `TenantMenuVisibility` table in the future. For now, Global Items are always visible unless restricted by Permissions/Claims.*

## 5. Execution Steps

1.  **Backend**: Modify `MenuItem` entity and `POSDbContext`. Create Migration.
2.  **Backend**: Update `SeedingService` to handle `TenantId` logic.
3.  **Backend**: Implement MediatR CRUD Commands/Handlers.
4.  **Backend**: Update `MenuItemsController`.
5.  **Frontend**: Generate `MenuModule` and Components.
6.  **Frontend**: Implement Service and UI.
7.  **Testing**: Verify SuperAdmin vs TenantAdmin capabilities.
