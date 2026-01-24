import { Routes } from '@angular/router';
import { CustomerListComponent } from './customer-list/customer-list.component';
import { CustomerDetailComponent } from './customer-detail/customer-detail.component';
import { AuthGuard } from '@core/security/auth.guard';
import { CustomerGuard } from './customer-guard';
import { CustomerDetailResolver } from './customer-detail-resolver';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    component: CustomerListComponent,
    data: { claimType: 'CUST_VIEW_CUSTOMERS' },
    canActivate: [AuthGuard, CustomerGuard]
  },
  {
    path: ':id',
    component: CustomerDetailComponent,
    resolve: {
      customer: CustomerDetailResolver
    },
    data: { claimType: ['CUST_ADD_CUSTOMER', 'CUST_UPDATE_CUSTOMER'] },
    canActivate: [AuthGuard]
  }
];


