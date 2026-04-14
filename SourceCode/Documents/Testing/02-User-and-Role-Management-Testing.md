# 02. User and Role Management Test Cases

**Module:** Users, Roles, Claims, and Permissions
**Prerequisites:** Logged in as Tenant Admin (`admin@techcorp.com`).

---

## Test Case 2.1: Create Custom Roles
**Objective:** Verify that the Tenant Admin can create custom roles with specific permissions.

**Steps:**
1. Navigate to Settings -> Roles.
2. Click "Add New Role".
3. Enter Role Name: "Store Manager".
4. Select claims/permissions (e.g., View Products, Add Products, View Sales, Add Sales).
5. Save the Role.
6. Create another Role named "Cashier" with restricted permissions (e.g., Add Sales only, NO access to Products or Settings).
7. Save the Role.

**Expected Result:**
- Both roles are created successfully and appear in the Roles list.
- Roles are associated specifically with the current Tenant ID.

---

## Test Case 2.2: Create New Users and Assign Roles
**Objective:** Verify that new users can be created and assigned to the roles.

**Steps:**
1. Navigate to Settings -> Users.
2. Click "Add New User".
3. Enter Details for Store Manager:
   - Name: Store Manager
   - Email: `manager@techcorp.com`
   - Password: `Manager@2024`
   - Role: Select "Store Manager"
4. Save the User.
5. Repeat to create Cashier:
   - Name: Cashier
   - Email: `cashier@techcorp.com`
   - Password: `Cashier@2024`
   - Role: Select "Cashier"
6. Save the User.

**Expected Result:**
- Users are created successfully.
- Users are linked to the correct Tenant and assigned the appropriate Role.

---

## Test Case 2.3: Verify Role-Based Access Control (RBAC)
**Objective:** Ensure that users can only access modules they have permissions for.

**Steps:**
1. Log out of the Tenant Admin account.
2. Log in as `cashier@techcorp.com`.
3. Attempt to navigate to the "Products" or "Settings" page from the side menu.
4. If the UI hides the menu, try directly navigating to the URL (e.g., `/products`).
5. Attempt to create a product via API using the Cashier's token.
6. Navigate to the POS / Sales Terminal.

**Expected Result:**
- The Cashier cannot see restricted menus in the UI.
- Direct URL access redirects the user to an "Unauthorized" or "Access Denied" page.
- Direct API calls to restricted endpoints return `403 Forbidden`.
- The Cashier *can* successfully access the POS / Sales Terminal.
