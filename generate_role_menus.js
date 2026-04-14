const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const menuItemsPath = 'f:\\MIllyass\\pos-with-inventory-management\\SourceCode\\SeedData\\MenuItems.csv';
const roleMenuItemsPath = 'f:\\MIllyass\\pos-with-inventory-management\\SourceCode\\SeedData\\RoleMenuItems.csv';

const superAdminRoleId = 'F8B6ACE9-A625-4397-BDF8-F34060DBD8E4';
const adminRoleId = '79E9B0F6-0000-0000-0000-000000000001';
const assignedBy = 'A29DE04B-8668-4510-8107-13B7D5869736'; // admin@gmail.com

const content = fs.readFileSync(menuItemsPath, 'utf8');
const lines = content.split('\n');

const roleMenuItems = [];
roleMenuItems.push('Id,RoleId,MenuItemId,CanView,CanCreate,CanEdit,CanDelete,AssignedDate,AssignedBy');

let count = 0;
const now = new Date().toISOString();

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (assuming IDs are quoted or not, but usually first column)
    // The format seen is "ID","Title",...
    const match = line.match(/^"?([0-9a-fA-F-]+)"?/);
    if (match) {
        const menuItemId = match[1];
        
        // Add for Super Admin
        roleMenuItems.push(`${crypto.randomUUID()},${superAdminRoleId},${menuItemId},1,1,1,1,${now},${assignedBy}`);
        
        // Add for Admin
        roleMenuItems.push(`${crypto.randomUUID()},${adminRoleId},${menuItemId},1,1,1,1,${now},${assignedBy}`);
        
        count++;
    }
}

fs.writeFileSync(roleMenuItemsPath, roleMenuItems.join('\n'));
console.log(`Generated RoleMenuItems.csv with ${roleMenuItems.length - 1} entries for ${count} menu items.`);
