import { Routes } from '@angular/router';
import { PageHelperListComponent } from './page-helper-list/page-helper-list.component';
import { ManagePageHelperComponent } from './manage-page-helper/manage-page-helper.component';
import { AuthGuard } from '@core/security/auth.guard';
import { PageHelperDetailResolver } from './page-helper-detail-resolver';

export const PAGE_HEPLPER_ROUTES: Routes = [
  {
    path: '',
    component: PageHelperListComponent,
    data: { claimType: 'SETT_MANAGE_PAGE_HELPER' },
    canActivate: [AuthGuard],
  },
  {
    path: 'manage/:id',
    component: ManagePageHelperComponent,
    resolve: { pageHelper: PageHelperDetailResolver },
    data: { claimType: 'SETT_MANAGE_PAGE_HELPER' },
    canActivate: [AuthGuard],
  },
];


