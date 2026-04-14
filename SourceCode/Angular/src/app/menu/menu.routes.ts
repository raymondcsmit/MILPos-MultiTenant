import { Routes } from '@angular/router';
import { MenuListComponent } from './menu-list/menu-list.component';
import { ManageMenuComponent } from './manage-menu/manage-menu.component';
import { AuthGuard } from '@core/security/auth.guard';

export const MENU_ROUTES: Routes = [
  {
    path: '',
    component: MenuListComponent,
    data: { claimType: 'MENU_VIEW_MENUS' },
    canActivate: [AuthGuard]
  },
  {
    path: 'manage',
    component: ManageMenuComponent,
    data: { claimType: 'MENU_ADD_MENU' },
    canActivate: [AuthGuard]
  },
  {
    path: 'manage/:id',
    component: ManageMenuComponent,
    data: { claimType: 'MENU_UPDATE_MENU' },
    canActivate: [AuthGuard]
  }
];
