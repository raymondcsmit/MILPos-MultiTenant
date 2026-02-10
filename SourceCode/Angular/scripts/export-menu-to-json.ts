import { MenuInfo } from '../src/app/core/sidebar/menu-info';
import { ROUTES } from '../src/app/core/sidebar/menu-items';
import * as fs from 'fs';
import * as path from 'path';

function flattenMenu(routes: MenuInfo[], parentId: string | null = null): any[] {
  const result: any[] = [];
  
  routes.forEach((route, index) => {
    // Generate a consistent ID (using title as seed if possible, or UUID-like)
    // For seeding, we might want to use something deterministic based on Title if unique
    const id = route.title; // Simplified for now, in real DB it will be Guid

    result.push({
      title: route.title,
      path: route.path || '',
      icon: route.icon || '',
      cssClass: route.class || '',
      order: index,
      parentId: parentId, // This would need to be mapped to the parent's ID
      hasClaims: route.hasClaims || []
    });
    
    if (route.submenu?.length > 0) {
      result.push(...flattenMenu(route.submenu, route.title));
    }
  });
  
  return result;
}

// Since we can't easily run TS directly without setup, 
// I will create a simpler JS script that extracts data from the TS file content regex or just manually creates the JSON
// because importing Angular TS files in Node.js environment is tricky (imports, decorators etc).
