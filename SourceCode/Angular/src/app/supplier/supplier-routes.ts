import { Routes } from '@angular/router';
import { AuthGuard } from '@core/security/auth.guard';
import { SupplierDetailComponent } from './supplier-detail/supplier-detail.component';
import { supplierDetailResolver } from './supplier-detail/supplier-detail-resolver';
import { SupplierListComponent } from './supplier-list/supplier-list.component';
import { SupplierGuard } from './supplier-gaurd';

export const SUPPLIER_ROUTES: Routes = [
  {
    path: '',
    component: SupplierListComponent,
    data: { claimType: 'SUPP_VIEW_SUPPLIERS' },
    canActivate: [AuthGuard, SupplierGuard]
  }, {
    path: 'manage/:id',
    component: SupplierDetailComponent,
    resolve: { supplier: supplierDetailResolver },
    data: { claimType: ['SUPP_ADD_SUPPLIER', 'SUPP_UPDATE_SUPPLIER'] }
  }
];

