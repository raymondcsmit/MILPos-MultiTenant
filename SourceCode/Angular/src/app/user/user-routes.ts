import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { ManageUserComponent } from './manage-user/manage-user.component';
import { userDetailResolver } from './user-detail-resolver';
import { UserListComponent } from './user-list/user-list.component';
import { UserPermissionComponent } from './user-permission/user-permission.component';

export const USER_ROUTES: Routes = [
  {
    path: '',
    component: UserListComponent,
    data: { claimType: 'USR_VIEW_USERS' },
    canActivate: [AuthGuard]
  }, {
    path: 'manage/:id',
    component: ManageUserComponent,
    resolve: { user: userDetailResolver },
    data: { claimType: 'USR_UPDATE_USER' },
    canActivate: [AuthGuard]
  }, {
    path: 'manage',
    component: ManageUserComponent,
    data: { claimType: 'USR_ADD_USER' },
    canActivate: [AuthGuard]
  }, {
    path: 'permission/:id',
    component: UserPermissionComponent,
    resolve: { user: userDetailResolver },
    data: { claimType: 'USR_ASSIGN_USR_PERMISSIONS' },
    canActivate: [AuthGuard]
  }
];


