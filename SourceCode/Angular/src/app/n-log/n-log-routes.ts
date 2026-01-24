import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { LogDetailResolver } from './log-detail-resolver';
import { NLogDetailComponent } from './n-log-detail/n-log-detail.component';
import { NLogListComponent } from './n-log-list/n-log-list.component';

export const NLOG_ROUTES: Routes = [
  {
    path: '',
    component: NLogListComponent,
    data: { claimType: 'LOGS_VIEW_ERROR_LOGS' },
    canActivate: [AuthGuard]
  }, {
    path: ':id',
    component: NLogDetailComponent,
    canActivate: [AuthGuard],
    resolve: {
      log: LogDetailResolver,
    },
    data: { claimType: 'LOGS_VIEW_ERROR_LOGS' },
  }
];


