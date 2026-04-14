const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const menuItemsPath = path.join(__dirname, '../src/app/core/sidebar/menu-items.ts');
const outputPath = path.join(__dirname, '../../SeedData/MenuItems.csv');

// Read file content
let content = fs.readFileSync(menuItemsPath, 'utf8');

// Extract the array content using regex or simple parsing
// We can't eval it easily because it has imports.
// We'll try to strip imports and export and use eval or new Function
content = content.replace(/import .*/g, '');
content = content.replace(/export const ROUTES: MenuInfo\[\] =/, 'const ROUTES =');
// Remove type annotations
content = content.replace(/: MenuInfo\[\]/g, '');

// Evaluate the script to get ROUTES object
// We need to handle the typescript object keys which might not be quoted
// And simple strings.
// Using a safer approach: Parse manually or use a TS parser.
// Given the environment, let's try a simplified extraction.

// We will assume standard JSON-like structure but with unquoted keys
// We can use a regex to convert keys to quoted keys
function looseJsonParse(objStr) {
    return Function('"use strict";return (' + objStr + ')')();
}

// Extract the array part
const match = content.match(/\[([\s\S]*)\];/);
if (!match) {
    console.error('Could not find ROUTES array');
    process.exit(1);
}

let arrayContent = match[0];
// Remove trailing semicolon
arrayContent = arrayContent.replace(/;$/, '');

// Replace single quotes with double quotes for JSON compatibility (mostly)
// But wait, it's JS object literal syntax. `eval` (or new Function) can handle it if we clean it up.
// The content has comments? No visible comments in the snippet.
// It has `hasClaims` arrays.

try {
    const ROUTES = looseJsonParse(arrayContent);
    
    const csvRows = [];
    const headers = ['Id', 'Title', 'Path', 'Icon', 'CssClass', 'Order', 'ParentId', 'IsActive', 'IsVisible'];
    csvRows.push(headers.join(','));

    function processMenu(items, parentId = null) {
        items.forEach((item, index) => {
            // Generate a deterministic GUID based on Title + Path (or just random if we don't care about stability across runs)
            // For seeding, stability helps if we re-seed.
            const seed = (item.title || '') + (item.path || '') + (parentId || '');
            const id = crypto.createHash('md5').update(seed).digest('hex').substring(0, 32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            
            // Clean up values
            const title = item.title || '';
            const pathVal = item.path || '';
            const icon = item.icon || '';
            const cssClass = item.class || '';
            const order = index + 1;
            const pId = parentId || '';
            const isActive = '1';
            const isVisible = '1';

            csvRows.push(`"${id}","${title}","${pathVal}","${icon}","${cssClass}","${order}","${pId}","${isActive}","${isVisible}"`);

            if (item.submenu && item.submenu.length > 0) {
                processMenu(item.submenu, id);
            }
        });
    }

    processMenu(ROUTES);

    fs.writeFileSync(outputPath, csvRows.join('\n'));
    console.log(`Successfully generated ${outputPath}`);

} catch (e) {
    console.error('Error parsing menu items:', e);
}
